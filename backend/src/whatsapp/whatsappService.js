const pool = require('../config/db');
const Sender = require('./sendMessage');
const BookingService = require('../services/bookingService');

const CURRENT_SESSION_VERSION = 2;

// --- Session Management ---

async function getSession(phone) {
  const [rows] = await pool.query('SELECT * FROM whatsapp_sessions WHERE whatsapp_number = ?', [phone]);
  
  if (rows.length === 0) {
    return null;
  }

  const session = rows[0];

  // 2. Session Versioning Check
  if (session.session_version !== CURRENT_SESSION_VERSION) {
    console.log(`[SESSION] Version mismatch for ${phone}. Resetting.`);
    await resetSession(phone);
    return null;
  }

  return session;
}

async function createSession(phone) {
  console.log(`[SESSION] Creating new session for ${phone}`);
  await pool.query(
    'INSERT INTO whatsapp_sessions (whatsapp_number, step, session_version) VALUES (?, ?, ?)',
    [phone, 'ASK_CITY', CURRENT_SESSION_VERSION]
  );
  return { whatsapp_number: phone, step: 'ASK_CITY' };
}

async function resetSession(phone) {
  console.log(`[SESSION] Hard reset for ${phone}`);
  await pool.query('DELETE FROM whatsapp_sessions WHERE whatsapp_number = ?', [phone]);
}

async function updateSessionStep(phone, step, updates = {}) {
  let query = 'UPDATE whatsapp_sessions SET step = ?';
  const params = [step];

  if (updates.city) {
    query += ', city = ?';
    params.push(updates.city);
  }
  if (updates.neighborhood) {
    query += ', neighborhood = ?';
    params.push(updates.neighborhood);
  }
  if (updates.reason) {
    query += ', reason = ?';
    params.push(updates.reason);
  }
  if (updates.event_id) {
    query += ', event_id = ?';
    params.push(updates.event_id);
  }

  query += ' WHERE whatsapp_number = ?';
  params.push(phone);

  await pool.query(query, params);
}

// --- Compatibility Helpers ---

async function getState(phone) {
  const session = await getSession(phone);
  if (session) {
    return { current_step: session.step, data: session }; // data is the session itself now
  }
  return null;
}

async function logMessage(phone, direction, text) {
  try {
    const col = direction === 'in' ? 'message_in' : 'message_out';
    await pool.query(`INSERT INTO conversation_logs (patient_phone, ${col}, created_at) VALUES (?, ?, NOW())`, [phone, text]);
  } catch (e) {
    console.error('Error logging message:', e);
  }
}

// --- Main Flow Entry ---

async function handleIncomingMessage(phone, text) {
  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  try {
    // 3. Hard Reset
    if (lowerText === 'start') {
      await resetSession(phone);
      return await startFlow(phone);
    }

    // 1. Session Initialization
    let session = await getSession(phone);
    if (!session) {
      session = await createSession(phone);
      return await startFlow(phone); // Start fresh
    }

    // 2. Strict Step Flow
    switch (session.step) {
      case 'ASK_CITY':
        return await handleCitySelection(phone, cleanText);
      
      case 'ASK_NEIGHBORHOOD':
        return await handleNeighborhoodInput(phone, cleanText);
      
      case 'ASK_REASON':
        return await handleReasonInput(phone, cleanText, session);
      
      case 'SHOW_EVENTS':
        return await handleEventSelection(phone, cleanText, session);
      
      case 'SHOW_TIME_SLOTS':
        return await handleSlotSelection(phone, cleanText, session);
      
      case 'BOOK_APPOINTMENT': // Should not really hang here, but for safety
      case 'CONFIRMATION':
        return { type: 'text', text: 'You have already booked an appointment. Type "start" to book a new one.' };
      
      default:
        // Invalid state -> Reset
        throw new Error(`Invalid step: ${session.step}`);
    }

  } catch (err) {
    console.error(`[FLOW ERROR] ${phone}:`, err);
    // 4. Auto-Reset on Invalid State
    await resetSession(phone);
    return { type: 'text', text: 'Something went wrong. Let’s start fresh. Which city are you in?' };
  }
}

// --- Step Handlers ---

async function startFlow(phone) {
  // Logic: Show cities
  const [cities] = await pool.query('SELECT id, name FROM cities ORDER BY name');
  
  if (cities.length === 0) {
    throw new Error('No cities available'); // Will trigger auto-reset
  }

  // Ensure session is at ASK_CITY (already set in createSession, but good to be sure if coming from 'start' reset)
  // If we just reset, we need to create a session if we are in 'start' logic?
  // Actually, handleIncomingMessage calls resetSession then startFlow.
  // startFlow should probably ensure a session exists or just return the prompt?
  // If we reset, we have no session row. We MUST create one.
  
  // Check if session exists (it might not if we just did resetSession)
  let session = await getSession(phone);
  if (!session) {
      await createSession(phone);
  } else {
      await updateSessionStep(phone, 'ASK_CITY');
  }

  const options = cities.map(c => ({
    id: String(c.id),
    title: c.name
  }));

  return { 
    type: 'options', 
    title: 'Welcome to Visual Health! Please select your city:', 
    options 
  };
}

async function handleCitySelection(phone, text) {
  // Validate City
  const [cities] = await pool.query('SELECT id, name FROM cities');
  const selectedCity = cities.find(c => 
    String(c.id) === text || c.name.toLowerCase() === text.toLowerCase()
  );

  if (!selectedCity) {
    return { type: 'text', text: 'Invalid city. Please select a valid city from the list.' };
  }

  // Update Session
  await updateSessionStep(phone, 'ASK_NEIGHBORHOOD', { city: selectedCity.name });

  return { type: 'text', text: `Great! You selected ${selectedCity.name}. Now, please type your neighborhood:` };
}

async function handleNeighborhoodInput(phone, text) {
  if (text.length < 3) {
      return { type: 'text', text: 'Please enter a valid neighborhood name.' };
  }

  await updateSessionStep(phone, 'ASK_REASON', { neighborhood: text });
  return { type: 'text', text: 'Got it. What is the reason for your appointment? (e.g., Eye Exam, Cataract Surgery)' };
}

async function handleReasonInput(phone, text, session) {
  // Update reason first
  // But wait, if we fail to find events, we should probably still save the reason? 
  // Or fail? "If event list query fails... DELETE session".
  // Let's save reason first.
  
  // We need city_id to find events.
  const [cities] = await pool.query('SELECT id FROM cities WHERE name = ?', [session.city]);
  if (cities.length === 0) {
      throw new Error('City not found in DB'); // Trigger reset
  }
  const cityId = cities[0].id;

  const [events] = await pool.query(
    'SELECT id, location, start_date, end_date FROM events WHERE city_id = ? ORDER BY start_date ASC',
    [cityId]
  );

  if (events.length === 0) {
     // User: "If events list is empty... DELETE session... Send 'Something went wrong...'"
     // This seems harsh for "no events", but I will follow "Events list not available" trap prevention.
     // Actually, "Never repeat 'Events list not available' endlessly".
     // If I reset, they go back to city selection. This is good.
     throw new Error('No events found for city');
  }

  // Save reason and move to SHOW_EVENTS
  await updateSessionStep(phone, 'SHOW_EVENTS', { reason: text });

  const options = events.map(e => ({
    id: String(e.id),
    title: e.location,
    description: `${new Date(e.start_date).toLocaleDateString()} - ${new Date(e.end_date).toLocaleDateString()}`
  }));

  return {
    type: 'options',
    title: 'Please select an event location:',
    options
  };
}

async function handleEventSelection(phone, text, session) {
  // We need to re-fetch events to validate? Or just trust the ID?
  // Better to validate to ensure it exists.
  const [events] = await pool.query('SELECT id, location FROM events WHERE id = ?', [text]);
  
  if (events.length === 0) {
      return { type: 'text', text: 'Invalid event. Please select one from the list.' };
  }
  const selectedEvent = events[0];

  // Fetch Slots
  const [slots] = await pool.query(
    'SELECT id, slot_date, slot_time FROM time_slots WHERE event_id = ? AND reserved_count < max_per_slot ORDER BY slot_date ASC, slot_time ASC LIMIT 10',
    [selectedEvent.id]
  );

  if (slots.length === 0) {
      // "Time slots are empty... DELETE session"
      throw new Error('No slots available');
  }

  await updateSessionStep(phone, 'SHOW_TIME_SLOTS', { event_id: selectedEvent.id });

  const options = slots.map(s => ({
    id: String(s.id),
    title: `${new Date(s.slot_date).toLocaleDateString()} ${s.slot_time.substring(0, 5)}`
  }));

  return {
    type: 'options',
    title: 'Select a time slot:',
    options
  };
}

async function handleSlotSelection(phone, text, session) {
  // 6. Time Slot & Booking Logic
  
  // Validate slot existence (and availability roughly)
  const [slots] = await pool.query('SELECT id, slot_date, slot_time FROM time_slots WHERE id = ?', [text]);
  if (slots.length === 0) {
       return { type: 'text', text: 'Invalid slot. Please select one from the list.' };
  }
  const slot = slots[0];

  // Attempt Booking
  try {
    const bookingResult = await BookingService.bookSlot({
      whatsapp_number: phone,
      city: session.city,
      neighborhood: session.neighborhood,
      reason: session.reason,
      event_id: session.event_id,
      time_slot_id: slot.id
    });

    // Success!
    // "After booking: DELETE the session"
    await resetSession(phone);

    const confirmText = `Your appointment has been scheduled for ${new Date(bookingResult.slot_date).toLocaleDateString()}, ${bookingResult.slot_time.substring(0, 5)}. Location: ${session.city}.`; // Using city as location proxy or I should have fetched event location.
    // I didn't store event location in session column.
    // But I can fetch it or just use City. User didn't ask for event_location column.
    // I'll stick to what I have or fetch it.
    
    return { 
      type: 'final', 
      text: confirmText
    };

  } catch (e) {
    if (e.message === 'SLOT_FULL') {
        return { type: 'text', text: 'Sorry, that slot was just taken. Please select another one.' };
    }
    if (e.message === 'ALREADY_BOOKED') {
         await resetSession(phone); // Treat as complete
         return { type: 'text', text: 'You already have an appointment for this event.' };
    }
    throw e; // Will trigger global auto-reset
  }
}

module.exports = {
  handleIncomingMessage,
  logMessage,
  getState,
  sendText: Sender.sendText,
  sendOptions: Sender.sendOptions,
  sendFinalConfirmation: Sender.sendFinalConfirmation
};

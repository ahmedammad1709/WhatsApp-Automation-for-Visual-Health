const pool = require('../config/db');
const Sender = require('./sendMessage');
const BookingService = require('../services/bookingService');

// --- Session Management ---

async function getSession(phone) {
  const [rows] = await pool.query('SELECT * FROM whatsapp_sessions WHERE phone_number = ?', [phone]);
  if (rows.length > 0) {
    return {
      step: rows[0].step,
      data: typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data
    };
  }
  return null;
}

async function updateSession(phone, step, data) {
  const [rows] = await pool.query('SELECT phone_number FROM whatsapp_sessions WHERE phone_number = ?', [phone]);
  if (rows.length > 0) {
    await pool.query('UPDATE whatsapp_sessions SET step = ?, data = ? WHERE phone_number = ?', [step, JSON.stringify(data), phone]);
  } else {
    await pool.query('INSERT INTO whatsapp_sessions (phone_number, step, data) VALUES (?, ?, ?)', [phone, step, JSON.stringify(data)]);
  }
}

async function clearSession(phone) {
  await pool.query('DELETE FROM whatsapp_sessions WHERE phone_number = ?', [phone]);
}

// --- Compatibility Helpers ---

// Used by controller for logging
async function getState(phone) {
  const session = await getSession(phone);
  if (session) {
    return { current_step: session.step, data: session.data };
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

// --- Flow Logic ---

async function handleIncomingMessage(phone, text) {
  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  // 1. Global Reset
  if (lowerText === 'start') {
    await clearSession(phone);
    return startFlow(phone);
  }

  // 2. "Any Time" Handler
  if (lowerText === 'any time' || lowerText === "i'm flexible" || lowerText === 'im flexible' || lowerText === 'qualquer horario') {
    return handleAnyTime(phone);
  }

  // 3. Load Session
  let session = await getSession(phone);
  if (!session) {
    return startFlow(phone);
  }

  // 4. State Machine
  try {
    switch (session.step) {
      case 'START':
        return startFlow(phone);
      case 'SELECT_CITY':
        return handleCitySelection(phone, cleanText, session.data);
      case 'ENTER_NEIGHBORHOOD':
        return handleNeighborhoodInput(phone, cleanText, session.data);
      case 'ENTER_REASON':
        return handleReasonInput(phone, cleanText, session.data);
      case 'SELECT_EVENT':
        return handleEventSelection(phone, cleanText, session.data);
      case 'SELECT_SLOT':
        return handleSlotSelection(phone, cleanText, session.data);
      case 'COMPLETED':
        return { type: 'text', text: 'You have already booked an appointment. Type "start" to book a new one.' };
      default:
        await clearSession(phone);
        return startFlow(phone);
    }
  } catch (err) {
    console.error('Error in flow:', err);
    return { type: 'text', text: 'An error occurred. Please type "start" to try again.' };
  }
}

// --- Step Handlers ---

async function startFlow(phone) {
  // Check if we have cities
  const [cities] = await pool.query('SELECT id, name FROM cities ORDER BY name');
  
  if (cities.length === 0) {
    return { type: 'text', text: 'Welcome! Currently there are no cities with available campaigns. Please check back later.' };
  }

  // Initialize Session
  await updateSession(phone, 'SELECT_CITY', {});

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

async function handleCitySelection(phone, text, data) {
  // Validate City
  // User might send ID (button) or Name (text)
  const [cities] = await pool.query('SELECT id, name FROM cities');
  
  const selectedCity = cities.find(c => 
    String(c.id) === text || c.name.toLowerCase() === text.toLowerCase()
  );

  if (!selectedCity) {
    return { type: 'text', text: 'Invalid city. Please select a valid city from the list.' };
  }

  data.city = selectedCity.name;
  data.city_id = selectedCity.id;
  
  await updateSession(phone, 'ENTER_NEIGHBORHOOD', data);
  
  return { type: 'text', text: `Great! You selected ${selectedCity.name}. Now, please type your neighborhood:` };
}

async function handleNeighborhoodInput(phone, text, data) {
  data.neighborhood = text;
  await updateSession(phone, 'ENTER_REASON', data);
  return { type: 'text', text: 'Got it. What is the reason for your appointment? (e.g., Eye Exam, Cataract Surgery)' };
}

async function handleReasonInput(phone, text, data) {
  data.reason = text;

  // Fetch Events for the City
  const [events] = await pool.query(
    'SELECT id, location, start_date, end_date FROM events WHERE city_id = ? ORDER BY start_date ASC',
    [data.city_id]
  );

  if (events.length === 0) {
    // No events logic? The user requirements didn't specify fallback for no events.
    // I'll just say no events.
    await updateSession(phone, 'SELECT_CITY', {}); // Reset to city selection?
    return { type: 'text', text: `Sorry, there are no upcoming events in ${data.city}. Type "start" to select another city.` };
  }

  data.events = events; // Cache events in session for validation
  await updateSession(phone, 'SELECT_EVENT', data);

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

async function handleEventSelection(phone, text, data) {
  // Validate Event
  const selectedEvent = data.events.find(e => String(e.id) === text); // Assuming button ID is sent

  if (!selectedEvent) {
    // Try to find by location name? Unlikely with button flow.
    return { type: 'text', text: 'Invalid event. Please select one from the list.' };
  }

  data.event_id = selectedEvent.id;
  data.event_location = selectedEvent.location;

  // Fetch Time Slots
  // "30-minute slots ... is_booked = 0" -> In my DB: reserved_count < max_per_slot
  const [slots] = await pool.query(
    'SELECT id, slot_date, slot_time FROM time_slots WHERE event_id = ? AND reserved_count < max_per_slot ORDER BY slot_date ASC, slot_time ASC LIMIT 10', // Limit to avoid too many buttons
    [selectedEvent.id]
  );

  if (slots.length === 0) {
    return { type: 'text', text: 'Sorry, this event is fully booked. Please select another event or type "start".' };
  }

  data.slots = slots; // Cache slots
  await updateSession(phone, 'SELECT_SLOT', data);

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

async function handleSlotSelection(phone, text, data) {
  const selectedSlot = data.slots.find(s => String(s.id) === text);

  if (!selectedSlot) {
    return { type: 'text', text: 'Invalid slot. Please select one from the list.' };
  }

  // Attempt Booking
  try {
    const bookingResult = await BookingService.bookSlot({
      whatsapp_number: phone,
      city: data.city,
      neighborhood: data.neighborhood,
      reason: data.reason,
      event_id: data.event_id,
      time_slot_id: selectedSlot.id
    });

    await updateSession(phone, 'COMPLETED', data);

    const confirmText = `Your appointment has been scheduled for ${new Date(bookingResult.slot_date).toLocaleDateString()}, ${bookingResult.slot_time.substring(0, 5)}. Location: ${data.event_location}.`;
    
    return { 
      type: 'final', 
      text: confirmText,
      appointment: {
          slot_date: bookingResult.slot_date,
          slot_time: bookingResult.slot_time,
          location: data.event_location,
          city_name: data.city
      }
    };

  } catch (e) {
    if (e.message === 'SLOT_FULL') {
        return { type: 'text', text: 'Sorry, that slot was just taken. Please select another one.' };
    }
    if (e.message === 'ALREADY_BOOKED') {
        return { type: 'text', text: 'You already have an appointment for this event.' };
    }
    console.error('Booking error:', e);
    return { type: 'text', text: 'An error occurred during booking. Please try again.' };
  }
}

async function handleAnyTime(phone) {
  const session = await getSession(phone);
  if (!session || !session.data || !session.data.event_id) {
    return { type: 'text', text: 'Please select an event first before asking for "Any Time".' };
  }

  const slot = await BookingService.findEarliestSlot(session.data.event_id);
  
  if (!slot) {
      return { type: 'text', text: 'Sorry, no slots available.' };
  }

  // Auto-book logic as per requirement "Auto-book OR ask confirmation"
  // I will ask confirmation to be safe/UX friendly, but the requirement allows auto-book.
  // "Backend must: Fetch earliest... Auto-book OR ask confirmation"
  // Let's Auto-book for "Any Time" as it's faster.
  
  try {
      const bookingResult = await BookingService.bookSlot({
          whatsapp_number: phone,
          city: session.data.city,
          neighborhood: session.data.neighborhood,
          reason: session.data.reason,
          event_id: session.data.event_id,
          time_slot_id: slot.id
      });
      
      await updateSession(phone, 'COMPLETED', session.data);

      const confirmText = `Your appointment has been scheduled for ${new Date(bookingResult.slot_date).toLocaleDateString()}, ${bookingResult.slot_time.substring(0, 5)}. Location: ${session.data.event_location}.`;

      return { type: 'final', text: confirmText };
  } catch (e) {
      return { type: 'text', text: 'Failed to book the earliest slot. Please try selecting manually.' };
  }
}


// --- Exports ---
module.exports = {
  handleIncomingMessage,
  logMessage,
  getState,
  // Re-export sender functions for controller
  sendText: Sender.sendText,
  sendOptions: Sender.sendOptions,
  sendFinalConfirmation: Sender.sendFinalConfirmation
};

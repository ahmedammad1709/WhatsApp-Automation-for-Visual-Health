const pool = require('../config/db');
const Sender = require('./sendMessage');
const BookingService = require('../services/bookingService');
const ChatGptService = require('../services/chatgptService');

const CURRENT_SESSION_VERSION = 3;

// --- Helper for Conversation History ---
async function getConversationHistory(phone, limit = 20) {
    const [rows] = await pool.query(
        'SELECT direction, message FROM conversation_logs WHERE whatsapp_number = ? ORDER BY created_at DESC LIMIT ?',
        [phone, limit]
    );
    // Reverse to chronological order
    return rows.reverse();
}

// --- Session Management ---

async function getSession(phone) {
  const [rows] = await pool.query('SELECT * FROM whatsapp_sessions WHERE whatsapp_number = ?', [phone]);
  
  if (rows.length === 0) {
    return null;
  }

  const session = rows[0];

  // Version Check
  if (session.session_version !== CURRENT_SESSION_VERSION) {
    console.log(`[SESSION] Version mismatch for ${phone}. Resetting.`);
    await resetSession(phone);
    return null;
  }

  // Parse metadata if it's a string (MySQL JSON type comes as object usually, but safety check)
  if (typeof session.metadata === 'string') {
      try {
          session.metadata = JSON.parse(session.metadata);
      } catch (e) {
          session.metadata = {};
      }
  } else if (!session.metadata) {
      session.metadata = {};
  }

  return session;
}

async function createSession(phone) {
  console.log(`[SESSION] Creating new session for ${phone}`);
  try {
      await pool.query(
        'INSERT INTO whatsapp_sessions (whatsapp_number, step, session_version, metadata) VALUES (?, ?, ?, ?)',
        [phone, 'ASK_NAME', CURRENT_SESSION_VERSION, JSON.stringify({})]
      );
  } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
          console.warn(`[SESSION] Duplicate found for ${phone} during create. Forcing reset and retry.`);
          await resetSession(phone);
          // Retry once
          await pool.query(
            'INSERT INTO whatsapp_sessions (whatsapp_number, step, session_version, metadata) VALUES (?, ?, ?, ?)',
            [phone, 'ASK_NAME', CURRENT_SESSION_VERSION, JSON.stringify({})]
          );
      } else {
          throw e;
      }
  }
  return { whatsapp_number: phone, step: 'ASK_NAME', metadata: {} };
}

async function resetSession(phone) {
  console.log(`[SESSION] Hard reset requested for ${phone}`);
  try {
      const [result] = await pool.query('DELETE FROM whatsapp_sessions WHERE whatsapp_number = ?', [phone]);
      console.log(`[SESSION] Reset complete for ${phone}. Affected rows: ${result.affectedRows}`);
  } catch (e) {
      console.error(`[SESSION] Reset failed for ${phone}:`, e);
      throw e;
  }
}

async function updateSession(phone, updates) {
  let query = 'UPDATE whatsapp_sessions SET ';
  const params = [];
  const fields = [];

  if (updates.step) { fields.push('step = ?'); params.push(updates.step); }
  if (updates.full_name) { fields.push('full_name = ?'); params.push(updates.full_name); }
  if (updates.city) { fields.push('city = ?'); params.push(updates.city); }
  if (updates.neighborhood) { fields.push('neighborhood = ?'); params.push(updates.neighborhood); }
  if (updates.reason) { fields.push('reason = ?'); params.push(updates.reason); }
  if (updates.event_id) { fields.push('event_id = ?'); params.push(updates.event_id); }
  if (updates.metadata) { fields.push('metadata = ?'); params.push(JSON.stringify(updates.metadata)); }

  if (fields.length === 0) return;

  query += fields.join(', ');
  query += ' WHERE whatsapp_number = ?';
  params.push(phone);

  await pool.query(query, params);
}

// --- Text Normalization Helper ---
function normalize(text) {
    if (!text) return '';
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

// --- Name Sanitization Helper ---
function sanitizeName(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Trim whitespace
    let sanitized = text.trim();
    
    // Remove emojis and special characters (keep letters, spaces, hyphens, apostrophes)
    sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    sanitized = sanitized.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc Symbols
    sanitized = sanitized.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport
    sanitized = sanitized.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
    sanitized = sanitized.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Misc symbols
    sanitized = sanitized.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
    sanitized = sanitized.replace(/[^\p{L}\s\-']/gu, ''); // Keep only letters, spaces, hyphens, apostrophes
    
    // Normalize multiple spaces to single space
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    // Limit length to 100 characters
    if (sanitized.length > 100) {
        sanitized = sanitized.substring(0, 100).trim();
    }
    
    // Final trim
    sanitized = sanitized.trim();
    
    return sanitized;
}

// --- Main Flow Entry ---

async function handleIncomingMessage(phone, text) {
  const cleanText = text.trim();
  const lowerText = normalize(cleanText);
  let currentStep = null; // Declare outside try for error handler access

  try {
    // 1. Hard Reset Command
    if (lowerText === 'start') {
      await resetSession(phone);
      // Ensure session is created immediately so next input is handled correctly
      await createSession(phone);
      return await startFlow(phone);
    }

    // 2. Fetch or Create Session
    let session = await getSession(phone);
    if (!session) {
      session = await createSession(phone);
      // If we just created it, we are at ASK_NAME, so we should prompt for name.
      return { type: 'text', text: 'Hi there! 😊 Welcome to Visual Health. Before we continue, may I have your full name?' };
    }

    // 3. Flow Logic
    currentStep = session.step; // Capture step before processing
    
    switch (currentStep) {
      case 'ASK_NAME':
        return await handleNameInput(phone, cleanText);

      case 'ASK_CITY':
        return await handleCityInput(phone, cleanText);
      
      case 'ASK_NEIGHBORHOOD':
        return await handleNeighborhoodInput(phone, cleanText);
      
      case 'ASK_REASON':
        return await handleReasonInput(phone, cleanText, session);
      
      case 'SHOW_EVENTS':
        return await handleEventSelection(phone, cleanText, session);
      
      case 'SHOW_TIME_SLOTS':
        return await handleSlotSelection(phone, cleanText, session);
      
      case 'CONFIRM_AND_BOOK':
        // Should not be here if session is deleted, but just in case
        return { type: 'text', text: 'You have already booked. Type "start" to book again.' };
      
      default:
        throw new Error(`Invalid step: ${session.step}`);
    }

  } catch (err) {
    console.error(`[FLOW ERROR] ${phone}:`, err);
    console.error(`[FLOW ERROR] Stack trace:`, err.stack);
    console.error(`[FLOW ERROR] Error occurred at step: ${currentStep || 'unknown'}`);
    
    // CRITICAL: Do NOT delete session if error happens at ASK_NAME
    // Instead, ask for name again politely
    if (currentStep === 'ASK_NAME') {
      console.log(`[FLOW ERROR] Error at ASK_NAME step - NOT deleting session, asking for name again`);
      return { type: 'text', text: 'I didn\'t quite catch that. Could you please tell me your full name? 😊' };
    }
    
    // For other steps, delete session and start over
    // This is allowed for: booking completed, session_version mismatch (handled in getSession),
    // and other fatal errors
    await resetSession(phone);
    return { type: 'text', text: 'Oops! Something went wrong. Let\'s start over. 😊 Type "start" or just tell me your name to begin.' };
  }
}

// --- Step Handlers ---

async function startFlow(phone) {
    // Just created session at ASK_NAME
    // We need to return the first prompt.
    // Note: handleIncomingMessage calls this if 'start' or new session.
    // If 'start' was typed, we reset and return this.
    return { type: 'text', text: 'Hi there! 😊 Welcome to Visual Health. Before we continue, may I have your full name?' };
}

async function handleNameInput(phone, text) {
    console.log(`[HANDLE NAME] Processing name input for ${phone}: "${text}"`);
    
    // GPT Analysis
    const analysis = await ChatGptService.analyzeInput(text, 'ASK_NAME');
    console.log(`[HANDLE NAME] GPT Analysis:`, JSON.stringify(analysis));

    if (analysis.classification === 'restart') {
        await resetSession(phone);
        await createSession(phone);
        return await startFlow(phone);
    }

    if (analysis.classification === 'off_topic') {
        // Reply with GPT's polite nudge and stay on same step
        return { type: 'text', text: analysis.reply || 'Could you please tell me your full name?' };
    }

    // Use cleaned value if valid, otherwise fallback to sanitized text
    let nameToSave = analysis.cleaned_value;
    if (!nameToSave || nameToSave.length < 2) {
         nameToSave = sanitizeName(text);
    }
    
    if (!nameToSave || nameToSave.length < 2) {
        return { type: 'text', text: 'Could you please provide your full name? It helps us identify you. 😊' };
    }

    await updateSession(phone, { step: 'ASK_CITY', full_name: nameToSave });

    const firstName = nameToSave.split(' ')[0];
    const [cities] = await pool.query('SELECT id, name FROM cities');
    
    if (cities.length === 0) {
        return { type: 'text', text: 'We are currently updating our service areas. Please try again later! (Error: No cities configured)' };
    }
    
    const options = cities.map(c => ({ id: String(c.id), title: c.name }));
    return {
        type: 'options',
        header: 'Select City',
        body: `Thanks, ${firstName}! 😊 Now, please select your city:`,
        options
    };
}

async function handleCityInput(phone, text) {
    // Validate City
    const normalizedInput = normalize(text);
    const [cities] = await pool.query('SELECT id, name FROM cities');
    
    // We match by Name (preferred) or ID (fallback)
    const selectedCity = cities.find(c => 
        normalize(c.name) === normalizedInput || String(c.id) === text
    );

    if (!selectedCity) {
        return { type: 'text', text: 'I couldn\'t find that city. Please select one from the list or type it exactly. 😊' };
    }

    await updateSession(phone, { step: 'ASK_NEIGHBORHOOD', city: selectedCity.name });

    return { type: 'text', text: `Great! ${selectedCity.name}. Now, which neighborhood do you live in?` };
}

async function handleNeighborhoodInput(phone, text) {
    // GPT Analysis
    const analysis = await ChatGptService.analyzeInput(text, 'ASK_NEIGHBORHOOD');

    if (analysis.classification === 'restart') {
        await resetSession(phone);
        await createSession(phone);
        return await startFlow(phone);
    }

    if (analysis.classification === 'off_topic') {
        return { type: 'text', text: analysis.reply || 'Which neighborhood do you live in?' };
    }

    const neighborhood = analysis.cleaned_value || text.trim();

    if (neighborhood.length < 2) {
        return { type: 'text', text: 'Please enter a valid neighborhood name.' };
    }

    await updateSession(phone, { step: 'ASK_REASON', neighborhood });
    return { type: 'text', text: 'Got it. What is the reason for your appointment? (e.g., Eye Exam, Cataract Surgery)' };
}

async function handleReasonInput(phone, text, session) {
    // GPT Analysis
    const analysis = await ChatGptService.analyzeInput(text, 'ASK_REASON');

    if (analysis.classification === 'restart') {
        await resetSession(phone);
        await createSession(phone);
        return await startFlow(phone);
    }

    if (analysis.classification === 'off_topic') {
        return { type: 'text', text: analysis.reply || 'Could you please briefly describe the reason for your appointment?' };
    }

    const reason = analysis.cleaned_value || text.trim();

    // 1. Fetch Events
    // 2. Build Text Map
    // 3. Show Events

    const [cities] = await pool.query('SELECT id FROM cities WHERE name = ?', [session.city]);
    if (cities.length === 0) throw new Error('City lost from DB');
    const cityId = cities[0].id;

    const [events] = await pool.query(
        'SELECT id, location, start_date, end_date FROM events WHERE city_id = ? ORDER BY start_date ASC',
        [cityId]
    );

    if (events.length === 0) {
        return { type: 'text', text: `I'm sorry, we don't have any upcoming events in ${session.city} right now. Please check back later! (Type "start" to try another city)` };
    }

    // Build Map
    const eventTextMap = [];
    const options = events.map(e => {
        const dateRange = `${new Date(e.start_date).toLocaleDateString()} - ${new Date(e.end_date).toLocaleDateString()}`;
        const displayText = `${e.location}\n${dateRange}`;
        const normalizedText = normalize(`${e.location} ${dateRange}`);
        
        eventTextMap.push({
            event_id: e.id,
            display_text: displayText,
            normalized_text: normalizedText,
            location_normalized: normalize(e.location)
        });

        return {
            id: String(e.id),
            title: e.location,
            description: dateRange
        };
    });

    // Save map to session
    await updateSession(phone, { 
        step: 'SHOW_EVENTS', 
        reason: reason,
        metadata: { ...session.metadata, event_text_map: eventTextMap }
    });

    return {
        type: 'options',
        header: 'Select Event',
        body: 'Please select an event location:',
        options
    };
}

async function handleEventSelection(phone, text, session) {
    const normalizedInput = normalize(text);
    const eventMap = session.metadata?.event_text_map || [];

    // Match Logic
    const match = eventMap.find(item => 
        item.normalized_text === normalizedInput || 
        item.location_normalized === normalizedInput ||
        String(item.event_id) === text // Fallback to ID if button sends ID
    );

    if (!match) {
        // "Politely ask user to tap again (do NOT say 'invalid' harshly)"
        return { type: 'text', text: 'I didn\'t catch that. Could you please tap on one of the event options above? 😊' };
    }

    const eventId = match.event_id;

    // Fetch Slots
    const [slots] = await pool.query(
        'SELECT id, slot_date, slot_time FROM time_slots WHERE event_id = ? AND reserved_count < max_per_slot ORDER BY slot_date ASC, slot_time ASC LIMIT 10',
        [eventId]
    );

    if (slots.length === 0) {
         return { type: 'text', text: 'Oh no! It looks like all slots for this event are fully booked. 😔 Please select a different event or check back later.' };
         // Keep them at SHOW_EVENTS?
         // Yes, they can select another event.
    }

    // Build Slot Map
    const slotTextMap = [];
    const options = slots.map(s => {
        const timeStr = s.slot_time.substring(0, 5);
        const dateStr = new Date(s.slot_date).toLocaleDateString();
        const displayText = `${dateStr} at ${timeStr}`;
        const normalizedText = normalize(displayText);

        slotTextMap.push({
            time_slot_id: s.id,
            display_text: displayText,
            normalized_text: normalizedText,
            simple_time: normalize(timeStr)
        });

        return {
            id: String(s.id),
            title: displayText
        };
    });

    await updateSession(phone, { 
        step: 'SHOW_TIME_SLOTS', 
        event_id: eventId,
        metadata: { ...session.metadata, slot_text_map: slotTextMap }
    });

    return {
        type: 'options',
        header: 'Select Time',
        body: 'Great! Here are the available time slots. Please pick one:',
        options
    };
}

async function handleSlotSelection(phone, text, session) {
    const normalizedInput = normalize(text);
    const slotMap = session.metadata?.slot_text_map || [];

    const match = slotMap.find(item => 
        item.normalized_text === normalizedInput ||
        item.simple_time === normalizedInput ||
        String(item.time_slot_id) === text
    );

    if (!match) {
        return { type: 'text', text: 'I missed that. Could you please select a time slot from the list? 😊' };
    }

    const slotId = match.time_slot_id;

    // Booking Transaction
    try {
        // --- Intelligent Data Extraction ---
        console.log(`[BOOKING] Extracting final patient data for ${phone}`);
        const history = await getConversationHistory(phone, 30); // Get last 30 messages
        const extractedData = await ChatGptService.extractPatientData(history);
        
        console.log(`[BOOKING] Extracted Data:`, JSON.stringify(extractedData));

        const finalName = extractedData.full_name || session.full_name;
        const finalNeighborhood = extractedData.neighborhood || session.neighborhood;
        const finalReason = extractedData.reason_for_visit || session.reason;
        
        // Use preferred name if available
        let displayName = finalName;
        if (extractedData.preferred_name) {
             displayName = `${finalName} (${extractedData.preferred_name})`;
        }

        const result = await BookingService.bookSlot({
            whatsapp_number: phone,
            full_name: displayName,
            city: session.city,
            neighborhood: finalNeighborhood,
            reason: finalReason,
            event_id: session.event_id,
            time_slot_id: slotId
        });

        // Cleanup
        await resetSession(phone);

        // Confirmation Message
        const confirmMsg = `All set, ${extractedData.preferred_name || finalName}! 😊\nYour appointment is confirmed for ${new Date(result.slot_date).toLocaleDateString()} at ${result.slot_time.substring(0, 5)} at ${result.location}.\nWe look forward to seeing you!`;

        return {
            type: 'final',
            text: confirmMsg
        };

    } catch (e) {
        if (e.message === 'SLOT_FULL') {
            return { type: 'text', text: 'Ah, that slot was just taken by someone else! 😅 Please choose another one.' };
        }
        if (e.message === 'ALREADY_BOOKED') {
            await resetSession(phone);
            return { type: 'text', text: 'It looks like you already have an appointment for this event! 😊 See you there.' };
        }
        
        throw e; // Triggers global error handler -> reset
    }
}

// --- Exports ---

async function logMessage(phone, direction, text) {
    try {
        await pool.query(
            'INSERT INTO conversation_logs (whatsapp_number, direction, message, created_at) VALUES (?, ?, ?, NOW())',
            [phone, direction, text]
        );
    } catch (e) {
        console.error('[LOG ERROR] Failed to log message:', e);
    }
}

async function sendText(phone, text, phoneId) {
    try {
        await Sender.sendText(phone, text, phoneId);
    } catch (e) {
        console.error('[SEND ERROR] Failed to send text:', e);
        throw e;
    }
}

async function sendOptions(phone, headerText, bodyText, options, phoneOverride) {
    try {
        await Sender.sendOptions(phone, headerText, bodyText, options, phoneOverride);
    } catch (e) {
        console.error('[SEND ERROR] Failed to send options:', e);
        throw e;
    }
}

module.exports = {
  handleIncomingMessage,
  logMessage,
  sendText,
  sendOptions,
  getSession,
  createSession,
  resetSession,
  // Helper exports if needed by tests
  processUserMessage: handleIncomingMessage // Alias if used elsewhere
};

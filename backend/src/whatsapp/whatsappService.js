import pool from '../config/db.js';
import * as Sender from './sendMessage.js';
import * as BookingService from '../services/bookingService.js';
import { processConversation } from '../services/chatgptService.js';

const CURRENT_SESSION_VERSION = 4; // Increment version to reset all sessions

// --- Helper for Conversation History ---
async function getConversationHistory(phone, limit = 50) {
    const [rows] = await pool.query(
        'SELECT direction, message FROM conversation_logs WHERE whatsapp_number = ? ORDER BY created_at ASC LIMIT ?',
        [phone, limit]
    );
    return rows;
}

// --- Session Management ---

async function getSession(phone) {
  const [rows] = await pool.query('SELECT * FROM whatsapp_sessions WHERE whatsapp_number = ?', [phone]);
  
  if (rows.length === 0) {
    return null;
  }

  const session = rows[0];

  // Version Check - reset if version mismatch
  if (session.session_version !== CURRENT_SESSION_VERSION) {
    console.log(`[SESSION] Version mismatch for ${phone}. Resetting.`);
    await resetSession(phone);
    return null;
  }

  // Parse metadata if it's a string
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
        [phone, 'active', CURRENT_SESSION_VERSION, JSON.stringify({})]
      );
  } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
          console.warn(`[SESSION] Duplicate found for ${phone} during create. Forcing reset and retry.`);
          await resetSession(phone);
          await pool.query(
            'INSERT INTO whatsapp_sessions (whatsapp_number, step, session_version, metadata) VALUES (?, ?, ?, ?)',
            [phone, 'active', CURRENT_SESSION_VERSION, JSON.stringify({})]
          );
      } else {
          throw e;
      }
  }
  return { whatsapp_number: phone, step: 'active', metadata: {} };
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

async function markSessionComplete(phone) {
  await pool.query(
    'UPDATE whatsapp_sessions SET step = ? WHERE whatsapp_number = ?',
    ['completed', phone]
  );
}

// --- Helper: Find matching event and time slot from booking data ---

async function findMatchingEventAndSlot(bookingData) {
  try {
    // Find city
    const [cities] = await pool.query('SELECT id, name FROM cities');
    const city = cities.find(c => 
      c.name.toLowerCase().includes(bookingData.city.toLowerCase()) ||
      bookingData.city.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!city) {
      throw new Error(`City "${bookingData.city}" not found`);
    }

    // Find event
    const [events] = await pool.query(
      'SELECT id, location, start_date, end_date FROM events WHERE city_id = ?',
      [city.id]
    );

    let event = null;
    if (bookingData.event) {
      event = events.find(e => 
        e.location.toLowerCase().includes(bookingData.event.toLowerCase()) ||
        bookingData.event.toLowerCase().includes(e.location.toLowerCase())
      );
    }

    // If no specific event match, use the first available event
    if (!event && events.length > 0) {
      event = events[0];
    }

    if (!event) {
      throw new Error(`No event found for city "${bookingData.city}"`);
    }

    // Parse date
    const targetDate = new Date(bookingData.date);
    if (isNaN(targetDate.getTime())) {
      throw new Error(`Invalid date: ${bookingData.date}`);
    }
    const dateStr = targetDate.toISOString().split('T')[0];

    // Parse time
    let timeStr = bookingData.time_slot;
    if (!timeStr.includes(':')) {
      throw new Error(`Invalid time format: ${bookingData.time_slot}`);
    }
    // Ensure time is in HH:MM:SS format
    const timeParts = timeStr.split(':');
    if (timeParts.length === 2) {
      timeStr = `${timeStr}:00`;
    }

    // Find matching time slot
    const [slots] = await pool.query(
      `SELECT id, slot_date, slot_time, reserved_count, max_per_slot 
       FROM time_slots 
       WHERE event_id = ? AND slot_date = ? AND slot_time LIKE ? AND reserved_count < max_per_slot
       ORDER BY slot_time ASC LIMIT 1`,
      [event.id, dateStr, `${timeStr.substring(0, 5)}%`]
    );

    if (slots.length === 0) {
      // Try to find nearest available slot
      const [allSlots] = await pool.query(
        `SELECT id, slot_date, slot_time, reserved_count, max_per_slot 
         FROM time_slots 
         WHERE event_id = ? AND slot_date >= ? AND reserved_count < max_per_slot
         ORDER BY slot_date ASC, slot_time ASC LIMIT 5`,
        [event.id, dateStr]
      );

      if (allSlots.length === 0) {
        throw new Error(`No available slots found for event "${event.location}"`);
      }

      // Use the first available slot
      return {
        event_id: event.id,
        time_slot_id: allSlots[0].id,
        event: event,
        slot: allSlots[0]
      };
    }

    return {
      event_id: event.id,
      time_slot_id: slots[0].id,
      event: event,
      slot: slots[0]
    };

  } catch (error) {
    console.error('[BOOKING] Error finding matching event/slot:', error);
    throw error;
  }
}

// --- Main Flow Entry ---

async function handleIncomingMessage(phone, text) {
  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  try {
    // 1. Hard Reset Command
    if (lowerText === 'start' || lowerText === 'reiniciar' || lowerText === 'começar') {
      await resetSession(phone);
      await createSession(phone);
      // Let ChatGPT handle the greeting
      const history = await getConversationHistory(phone, 5);
      const { reply } = await processConversation('Olá, quero agendar uma consulta', history);
      return { type: 'text', text: reply };
    }

    // 2. Fetch or Create Session
    let session = await getSession(phone);
    if (!session) {
      session = await createSession(phone);
    }

    // 3. Check if booking is already completed
    if (session.step === 'completed') {
      if (lowerText === 'start' || lowerText.includes('agendar') || lowerText.includes('nova consulta')) {
        await resetSession(phone);
        await createSession(phone);
        const history = await getConversationHistory(phone, 5);
        const { reply } = await processConversation('Olá, quero agendar uma nova consulta', history);
        return { type: 'text', text: reply };
      }
      return { 
        type: 'text', 
        text: 'Seu agendamento já foi confirmado! 😊 Digite "start" se quiser agendar uma nova consulta.' 
      };
    }

    // 4. Get conversation history
    const history = await getConversationHistory(phone, 50);

    // 5. Process with ChatGPT
    console.log(`[CONVERSATION] Processing message for ${phone} with ChatGPT`);
    const { reply, bookingData } = await processConversation(cleanText, history);

    // 6. If booking data is complete, process the booking
    if (bookingData) {
      console.log(`[BOOKING] Complete booking data received:`, bookingData);
      
      try {
        // Find matching event and time slot
        const match = await findMatchingEventAndSlot(bookingData);
        
        // Create booking
        const result = await BookingService.bookSlot({
          whatsapp_number: phone,
          full_name: bookingData.full_name,
          city: bookingData.city,
          neighborhood: bookingData.neighborhood,
          reason: bookingData.reason_for_visit,
          event_id: match.event_id,
          time_slot_id: match.time_slot_id
        });

        // Mark session as complete
        await markSessionComplete(phone);

        // Format confirmation message
        const slotDate = new Date(result.slot_date).toLocaleDateString('pt-BR');
        const slotTime = result.slot_time.substring(0, 5);
        const confirmMsg = `${reply}\n\n✅ Agendamento confirmado para ${slotDate} às ${slotTime} em ${result.location}. Estamos ansiosos para vê-lo!`;

        return {
          type: 'final',
          text: confirmMsg,
          appointment: {
            slot_date: result.slot_date,
            slot_time: result.slot_time,
            location: result.location
          }
        };

      } catch (bookingError) {
        console.error('[BOOKING] Error processing booking:', bookingError);
        
        let errorMsg = reply;
        if (bookingError.message === 'SLOT_FULL') {
          errorMsg = `${reply}\n\n⚠️ Desculpe, esse horário acabou de ser preenchido. Poderia escolher outro horário?`;
        } else if (bookingError.message === 'ALREADY_BOOKED') {
          errorMsg = `${reply}\n\n⚠️ Parece que você já tem um agendamento para este evento.`;
          await markSessionComplete(phone);
        } else if (bookingError.message.includes('not found') || bookingError.message.includes('No available')) {
          errorMsg = `${reply}\n\n⚠️ ${bookingError.message}. Poderia verificar as opções disponíveis?`;
        } else {
          errorMsg = `${reply}\n\n⚠️ Ocorreu um erro ao processar o agendamento. Poderia tentar novamente?`;
        }

        return { type: 'text', text: errorMsg };
      }
    }

    // 7. Return ChatGPT's natural response
    return { type: 'text', text: reply };

  } catch (err) {
    console.error(`[FLOW ERROR] ${phone}:`, err);
    console.error(`[FLOW ERROR] Stack trace:`, err.stack);
    
    // Provide a helpful error message
    return { 
      type: 'text', 
      text: 'Desculpe, ocorreu um erro ao processar sua mensagem. 😔 Poderia repetir, por favor? Ou digite "start" para começar de novo.' 
    };
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

export {
  handleIncomingMessage,
  logMessage,
  sendText,
  sendOptions,
  getSession,
  createSession,
  resetSession,
  // Helper exports if needed by tests
  handleIncomingMessage as processUserMessage
};

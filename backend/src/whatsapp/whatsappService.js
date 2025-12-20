const https = require('https');
const pool = require('../config/db');
const AIFlow = require('./aiFlowService');
const Sender = require('./sendMessage');

async function getState(phone) {
  const [rows] = await pool.query('SELECT id, user_phone, current_step, data FROM conversation_states WHERE user_phone = ?', [phone]);
  return rows[0] || null;
}

async function upsertState(phone, step, temp) {
  const [rows] = await pool.query('SELECT id FROM conversation_states WHERE user_phone = ?', [phone]);
  if (rows[0]) {
    await pool.query('UPDATE conversation_states SET current_step = ?, data = ?, updated_at = NOW() WHERE id = ?', [step, JSON.stringify(temp || null), rows[0].id]);
    return rows[0].id;
  }
  const [res] = await pool.query('INSERT INTO conversation_states (user_phone, current_step, data, updated_at) VALUES (?, ?, ?, NOW())', [phone, step, JSON.stringify(temp || null)]);
  return res.insertId;
}

async function resetState(phone) {
  await upsertState(phone, 'start', null);
}

async function checkOrCreatePatient(phone) {
  const [rows] = await pool.query('SELECT id, full_name, city, neighborhood, reason FROM patients WHERE whatsapp_number = ?', [phone]);
  if (rows[0]) {
    return { exists: true, patient: rows[0] };
  }
  // Create patient record with just whatsapp_number
  const [res] = await pool.query('INSERT INTO patients (whatsapp_number, created_at) VALUES (?, NOW())', [phone]);
  return { exists: false, patient: { id: res.insertId, whatsapp_number: phone } };
}

async function logMessage(phone, direction, text) {
  try {
    if (direction === 'in') {
      await pool.query('INSERT INTO conversation_logs (patient_phone, message_in, created_at) VALUES (?, ?, NOW())', [phone, text]);
    } else {
      await pool.query('INSERT INTO conversation_logs (patient_phone, message_out, created_at) VALUES (?, ?, NOW())', [phone, text]);
    }
  } catch (e) {
    console.error('Error logging message:', e);
  }
}

async function detectCity(text) {
  return AIFlow.detectCity(text);
}

async function getEventForCity(cityId) {
  return AIFlow.getEventForCity(cityId);
}

async function getAvailableSlots(eventId) {
  return AIFlow.getAvailableSlots(eventId);
}

async function sendText(phone, text, phoneOverride) {
  console.log("BOT SEND TEXT:", text);

  return Sender.sendText(phone, text, phoneOverride);
}

async function sendOptions(phone, title, options, phoneOverride) {
  return Sender.sendOptions(phone, title, options, phoneOverride);
}

async function sendFinalConfirmation(phone, appointmentObject, phoneOverride) {
  const text = `✅ Appointment Confirmed!\n\nYour appointment has been scheduled:\nDate: ${appointmentObject.slot_date}\nTime: ${appointmentObject.slot_time}\nLocation: ${appointmentObject.location}\nCity: ${appointmentObject.city_name}\n\nWe look forward to seeing you at Instituto Luz no Caminho!`;
  return Sender.sendText(phone, text, phoneOverride);
}

async function savePatient(data) {
  const [res] = await pool.query('INSERT INTO patients (full_name, whatsapp_number, city, neighborhood, reason, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [data.full_name, data.whatsapp_number, data.city, data.neighborhood || null, data.reason || null]);
  return { id: res.insertId };
}

async function saveAppointment(patientId, eventId, timeSlotId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query('INSERT INTO appointments (patient_id, event_id, time_slot_id, status, created_at) VALUES (?, ?, ?, ?, NOW())', [patientId, eventId, timeSlotId, 'scheduled']);
    await conn.query('UPDATE time_slots SET reserved_count = reserved_count + 1 WHERE id = ?', [timeSlotId]);
    const [tsRows] = await conn.query('SELECT slot_date, slot_time FROM time_slots WHERE id = ?', [timeSlotId]);
    const [evRows] = await conn.query('SELECT location, city_id FROM events WHERE id = ?', [eventId]);
    const [cityRows] = await conn.query('SELECT name FROM cities WHERE id = ?', [evRows[0].city_id]);
    await conn.commit();
    return { id: result.insertId, time_slot_id: timeSlotId, slot_date: tsRows[0].slot_date, slot_time: tsRows[0].slot_time, location: evRows[0].location, city_name: cityRows[0].name };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function handleStep(phone, text, state) {
  const current = state ? state.current_step : 'start';
  const temp = state && state.data ? (typeof state.data === 'string' ? JSON.parse(state.data) : state.data) : {};
  
  // Step: Start / Check Patient Record
  if (current === 'start' || !current) {
    const patientCheck = await checkOrCreatePatient(phone);
    await upsertState(phone, 'ask_name', {});
    return { type: 'text', text: 'Hi! I\'m your appointment assistant from Instituto Luz no Caminho. May I know your full name?' };
  }
  
  // Step 1: Ask Full Name
  if (current === 'ask_name') {
    temp.full_name = text.trim();
    await upsertState(phone, 'ask_city', temp);
    
    // Get available cities
    const [cities] = await pool.query('SELECT id, name, state FROM cities ORDER BY name');
    if (cities.length === 0) {
      return { type: 'text', text: 'Thank you! Unfortunately, there are no cities available at the moment. Please check back later.' };
    }
    
    const cityList = cities.map(c => c.name).join(', ');
    return { type: 'text', text: `Thank you, ${temp.full_name}! Here are the cities where our services are available: ${cityList}. Which city are you in?` };
  }
  
  // Step 2: Show Available Cities
  if (current === 'ask_city') {
    const city = await detectCity(text);
    if (!city) {
      const [cities] = await pool.query('SELECT id, name, state FROM cities ORDER BY name');
      const cityList = cities.map(c => c.name).join(', ');
      return { type: 'text', text: `I couldn't find that city. Here are the available cities: ${cityList}. Please select one from the list.` };
    }
    temp.city = city;
    await upsertState(phone, 'ask_neighborhood', temp);
    return { type: 'text', text: `Great! You're in ${city.name}. What neighborhood are you located in?` };
  }
  
  // Step 3: Ask Neighborhood
  if (current === 'ask_neighborhood') {
    temp.neighborhood = text.trim();
    await upsertState(phone, 'ask_reason', temp);
    return { type: 'text', text: 'What is the reason for your appointment? (e.g., eye exam, consultation, follow-up)' };
  }
  
  // Step 4: Ask Reason / Purpose
  if (current === 'ask_reason') {
    temp.reason = text.trim();
    await upsertState(phone, 'select_event', temp);
    
    // Get events for selected city
    const [events] = await pool.query(
      'SELECT id, location, start_date, end_date, max_capacity, notes FROM events WHERE city_id = ? AND end_date >= CURDATE() ORDER BY start_date ASC',
      [temp.city.id]
    );
    
    if (events.length === 0) {
      return { type: 'text', text: `Thank you for the information. Unfortunately, there are no upcoming events in ${temp.city.name} at the moment. Please check back later or contact us for more information.` };
    }
    
    // Format events list
    const eventList = events.map((e, idx) => {
      const startDate = new Date(e.start_date).toLocaleDateString('pt-BR');
      const endDate = new Date(e.end_date).toLocaleDateString('pt-BR');
      return `${idx + 1}. ${e.location} (${startDate} to ${endDate})`;
    }).join('\n');
    
    temp.events = events;
    await upsertState(phone, 'select_event', temp);
    
    return { type: 'text', text: `Here are the upcoming events in ${temp.city.name}:\n\n${eventList}\n\nPlease reply with the number of the event you'd like to book.` };
  }
  
  // Step 5: Show Upcoming Events
  if (current === 'select_event') {
    const eventIndex = parseInt(text.trim(), 10) - 1;
    if (isNaN(eventIndex) || !temp.events || !temp.events[eventIndex]) {
      const eventList = temp.events.map((e, idx) => {
        const startDate = new Date(e.start_date).toLocaleDateString('pt-BR');
        const endDate = new Date(e.end_date).toLocaleDateString('pt-BR');
        return `${idx + 1}. ${e.location} (${startDate} to ${endDate})`;
      }).join('\n');
      return { type: 'text', text: `Please select a valid event number:\n\n${eventList}` };
    }
    
    temp.event = temp.events[eventIndex];
    await upsertState(phone, 'select_time_slot', temp);
    
    // Get available time slots
    const slots = await getAvailableSlots(temp.event.id);
    if (slots.length === 0) {
      return { type: 'text', text: 'Unfortunately, there are no available time slots for this event. Please select another event or check back later.' };
    }
    
    // Format slots as options
    const slotOptions = slots.map((s, idx) => ({
      id: String(s.id),
      title: `${new Date(s.slot_date).toLocaleDateString('pt-BR')} at ${s.slot_time}`,
      description: `${s.max_per_slot - s.reserved_count} spots available`
    }));
    
    temp.slots = slots;
    await upsertState(phone, 'select_time_slot', temp);
    
    return { type: 'options', title: 'Select a time slot', options: slotOptions };
  }
  
  // Step 6: Show Available Time Slots
  if (current === 'select_time_slot') {
    const chosen = (temp.slots || []).find(s => String(s.id) === String(text).trim());
    if (!chosen) {
      const slotOptions = temp.slots.map((s, idx) => ({
        id: String(s.id),
        title: `${new Date(s.slot_date).toLocaleDateString('pt-BR')} at ${s.slot_time}`,
        description: `${s.max_per_slot - s.reserved_count} spots available`
      }));
      return { type: 'options', title: 'Please select a valid time slot', options: slotOptions };
    }
    
    // Store selected slot ID
    temp.selected_slot_id = chosen.id;
    await upsertState(phone, 'confirm_booking', temp);
    
    // Prepare confirmation message
    const eventDate = new Date(temp.event.start_date).toLocaleDateString('pt-BR');
    const slotDate = new Date(chosen.slot_date).toLocaleDateString('pt-BR');
    
    return { type: 'text', text: `Please confirm your appointment:\n\nPatient: ${temp.full_name}\nCity: ${temp.city.name}\nNeighborhood: ${temp.neighborhood}\nReason: ${temp.reason}\nEvent: ${temp.event.location} (${eventDate})\nTime Slot: ${slotDate} at ${chosen.slot_time}\n\nReply "yes" to confirm or "no" to cancel.` };
  }
  
  // Step 7: Confirm Appointment
  if (current === 'confirm_booking') {
    const lowerText = text.toLowerCase().trim();
    if (lowerText === 'yes' || lowerText === 'sim' || lowerText === 'confirm' || lowerText === 'confirmar') {
      // Update patient record with all collected data
      await pool.query(
        'UPDATE patients SET full_name = ?, city = ?, neighborhood = ?, reason = ? WHERE whatsapp_number = ?',
        [temp.full_name, temp.city.name, temp.neighborhood, temp.reason, phone]
      );
      
      // Get patient ID
      const [patientRows] = await pool.query('SELECT id FROM patients WHERE whatsapp_number = ?', [phone]);
      const patientId = patientRows[0].id;
      
      // Use stored selected slot ID
      const selectedSlotId = temp.selected_slot_id || (temp.slots && temp.slots[0] ? temp.slots[0].id : null);
      if (!selectedSlotId) {
        return { type: 'text', text: 'Error: No time slot selected. Please start over.' };
      }
      
      // Create appointment
      const appt = await saveAppointment(patientId, temp.event.id, selectedSlotId);
      
      // Mark conversation as completed
      await upsertState(phone, 'completed', temp);
      
      const selectedSlot = temp.slots.find(s => s.id === selectedSlotId) || temp.slots[0];
      const slotDate = new Date(selectedSlot.slot_date).toLocaleDateString('pt-BR');
      const confirmationText = `✅ Appointment Confirmed!\n\nYour appointment has been scheduled:\n\nPatient: ${temp.full_name}\nEvent: ${temp.event.location}\nDate: ${slotDate}\nTime: ${selectedSlot.slot_time}\n\nWe look forward to seeing you at Instituto Luz no Caminho!`;
      
      return { type: 'final', appointment: appt, text: confirmationText };
    } else if (lowerText === 'no' || lowerText === 'não' || lowerText === 'cancel' || lowerText === 'cancelar') {
      await resetState(phone);
      return { type: 'text', text: 'Appointment booking cancelled. If you\'d like to start over, just send a message!' };
    } else {
      return { type: 'text', text: 'Please reply "yes" to confirm your appointment or "no" to cancel.' };
    }
  }
  
  // If completed or unknown state, reset
  if (current === 'completed') {
    await resetState(phone);
    return { type: 'text', text: 'Hi! I\'m your appointment assistant from Instituto Luz no Caminho. Would you like to book a new appointment? May I know your full name?' };
  }
  
  // Default: start over
  await resetState(phone);
  return { type: 'text', text: 'Hi! I\'m your appointment assistant from Instituto Luz no Caminho. May I know your full name?' };
}

async function handleIncomingMessage(phone, text) {
  const state = await getState(phone);
  return handleStep(phone, text, state);
}

async function processUserMessage(from, text) {
  console.log("BOT RECEIVED TEXT:", text);
  
  // Get current conversation state
  const state = await getState(from);
  const currentStep = state ? state.current_step : 'ask_city';
  const temp = state && state.data ? (typeof state.data === 'string' ? JSON.parse(state.data) : state.data) : {};
  
  // Get dynamic data for ChatGPT context
  const [cities] = await pool.query('SELECT id, name, state FROM cities ORDER BY name');
  let contextData = {
    availableCities: cities.map(c => ({ id: c.id, name: c.name, state: c.state })),
    currentStep: currentStep,
    userData: temp
  };
  
  // If user has selected a city, get events for that city
  if (temp.city && temp.city.id) {
    const [events] = await pool.query(
      'SELECT id, city_id, location, start_date, end_date, max_capacity FROM events WHERE city_id = ? ORDER BY start_date ASC',
      [temp.city.id]
    );
    contextData.availableEvents = events;
    
    // If user has selected an event, get time slots
    if (temp.event && temp.event.id) {
      const slots = await getAvailableSlots(temp.event.id);
      contextData.availableTimeSlots = slots;
    }
  }
  
  // Generate ChatGPT response with context
  const reply = await generateGPTReply(text, contextData, currentStep, temp);
  const safe = (reply || '').trim();
  
  // Process the reply to handle appointment flow
  // If ChatGPT suggests a city/event/slot selection, we still need to handle it through the structured flow
  // For now, we'll use ChatGPT for natural conversation but still use handleStep for structured data collection
  return { type: 'text', text: safe || 'Desculpe, não consegui responder agora.' };
}

async function generateGPTReply(prompt, contextData, currentStep, temp) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return 'Configuração inválida: OPENAI_API_KEY ausente.';
  }
  
  // Build system prompt with context
  let systemPrompt = `You are a WhatsApp appointment assistant for "Instituto Luz no Caminho". 
You must always:
- Greet the user politely and act as the official representative of the clinic.
- Guide the user step by step to book an appointment.
- Ask for user's full name, city, neighborhood, age, and reason for appointment.
- Show available cities dynamically from the database.
- Show upcoming events and available time slots based on the selected city.
- Confirm the appointment once all info is collected.
- Never give generic responses; always act as the official clinic assistant.
- Respond in Portuguese (Brazilian Portuguese).
- Keep responses concise and professional (2-3 sentences maximum).

CURRENT CONVERSATION CONTEXT:
`;

  // Add cities to context
  if (contextData.availableCities && contextData.availableCities.length > 0) {
    systemPrompt += `\nCidades disponíveis:\n`;
    contextData.availableCities.forEach(city => {
      systemPrompt += `- ${city.name}${city.state ? ` (${city.state})` : ''}\n`;
    });
  }
  
  // Add events if city is selected
  if (contextData.availableEvents && contextData.availableEvents.length > 0) {
    systemPrompt += `\nEventos disponíveis:\n`;
    contextData.availableEvents.forEach(event => {
      systemPrompt += `- ${event.location} (${event.start_date} a ${event.end_date})\n`;
    });
  }
  
  // Add time slots if event is selected
  if (contextData.availableTimeSlots && contextData.availableTimeSlots.length > 0) {
    systemPrompt += `\nHorários disponíveis:\n`;
    contextData.availableTimeSlots.forEach(slot => {
      systemPrompt += `- ${slot.slot_date} às ${slot.slot_time} (${slot.max_per_slot - slot.reserved_count} vagas disponíveis)\n`;
    });
  }
  
  // Add current step context
  if (currentStep && currentStep !== 'start') {
    systemPrompt += `\nCurrent step in booking process: ${currentStep}\n`;
    if (temp.full_name) systemPrompt += `Patient name: ${temp.full_name}\n`;
    if (temp.city) systemPrompt += `Selected city: ${temp.city.name}\n`;
    if (temp.neighborhood) systemPrompt += `Neighborhood: ${temp.neighborhood}\n`;
    if (temp.reason) systemPrompt += `Reason: ${temp.reason}\n`;
    if (temp.event) systemPrompt += `Selected event: ${temp.event.location}\n`;
  }
  
  systemPrompt += `\nRespond naturally and friendly, always in Portuguese. Act as the official clinic assistant.`;
  
  const payload = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 200
  });
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(new URL('https://api.openai.com/v1/chat/completions'), options, (res) => {
      let data = '';
      res.on('data', (d) => (data += d.toString()));
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          const content = json?.choices?.[0]?.message?.content?.trim();
          resolve(content || 'Desculpe, não consegui responder agora.');
        } catch (_) {
          resolve('Desculpe, ocorreu um erro ao gerar a resposta.');
        }
      });
    });
    req.on('error', () => resolve('Falha na comunicação com o serviço de IA.'));
    req.write(payload);
    req.end();
  });
}

module.exports = { handleIncomingMessage, handleStep, resetState, detectCity, getEventForCity, getAvailableSlots, savePatient, saveAppointment, logMessage, sendText, sendOptions, sendFinalConfirmation, processUserMessage, generateGPTReply, getState };

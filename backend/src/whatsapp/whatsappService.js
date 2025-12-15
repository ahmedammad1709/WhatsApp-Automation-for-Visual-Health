const https = require('https');
const pool = require('../config/db');
const AIFlow = require('./aiFlowService');
const Sender = require('./sendMessage');

async function getState(phone) {
  const [rows] = await pool.query('SELECT id, user_phone, current_step, temp_data FROM conversation_states WHERE user_phone = ?', [phone]);
  return rows[0] || null;
}

async function upsertState(phone, step, temp) {
  const [rows] = await pool.query('SELECT id FROM conversation_states WHERE user_phone = ?', [phone]);
  if (rows[0]) {
    await pool.query('UPDATE conversation_states SET current_step = ?, temp_data = ?, updated_at = NOW() WHERE id = ?', [step, JSON.stringify(temp || null), rows[0].id]);
    return rows[0].id;
  }
  const [res] = await pool.query('INSERT INTO conversation_states (user_phone, current_step, temp_data, updated_at) VALUES (?, ?, ?, NOW())', [phone, step, JSON.stringify(temp || null)]);
  return res.insertId;
}

async function resetState(phone) {
  await upsertState(phone, 'ask_city', null);
}

async function logMessage(phone, direction, text) {
  try {
    await pool.query('INSERT INTO conversation_logs (user_phone, direction, message_text, created_at) VALUES (?, ?, ?, NOW())', [phone, direction, text]);
  } catch (e) {
    try {
      await pool.query('INSERT INTO conversation_logs (user_phone, direction, message, created_at) VALUES (?, ?, ?, NOW())', [phone, direction, text]);
    } catch (_) {}
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
  return Sender.sendFinalConfirmation(phone, appointmentObject, phoneOverride);
}

async function savePatient(data) {
  const [res] = await pool.query('INSERT INTO patients (full_name, whatsapp_number, city, neighborhood, reason, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [data.full_name, data.whatsapp_number, data.city, data.neighborhood || null, data.reason || null]);
  return { id: res.insertId };
}

async function saveAppointment(patientId, eventId, timeSlotId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query('INSERT INTO appointments (patient_id, event_id, time_slot_id, status, created_at) VALUES (?, ?, ?, ?, NOW())', [patientId, eventId, timeSlotId, 'reserved']);
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
  const current = state ? state.current_step : 'ask_city';
  const temp = state && state.temp_data ? JSON.parse(state.temp_data) : {};
  if (current === 'ask_city') {
    await upsertState(phone, 'await_city', temp);
    return { type: 'text', text: 'Qual é sua cidade?' };
  }
  if (current === 'await_city') {
    const city = await detectCity(text);
    if (!city) {
      return { type: 'text', text: 'Não encontrei a cidade. Informe novamente.' };
    }
    temp.city = city;
    const event = await getEventForCity(city.id);
    if (!event) {
      const alt = await AIFlow.getNearestAvailableEvent(city.id);
      if (alt) {
        await upsertState(phone, 'await_city', temp);
        return { type: 'text', text: `Evento lotado. Próximo: ${alt.city_name} em ${alt.location}. Informe outra cidade.` };
      }
      return { type: 'text', text: 'Sem eventos disponíveis.' };
    }
    temp.event = event;
    await upsertState(phone, 'await_name', temp);
    return { type: 'text', text: 'Informe seu nome completo.' };
  }
  if (current === 'await_name') {
    temp.full_name = text.trim();
    await upsertState(phone, 'await_neighborhood', temp);
    return { type: 'text', text: 'Informe seu bairro.' };
  }
  if (current === 'await_neighborhood') {
    temp.neighborhood = text.trim();
    await upsertState(phone, 'await_reason', temp);
    return { type: 'text', text: 'Qual o motivo da consulta?' };
  }
  if (current === 'await_reason') {
    temp.reason = text.trim();
    const slots = await getAvailableSlots(temp.event.id);
    if (!slots.length) {
      return { type: 'text', text: 'Sem horários disponíveis.' };
    }
    temp.slots = slots;
    await upsertState(phone, 'await_slot', temp);
    const opts = slots.map(s => ({ id: String(s.id), title: `${s.slot_date} ${s.slot_time}` }));
    return { type: 'options', title: 'Escolha um horário', options: opts };
  }
  if (current === 'await_slot') {
    const chosen = (temp.slots || []).find(s => String(s.id) === String(text).trim());
    const [patient] = await pool.query('SELECT id FROM patients WHERE whatsapp_number = ?', [phone]);
    let patientId = patient[0] && patient[0].id;
    if (!patientId) {
      const saved = await savePatient({ full_name: temp.full_name, whatsapp_number: phone, city: temp.city.name, neighborhood: temp.neighborhood, reason: temp.reason });
      patientId = saved.id;
    }
    const appt = await saveAppointment(patientId, temp.event.id, chosen ? chosen.id : parseInt(text, 10));
    await resetState(phone);
    return { type: 'final', appointment: appt };
  }
  await resetState(phone);
  return { type: 'text', text: 'Vamos começar. Qual é sua cidade?' };
}

async function handleIncomingMessage(phone, text) {
  const state = await getState(phone);
  return handleStep(phone, text, state);
}

async function processUserMessage(from, text) {
  console.log("BOT RECEIVED TEXT:", text);
  const reply = await generateGPTReply(text);
  const safe = (reply || '').trim();
  return { type: 'text', text: safe || 'Desculpe, não consegui responder agora.' };
}

async function generateGPTReply(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return 'Configuração inválida: OPENAI_API_KEY ausente.';
  }
  const payload = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Você é um assistente do Mutirão de Saúde. Responda de forma curta e clara em português.' },
      { role: 'user', content: prompt }
    ]
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

module.exports = { handleIncomingMessage, handleStep, resetState, detectCity, getEventForCity, getAvailableSlots, savePatient, saveAppointment, logMessage, sendText, sendOptions, sendFinalConfirmation, processUserMessage, generateGPTReply };

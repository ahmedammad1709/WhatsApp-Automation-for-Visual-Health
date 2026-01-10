import cron from 'node-cron';
import pool from '../config/db.js';
import { sendText, sendTemplate } from '../whatsapp/sendMessage.js';

const CRON_EXPRESSION = process.env.REMINDER_24H_CRON || '5 * * * *'; // hourly at minute 5
const TEMPLATE_NAME = process.env.WHATSAPP_REMINDER_TEMPLATE_NAME || null;
const TEMPLATE_LANG = process.env.WHATSAPP_REMINDER_TEMPLATE_LANG || 'pt_BR';
const PHONE_ID_OVERRIDE = process.env.WHATSAPP_PHONE_NUMBER_ID; // optional override

/**
 * Ensures reminder columns exist on appointments table to avoid duplicate sends.
 */
async function ensureReminderColumns() {
  try {
    await pool.query(`ALTER TABLE appointments ADD COLUMN reminder_24h_sent TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e) {
    // Ignore duplicate column error
    if (e.code !== 'ER_DUP_FIELDNAME') {
      console.error('[REMINDER 24H] Failed to add reminder_24h_sent column:', e);
    }
  }

  try {
    await pool.query(`ALTER TABLE appointments ADD COLUMN reminder_24h_sent_at DATETIME NULL`);
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') {
      console.error('[REMINDER 24H] Failed to add reminder_24h_sent_at column:', e);
    }
  }
}

function getToday(simulatedDateStr) {
  if (simulatedDateStr) {
    const d = new Date(`${simulatedDateStr}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateBR(dateStr) {
  // Manual formatting to avoid timezone issues
  // dateStr is likely a Date object or a string "YYYY-MM-DD"
  let dateObj = dateStr;
  if (typeof dateStr === 'string') {
    dateObj = new Date(dateStr);
  }
  
  if (dateObj instanceof Date && !isNaN(dateObj)) {
     const year = dateObj.getFullYear();
     const month = String(dateObj.getMonth() + 1).padStart(2, '0');
     const day = String(dateObj.getDate()).padStart(2, '0');
     // If dateStr was YYYY-MM-DD string, the Date constructor might treat it as UTC
     // which leads to previous day in local time.
     // Safer to just parse the string if it's available.
  }

  // Best approach: if it comes from MySQL date column, it might be a Date object in local time or UTC.
  // Let's assume input is either YYYY-MM-DD string or Date object.
  // If it's a Date object from mysql2 driver for a DATE column, it usually represents local midnight.
  
  // To be absolutely safe with "YYYY-MM-DD" from DB:
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
  }
  
  // If it's a Date object
  if (dateObj instanceof Date) {
      // Use toISOString and split if we want to ignore timezone (assuming UTC date in DB)
      // But mysql2 often converts to local time.
      // Let's rely on string formatting if possible.
      try {
          return dateObj.toLocaleDateString('pt-BR');
      } catch (e) {
          return dateStr;
      }
  }
  
  return String(dateStr);
}

// Improved version that handles both string and Date object from MySQL
function safeDateBR(val) {
    if (!val) return '';
    if (val instanceof Date) {
        // Fix for the timezone issue: treat UTC date as local date components
        return val.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [y, m, d] = val.split('T')[0].split('-');
        return `${d}/${m}/${y}`;
    }
    return String(val);
}

async function fetchAppointmentsForDate(targetDateStr) {
  // targetDateStr is YYYY-MM-DD
  const [rows] = await pool.query(
    `SELECT 
        a.id,
        a.status,
        a.reminder_24h_sent,
        a.reminder_24h_sent_at,
        p.full_name,
        p.whatsapp_number AS phone,
        a.appointment_date,
        e.location,
        c.name AS city_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN events e ON e.id = a.event_id
     JOIN cities c ON c.id = e.city_id
     WHERE a.status = 'scheduled'
       AND a.appointment_date = ?
       AND (a.reminder_24h_sent IS NULL OR a.reminder_24h_sent = 0)`,
    [targetDateStr]
  );
  
  // Format dates in the rows to be safe strings
  return rows.map(row => ({
      ...row,
      formatted_date: safeDateBR(row.appointment_date)
  }));
}

async function getLastInboundTimestamp(phone) {
  const [rows] = await pool.query(
    `SELECT created_at 
       FROM conversation_logs 
      WHERE whatsapp_number = ? AND direction = 'in'
      ORDER BY created_at DESC
      LIMIT 1`,
    [phone]
  );
  return rows.length ? new Date(rows[0].created_at) : null;
}

function buildReminderMessage(appt) {
  const date = appt.formatted_date || safeDateBR(appt.appointment_date);
  return `Olá, ${appt.full_name}! Aqui é o Instituto Luz no Caminho. Lembrete da sua consulta amanhã, ${date}, em ${appt.location}, ${appt.city_name}. Se precisar reagendar, responda por aqui.`;
}

async function markReminderSent(apptId) {
  await pool.query(
    'UPDATE appointments SET reminder_24h_sent = 1, reminder_24h_sent_at = NOW() WHERE id = ?',
    [apptId]
  );
}

async function sendReminder(appt) {
  const now = new Date();
  const lastInbound = await getLastInboundTimestamp(appt.phone);
  const within24h = lastInbound ? (now - lastInbound) <= 24 * 3600000 : false;
  const message = buildReminderMessage(appt);

  try {
    if (within24h) {
      console.log(`[REMINDER 24H] Sending text (within 24h window) to ${appt.phone}`);
      await sendText(appt.phone, message, PHONE_ID_OVERRIDE);
    } else {
      if (!TEMPLATE_NAME) {
        console.warn(`[REMINDER 24H] Skipping ${appt.phone} - outside 24h window and WHATSAPP_REMINDER_TEMPLATE_NAME not set.`);
        return false;
      }
      console.log(`[REMINDER 24H] Sending template (outside 24h window) to ${appt.phone}`);
      const date = formatDateBR(appt.appointment_date);
      await sendTemplate(
        appt.phone,
        TEMPLATE_NAME,
        [appt.full_name, date, appt.location, appt.city_name],
        TEMPLATE_LANG,
        PHONE_ID_OVERRIDE
      );
    }

    await markReminderSent(appt.id);
    console.log(`[REMINDER 24H] Reminder sent and marked for appointment ${appt.id}`);
    return true;
  } catch (err) {
    console.error(`[REMINDER 24H] Failed to send reminder for appointment ${appt.id}:`, err);
    return false;
  }
}

async function runOnce({ simulateToday } = {}) {
  await ensureReminderColumns();

  const today = getToday(simulateToday || process.env.REMINDER_SIMULATED_TODAY);
  const targetDate = addDays(today, 1);
  
  // Fix: Use local date components to avoid timezone shift when converting to string
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  const targetDateStr = `${y}-${m}-${d}`;

  console.log(`[REMINDER 24H] Running job for target date ${targetDateStr}${simulateToday ? ` (simulated today: ${simulateToday})` : ''}`);

  const appointments = await fetchAppointmentsForDate(targetDateStr);
  console.log(`[REMINDER 24H] Appointments found: ${appointments.length}`);

  for (const appt of appointments) {
    await sendReminder(appt);
  }
}

function schedule() {
  console.log(`[REMINDER 24H] Scheduling cron with expression "${CRON_EXPRESSION}"`);
  cron.schedule(CRON_EXPRESSION, () => runOnce().catch(err => console.error('[REMINDER 24H] Job error:', err)));
}

export { schedule, runOnce };
export default { schedule, runOnce };
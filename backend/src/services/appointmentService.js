import pool from '../config/db.js';

async function createAppointment({ patient_id, event_id, appointment_date, status }) {
  const [result] = await pool.query(
    'INSERT INTO appointments (patient_id, event_id, appointment_date, status, created_at) VALUES (?, ?, ?, ?, NOW())',
    [patient_id, event_id, appointment_date, status || 'scheduled']
  );
  return { id: result.insertId, patient_id, event_id, appointment_date, status: status || 'scheduled' };
}

async function listAppointmentsByEvent(event_id) {
  const [rows] = await pool.query(
    `SELECT a.id, a.patient_id, a.event_id, a.appointment_date, a.status, a.created_at,
            p.full_name AS patient_name, p.whatsapp_number,
            e.location, e.start_date, e.end_date,
            c.name AS city_name
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id
     LEFT JOIN events e ON e.id = a.event_id
     LEFT JOIN cities c ON c.id = e.city_id
     WHERE a.event_id = ?
     ORDER BY a.appointment_date ASC, a.created_at ASC`,
    [event_id]
  );
  return rows;
}

async function deleteAppointment(id) {
  const [delRes] = await pool.query('DELETE FROM appointments WHERE id = ?', [id]);
  return delRes.affectedRows > 0;
}

async function getAllAppointments() {
  const [rows] = await pool.query(
    `SELECT a.id, a.patient_id, a.event_id, a.appointment_date, a.status, a.created_at,
            p.full_name AS patient_name, p.whatsapp_number, p.city, p.neighborhood,
            e.location, e.start_date, e.end_date,
            c.name AS city_name
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id
     LEFT JOIN events e ON e.id = a.event_id
     LEFT JOIN cities c ON c.id = e.city_id
     ORDER BY a.created_at DESC`
  );
  return rows;
}

async function updateAppointmentStatus(id, status) {
  const [result] = await pool.query(
    'UPDATE appointments SET status = ? WHERE id = ?',
    [status, id]
  );
  return result.affectedRows > 0;
}

async function getSentReminders() {
  const [rows] = await pool.query(
    `SELECT a.id, a.patient_id, a.event_id, a.appointment_date, a.status, 
            a.reminder_24h_sent, a.reminder_24h_sent_at,
            p.full_name AS patient_name, p.whatsapp_number,
            e.location,
            c.name AS city_name
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id
     LEFT JOIN events e ON e.id = a.event_id
     LEFT JOIN cities c ON c.id = e.city_id
     WHERE a.reminder_24h_sent = 1
     ORDER BY a.reminder_24h_sent_at DESC`
  );
  return rows;
}

async function markReminderForLatestAppointmentByPhone(phone) {
  const [rows] = await pool.query(
    `SELECT a.id 
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
      WHERE p.whatsapp_number = ?
      ORDER BY a.appointment_date DESC, a.created_at DESC
      LIMIT 1`,
    [phone]
  );
  if (!rows.length) return false;
  const apptId = rows[0].id;
  await pool.query(
    'UPDATE appointments SET reminder_24h_sent = 1, reminder_24h_sent_at = NOW() WHERE id = ?',
    [apptId]
  );
  return true;
}

export { createAppointment, listAppointmentsByEvent, deleteAppointment, getAllAppointments, updateAppointmentStatus, getSentReminders, markReminderForLatestAppointmentByPhone };

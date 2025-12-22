import pool from '../config/db.js';

async function createAppointment({ patient_id, event_id, time_slot_id, status }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO appointments (patient_id, event_id, time_slot_id, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [patient_id, event_id, time_slot_id, status || 'scheduled']
    );
    await conn.query('UPDATE time_slots SET reserved_count = reserved_count + 1 WHERE id = ?', [time_slot_id]);
    await conn.commit();
    return { id: result.insertId, patient_id, event_id, time_slot_id, status: status || 'scheduled' };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function listAppointmentsByEvent(event_id) {
  const [rows] = await pool.query(
    `SELECT a.id, a.patient_id, a.event_id, a.time_slot_id, a.status, a.created_at,
            p.full_name AS patient_name, p.whatsapp_number,
            ts.slot_date, ts.slot_time
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id
     LEFT JOIN time_slots ts ON ts.id = a.time_slot_id
     WHERE a.event_id = ?
     ORDER BY ts.slot_date ASC, ts.slot_time ASC`,
    [event_id]
  );
  return rows;
}

async function deleteAppointment(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT time_slot_id FROM appointments WHERE id = ?', [id]);
    const appt = rows[0];
    if (!appt) {
      await conn.rollback();
      return false;
    }
    const timeSlotId = appt.time_slot_id;
    const [delRes] = await conn.query('DELETE FROM appointments WHERE id = ?', [id]);
    if (delRes.affectedRows > 0) {
      await conn.query('UPDATE time_slots SET reserved_count = GREATEST(reserved_count - 1, 0) WHERE id = ?', [timeSlotId]);
      await conn.commit();
      return true;
    }
    await conn.rollback();
    return false;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function getAllAppointments() {
  const [rows] = await pool.query(
    `SELECT a.id, a.patient_id, a.event_id, a.time_slot_id, a.status, a.created_at,
            p.full_name AS patient_name, p.whatsapp_number, p.city, p.neighborhood,
            ts.slot_date, ts.slot_time,
            e.location, e.start_date, e.end_date,
            c.name AS city_name
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id
     LEFT JOIN time_slots ts ON ts.id = a.time_slot_id
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

export { createAppointment, listAppointmentsByEvent, deleteAppointment, getAllAppointments, updateAppointmentStatus };
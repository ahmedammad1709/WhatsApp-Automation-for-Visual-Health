const pool = require('../config/db');

async function listByEvent(event_id) {
  const [rows] = await pool.query(
    'SELECT id, event_id, slot_date, slot_time, max_per_slot, reserved_count, created_at FROM time_slots WHERE event_id = ? ORDER BY slot_date ASC, slot_time ASC',
    [event_id]
  );
  return rows;
}

async function createTimeSlot({ event_id, slot_date, slot_time, max_per_slot }) {
  const [result] = await pool.query(
    'INSERT INTO time_slots (event_id, slot_date, slot_time, max_per_slot, reserved_count, created_at) VALUES (?, ?, ?, ?, 0, NOW())',
    [event_id, slot_date, slot_time, max_per_slot]
  );
  return { id: result.insertId, event_id, slot_date, slot_time, max_per_slot };
}

async function deleteTimeSlot(id) {
  const [result] = await pool.query('DELETE FROM time_slots WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function getAllTimeSlots() {
  const [rows] = await pool.query(
    `SELECT ts.id, ts.event_id, ts.slot_date, ts.slot_time, ts.max_per_slot, ts.reserved_count, ts.created_at,
            e.location, e.start_date, e.end_date,
            c.name AS city_name
     FROM time_slots ts
     LEFT JOIN events e ON e.id = ts.event_id
     LEFT JOIN cities c ON c.id = e.city_id
     ORDER BY ts.slot_date ASC, ts.slot_time ASC`
  );
  return rows;
}

module.exports = { listByEvent, createTimeSlot, deleteTimeSlot, getAllTimeSlots };
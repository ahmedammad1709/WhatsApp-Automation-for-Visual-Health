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

module.exports = { listByEvent, createTimeSlot, deleteTimeSlot };
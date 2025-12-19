const pool = require('../config/db');

async function listEvents() {
  const [rows] = await pool.query(
    'SELECT id, city_id, location, start_date, end_date, max_capacity, notes, created_at FROM events ORDER BY start_date DESC'
  );
  return rows;
}

async function createEvent({ city_id, location, start_date, end_date, max_capacity, notes }) {
  const [result] = await pool.query(
    'INSERT INTO events (city_id, location, start_date, end_date, max_capacity, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [city_id, location, start_date, end_date, max_capacity, notes || null]
  );
  return { id: result.insertId, city_id, location, start_date, end_date, max_capacity, notes: notes || null };
}

async function deleteEvent(id) {
  const [result] = await pool.query('DELETE FROM events WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function listEventsByCity(city_id) {
  const [rows] = await pool.query(
    'SELECT id, city_id, location, start_date, end_date, max_capacity, notes, created_at FROM events WHERE city_id = ? ORDER BY start_date DESC',
    [city_id]
  );
  return rows;
}

module.exports = { listEvents, createEvent, deleteEvent, updateEvent, listEventsByCity };
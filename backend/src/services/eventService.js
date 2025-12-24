import pool from '../config/db.js';

async function listEvents() {
  const [rows] = await pool.query(
    'SELECT id, city_id, location, start_date, end_date, max_capacity, notes, created_at FROM events ORDER BY start_date DESC'
  );
  return rows;
}

// Date-only events: no time slots
async function createEvent({ city_id, location, start_date, end_date, max_capacity, notes }) {
  const [result] = await pool.query(
    'INSERT INTO events (city_id, location, start_date, end_date, max_capacity, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [city_id, location, start_date, end_date, max_capacity, notes || null]
  );
  const eventId = result.insertId;
  return { id: eventId, city_id, location, start_date, end_date, max_capacity, notes: notes || null };
}

async function deleteEvent(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Delete Appointments linked to this event
    await connection.query('DELETE FROM appointments WHERE event_id = ?', [id]);

    // 2. Delete Event
    const [result] = await connection.query('DELETE FROM events WHERE id = ?', [id]);
    
    await connection.commit();
    return result.affectedRows > 0;
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

async function listEventsByCity(city_id) {
  const [rows] = await pool.query(
    'SELECT id, city_id, location, start_date, end_date, max_capacity, notes, created_at FROM events WHERE city_id = ? ORDER BY start_date DESC',
    [city_id]
  );
  return rows;
}

async function updateEvent(id, { city_id, location, start_date, end_date, max_capacity, notes }) {
  const [result] = await pool.query(
    'UPDATE events SET city_id = ?, location = ?, start_date = ?, end_date = ?, max_capacity = ?, notes = ? WHERE id = ?',
    [city_id, location, start_date, end_date, max_capacity, notes || null, id]
  );
  if (result.affectedRows > 0) {
    return { id, city_id, location, start_date, end_date, max_capacity, notes: notes || null };
  }
  return null;
}

export { listEvents, createEvent, deleteEvent, updateEvent, listEventsByCity };
const pool = require('../config/db');

async function listEvents() {
  const [rows] = await pool.query(
    'SELECT id, city_id, location, start_date, end_date, max_capacity, notes, created_at FROM events ORDER BY start_date DESC'
  );
  return rows;
}

async function createEvent({ city_id, location, start_date, end_date, max_capacity, notes, startTime, endTime }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Create Event
    const [result] = await connection.query(
      'INSERT INTO events (city_id, location, start_date, end_date, max_capacity, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [city_id, location, start_date, end_date, max_capacity, notes || null]
    );
    const eventId = result.insertId;

    // 2. Create Time Slots (if times provided)
    if (startTime && endTime) {
      const slots = [];
      const start = new Date(start_date);
      const end = new Date(end_date);
      
      // Convert "09:00 AM" -> "09:00:00"
      const formatTime = (timeStr) => {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') {
          hours = '00';
        }
        if (modifier === 'PM') {
          hours = parseInt(hours, 10) + 12;
        }
        return `${hours}:${minutes}:00`;
      };
      
      const sqlTime = formatTime(startTime);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const slotDate = d.toISOString().split('T')[0];
        slots.push([eventId, slotDate, sqlTime, max_capacity, 0]);
      }

      if (slots.length > 0) {
        await connection.query(
          'INSERT INTO time_slots (event_id, slot_date, slot_time, max_per_slot, reserved_count, created_at) VALUES ?',
          [slots.map(s => [...s, new Date()])]
        );
      }
    }

    await connection.commit();
    return { id: eventId, city_id, location, start_date, end_date, max_capacity, notes: notes || null };
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
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

module.exports = { listEvents, createEvent, deleteEvent, updateEvent, listEventsByCity };
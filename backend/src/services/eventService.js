import pool from '../config/db.js';

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
      
      const sqlStartTime = formatTime(startTime);
      const sqlEndTime = formatTime(endTime);

      // Generate 30-minute slots for each day in the range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const currentDateStr = d.toISOString().split('T')[0];
        
        // Create Date objects for time comparison logic
        // We use a dummy date (e.g., 1970-01-01) or the current date to step through times
        // But simpler: just manipulate the hours/minutes
        
        let [startH, startM] = sqlStartTime.split(':').map(Number);
        let [endH, endM] = sqlEndTime.split(':').map(Number);
        
        // Current time pointer (in minutes from midnight)
        let currentMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        while (currentMinutes < endMinutes) {
          const h = Math.floor(currentMinutes / 60);
          const m = currentMinutes % 60;
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
          
          slots.push([eventId, currentDateStr, timeStr, max_capacity, 0]);
          
          currentMinutes += 30; // Increment by 30 minutes
        }
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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Delete Appointments linked to this event
    await connection.query('DELETE FROM appointments WHERE event_id = ?', [id]);

    // 2. Delete Time Slots linked to this event
    await connection.query('DELETE FROM time_slots WHERE event_id = ?', [id]);

    // 3. Delete Event
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
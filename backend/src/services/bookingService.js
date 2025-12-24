import pool from '../config/db.js';

/**
 * Transactional booking logic (DATE-ONLY, NO TIME SLOTS)
 */
async function bookAppointment({ whatsapp_number, full_name, city, neighborhood, reason, event_id, appointment_date }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Manage Patient
    let patientId;
    const [existingPatients] = await connection.query(
      'SELECT id FROM patients WHERE whatsapp_number = ?',
      [whatsapp_number]
    );

    if (existingPatients.length > 0) {
      patientId = existingPatients[0].id;
      // If patient exists: reuse existing patient ID without overwriting details
    } else {
      const [createResult] = await connection.query(
        'INSERT INTO patients (whatsapp_number, full_name, city, neighborhood, reason, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [whatsapp_number, full_name || 'WhatsApp User', city, neighborhood, reason]
      );
      patientId = createResult.insertId;
    }

    // 2. Validate event and date range
    const [[event]] = await connection.query(
      'SELECT id, city_id, location, start_date, end_date, max_capacity FROM events WHERE id = ?',
      [event_id]
    );

    if (!event) {
      throw new Error('EVENT_NOT_FOUND');
    }

    const dateOnly = new Date(appointment_date);
    if (Number.isNaN(dateOnly.getTime())) {
      throw new Error('INVALID_APPOINTMENT_DATE');
    }
    const dateStr = dateOnly.toISOString().split('T')[0];

    if (dateStr < event.start_date || dateStr > event.end_date) {
      throw new Error('DATE_OUT_OF_RANGE');
    }

    // 3. Capacity check per event/date
    const [[countRow]] = await connection.query(
      'SELECT COUNT(*) AS count FROM appointments WHERE event_id = ? AND appointment_date = ? AND status != "cancelled"',
      [event_id, dateStr]
    );

    if (countRow.count >= event.max_capacity) {
      throw new Error('EVENT_FULL');
    }

    // 4. Prevent duplicate booking for same patient/event/date
    const [existingAppt] = await connection.query(
      'SELECT id FROM appointments WHERE patient_id = ? AND event_id = ? AND appointment_date = ? AND status != "cancelled"',
      [patientId, event_id, dateStr]
    );

    if (existingAppt.length > 0) {
      throw new Error('ALREADY_BOOKED');
    }

    // 5. Create Appointment
    const [apptResult] = await connection.query(
      'INSERT INTO appointments (patient_id, event_id, appointment_date, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [patientId, event_id, dateStr, 'scheduled']
    );

    // Fetch city name for confirmation message
    const [[cityRow]] = await connection.query(
      'SELECT name FROM cities WHERE id = ?',
      [event.city_id]
    );

    await connection.commit();

    return {
      appointmentId: apptResult.insertId,
      appointment_date: dateStr,
      location: event.location,
      city_name: cityRow?.name || city
    };

  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

export { bookAppointment };

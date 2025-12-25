import pool from '../config/db.js';

export const getReportStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Total Appointments (All time)
    const [totalApptsResult] = await pool.query('SELECT COUNT(*) as count FROM appointments');
    const totalAppointments = totalApptsResult[0].count;

    // 2. Active Events (End date >= today)
    const [activeEventsResult] = await pool.query('SELECT COUNT(*) as count FROM events WHERE end_date >= ?', [today]);
    const activeEvents = activeEventsResult[0].count;

    // 3. Cities Covered (Cities with at least one event)
    const [citiesResult] = await pool.query('SELECT COUNT(DISTINCT city_id) as count FROM events');
    const citiesCovered = citiesResult[0].count;

    // 4. Average Conversion (Unique Patients / Unique WhatsApp Contacts)
    // This is a rough proxy for "Lead to Patient" conversion
    const [patientsResult] = await pool.query('SELECT COUNT(*) as count FROM patients');
    const [contactsResult] = await pool.query('SELECT COUNT(DISTINCT whatsapp_number) as count FROM conversation_logs');
    
    const patientsCount = patientsResult[0].count;
    const contactsCount = contactsResult[0].count;
    const conversionRate = contactsCount > 0 ? ((patientsCount / contactsCount) * 100).toFixed(1) : 0;

    res.json({
      totalAppointments,
      activeEvents,
      citiesCovered,
      conversionRate
    });

  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReportCharts = async (req, res) => {
  try {
    const today = new Date();
    
    // 1. Appointments by City (Bar Chart)
    const [byCity] = await pool.query(`
      SELECT c.name as city, COUNT(a.id) as appointments
      FROM appointments a
      JOIN events e ON a.event_id = e.id
      JOIN cities c ON e.city_id = c.id
      GROUP BY c.name
      ORDER BY appointments DESC
    `);

    // 2. Appointments by Status (Pie Chart)
    const [byStatus] = await pool.query(`
      SELECT status, COUNT(*) as value
      FROM appointments
      GROUP BY status
    `);

    // 3. Daily Performance (Last 5 days)
    const dailyPerformance = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Appointments for this date
      const [appts] = await pool.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('scheduled', 'confirmed') THEN 1 ELSE 0 END) as confirmed
         FROM appointments 
         WHERE appointment_date = ?`, 
        [dateStr]
      );
      
      const total = appts[0].total;
      const confirmed = appts[0].confirmed || 0;
      
      // Calculate capacity for this date (Sum of capacities of events active on this date)
      // Note: This is simplified. Ideally we'd subtract existing bookings, but "remaining capacity" usually implies available slots.
      // Let's calculate "Total Capacity" for events active on this date
      const [capacityResult] = await pool.query(
        `SELECT SUM(max_capacity) as total_cap 
         FROM events 
         WHERE start_date <= ? AND end_date >= ?`,
        [dateStr, dateStr]
      );
      const totalCapacity = capacityResult[0].total_cap || 0;
      const remainingCapacity = Math.max(0, totalCapacity - confirmed);

      dailyPerformance.push({
        date: dateStr,
        day: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : date.toLocaleDateString('en-US', { weekday: 'long' }),
        totalAppointments: total,
        confirmedAppointments: confirmed,
        conversionRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
        remainingCapacity
      });
    }

    res.json({
      appointmentsByCity: byCity,
      appointmentsByStatus: byStatus, // For Pie Chart
      dailyPerformance // For Table
    });

  } catch (error) {
    console.error('Error fetching report charts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

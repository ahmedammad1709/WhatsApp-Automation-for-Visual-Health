import pool from '../config/db.js';

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Total Appointments Today
    const [todayAppts] = await pool.query(
      'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?',
      [today]
    );
    const todayCount = todayAppts[0].count;

    // 2. Confirmed Appointments (Total)
    const [confirmedAppts] = await pool.query(
      "SELECT COUNT(*) as count FROM appointments WHERE status = 'scheduled' OR status = 'confirmed'"
    );
    const confirmedCount = confirmedAppts[0].count;

    // 3. Pending Capacity (Total Capacity - Total Scheduled)
    // First get total capacity from future events
    const [capacityResult] = await pool.query(
      'SELECT SUM(max_capacity) as total_capacity FROM events WHERE end_date >= ?',
      [today]
    );
    const totalCapacity = capacityResult[0].total_capacity || 0;

    // Get appointments for future events
    const [futureAppts] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM appointments a 
       JOIN events e ON a.event_id = e.id 
       WHERE e.end_date >= ?`,
      [today]
    );
    const futureApptsCount = futureAppts[0].count;
    const pendingCapacity = Math.max(0, totalCapacity - futureApptsCount);

    // 4. Conversion Rate
    // (Unique Patients / Unique Phone Numbers in Logs) * 100
    const [patientsCount] = await pool.query('SELECT COUNT(*) as count FROM patients');
    const [uniqueContacts] = await pool.query('SELECT COUNT(DISTINCT whatsapp_number) as count FROM conversation_logs');
    
    const pCount = patientsCount[0].count;
    const cCount = uniqueContacts[0].count;
    
    const conversionRate = cCount > 0 ? ((pCount / cCount) * 100).toFixed(1) : 0;

    res.json({
      todayAppointments: todayCount,
      confirmedAppointments: confirmedCount,
      pendingCapacity: pendingCapacity,
      conversionRate: conversionRate
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDashboardCharts = async (req, res) => {
  try {
    // 1. Appointments by City
    const [byCity] = await pool.query(`
      SELECT c.name as city, COUNT(a.id) as appointments
      FROM appointments a
      JOIN events e ON a.event_id = e.id
      JOIN cities c ON c.id = e.city_id
      GROUP BY c.name
      ORDER BY appointments DESC
      LIMIT 10
    `);

    // 2. Appointments by Date (Last 7 days)
    // Since we don't have hours, we show daily trend
    const [byDate] = await pool.query(`
      SELECT DATE_FORMAT(appointment_date, '%Y-%m-%d') as date, COUNT(*) as appointments
      FROM appointments
      WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY appointment_date
      ORDER BY appointment_date ASC
    `);

    // Format dates nicely
    const formattedByDate = byDate.map(item => ({
      date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      appointments: item.appointments
    }));

    res.json({
      appointmentsByCity: byCity,
      appointmentsByDate: formattedByDate // Replacing appointmentsByHour
    });

  } catch (error) {
    console.error('Error fetching dashboard charts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

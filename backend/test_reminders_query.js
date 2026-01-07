import 'dotenv/config';
import pool from './src/config/db.js';

async function checkReminders() {
  console.log('Testing getSentReminders query...');
  
  const query = `
    SELECT 
      a.id,
      p.full_name as patient_name,
      p.whatsapp_number,
      a.appointment_date,
      a.reminder_24h_sent_at,
      e.location,
      c.name as city_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN events e ON e.id = a.event_id
    JOIN cities c ON c.id = e.city_id
    WHERE a.reminder_24h_sent = 1
    ORDER BY a.reminder_24h_sent_at DESC
  `;

  const [rows] = await pool.query(query);
  console.log(`Found ${rows.length} sent reminders.`);
  if (rows.length > 0) {
    console.log('First reminder:', rows[0]);
  }
  
  process.exit();
}

checkReminders();

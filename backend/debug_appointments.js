import 'dotenv/config';
import pool from './src/config/db.js';

async function check() {
  const targetDateStr = '2026-01-08';
  console.log('Checking for date:', targetDateStr);

  const [patient] = await pool.query('SELECT whatsapp_number FROM patients WHERE id = 5');
  const phone = patient[0].whatsapp_number;
  console.log('Inserting fake inbound message for:', phone);
  
  await pool.query(
      'INSERT INTO conversation_logs (patient_phone, message_in, created_at) VALUES (?, ?, NOW())',
      [phone, 'Test inbound']
  );
  console.log('Inserted.');
  process.exit();
}

check();

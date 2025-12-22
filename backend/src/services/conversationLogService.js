import pool from '../config/db.js';

async function getAllConversationLogs() {
  const [rows] = await pool.query(
    'SELECT id, patient_phone, message_in, message_out, created_at FROM conversation_logs ORDER BY created_at DESC'
  );
  return rows;
}

async function getConversationLogsByPhone(phone) {
  const [rows] = await pool.query(
    'SELECT id, patient_phone, message_in, message_out, created_at FROM conversation_logs WHERE patient_phone = ? ORDER BY created_at DESC',
    [phone]
  );
  return rows;
}

export { getAllConversationLogs, getConversationLogsByPhone };


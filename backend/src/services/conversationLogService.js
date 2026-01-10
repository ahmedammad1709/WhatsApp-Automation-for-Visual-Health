import pool from '../config/db.js';

async function getAllConversationLogs() {
  const [rows] = await pool.query(
    'SELECT id, whatsapp_number, direction, message, created_at FROM conversation_logs ORDER BY created_at DESC'
  );
  
  return rows.map(row => ({
    id: row.id,
    whatsapp_number: row.whatsapp_number,
    message_in: row.direction === 'in' ? row.message : null,
    message_out: row.direction === 'out' ? row.message : null,
    created_at: row.created_at
  }));
}

async function getConversationLogsByPhone(phone) {
  const [rows] = await pool.query(
    'SELECT id, whatsapp_number, direction, message, created_at FROM conversation_logs WHERE whatsapp_number = ? ORDER BY created_at DESC',
    [phone]
  );
  
  return rows.map(row => ({
    id: row.id,
    whatsapp_number: row.whatsapp_number,
    message_in: row.direction === 'in' ? row.message : null,
    message_out: row.direction === 'out' ? row.message : null,
    created_at: row.created_at
  }));
}

export { getAllConversationLogs, getConversationLogsByPhone };


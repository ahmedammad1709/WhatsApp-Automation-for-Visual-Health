const cron = require('node-cron');
const pool = require('../config/db');
const { sendText } = require('../whatsapp/sendMessage');

function schedule() {
  cron.schedule('0 9 * * *', async () => {
    const [events] = await pool.query('SELECT id, end_date FROM events');
    const now = new Date();
    for (const e of events) {
      const end = new Date(`${e.end_date}T23:59:59`);
      const diffD = Math.floor((now - end) / 86400000);
      if (diffD === 1) {
        const [rows] = await pool.query(
          `SELECT p.whatsapp_number AS phone
           FROM appointments a
           LEFT JOIN patients p ON p.id = a.patient_id
           WHERE a.event_id = ?`,
          [e.id]
        );
        for (const r of rows) {
          await sendText(r.phone, 'Obrigado por participar do mutirão. [THANKS]');
        }
      }
    }
  });
}

module.exports = { schedule };
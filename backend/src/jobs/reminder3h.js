import cron from 'node-cron';
import pool from '../config/db.js';
import { sendText } from '../whatsapp/sendMessage.js';

function schedule() {
  cron.schedule('*/15 * * * *', async () => {
    const [rows] = await pool.query(
      `SELECT a.id, p.whatsapp_number AS phone, ts.slot_date, ts.slot_time, e.location, c.name AS city_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN time_slots ts ON ts.id = a.time_slot_id
       LEFT JOIN events e ON e.id = a.event_id
       LEFT JOIN cities c ON c.id = e.city_id`
    );
    const now = new Date();
    for (const r of rows) {
      const dt = new Date(`${r.slot_date}T${r.slot_time}:00`);
      const diffH = (dt - now) / 3600000;
      if (diffH > 2.5 && diffH < 3.5) {
        const text = `Estamos te esperando: ${r.slot_date} ${r.slot_time} em ${r.location} - ${r.city_name} [REMINDER3H]`;
        await sendText(r.phone, text);
      }
    }
  });
}

export { schedule };
export default { schedule };
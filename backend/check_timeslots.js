import pool from './src/config/db.js';

async function checkTimeSlots() {
  try {
    console.log('\n--- Time Slots Table ---');
    const [timeSlots] = await pool.query('DESCRIBE time_slots');
    console.log(timeSlots);
    process.exit(0);
  } catch (error) {
    console.error('Error or table does not exist:', error.message);
    process.exit(1);
  }
}

checkTimeSlots();

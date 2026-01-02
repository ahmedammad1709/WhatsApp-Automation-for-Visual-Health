import pool from './src/config/db.js';

async function checkSchema() {
  try {
    console.log('--- Patients Table ---');
    const [patients] = await pool.query('DESCRIBE patients');
    console.log(patients);

    console.log('\n--- Appointments Table ---');
    const [appointments] = await pool.query('DESCRIBE appointments');
    console.log(appointments);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkSchema();

const pool = require('./src/config/db');

async function checkSchema() {
  try {
    const [rows] = await pool.query('DESCRIBE whatsapp_sessions');
    console.log('Current Schema:', rows);
    process.exit(0);
  } catch (error) {
    console.error('Error describing table:', error);
    process.exit(1);
  }
}

checkSchema();

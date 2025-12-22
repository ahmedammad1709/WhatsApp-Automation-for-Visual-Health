import pool from './src/config/db.js';
import 'dotenv/config';

async function check() {
  try {
    console.log('Checking DB connection...');
    const [rows] = await pool.query('SELECT 1');
    console.log('DB Connection OK:', rows);

    console.log('Checking cities...');
    const [cities] = await pool.query('SELECT * FROM cities');
    console.log('Cities count:', cities.length);
    console.log('Cities data:', cities);

    console.log('Checking events...');
    const [events] = await pool.query('SELECT * FROM events');
    console.log('Events count:', events.length);
    console.log('Events data:', events);

  } catch (e) {
    console.error('DB Check Failed:', e);
  } finally {
    process.exit();
  }
}

check();
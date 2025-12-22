import pool from './src/config/db.js';
import 'dotenv/config';

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log('Dropping old whatsapp_sessions table...');
    await connection.query('DROP TABLE IF EXISTS whatsapp_sessions');

    console.log('Creating new whatsapp_sessions table...');
    await connection.query(`
      CREATE TABLE whatsapp_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        whatsapp_number VARCHAR(50) NOT NULL UNIQUE,
        step VARCHAR(50) NOT NULL,
        full_name VARCHAR(100),
        city VARCHAR(100),
        neighborhood VARCHAR(100),
        reason VARCHAR(255),
        event_id INT,
        session_version INT DEFAULT 1,
        metadata JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Migration successful.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

migrate();

import pool from './src/config/db.js';

const createSettingsTable = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Creating app_settings table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Table created successfully.');
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
};

createSettingsTable();

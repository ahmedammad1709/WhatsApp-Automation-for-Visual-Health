import pool from './src/config/db.js';
import 'dotenv/config';

async function fixSchema() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting DB Schema Fix...');

    // 1. Fix whatsapp_sessions
    console.log('Fixing whatsapp_sessions...');
    await connection.query('DROP TABLE IF EXISTS whatsapp_sessions');
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
    console.log('✓ whatsapp_sessions table recreated with correct schema.');

    // 2. Fix conversation_logs
    console.log('Fixing conversation_logs...');
    // Check if table exists
    const [logsTable] = await connection.query("SHOW TABLES LIKE 'conversation_logs'");
    if (logsTable.length === 0) {
        console.log('conversation_logs does not exist. Creating...');
        await connection.query(`
            CREATE TABLE conversation_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                whatsapp_number VARCHAR(50) NOT NULL,
                direction VARCHAR(10) NOT NULL,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } else {
        console.log('conversation_logs exists. Checking columns...');
        const [columns] = await connection.query("SHOW COLUMNS FROM conversation_logs LIKE 'whatsapp_number'");
        if (columns.length === 0) {
            console.log('Column whatsapp_number missing. Dropping and recreating table to ensure consistency...');
            await connection.query('DROP TABLE conversation_logs');
            await connection.query(`
                CREATE TABLE conversation_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    whatsapp_number VARCHAR(50) NOT NULL,
                    direction VARCHAR(10) NOT NULL,
                    message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } else {
            console.log('conversation_logs seems okay.');
        }
    }
    console.log('✓ conversation_logs checked/fixed.');

    // 3. Ensure patients table exists and has correct columns
    console.log('Checking patients table...');
    const [patientsTable] = await connection.query("SHOW TABLES LIKE 'patients'");
    if (patientsTable.length === 0) {
        console.log('patients table missing. Creating...');
        await connection.query(`
            CREATE TABLE patients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                whatsapp_number VARCHAR(50) NOT NULL UNIQUE,
                full_name VARCHAR(100),
                city VARCHAR(100),
                neighborhood VARCHAR(100),
                reason VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ patients table created.');
    } else {
        console.log('patients table exists.');
    }

    // 4. Ensure appointments table exists (DATE-ONLY, NO TIME SLOTS)
    console.log('Checking appointments table...');
    const [appointmentsTable] = await connection.query("SHOW TABLES LIKE 'appointments'");
    if (appointmentsTable.length === 0) {
        console.log('appointments table missing. Creating...');
        await connection.query(`
            CREATE TABLE appointments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id INT NOT NULL,
                event_id INT NOT NULL,
                appointment_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'scheduled',
                reminder_24h_sent TINYINT(1) NOT NULL DEFAULT 0,
                reminder_24h_sent_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (event_id) REFERENCES events(id)
            )
        `);
        console.log('✓ appointments table created (date-only, no time slots).');
    } else {
        console.log('appointments table exists. Ensuring schema is up to date...');
        // Best-effort migration: drop time_slot_id and add appointment_date if needed
        try {
          const [cols] = await connection.query("SHOW COLUMNS FROM appointments LIKE 'time_slot_id'");
          if (cols.length > 0) {
            console.log('Removing obsolete time_slot_id column from appointments...');
            await connection.query('ALTER TABLE appointments DROP COLUMN time_slot_id');
          }
        } catch (e) {
          console.warn('Could not drop time_slot_id (may not exist):', e.message);
        }
        try {
          const [cols] = await connection.query("SHOW COLUMNS FROM appointments LIKE 'appointment_date'");
          if (cols.length === 0) {
            console.log('Adding appointment_date column to appointments...');
            await connection.query("ALTER TABLE appointments ADD COLUMN appointment_date DATE NOT NULL AFTER event_id");
          }
        } catch (e) {
          console.warn('Could not ensure appointment_date column:', e.message);
        }
    }

    // 5. Remove legacy time_slots table if it still exists
    console.log('Dropping legacy time_slots table if present...');
    await connection.query('DROP TABLE IF EXISTS time_slots');
    // 4. Ensure appointments table exists
    console.log('Checking appointments table...');
    const [appointmentsTable] = await connection.query("SHOW TABLES LIKE 'appointments'");
    if (appointmentsTable.length === 0) {
        console.log('appointments table missing. Creating...');
        await connection.query(`
            CREATE TABLE appointments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id INT NOT NULL,
                event_id INT NOT NULL,
                time_slot_id INT NOT NULL,
                status VARCHAR(50) DEFAULT 'scheduled',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (event_id) REFERENCES events(id),
                FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
            )
        `);
        console.log('✓ appointments table created.');
    } else {
        console.log('appointments table exists.');
    }

    console.log('DB Schema Fix Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error('DB Schema Fix Failed:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

fixSchema();

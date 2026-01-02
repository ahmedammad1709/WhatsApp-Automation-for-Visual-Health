import pool from './src/config/db.js';

async function fixAppointmentsSchema() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting appointments table schema fix...');

    // 1. Check if time_slot_id exists
    const [colsDrop] = await connection.query("SHOW COLUMNS FROM appointments LIKE 'time_slot_id'");
    
    if (colsDrop.length > 0) {
      console.log('time_slot_id exists.');
      
      // Try to drop the known foreign key constraint
      try {
        console.log('Attempting to drop foreign key appointments_ibfk_3...');
        await connection.query('ALTER TABLE appointments DROP FOREIGN KEY appointments_ibfk_3');
        console.log('✓ Foreign key appointments_ibfk_3 dropped.');
      } catch (err) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
           console.log('Foreign key appointments_ibfk_3 does not exist or already dropped.');
        } else {
           console.log('Warning: Failed to drop foreign key (might not exist):', err.message);
        }
      }

      console.log('Dropping obsolete time_slot_id column...');
      await connection.query('ALTER TABLE appointments DROP COLUMN time_slot_id');
      console.log('✓ time_slot_id dropped.');
    } else {
      console.log('time_slot_id does not exist (already correct).');
    }

    // 2. Check if appointment_date exists and add it if missing
    const [colsAdd] = await connection.query("SHOW COLUMNS FROM appointments LIKE 'appointment_date'");
    if (colsAdd.length === 0) {
      console.log('Adding appointment_date column (initially nullable)...');
      
      // Add as nullable first
      await connection.query('ALTER TABLE appointments ADD COLUMN appointment_date DATE NULL AFTER event_id');
      console.log('✓ appointment_date added as NULL.');
      
      // Backfill data from created_at
      console.log('Backfilling appointment_date from created_at...');
      await connection.query('UPDATE appointments SET appointment_date = DATE(created_at) WHERE appointment_date IS NULL');
      console.log('✓ Backfill complete.');
      
      // Modify to NOT NULL
      console.log('Setting appointment_date to NOT NULL...');
      await connection.query('ALTER TABLE appointments MODIFY appointment_date DATE NOT NULL');
      console.log('✓ appointment_date set to NOT NULL.');
      
    } else {
      console.log('appointment_date already exists.');
    }

    console.log('Schema fix completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Schema fix failed:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

fixAppointmentsSchema();

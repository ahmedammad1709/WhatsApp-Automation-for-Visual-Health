import pool from '../config/db.js';

/**
 * Retrieves a setting value from the database, falling back to an environment variable.
 * @param {string} key - The key in the app_settings table.
 * @param {string} envVar - The environment variable name to fallback to.
 * @returns {Promise<string>} - The setting value.
 */
export const getAppSetting = async (key, envVar) => {
  try {
    const [rows] = await pool.query('SELECT setting_value FROM app_settings WHERE setting_key = ?', [key]);
    
    if (rows.length > 0 && rows[0].setting_value) {
      return rows[0].setting_value;
    }
    
    // Fallback to environment variable
    return process.env[envVar];
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    // Fallback to environment variable on error
    return process.env[envVar];
  }
};

/**
 * Updates or inserts a setting value in the database.
 * @param {string} key - The key in the app_settings table.
 * @param {string} value - The value to store.
 */
export const setAppSetting = async (key, value) => {
  try {
    await pool.query(
      'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      [key, value, value]
    );
  } catch (error) {
    console.error(`Error saving setting ${key}:`, error);
    throw error;
  }
};

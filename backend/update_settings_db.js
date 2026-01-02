import dotenv from 'dotenv';
import pool from './src/config/db.js';

dotenv.config();

const updateSettings = async () => {
  try {
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;

    console.log('Updating app_settings with values from .env...');
    console.log(`Phone ID: ${phoneId}`);
    // Don't log full token/key for security
    console.log(`Token: ${token ? token.substring(0, 10) + '...' : 'undefined'}`);
    console.log(`OpenAI Key: ${openaiKey ? openaiKey.substring(0, 10) + '...' : 'undefined'}`);

    if (phoneId) {
      await pool.query(
        `INSERT INTO app_settings (setting_key, setting_value) 
         VALUES ('WHATSAPP_PHONE_NUMBER_ID', ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [phoneId, phoneId]
      );
      console.log('Updated WHATSAPP_PHONE_NUMBER_ID');
    }

    if (token) {
      await pool.query(
        `INSERT INTO app_settings (setting_key, setting_value) 
         VALUES ('WHATSAPP_ACCESS_TOKEN', ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [token, token]
      );
      console.log('Updated WHATSAPP_ACCESS_TOKEN');
    }

    if (openaiKey) {
      await pool.query(
        `INSERT INTO app_settings (setting_key, setting_value) 
         VALUES ('OPENAI_API_KEY', ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [openaiKey, openaiKey]
      );
      console.log('Updated OPENAI_API_KEY');
    }

    console.log('Settings update complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating settings:', error);
    process.exit(1);
  }
};

updateSettings();

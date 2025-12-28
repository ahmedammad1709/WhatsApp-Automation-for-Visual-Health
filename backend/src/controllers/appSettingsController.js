import pool from '../config/db.js';
import { getAppSetting, setAppSetting } from '../utils/settingsHelper.js';

export const getSettings = async (req, res) => {
  try {
    const keys = ['OPENAI_API_KEY', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'];
    const settings = {};

    for (const key of keys) {
      // Get value from DB or Env
      const value = await getAppSetting(key, key); 
      
      if (value) {
        // Mask the value for security
        if (key === 'OPENAI_API_KEY') {
           settings[key] = value.substring(0, 7) + '...' + value.substring(value.length - 4);
        } else if (key === 'WHATSAPP_ACCESS_TOKEN') {
           settings[key] = value.substring(0, 10) + '...';
        } else {
           // Phone ID is usually safe to show, or maybe partially mask
           settings[key] = value;
        }
        settings[key + '_IS_SET'] = true;
      } else {
        settings[key] = '';
        settings[key + '_IS_SET'] = false;
      }
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSettings = async (req, res) => {
  const { openai_key, whatsapp_phone_id, whatsapp_token } = req.body;
  
  try {
    // Only update if a new value is provided
    // Allow empty strings to clear the setting (falling back to env)
    
    if (openai_key !== undefined) {
       // If it's the masked value, ignore it
       if (!openai_key.includes('...')) {
         await setAppSetting('OPENAI_API_KEY', openai_key);
       }
    }
    
    if (whatsapp_phone_id !== undefined) {
      await setAppSetting('WHATSAPP_PHONE_NUMBER_ID', whatsapp_phone_id);
    }
    
    if (whatsapp_token !== undefined) {
       // If it's the masked value, ignore it
       if (!whatsapp_token.includes('...')) {
         await setAppSetting('WHATSAPP_ACCESS_TOKEN', whatsapp_token);
       }
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

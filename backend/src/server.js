require('dotenv').config();

const app = require('./app');

const PORT = parseInt(process.env.PORT || '5000', 10);
const PUBLIC_API_URL = process.env.VITE_API_URL || `http://localhost:${PORT}`;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION;

app.listen(PORT, () => {
  console.log(`Server running on ${PUBLIC_API_URL}`);
  console.log(`WhatsApp Phone Number ID: ${WHATSAPP_PHONE_NUMBER_ID}`);
  console.log(`WhatsApp Graph API version: ${WHATSAPP_API_VERSION}`);
  
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_API_VERSION) {
    console.error('WARNING: WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_API_VERSION is missing in .env');
  }
});
try {
  require('./jobs/reminder24h').schedule();
  require('./jobs/reminder3h').schedule();
  require('./jobs/postEventThanks').schedule();
} catch (_) {}
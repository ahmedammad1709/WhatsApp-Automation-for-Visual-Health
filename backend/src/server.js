import 'dotenv/config';
import app from './app.js';
import reminder24h from './jobs/reminder24h.js';
import reminder3h from './jobs/reminder3h.js';
import postEventThanks from './jobs/postEventThanks.js';

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
  reminder24h.schedule();
  reminder3h.schedule();
  postEventThanks.schedule();
} catch (_) {}
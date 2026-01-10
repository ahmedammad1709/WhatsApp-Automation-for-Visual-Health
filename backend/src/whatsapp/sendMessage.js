import https from 'https';
import { getAppSetting } from '../utils/settingsHelper.js';

async function postMessage(path, body, phoneOverride) {
  const phoneId = phoneOverride || await getAppSetting('WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = await getAppSetting('WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_ACCESS_TOKEN');

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const version = process.env.WHATSAPP_API_VERSION;

    if (!phoneId) {
      console.error('[GRAPH API] Error: WHATSAPP_PHONE_NUMBER_ID is missing');
      return resolve({ error: 'missing_phone_number_id' });
    }
    if (!version) {
      console.error('[GRAPH API] Error: WHATSAPP_API_VERSION is missing');
      return resolve({ error: 'missing_api_version' });
    }

    // Construct URL strictly: https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages
    const urlStr = `https://graph.facebook.com/${version}/${phoneId}/${path}`;
    const url = new URL(urlStr);

    console.log(`[GRAPH API] Sending to ${url.toString()}`);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const req = https.request(url, options, (res) => {
      let chunks = '';
      res.on('data', (d) => chunks += d.toString());
      res.on('end', () => {
        try {
          const json = JSON.parse(chunks || '{}');
          if (res.statusCode && res.statusCode >= 400) {
            console.error(`[GRAPH API] Error ${res.statusCode}:`, JSON.stringify(json));
          } else {
            console.log(`[GRAPH API] Success: ${res.statusCode}`);
          }
          resolve(json);
        } catch (_) {
          console.error('[GRAPH API] Response parse error');
          resolve({});
        }
      });
    });
    req.on('error', (e) => {
      console.error('[GRAPH API] Network error:', e);
      reject(e);
    });
    req.write(data);
    req.end();
  });
}

async function sendText(phone, text, phoneOverride) {
  // Sanitize phone number to remove non-digits
  const cleanPhone = String(phone).replace(/\D/g, '');
  
  const body = {
    messaging_product: 'whatsapp',
    to: cleanPhone,
    type: 'text',
    text: { body: text }
  };
  return postMessage('messages', body, phoneOverride);
}

async function sendOptions(phone, headerText, bodyText, options, phoneOverride) {
  const rows = (options || []).map((o, idx) => ({ id: o.id || String(idx + 1), title: o.title, description: o.description || '' }));
  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText || 'Opções' },
      body: { text: bodyText || 'Selecione uma opção' },
      footer: { text: 'Selecione uma opção' },
      action: { button: 'Selecionar', sections: [{ title: 'Opções', rows }] }
    }
  };
  return postMessage('messages', body, phoneOverride);
}

// Sends a pre-approved template message (business-initiated, outside 24h window)
async function sendTemplate(phone, templateName, bodyParams = [], languageCode = 'pt_BR', phoneOverride) {
  if (!templateName) {
    console.error('[GRAPH API] Missing template name for sendTemplate');
    return { error: 'missing_template_name' };
  }

  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: 'body',
          parameters: bodyParams.map((p) => ({
            type: 'text',
            text: String(p ?? '')
          }))
        }
      ]
    }
  };

  return postMessage('messages', body, phoneOverride);
}

async function sendFinalConfirmation(phone, appt, phoneOverride) {
  const dateStr = new Date(appt.appointment_date).toLocaleDateString('pt-BR');
  const text = `Sua consulta está confirmada para o dia ${dateStr}, em ${appt.location}, ${appt.city_name}.`;
  return sendText(phone, text, phoneOverride);
}

export { sendText, sendOptions, sendTemplate, sendFinalConfirmation };
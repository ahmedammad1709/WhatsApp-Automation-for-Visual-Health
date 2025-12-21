const https = require('https');

function postMessage(path, body, phoneOverride) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const phoneId = phoneOverride || process.env.WHATSAPP_PHONE_NUMBER_ID;
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
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
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
  const body = {
    messaging_product: 'whatsapp',
    to: phone,
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

async function sendFinalConfirmation(phone, appt, phoneOverride) {
  const text = `Agendado: ${appt.slot_date} ${appt.slot_time} em ${appt.location} - ${appt.city_name}`;
  return sendText(phone, text, phoneOverride);
}

module.exports = { sendText, sendOptions, sendFinalConfirmation };
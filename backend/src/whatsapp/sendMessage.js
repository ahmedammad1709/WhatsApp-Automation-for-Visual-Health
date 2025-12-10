const https = require('https');

function postMessage(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const url = new URL(`https://graph.facebook.com/v17.0/${phoneId}/${path}`);
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
          resolve(json);
        } catch (_) {
          resolve({});
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendText(phone, text) {
  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: text }
  };
  return postMessage('messages', body);
}

async function sendOptions(phone, title, options) {
  const rows = (options || []).map((o, idx) => ({ id: o.id || String(idx + 1), title: o.title, description: o.description || '' }));
  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: title },
      body: { text: title },
      footer: { text: 'Selecione uma opção' },
      action: { button: 'Selecionar', sections: [{ title: 'Opções', rows }] }
    }
  };
  return postMessage('messages', body);
}

async function sendFinalConfirmation(phone, appt) {
  const text = `Agendado: ${appt.slot_date} ${appt.slot_time} em ${appt.location} - ${appt.city_name}`;
  return sendText(phone, text);
}

module.exports = { sendText, sendOptions, sendFinalConfirmation };

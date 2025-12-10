const { ok, error } = require('../utils/response');
const WhatsAppService = require('./whatsappService');

function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge);
    return;
  }
  res.status(403).send('Forbidden');
}

async function handleWebhook(req, res) {
  try {
    console.log('Received webhook:', JSON.stringify(req.body));
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (!message) return res.status(200).send('Webhook received');
    const from = message.from;
    const text = message.text?.body || '';
    await WhatsAppService.logMessage(from, 'in', text);
    const result = await WhatsAppService.processUserMessage(from, text);
    console.log("INCOMING:", JSON.stringify(req.body, null, 2));
    if (result?.type === 'text' && result.text) {
      await WhatsAppService.sendText(from, result.text);
      await WhatsAppService.logMessage(from, 'out', result.text);
    }
    if (result?.type === 'options') {
      await WhatsAppService.sendOptions(from, result.title, result.options);
      await WhatsAppService.logMessage(from, 'out', result.title);
    }
    if (result?.type === 'final') {
      await WhatsAppService.sendFinalConfirmation(from, result.appt);
      await WhatsAppService.logMessage(from, 'out', 'Confirmação enviada');
    }
    return res.status(200).send('Webhook received');
  } catch (e) {
    return res.status(200).send('Webhook received');
  }
  
}

module.exports = { verifyWebhook, handleWebhook };

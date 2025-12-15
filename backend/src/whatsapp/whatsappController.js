const { ok, error } = require('../utils/response');
const WhatsAppService = require('./whatsappService');

const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // Force correct phone ID

function extractTextFromMessage(message) {
  try {
    const type = message?.type;
    if (type === 'text') return message?.text?.body || '';
    if (type === 'interactive') {
      const it = message?.interactive;
      if (it?.type === 'button_reply') return it?.button_reply?.title || it?.button_reply?.id || '';
      if (it?.type === 'list_reply') return it?.list_reply?.title || it?.list_reply?.id || '';
    }
    return '';
  } catch (_) {
    return '';
  }
}

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

    const from = message?.from;
    const text = extractTextFromMessage(message);

    // Log incoming message
    await WhatsAppService.logMessage(from, 'in', text);

    // Process message
    let result;
    if (text && typeof text === 'string' && text.trim()) {
      result = await WhatsAppService.processUserMessage(from, text.trim());
    } else {
      result = { type: 'text', text: 'Por favor, envie uma mensagem de texto.' };
    }

    console.log("INCOMING:", JSON.stringify(req.body, null, 2));

    // Send response using forced PHONE_ID
    if (result?.type === 'text' && result.text) {
      await WhatsAppService.sendText(from, result.text, PHONE_ID);
      await WhatsAppService.logMessage(from, 'out', result.text);
    }

    if (result?.type === 'options') {
      await WhatsAppService.sendOptions(from, result.title, result.options, PHONE_ID);
      await WhatsAppService.logMessage(from, 'out', result.title);
    }

    if (result?.type === 'final') {
      await WhatsAppService.sendFinalConfirmation(from, result.appt, PHONE_ID);
      await WhatsAppService.logMessage(from, 'out', 'Confirmação enviada');
    }

    return res.status(200).send('Webhook received');
  } catch (e) {
    console.error('Webhook processing error:', e?.message || e);
    return res.status(200).send('Webhook received');
  }
}

module.exports = { verifyWebhook, handleWebhook };

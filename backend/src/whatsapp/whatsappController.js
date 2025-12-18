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
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  console.log('[WEBHOOK] Verification request received');

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WEBHOOK] Verification successful');
    res.status(200).send(challenge);
    return;
  }
  console.error('[WEBHOOK] Verification failed. Token mismatch.');
  res.status(403).send('Forbidden');
}

async function handleWebhook(req, res) {
  try {
    console.log('[WEBHOOK] POST received from Meta');
    // Always respond 200 OK immediately as per Meta requirement, 
    // but here we process first then send. Ideally we send 200 then process, 
    // but the existing structure waits. We will keep it but ensure 200 is sent.
    
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    
    if (!message) {
      console.log('[WEBHOOK] No message found in payload');
      return res.status(200).send('Webhook received');
    }

    const from = message?.from;
    const text = extractTextFromMessage(message);

    console.log(`[WEBHOOK] Incoming message from ${from}`);
    console.log(`[WEBHOOK] Message text: "${text}"`);

    // Log incoming message to DB
    await WhatsAppService.logMessage(from, 'in', text);

    // Process message
    let result;
    if (text && typeof text === 'string' && text.trim()) {
      console.log('[WEBHOOK] Processing message...');
      result = await WhatsAppService.processUserMessage(from, text.trim());
    } else {
      result = { type: 'text', text: 'Por favor, envie uma mensagem de texto.' };
    }

    // Send response using forced PHONE_ID
    if (result) {
      console.log('[WEBHOOK] Sending reply...');
      if (result.type === 'text' && result.text) {
        await WhatsAppService.sendText(from, result.text, PHONE_ID);
        await WhatsAppService.logMessage(from, 'out', result.text);
      } else if (result.type === 'options') {
        await WhatsAppService.sendOptions(from, result.title, result.options, PHONE_ID);
        await WhatsAppService.logMessage(from, 'out', result.title);
      } else if (result.type === 'final') {
        await WhatsAppService.sendFinalConfirmation(from, result.appt, PHONE_ID);
        await WhatsAppService.logMessage(from, 'out', 'Confirmação enviada');
      }
    }

    return res.status(200).send('Webhook received');
  } catch (e) {
    console.error('[WEBHOOK] processing error:', e?.message || e);
    return res.status(200).send('Webhook received');
  }
}

module.exports = { verifyWebhook, handleWebhook };

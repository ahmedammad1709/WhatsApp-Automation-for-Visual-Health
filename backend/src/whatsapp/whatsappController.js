const { ok, error } = require('../utils/response');
const WhatsAppService = require('./whatsappService');

function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.status(403).send('Forbidden');
}

async function handleWebhook(req, res) {
  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (!message) return res.sendStatus(200);
    const from = message.from;
    const text = message.text?.body || '';
    await WhatsAppService.logMessage(from, 'in', text);
    const AIFlow = require('./aiFlowService');
    const result = await AIFlow.processUserMessage(from, text);
    console.log("INCOMING:", JSON.stringify(req.body, null, 2));
    
    if (!result) return res.sendStatus(200);
    if (result.type === 'text') {
      await WhatsAppService.sendText(from, result.text);
      await WhatsAppService.logMessage(from, 'out', result.text);
    }
    if (result.type === 'options') {
      await WhatsAppService.sendOptions(from, result.title, result.options);
      await WhatsAppService.logMessage(from, 'out', result.title);
    }
    if (result.type === 'final') {
      await WhatsAppService.sendFinalConfirmation(from, result.appt);
      await WhatsAppService.logMessage(from, 'out', 'Confirmação enviada');
    }
    return res.sendStatus(200);
  } catch (e) {
    return res.sendStatus(200);
  }
  
}

module.exports = { verifyWebhook, handleWebhook };

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
    const body = req.body || {};
    const entry = (body.entry && body.entry[0]) || null;
    const changes = (entry && entry.changes && entry.changes[0]) || null;
    const value = (changes && changes.value) || null;
    const messages = (value && value.messages) || [];
    const statuses = (value && value.statuses) || [];
    if (statuses && statuses.length > 0) {
      res.status(200).json(ok(null, 'Status received'));
      return;
    }
    const msg = messages[0] || null;
    if (!msg) {
      res.status(200).json(ok(null, 'No message'));
      return;
    }
    const phone = msg.from;
    let text = '';
    if (msg.type === 'text' && msg.text && msg.text.body) text = msg.text.body;
    if (msg.type === 'interactive') {
      const ir = msg.interactive || {};
      const lr = ir.list_reply || null;
      const br = ir.button_reply || null;
      if (lr && lr.id) text = lr.id;
      if (br && br.id) text = br.id;
    }
    await WhatsAppService.logMessage(phone, 'in', text);
    const reply = await WhatsAppService.handleIncomingMessage(phone, text);
    if (!reply) {
      res.status(200).json(ok(null, 'No reply'));
      return;
    }
    if (reply.type === 'text') {
      await WhatsAppService.sendText(phone, reply.text);
      await WhatsAppService.logMessage(phone, 'out', reply.text);
    } else if (reply.type === 'options') {
      await WhatsAppService.sendOptions(phone, reply.title, reply.options);
      await WhatsAppService.logMessage(phone, 'out', reply.title);
    } else if (reply.type === 'final') {
      await WhatsAppService.sendFinalConfirmation(phone, reply.appointment);
      await WhatsAppService.logMessage(phone, 'out', 'Confirmação enviada');
    }
    res.status(200).json(ok(null, 'Processed'));
  } catch (e) {
    res.status(200).json(ok(null, 'Processed'));
  }
}

module.exports = { verifyWebhook, handleWebhook };
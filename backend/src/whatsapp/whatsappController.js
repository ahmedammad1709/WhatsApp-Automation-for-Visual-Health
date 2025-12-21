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

    // Process message - try structured flow first, then ChatGPT
    let result;
    if (text && typeof text === 'string' && text.trim()) {
      console.log('[WEBHOOK] Processing message...');
      
      try {
        // Use structured flow for appointment booking
        // ChatGPT is used within the flow for natural responses when needed
        // Fix: Use getSession instead of getState since getState is not exported/implemented
        const session = await WhatsAppService.getSession(from);
        const currentStep = session ? session.step : 'start';
        
        // Always use structured flow for booking process
        result = await WhatsAppService.handleIncomingMessage(from, text.trim());
        
        // If user wants to start booking and we're not in a flow, initiate it
        if (currentStep === 'start' || !currentStep) {
          const lowerText = text.toLowerCase();
          if (lowerText.includes('agendar') || lowerText.includes('marcar') || lowerText.includes('consulta') || lowerText.includes('appointment') || lowerText.includes('book') || lowerText.includes('hi') || lowerText.includes('hello') || lowerText.includes('olá') || lowerText.includes('oi')) {
            // Already handled by handleIncomingMessage above, but logic here seems redundant if handleIncomingMessage handles everything
            // Let's rely on handleIncomingMessage returning the correct response.
          }
        }
      } catch (e) {
        console.error('[WEBHOOK] Error processing message:', e);
        // Always provide a response even on error
        result = { type: 'text', text: 'Sorry, I encountered an error. Please try again or send "start" to begin.' };
      }
    } else {
      result = { type: 'text', text: 'Por favor, envie uma mensagem de texto.' };
    }
    
    // Ensure result exists
    if (!result) {
      result = { type: 'text', text: 'Hi! I\'m your appointment assistant from Instituto Luz no Caminho. May I know your full name?' };
    }

    // Send response using forced PHONE_ID
    if (result) {
      try {
        console.log('[WEBHOOK] Sending reply...');
        if (result.type === 'text' && result.text) {
          await WhatsAppService.sendText(from, result.text, PHONE_ID);
          await WhatsAppService.logMessage(from, 'out', result.text);
        } else if (result.type === 'options') {
          // Supports header, body, and title (legacy)
          await WhatsAppService.sendOptions(from, result.header || result.title, result.body || result.title, result.options, PHONE_ID);
          await WhatsAppService.logMessage(from, 'out', result.body || result.title);
        } else if (result.type === 'final') {
          const confirmationText = result.text || `Appointment confirmed for ${result.appointment?.slot_date} at ${result.appointment?.slot_time}`;
          await WhatsAppService.sendText(from, confirmationText, PHONE_ID);
          await WhatsAppService.logMessage(from, 'out', confirmationText);
        }
      } catch (e) {
        console.error('[WEBHOOK] Error sending reply:', e);
        // Try to send error message
        try {
          await WhatsAppService.sendText(from, 'Sorry, I encountered an error sending my reply. Please try again.', PHONE_ID);
        } catch (sendError) {
          console.error('[WEBHOOK] Error sending error message:', sendError);
        }
      }
    }

    return res.status(200).send('Webhook received');
  } catch (e) {
    console.error('[WEBHOOK] processing error:', e?.message || e);
    return res.status(200).send('Webhook received');
  }
}

module.exports = { verifyWebhook, handleWebhook };
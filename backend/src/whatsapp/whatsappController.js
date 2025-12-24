import { ok, error } from '../utils/response.js';
import * as WhatsAppService from './whatsappService.js';

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

    // Process message with ChatGPT-driven conversation
    let result;
    if (text && typeof text === 'string' && text.trim()) {
      console.log('[WEBHOOK] Processing message with ChatGPT...');
      
      try {
        // ChatGPT handles all conversation logic
        result = await WhatsAppService.handleIncomingMessage(from, text.trim());
      } catch (e) {
        console.error('[WEBHOOK] Error processing message:', e);
        // Always provide a response even on error
        result = { type: 'text', text: 'Desculpe, ocorreu um erro. Por favor, tente novamente ou digite "start" para começar.' };
      }
    } else {
      result = { type: 'text', text: 'Por favor, envie uma mensagem de texto.' };
    }
    
    // Ensure result exists
    if (!result) {
      result = { type: 'text', text: 'Olá! Sou a assistente do Instituto Luz no Caminho. Como posso ajudá-lo hoje?' };
    }

    // Send response using forced PHONE_ID
    if (result) {
      try {
        console.log('[WEBHOOK] Sending reply...');
        if (result.type === 'text' && result.text) {
          await WhatsAppService.sendText(from, result.text, PHONE_ID);
          await WhatsAppService.logMessage(from, 'out', result.text);
        } else if (result.type === 'options') {
          // Legacy support for options (though ChatGPT should handle everything in natural language)
          await WhatsAppService.sendOptions(from, result.header || result.title, result.body || result.title, result.options, PHONE_ID);
          await WhatsAppService.logMessage(from, 'out', result.body || result.title);
        } else if (result.type === 'final') {
          // Final confirmation message (DATE-ONLY)
          const dateStr = result.appointment?.appointment_date
            ? new Date(result.appointment.appointment_date).toLocaleDateString('pt-BR')
            : null;
          const confirmationText = result.text || (dateStr
            ? `Sua consulta está confirmada para o dia ${dateStr}, em ${result.appointment?.location}, ${result.appointment?.city_name}.`
            : 'Sua consulta está confirmada.');
          await WhatsAppService.sendText(from, confirmationText, PHONE_ID);
          await WhatsAppService.logMessage(from, 'out', confirmationText);
        }
      } catch (e) {
        console.error('[WEBHOOK] Error sending reply:', e);
        // Try to send error message
        try {
          await WhatsAppService.sendText(from, 'Desculpe, ocorreu um erro ao enviar minha resposta. Por favor, tente novamente.', PHONE_ID);
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

export { verifyWebhook, handleWebhook };
const express = require('express');
const router = express.Router();
const WhatsAppController = require('../whatsapp/whatsappController');

router.get('/webhook', WhatsAppController.verifyWebhook);
router.post('/webhook', WhatsAppController.handleWebhook);

module.exports = router;

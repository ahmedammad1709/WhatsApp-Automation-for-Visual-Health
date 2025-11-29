const express = require('express');
const router = express.Router();
const WhatsAppController = require('../whatsapp/whatsappController');

router.get('/whatsapp', WhatsAppController.verifyWebhook);
router.post('/whatsapp', WhatsAppController.handleWebhook);

module.exports = router;
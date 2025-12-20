const express = require('express');
const router = express.Router();
const ConversationLogController = require('../controllers/conversationLogController');

/**
 * GET /conversation-logs - Get all conversation logs
 * GET /conversation-logs/phone/:phone - Get conversation logs by phone
 */

router.get('/', ConversationLogController.getAll);
router.get('/phone/:phone', ConversationLogController.getByPhone);

module.exports = router;


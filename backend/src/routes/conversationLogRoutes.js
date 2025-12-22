import express from 'express';
import * as ConversationLogController from '../controllers/conversationLogController.js';

const router = express.Router();

/**
 * GET /conversation-logs - Get all conversation logs
 * GET /conversation-logs/phone/:phone - Get conversation logs by phone
 */

router.get('/', ConversationLogController.getAll);
router.get('/phone/:phone', ConversationLogController.getByPhone);

export default router;


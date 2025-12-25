import express from 'express';
import { getChatbotSettings, updateChatbotSettings } from '../controllers/chatbotSettingsController.js';

const router = express.Router();

router.get('/', getChatbotSettings);
router.post('/', updateChatbotSettings);

export default router;

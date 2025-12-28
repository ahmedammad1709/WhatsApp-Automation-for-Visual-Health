import express from 'express';
import { getSettings, updateSettings } from '../controllers/appSettingsController.js';

const router = express.Router();

router.get('/', getSettings);
router.post('/', updateSettings);

export default router;

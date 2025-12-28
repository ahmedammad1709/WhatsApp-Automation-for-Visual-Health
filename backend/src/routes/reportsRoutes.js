import express from 'express';
import { getReportStats, getReportCharts, sendReportToWhatsApp } from '../controllers/reportsController.js';

const router = express.Router();

router.get('/stats', getReportStats);
router.get('/charts', getReportCharts);
router.post('/send', sendReportToWhatsApp);

export default router;

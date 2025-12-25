import express from 'express';
import { getReportStats, getReportCharts } from '../controllers/reportsController.js';

const router = express.Router();

router.get('/stats', getReportStats);
router.get('/charts', getReportCharts);

export default router;

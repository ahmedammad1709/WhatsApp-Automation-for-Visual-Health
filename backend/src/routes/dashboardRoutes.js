import express from 'express';
import { getDashboardStats, getDashboardCharts } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/charts', getDashboardCharts);

export default router;

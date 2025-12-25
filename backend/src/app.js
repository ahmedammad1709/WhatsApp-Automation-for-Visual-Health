import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import cityRoutes from './routes/cityRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import conversationLogRoutes from './routes/conversationLogRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import chatbotSettingsRoutes from './routes/chatbotSettingsRoutes.js';
import { ok } from './utils/response.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    console.error('JSON parse error on webhook:', err.message);
    return res.status(200).send('Webhook received');
  }
  next(err);
});

app.get('/', (req, res) => {
  res.json(ok({ name: 'whatsapp_project_api' }, 'API running'));
});

// Support both /api/ prefix (standard) and root paths (in case Nginx strips /api)
app.use('/api/cities', cityRoutes);
app.use('/cities', cityRoutes);

app.use('/api/events', eventRoutes);
app.use('/events', eventRoutes);

app.use('/api/patients', patientRoutes);
app.use('/patients', patientRoutes);

app.use('/api/appointments', appointmentRoutes);
app.use('/appointments', appointmentRoutes);

app.use('/api/conversation-logs', conversationLogRoutes);
app.use('/conversation-logs', conversationLogRoutes);

app.use('/api/dashboard', dashboardRoutes);
app.use('/dashboard', dashboardRoutes);

app.use('/api/reports', reportsRoutes);
app.use('/reports', reportsRoutes);

app.use('/api/chatbot-settings', chatbotSettingsRoutes);
app.use('/chatbot-settings', chatbotSettingsRoutes);

app.use('/', whatsappRoutes);

export default app;

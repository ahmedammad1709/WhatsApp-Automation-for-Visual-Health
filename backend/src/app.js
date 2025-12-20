const express = require('express');
const cors = require('cors');
require('dotenv').config();

const cityRoutes = require('./routes/cityRoutes');
const eventRoutes = require('./routes/eventRoutes');
const timeSlotRoutes = require('./routes/timeSlotRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const { ok } = require('./utils/response');

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

app.use('/api/time-slots', timeSlotRoutes);
app.use('/time-slots', timeSlotRoutes);

app.use('/api/patients', patientRoutes);
app.use('/patients', patientRoutes);

app.use('/api/appointments', appointmentRoutes);
app.use('/appointments', appointmentRoutes);

const conversationLogRoutes = require('./routes/conversationLogRoutes');
app.use('/api/conversation-logs', conversationLogRoutes);
app.use('/conversation-logs', conversationLogRoutes);

app.use('/', whatsappRoutes);

module.exports = app;

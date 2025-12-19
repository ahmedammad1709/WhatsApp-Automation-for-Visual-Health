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

app.use('/api/cities', cityRoutes);
app.use('/api/events', eventRoutes);
app.use('/time-slots', timeSlotRoutes);
app.use('/patients', patientRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/', whatsappRoutes);

module.exports = app;

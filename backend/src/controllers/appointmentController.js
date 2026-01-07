import { ok, error } from '../utils/response.js';
import * as AppointmentService from '../services/appointmentService.js';
import * as WhatsAppService from '../whatsapp/whatsappService.js';
import { getAppSetting } from '../utils/settingsHelper.js';

async function create(req, res) {
  const { patient_id, event_id, appointment_date, status } = req.body || {};
  if (!patient_id || !event_id || !appointment_date) {
    return res.status(400).json(error('patient_id, event_id, appointment_date are required'));
  }
  try {
    const created = await AppointmentService.createAppointment({ patient_id, event_id, appointment_date, status });
    res.status(201).json(ok(created, 'Appointment created'));
  } catch (e) {
    res.status(500).json(error('Failed to create appointment'));
  }
}

async function listByEvent(req, res) {
  const event_id = parseInt(req.params.event_id, 10);
  if (!event_id) return res.status(400).json(error('Valid event_id is required'));
  try {
    const data = await AppointmentService.listAppointmentsByEvent(event_id);
    res.json(ok(data, 'Appointments fetched'));
  } catch (e) {
    res.status(500).json(error('Failed to fetch appointments'));
  }
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json(error('Valid id is required'));
  try {
    const deleted = await AppointmentService.deleteAppointment(id);
    if (!deleted) return res.status(404).json(error('Appointment not found'));
    res.json(ok(null, 'Appointment deleted'));
  } catch (e) {
    res.status(500).json(error('Failed to delete appointment'));
  }
}

async function getAll(req, res) {
  try {
    const data = await AppointmentService.getAllAppointments();
    res.json(ok(data, 'Appointments fetched'));
  } catch (e) {
    console.error('Error fetching appointments:', e);
    res.status(500).json(error('Failed to fetch appointments'));
  }
}

async function updateStatus(req, res) {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body || {};
  if (!id) return res.status(400).json(error('Valid id is required'));
  if (!status) return res.status(400).json(error('status is required'));
  try {
    const updated = await AppointmentService.updateAppointmentStatus(id, status);
    if (!updated) return res.status(404).json(error('Appointment not found'));
    res.json(ok(null, 'Appointment status updated'));
  } catch (e) {
    res.status(500).json(error('Failed to update appointment status'));
  }
}

async function getReminders(req, res) {
  try {
    const data = await AppointmentService.getSentReminders();
    res.json(ok(data));
  } catch (e) {
    res.status(500).json(error('Failed to fetch reminders'));
  }
}

export { create, listByEvent, remove, getAll, updateStatus, getReminders };

async function sendCustomReminder(req, res) {
  try {
    const { phone, message } = req.body || {};
    if (!phone || !message) {
      return res.status(400).json(error('phone and message are required'));
    }
    const phoneId = await getAppSetting('WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_PHONE_NUMBER_ID');
    await WhatsAppService.sendText(phone, message, phoneId);
    await WhatsAppService.logMessage(phone, 'out', message);
    await AppointmentService.markReminderForLatestAppointmentByPhone(phone);
    return res.json(ok({ sent: true }, 'Reminder sent'));
  } catch (e) {
    return res.status(500).json(error('Failed to send reminder'));
  }
}

export { sendCustomReminder };

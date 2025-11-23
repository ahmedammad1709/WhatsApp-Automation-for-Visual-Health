const { ok, error } = require('../utils/response');
const AppointmentService = require('../services/appointmentService');

async function create(req, res) {
  const { patient_id, event_id, time_slot_id, status } = req.body || {};
  if (!patient_id || !event_id || !time_slot_id) {
    return res.status(400).json(error('patient_id, event_id, time_slot_id are required'));
  }
  try {
    const created = await AppointmentService.createAppointment({ patient_id, event_id, time_slot_id, status });
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

module.exports = { create, listByEvent, remove };
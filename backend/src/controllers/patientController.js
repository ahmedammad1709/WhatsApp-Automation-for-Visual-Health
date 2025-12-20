const { ok, error } = require('../utils/response');
const PatientService = require('../services/patientService');

async function create(req, res) {
  const { full_name, whatsapp_number, city, neighborhood, reason } = req.body || {};
  if (!full_name || !whatsapp_number || !city) {
    return res.status(400).json(error('full_name, whatsapp_number, city are required'));
  }
  try {
    const created = await PatientService.createPatient({ full_name, whatsapp_number, city, neighborhood, reason });
    res.status(201).json(ok(created, 'Patient created'));
  } catch (e) {
    res.status(500).json(error('Failed to create patient'));
  }
}

async function getById(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json(error('Valid id is required'));
  try {
    const patient = await PatientService.getPatientById(id);
    if (!patient) return res.status(404).json(error('Patient not found'));
    res.json(ok(patient, 'Patient fetched'));
  } catch (e) {
    res.status(500).json(error('Failed to fetch patient'));
  }
}

async function getAll(req, res) {
  try {
    const data = await PatientService.getAllPatients();
    res.json(ok(data, 'Patients fetched'));
  } catch (e) {
    console.error('Error fetching patients:', e);
    res.status(500).json(error('Failed to fetch patients'));
  }
}

module.exports = { create, getById, getAll };
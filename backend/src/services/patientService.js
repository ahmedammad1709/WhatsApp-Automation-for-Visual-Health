const pool = require('../config/db');

async function createPatient({ full_name, whatsapp_number, city, neighborhood, reason }) {
  const [result] = await pool.query(
    'INSERT INTO patients (full_name, whatsapp_number, city, neighborhood, reason, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [full_name, whatsapp_number, city, neighborhood || null, reason || null]
  );
  return { id: result.insertId, full_name, whatsapp_number, city, neighborhood: neighborhood || null, reason: reason || null };
}

async function getPatientById(id) {
  const [rows] = await pool.query(
    'SELECT id, full_name, whatsapp_number, city, neighborhood, reason, created_at FROM patients WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function getAllPatients() {
  const [rows] = await pool.query(
    'SELECT id, full_name, whatsapp_number, city, neighborhood, reason, created_at FROM patients ORDER BY created_at DESC'
  );
  return rows;
}

module.exports = { createPatient, getPatientById, getAllPatients };
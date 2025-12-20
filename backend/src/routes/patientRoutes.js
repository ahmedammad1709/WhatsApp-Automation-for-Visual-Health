const express = require('express');
const router = express.Router();
const PatientController = require('../controllers/patientController');

/**
 * GET /patients - Get all patients
 * POST /patients - Create patient
 * GET /patients/:id - Get patient by id
 */

router.get('/', PatientController.getAll);
router.post('/', PatientController.create);
router.get('/:id', PatientController.getById);

module.exports = router;
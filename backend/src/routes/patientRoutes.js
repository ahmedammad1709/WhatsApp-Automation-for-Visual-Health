const express = require('express');
const router = express.Router();
const PatientController = require('../controllers/patientController');

/**
 * POST /patients
 * GET /patients/:id
 */

router.post('/', PatientController.create);
router.get('/:id', PatientController.getById);

module.exports = router;
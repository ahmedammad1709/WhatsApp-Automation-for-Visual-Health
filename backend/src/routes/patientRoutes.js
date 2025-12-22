import express from 'express';
import * as PatientController from '../controllers/patientController.js';

const router = express.Router();

/**
 * GET /patients - Get all patients
 * POST /patients - Create patient
 * GET /patients/:id - Get patient by id
 */

router.get('/', PatientController.getAll);
router.post('/', PatientController.create);
router.get('/:id', PatientController.getById);

export default router;
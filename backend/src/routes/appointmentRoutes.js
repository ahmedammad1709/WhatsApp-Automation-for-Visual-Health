import express from 'express';
import * as AppointmentController from '../controllers/appointmentController.js';

const router = express.Router();

/**
 * GET /appointments - Get all appointments
 * POST /appointments - Create appointment
 * GET /appointments/event/:event_id - Get appointments by event
 * PATCH /appointments/:id/status - Update appointment status
 * DELETE /appointments/:id - Delete appointment
 */

router.get('/reminders', AppointmentController.getReminders);
router.get('/', AppointmentController.getAll);
router.post('/', AppointmentController.create);
router.get('/event/:event_id', AppointmentController.listByEvent);
router.patch('/:id/status', AppointmentController.updateStatus);
router.delete('/:id', AppointmentController.remove);

export default router;
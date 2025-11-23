const express = require('express');
const router = express.Router();
const AppointmentController = require('../controllers/appointmentController');

/**
 * POST /appointments
 * GET /appointments/event/:event_id
 * DELETE /appointments/:id
 */

router.post('/', AppointmentController.create);
router.get('/event/:event_id', AppointmentController.listByEvent);
router.delete('/:id', AppointmentController.remove);

module.exports = router;
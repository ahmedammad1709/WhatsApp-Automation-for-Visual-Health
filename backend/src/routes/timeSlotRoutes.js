const express = require('express');
const router = express.Router();
const TimeSlotController = require('../controllers/timeSlotController');

/**
 * GET /time-slots - Get all time slots
 * GET /time-slots/event/:event_id - Get time slots by event
 * POST /time-slots - Create time slot
 * DELETE /time-slots/:id - Delete time slot
 */

router.get('/', TimeSlotController.getAll);
router.get('/event/:event_id', TimeSlotController.listByEvent);
router.post('/', TimeSlotController.create);
router.delete('/:id', TimeSlotController.remove);

module.exports = router;
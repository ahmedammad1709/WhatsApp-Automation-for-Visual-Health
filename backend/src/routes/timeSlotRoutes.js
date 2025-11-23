const express = require('express');
const router = express.Router();
const TimeSlotController = require('../controllers/timeSlotController');

/**
 * GET /time-slots/event/:event_id
 * POST /time-slots
 * DELETE /time-slots/:id
 */

router.get('/event/:event_id', TimeSlotController.listByEvent);
router.post('/', TimeSlotController.create);
router.delete('/:id', TimeSlotController.remove);

module.exports = router;
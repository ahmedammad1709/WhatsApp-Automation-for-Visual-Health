import express from 'express';
import * as TimeSlotController from '../controllers/timeSlotController.js';

const router = express.Router();

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

export default router;
import express from 'express';
import * as EventController from '../controllers/eventController.js';

const router = express.Router();

/**
 * GET /events
 * POST /events
 * DELETE /events/:id
 * GET /events/city/:city_id
 */

router.get('/', EventController.list);
router.post('/', EventController.create);
router.put('/:id', EventController.update);
router.delete('/:id', EventController.remove);
router.get('/city/:city_id', EventController.listByCity);

export default router;
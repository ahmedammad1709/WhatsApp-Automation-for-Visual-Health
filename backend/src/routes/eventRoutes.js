const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');

/**
 * GET /events
 * POST /events
 * DELETE /events/:id
 * GET /events/city/:city_id
 */

router.get('/', EventController.list);
router.post('/', EventController.create);
router.delete('/:id', EventController.remove);
router.get('/city/:city_id', EventController.listByCity);

module.exports = router;
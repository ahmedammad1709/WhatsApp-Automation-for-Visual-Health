const express = require('express');
const router = express.Router();
const CityController = require('../controllers/cityController');

/**
 * GET /cities
 * POST /cities
 * DELETE /cities/:id
 */

router.get('/', CityController.list);
router.post('/', CityController.create);
router.put('/:id', CityController.update);
router.delete('/:id', CityController.remove);

module.exports = router;
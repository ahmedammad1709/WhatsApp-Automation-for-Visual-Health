import express from 'express';
import * as CityController from '../controllers/cityController.js';

const router = express.Router();

/**
 * GET /cities
 * POST /cities
 * DELETE /cities/:id
 */

router.get('/', CityController.list);
router.post('/', CityController.create);
router.put('/:id', CityController.update);
router.delete('/:id', CityController.remove);

export default router;
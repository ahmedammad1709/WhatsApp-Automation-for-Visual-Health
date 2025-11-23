const { ok, error } = require('../utils/response');
const CityService = require('../services/cityService');

async function list(req, res) {
  try {
    const data = await CityService.listCities();
    res.json(ok(data, 'Cities fetched'));
  } catch (e) {
    res.status(500).json(error('Failed to fetch cities'));
  }
}

async function create(req, res) {
  const { name, state } = req.body || {};
  if (!name || !state) return res.status(400).json(error('name and state are required'));
  try {
    const created = await CityService.createCity({ name, state });
    res.status(201).json(ok(created, 'City created'));
  } catch (e) {
    res.status(500).json(error('Failed to create city'));
  }
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json(error('Valid id is required'));
  try {
    const deleted = await CityService.deleteCity(id);
    if (!deleted) return res.status(404).json(error('City not found'));
    res.json(ok(null, 'City deleted'));
  } catch (e) {
    res.status(500).json(error('Failed to delete city'));
  }
}

async function update(req, res) {
  const id = parseInt(req.params.id, 10);
  const { name, state } = req.body || {};
  if (!id || !name || !state) return res.status(400).json(error('id, name and state are required'));
  try {
    const updated = await CityService.updateCity(id, { name, state });
    if (!updated) return res.status(404).json(error('City not found'));
    res.json(ok(updated, 'City updated'));
  } catch (e) {
    res.status(500).json(error('Failed to update city'));
  }
}

module.exports = { list, create, remove, update };
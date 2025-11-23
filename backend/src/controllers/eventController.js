const { ok, error } = require('../utils/response');
const EventService = require('../services/eventService');

async function list(req, res) {
  try {
    const data = await EventService.listEvents();
    res.json(ok(data, 'Events fetched'));
  } catch (e) {
    res.status(500).json(error('Failed to fetch events'));
  }
}

async function create(req, res) {
  const { city_id, location, start_date, end_date, max_capacity, notes } = req.body || {};
  if (!city_id || !location || !start_date || !end_date || !max_capacity) {
    return res.status(400).json(error('city_id, location, start_date, end_date, max_capacity are required'));
  }
  try {
    const created = await EventService.createEvent({ city_id, location, start_date, end_date, max_capacity, notes });
    res.status(201).json(ok(created, 'Event created'));
  } catch (e) {
    res.status(500).json(error('Failed to create event'));
  }
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json(error('Valid id is required'));
  try {
    const deleted = await EventService.deleteEvent(id);
    if (!deleted) return res.status(404).json(error('Event not found'));
    res.json(ok(null, 'Event deleted'));
  } catch (e) {
    res.status(500).json(error('Failed to delete event'));
  }
}

async function listByCity(req, res) {
  const city_id = parseInt(req.params.city_id, 10);
  if (!city_id) return res.status(400).json(error('Valid city_id is required'));
  try {
    const data = await EventService.listEventsByCity(city_id);
    res.json(ok(data, 'Events fetched'));
  } catch (e) {
    res.status(500).json(error('Failed to fetch events by city'));
  }
}

module.exports = { list, create, remove, listByCity };
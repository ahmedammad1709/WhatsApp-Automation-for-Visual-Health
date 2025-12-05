const { ok, error } = require('../utils/response');
const TimeSlotService = require('../services/timeSlotService');

async function listByEvent(req, res) {
  const event_id = parseInt(req.params.event_id, 10);
  if (!event_id) return res.status(400).json(error('Valid event_id is required'));
  try {
    const data = await TimeSlotService.listByEvent(event_id);
    res.json(ok(data, 'Time slots fetched'));
  } catch (e) {
    res.status(500).json(error('Failed to fetch time slots'));
  }

}

async function create(req, res) {
  const { event_id, slot_date, slot_time, max_per_slot } = req.body || {};
  if (!event_id || !slot_date || !slot_time || !max_per_slot) {
    return res.status(400).json(error('event_id, slot_date, slot_time, max_per_slot are required'));
  }
  try {
    const created = await TimeSlotService.createTimeSlot({ event_id, slot_date, slot_time, max_per_slot });
    res.status(201).json(ok(created, 'Time slot created'));
  } catch (e) {
    res.status(500).json(error('Failed to create time slot'));
  }
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json(error('Valid id is required'));
  try {
    const deleted = await TimeSlotService.deleteTimeSlot(id);
    if (!deleted) return res.status(404).json(error('Time slot not found'));
    res.json(ok(null, 'Time slot deleted'));
  } catch (e) {
    res.status(500).json(error('Failed to delete time slot'));
  }
}

module.exports = { listByEvent, create, remove };
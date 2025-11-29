const pool = require('../config/db');

function levenshtein(a, b) {
  const m = Array(a.length + 1).fill(0).map(() => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
}

async function detectCity(input) {
  const [cities] = await pool.query('SELECT id, name, state FROM cities');
  const t = (input || '').trim().toLowerCase();
  let best = null;
  for (const c of cities) {
    const name = String(c.name || '').toLowerCase();
    if (name === t) return c;
    if (name.includes(t) || t.includes(name)) {
      best = best || c;
      continue;
    }
    const dist = levenshtein(name, t);
    const score = 1 - dist / Math.max(name.length, t.length);
    if (!best || score > best._score) best = { ...c, _score: score };
  }
  return best ? { id: best.id, name: best.name, state: best.state } : null;
}

async function getEventForCity(cityId) {
  const [events] = await pool.query('SELECT id, city_id, location, start_date, end_date, max_capacity FROM events WHERE city_id = ? ORDER BY start_date ASC', [cityId]);
  if (!events.length) return null;
  for (const e of events) {
    const [rows] = await pool.query('SELECT SUM(reserved_count) AS total FROM time_slots WHERE event_id = ?', [e.id]);
    const total = (rows[0] && rows[0].total) || 0;
    if (total < e.max_capacity) return e;
  }
  return null;
}

async function getNearestAvailableEvent(excludeCityId) {
  const [events] = await pool.query('SELECT e.id, e.city_id, e.location, e.start_date, e.end_date, e.max_capacity, c.name AS city_name FROM events e LEFT JOIN cities c ON c.id = e.city_id ORDER BY e.start_date ASC');
  for (const e of events) {
    if (excludeCityId && e.city_id === excludeCityId) continue;
    const [rows] = await pool.query('SELECT SUM(reserved_count) AS total FROM time_slots WHERE event_id = ?', [e.id]);
    const total = (rows[0] && rows[0].total) || 0;
    if (total < e.max_capacity) return e;
  }
  return null;
}

async function getAvailableSlots(eventId) {
  const [rows] = await pool.query('SELECT id, slot_date, slot_time, max_per_slot, reserved_count FROM time_slots WHERE event_id = ? ORDER BY slot_date ASC, slot_time ASC', [eventId]);
  return rows.filter(r => r.reserved_count < r.max_per_slot);
}

module.exports = { detectCity, getEventForCity, getNearestAvailableEvent, getAvailableSlots };
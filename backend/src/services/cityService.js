import pool from '../config/db.js';

async function listCities() {
  const [rows] = await pool.query(
    'SELECT id, name, state, created_at FROM cities ORDER BY name ASC'
  );
  return rows;
}

async function createCity({ name, state }) {
  const [result] = await pool.query(
    'INSERT INTO cities (name, state, created_at) VALUES (?, ?, NOW())',
    [name, state]
  );
  const [rows] = await pool.query(
    'SELECT id, name, state, created_at FROM cities WHERE id = ?',
    [result.insertId]
  );
  return rows[0];
}

async function deleteCity(id) {
  const [result] = await pool.query('DELETE FROM cities WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function updateCity(id, { name, state }) {
  const [result] = await pool.query(
    'UPDATE cities SET name = ?, state = ? WHERE id = ?',
    [name, state, id]
  );
  if (result.affectedRows > 0) {
    return { id, name, state };
  }
  return null;
}

export { listCities, createCity, deleteCity, updateCity };
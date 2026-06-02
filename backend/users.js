const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../models/db');
const { auth, gestor } = require('../middleware/auth');

// GET /api/users
router.get('/', auth, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, active, created_at FROM users ORDER BY name').all();
  res.json(users);
});

// POST /api/users
router.post('/', auth, gestor, (req, res) => {
  const { name, email, password, role, active } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (name, email, password, role, active) VALUES (?,?,?,?,?)');
    const info = stmt.run(name, email, hash, role || 'operador', active === false ? 0 : 1);
    res.json({ id: info.lastInsertRowid, name, email, role });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'E-mail já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PUT /api/users/:id
router.put('/:id', auth, gestor, (req, res) => {
  const { name, email, password, role, active } = req.body;
  const fields = [];
  const values = [];
  if (name)   { fields.push('name = ?');   values.push(name); }
  if (email)  { fields.push('email = ?');  values.push(email); }
  if (password && password.length > 0) { fields.push('password = ?'); values.push(bcrypt.hashSync(password, 10)); }
  if (role)   { fields.push('role = ?');   values.push(role); }
  if (active !== undefined) { fields.push('active = ?'); values.push(active ? 1 : 0); }
  fields.push('updated_at = datetime(\'now\')');
  values.push(req.params.id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

// DELETE /api/users/:id
router.delete('/:id', auth, gestor, (req, res) => {
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

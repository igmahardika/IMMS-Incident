import bcrypt from 'bcryptjs';
import db from '../../db.js';
import { USER_ROLE_PRIORITY } from './utils.js';

const VALID_ROLES = ['admin', 'manager', 'noc', 'technician'];

export function listUsers() {
  return db.prepare(`
    SELECT id, username, role, name, email, employee_id, is_active, created_at
    FROM users
    ORDER BY ${USER_ROLE_PRIORITY}, is_active DESC, name
  `).all();
}

export function createUser(payload) {
  const { username, password, role, name, email, employee_id } = payload;

  if (!username?.trim() || !password || !name?.trim()) {
    const error = new Error('Username, password, and name are required.');
    error.status = 400;
    throw error;
  }

  if (role && !VALID_ROLES.includes(role)) {
    const error = new Error('Invalid role.');
    error.status = 400;
    throw error;
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, name, email, employee_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    username.trim(),
    hash,
    role || 'technician',
    name.trim(),
    email?.trim() || null,
    employee_id?.trim() || null
  );

  return db.prepare(`
    SELECT id, username, role, name, email, employee_id, is_active
    FROM users
    WHERE id = ?
  `).get(result.lastInsertRowid);
}

export function updateUser(id, payload, actorUserId) {
  const { role, name, email, is_active, password, employee_id } = payload;
  const targetId = Number(id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);

  if (!existing) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  if (role && !VALID_ROLES.includes(role)) {
    const error = new Error('Invalid role.');
    error.status = 400;
    throw error;
  }

  if (actorUserId === targetId) {
    if (is_active === false || is_active === 0) {
      const error = new Error('You cannot deactivate your own account.');
      error.status = 400;
      throw error;
    }

    if (role && role !== 'admin') {
      const error = new Error('You cannot downgrade your own admin role.');
      error.status = 400;
      throw error;
    }
  }

  if (typeof password === 'string' && password.trim()) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, targetId);
  }

  db.prepare(`
    UPDATE users
    SET role = ?,
        name = ?,
        email = ?,
        employee_id = ?,
        is_active = ?
    WHERE id = ?
  `).run(
    role ?? existing.role,
    name?.trim() || existing.name,
    email === undefined ? existing.email : (email?.trim() || null),
    employee_id === undefined ? existing.employee_id : (employee_id?.trim() || null),
    is_active === undefined ? existing.is_active : Number(Boolean(is_active)),
    targetId
  );

  return db.prepare(`
    SELECT id, username, role, name, email, employee_id, is_active
    FROM users
    WHERE id = ?
  `).get(targetId);
}

export function deactivateUser(id, actorUserId) {
  const targetId = Number(id);
  if (actorUserId === targetId) {
    const error = new Error('You cannot deactivate your own account.');
    error.status = 400;
    throw error;
  }

  const result = db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(targetId);
  if (!result.changes) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  return { success: true };
}

export function listTechnicalSupportCompatibility() {
  return db.prepare(`
    SELECT
      id,
      employee_id AS no,
      name,
      UPPER(role) AS unit,
      is_active,
      created_at
    FROM users
    WHERE is_active = 1
      AND role IN ('technician', 'noc')
    ORDER BY ${USER_ROLE_PRIORITY}, name
  `).all();
}

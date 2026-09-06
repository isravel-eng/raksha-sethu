import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { AppError, asyncHandler } from '../errors.js';
import { asEmail, asPassword, asRole, requireFields, asBoolean } from '../middleware/validate.js';

const router = Router();
const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function sanitizeUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    citizen_id: row.citizen_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

router.post('/register', asyncHandler(async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  if (!config.jwtSecret || config.jwtSecret === 'replace-with-a-long-random-secret') {
    throw new AppError(500, 'JWT_SECRET is not configured');
  }

  const email = asEmail(req.body.email);
  const password = asPassword(req.body.password);
  const role = asRole(req.body.role || 'citizen');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const created = await withTransaction(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at, updated_at`,
      [email, passwordHash, role]
    );
    const user = userResult.rows[0];
    let citizenId = null;

    if (role === 'citizen') {
      requireFields(req.body, ['name', 'district', 'state']);
      const consent = req.body.consent_given === undefined
        ? false
        : asBoolean(req.body.consent_given, 'consent_given');
      const citizen = await client.query(
        `INSERT INTO citizens (user_id, name, phone, district, state, consent_given)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [user.id, String(req.body.name).trim(), req.body.phone || null, req.body.district, req.body.state, consent]
      );
      citizenId = citizen.rows[0].id;
    }

    return { ...user, citizen_id: citizenId };
  });

  return res.status(201).json({
    token: signToken(created),
    user: sanitizeUser(created),
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const email = asEmail(req.body.email);
  const result = await query(
    `SELECT u.id, u.email, u.role, u.password_hash, u.created_at, u.updated_at, c.id AS citizen_id
     FROM users u
     LEFT JOIN citizens c ON c.user_id = u.id
     WHERE u.email = $1`,
    [email]
  );
  const row = result.rows[0];
  if (!row) {
    throw new AppError(401, 'Invalid email or password');
  }
  const ok = await bcrypt.compare(String(req.body.password), row.password_hash);
  if (!ok) {
    throw new AppError(401, 'Invalid email or password');
  }

  const user = sanitizeUser(row);
  return res.json({ token: signToken(user), user });
}));

export default router;

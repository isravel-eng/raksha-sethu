import jwt from 'jsonwebtoken';
import { config, STAFF_ROLES } from '../config.js';
import { query } from '../db.js';
import { AppError } from '../errors.js';
import { parseId } from './validate.js';

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    citizen_id: row.citizen_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'Authentication required');
    }
    if (!config.jwtSecret || config.jwtSecret === 'replace-with-a-long-random-secret') {
      throw new AppError(500, 'JWT_SECRET is not configured');
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new AppError(401, 'Invalid or expired token');
    }

    const result = await query(
      `SELECT u.id, u.email, u.role, u.created_at, u.updated_at, c.id AS citizen_id
       FROM users u
       LEFT JOIN citizens c ON c.user_id = u.id
       WHERE u.id = $1`,
      [payload.sub]
    );
    if (!result.rows[0]) {
      throw new AppError(401, 'User no longer exists');
    }

    req.user = publicUser(result.rows[0]);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}

export async function loadCitizenOr403(req, citizenId) {
  const id = parseId(citizenId, 'citizen_id');
  const result = await query('SELECT * FROM citizens WHERE id = $1', [id]);
  const citizen = result.rows[0];
  if (!citizen) {
    throw new AppError(404, 'Citizen not found');
  }
  if (req.user.role === 'citizen' && req.user.citizen_id !== citizen.id) {
    throw new AppError(403, 'Citizens may only access their own records');
  }
  return citizen;
}

export async function loadCaseOr403(req, caseId) {
  const id = parseId(caseId, 'case_id');
  const result = await query(
    `SELECT cases.*, citizens.user_id
     FROM cases
     JOIN citizens ON citizens.id = cases.citizen_id
     WHERE cases.id = $1`,
    [id]
  );
  const caseRow = result.rows[0];
  if (!caseRow) {
    throw new AppError(404, 'Case not found');
  }
  if (req.user.role === 'citizen' && req.user.citizen_id !== caseRow.citizen_id) {
    throw new AppError(403, 'Citizens may only access their own cases');
  }
  return caseRow;
}

export function staffOnly(req, _res, next) {
  if (!STAFF_ROLES.includes(req.user?.role)) {
    return next(new AppError(403, 'Staff role required'));
  }
  next();
}

import { AppError } from '../errors.js';
import { ALERT_STATUSES, CASE_STAGES, EVENT_TYPES, ROLES } from '../config.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body?.[field];
    return value === undefined || value === null || value === '';
  });
  if (missing.length) {
    throw new AppError(400, `Missing required fields: ${missing.join(', ')}`);
  }
}

export function parseId(value, name = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return id;
}

export function optionalId(value, name) {
  if (value === undefined || value === null || value === '') return null;
  return parseId(value, name);
}

export function asEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new AppError(400, 'Invalid email');
  }
  return email;
}

export function asRole(value) {
  const role = String(value || 'citizen');
  if (!ROLES.includes(role)) {
    throw new AppError(400, `Invalid role. Allowed: ${ROLES.join(', ')}`);
  }
  return role;
}

export function asPassword(value) {
  const password = String(value || '');
  if (password.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }
  return password;
}

export function asBoundedNumber(value, name, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new AppError(400, `${name} must be a number between ${min} and ${max}`);
  }
  return number;
}

export function asBoolean(value, name) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  throw new AppError(400, `${name} must be a boolean`);
}

export function asEventType(value) {
  const type = String(value || '').toUpperCase();
  if (!EVENT_TYPES.includes(type)) {
    throw new AppError(400, `event_type must be one of: ${EVENT_TYPES.join(', ')}`);
  }
  return type;
}

export function asCaseStage(value) {
  const stage = String(value || 'FIR').toUpperCase();
  if (!CASE_STAGES.includes(stage)) {
    throw new AppError(400, `case_stage must be one of: ${CASE_STAGES.join(', ')}`);
  }
  return stage;
}

export function asAlertStatus(value) {
  const status = String(value || '').toLowerCase();
  if (!ALERT_STATUSES.includes(status)) {
    throw new AppError(400, `status must be one of: ${ALERT_STATUSES.join(', ')}`);
  }
  return status;
}

export function asJsonObject(value, name) {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  throw new AppError(400, `${name} must be an object`);
}

export function asTimestamp(value) {
  if (value === undefined || value === null || value === '') return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'Invalid timestamp');
  }
  return date;
}

import 'dotenv/config';

const productionFrontendOrigins = [
  'https://raksha-setu-five.vercel.app',
  'https://raksha-setu-frontend.onrender.com',
];

const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  ...productionFrontendOrigins,
];

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  mlServiceUrl: (process.env.ML_SERVICE_URL || 'https://raksha-sethu-ml.onrender.com').replace(/\/$/, ''),
  mlTimeoutMs: Number(process.env.ML_TIMEOUT_MS || 10000),
  corsOrigins: [...new Set([...defaultCorsOrigins, ...configuredCorsOrigins])],
};

export const ROLES = [
  'citizen',
  'counsellor',
  'district_officer',
  'state_officer',
  'national_admin',
];

export const STAFF_ROLES = ROLES.filter((role) => role !== 'citizen');

export const EVENT_TYPES = [
  'FIR',
  'CHARGESHEET',
  'TRIAL_DATE',
  'HEARING_POSTPONED',
  'RELIEF',
  'THREAT_REPORTED',
];

export const CASE_STAGES = ['FIR', 'CHARGESHEET', 'TRIAL', 'RELIEF', 'CLOSED'];
export const ALERT_STATUSES = ['open', 'acknowledged', 'resolved'];

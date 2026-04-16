import { z } from 'zod';

const DEFAULT_JWT_SECRET = 'imms-dev-access-secret-change-me';
const DEFAULT_REFRESH_SECRET = 'imms-dev-refresh-secret-change-me';
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const runtimeSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  JWT_SECRET: z.string().trim().optional(),
  REFRESH_TOKEN_SECRET: z.string().trim().optional(),
  ALLOWED_ORIGINS: z.string().trim().optional(),
  TRUST_PROXY: z.union([z.literal('true'), z.literal('false')]).optional(),
  SQLITE_BUSY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(5000),
  SQLITE_SYNCHRONOUS: z.enum(['OFF', 'NORMAL', 'FULL', 'EXTRA']).default('NORMAL'),
  SQLITE_WAL_AUTOCHECKPOINT: z.coerce.number().int().min(100).max(100000).default(1000),
  BODY_LIMIT_MB: z.coerce.number().int().min(1).max(200).default(50),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(30000),
  KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(5000),
});

function normalizeOrigins(rawOrigins) {
  if (!rawOrigins) return DEFAULT_ALLOWED_ORIGINS;
  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildWarnings(config) {
  const warnings = [];

  if (!config.JWT_SECRET) {
    warnings.push('JWT_SECRET is not set. Development fallback secret is active.');
  }

  if (!config.REFRESH_TOKEN_SECRET) {
    warnings.push('REFRESH_TOKEN_SECRET is not set. Development fallback secret is active.');
  }

  if (!config.ALLOWED_ORIGINS) {
    warnings.push('ALLOWED_ORIGINS is not set. Default localhost origins are active.');
  }

  return warnings;
}

export function loadRuntimeConfig(env = process.env) {
  const parsed = runtimeSchema.safeParse(env);
  if (!parsed.success) {
    const error = new Error(`Invalid runtime configuration: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
    error.status = 500;
    throw error;
  }

  const raw = parsed.data;
  const config = {
    ...raw,
    JWT_SECRET: raw.JWT_SECRET || DEFAULT_JWT_SECRET,
    REFRESH_TOKEN_SECRET: raw.REFRESH_TOKEN_SECRET || DEFAULT_REFRESH_SECRET,
    TRUST_PROXY: raw.TRUST_PROXY === 'true',
    ALLOWED_ORIGINS_LIST: normalizeOrigins(raw.ALLOWED_ORIGINS),
    BODY_LIMIT: `${raw.BODY_LIMIT_MB}mb`,
  };

  const warnings = buildWarnings(raw);

  if (config.NODE_ENV === 'production') {
    if (!raw.JWT_SECRET || config.JWT_SECRET === DEFAULT_JWT_SECRET) {
      throw new Error('JWT_SECRET must be set to a non-default value in production.');
    }
    if (!raw.REFRESH_TOKEN_SECRET || config.REFRESH_TOKEN_SECRET === DEFAULT_REFRESH_SECRET) {
      throw new Error('REFRESH_TOKEN_SECRET must be set to a non-default value in production.');
    }
    if (!config.ALLOWED_ORIGINS_LIST.length) {
      throw new Error('ALLOWED_ORIGINS must define at least one trusted frontend origin in production.');
    }
  }

  return {
    config,
    warnings,
  };
}

const loaded = loadRuntimeConfig();

export const runtimeConfig = loaded.config;
export const runtimeWarnings = loaded.warnings;

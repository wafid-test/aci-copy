import 'dotenv/config';
import { z } from 'zod';

const FALLBACK_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/access_backend?schema=public';
const FALLBACK_JWT_SECRET = 'temporary-railway-fallback-secret';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().default('access_token'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_URLS: z.string().optional(),
  DEFAULT_ADMIN_NAME: z.string().default('Super Admin'),
  DEFAULT_ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default('12345678')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const envIssues: string[] = [];

if (!parsed.data.DATABASE_URL) {
  envIssues.push('DATABASE_URL is missing');
  process.env.DATABASE_URL = FALLBACK_DATABASE_URL;
}

if (!parsed.data.JWT_SECRET) {
  envIssues.push('JWT_SECRET is missing');
}

if (envIssues.length > 0) {
  console.warn('Starting with degraded environment configuration:', envIssues.join('; '));
}

export const env = {
  ...parsed.data,
  DATABASE_URL: parsed.data.DATABASE_URL ?? process.env.DATABASE_URL ?? FALLBACK_DATABASE_URL,
  JWT_SECRET: parsed.data.JWT_SECRET ?? FALLBACK_JWT_SECRET
};

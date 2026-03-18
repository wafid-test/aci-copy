import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthTokenPayload } from '../types/auth.js';

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';
import type { AuthResponse } from '@muzzle/shared';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export function validatePassword(pw: string): boolean {
  const expected = process.env.MUZZLE_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(pw);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function generateToken(): AuthResponse {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const token = jwt.sign({ exp: Math.floor(expires.getTime() / 1000) }, getJwtSecret());
  return { token, expiresAt: expires.toISOString() };
}

export function verifyToken(t: string): boolean {
  try {
    jwt.verify(t, getJwtSecret());
    return true;
  } catch (err) {
    if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
      return false;
    }
    throw err;
  }
}

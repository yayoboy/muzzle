import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export function validatePassword(pw: string): boolean {
  if (!process.env.MUZZLE_PASSWORD) return false;
  return pw === process.env.MUZZLE_PASSWORD;
}

export function generateToken() {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const token = jwt.sign({ exp: Math.floor(expires.getTime() / 1000) }, getJwtSecret());
  return { token, expiresAt: expires.toISOString() };
}

export function verifyToken(t: string): boolean {
  try {
    jwt.verify(t, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

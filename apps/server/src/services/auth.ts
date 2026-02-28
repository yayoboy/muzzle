const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'muzzle-secret';
export function validatePassword(pw: string): boolean { return pw === process.env.MUZZLE_PASSWORD; }
export function generateToken() {
  const expires = new Date(Date.now() + 24*60*60*1000);
  const token = jwt.sign({ exp: Math.floor(expires.getTime()/1000) }, JWT_SECRET);
  return { token, expiresAt: expires.toISOString() };
}
export function verifyToken(t: string): boolean { try { jwt.verify(t, JWT_SECRET); return true; } catch { return false; } }
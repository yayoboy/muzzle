"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = validatePassword;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'muzzle-secret';
function validatePassword(pw) { return pw === process.env.MUZZLE_PASSWORD; }
function generateToken() {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const token = jwt.sign({ exp: Math.floor(expires.getTime() / 1000) }, JWT_SECRET);
    return { token, expiresAt: expires.toISOString() };
}
function verifyToken(t) { try {
    jwt.verify(t, JWT_SECRET);
    return true;
}
catch {
    return false;
} }

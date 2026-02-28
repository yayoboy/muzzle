"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const auth_1 = require("../services/auth");
function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
        return res.status(401).json({ error: 'Missing token' });
    const token = header.slice(7);
    if (!(0, auth_1.verifyToken)(token))
        return res.status(401).json({ error: 'Invalid token' });
    next();
}

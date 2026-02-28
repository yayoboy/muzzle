"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../services/auth");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/login', (req, res) => {
    const { password } = req.body;
    if (!password)
        return res.status(400).json({ error: 'Password required' });
    if (!(0, auth_1.validatePassword)(password))
        return res.status(401).json({ error: 'Invalid password' });
    const { token, expiresAt } = (0, auth_1.generateToken)();
    res.json({ token, expiresAt });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express = require('express');
const cors = require('cors');
const { authRouter } = require('./routes/auth');
function createApp() {
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    return app;
}

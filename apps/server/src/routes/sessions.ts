import { Router } from 'express';
import { SessionManager } from '../services/sessions';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSessionSchema, sessionParamSchema, sendCommandSchema } from '../schemas/sessions';

export const sessionsRouter = Router();

sessionsRouter.use(authMiddleware);

sessionsRouter.post('/', validate(createSessionSchema), async (req, res, next) => {
  try {
    const { name } = req.body;
    const session = await SessionManager.createSession(name);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

sessionsRouter.get('/', async (req, res, next) => {
  try {
    const sessions = await SessionManager.listSessions();
    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

sessionsRouter.get('/:id', validate(sessionParamSchema), async (req, res, next) => {
  try {
    const session = await SessionManager.getSession(req.params.id);
    res.json(session);
  } catch (error) {
    next(error);
  }
});

sessionsRouter.delete('/:id', validate(sessionParamSchema), async (req, res, next) => {
  try {
    await SessionManager.deleteSession(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

sessionsRouter.get('/:id/attach', validate(sessionParamSchema), async (req, res, next) => {
  try {
    const url = await SessionManager.getSessionAttachUrl(req.params.id);
    res.json(url);
  } catch (error) {
    next(error);
  }
});

sessionsRouter.post('/:id/command', validate(sendCommandSchema), async (req, res, next) => {
  try {
    const { command } = req.body;
    await SessionManager.sendCommand(req.params.id, command);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

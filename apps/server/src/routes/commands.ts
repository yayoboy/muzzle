import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { loadProfiles } from '../services/commands';

export const commandsRouter = Router();

commandsRouter.use(authMiddleware);

commandsRouter.get('/', async (_req, res) => {
  try {
    const profiles = await loadProfiles();
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

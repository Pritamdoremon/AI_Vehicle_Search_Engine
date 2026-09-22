import { Router } from 'express';
import { createAuthController } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';

export function createAuthRoutes(): Router {
  const router = Router();
  const controller = createAuthController();

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.get('/me', authenticate, controller.me);

  return router;
}
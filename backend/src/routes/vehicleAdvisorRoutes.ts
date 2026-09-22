import { Router } from 'express';
import { createVehicleAdvisorController } from '../controllers/vehicleAdvisorController';
import { authenticate } from '../middleware/authenticate';

export function createVehicleAdvisorRoutes(): Router {
  const router = Router();
  const controller = createVehicleAdvisorController();

  // Dashboard users are logged in; JWT also ties optional history to the user.
  router.post('/', authenticate, controller.advise);

  return router;
}

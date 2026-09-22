import express from 'express';
import path from 'path';
import { pool } from './db/pool';
import { errorHandler } from './middleware/errorHandler';
import { VehicleRepository } from './repositories/vehicleRepository';
import { createAuthRoutes } from './routes/authRoutes';
import { createVehicleRoutes } from './routes/vehicleRoutes';
import { createUserRoutes } from './routes/userRoutes';
import { FilterParser, createFilterParser } from './services/llmFilterService';

export function createApp(repository = new VehicleRepository(pool), parser: FilterParser = createFilterParser()): express.Express {
  const app = express();

  // Built React app (Vite output). Run `npm run build` before production start.
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');

  app.use(express.json());
  app.use('/api/auth', createAuthRoutes());
  app.use('/api/user', createUserRoutes());
  app.use('/api/vehicles', createVehicleRoutes(repository, parser));
  app.use(express.static(frontendDist));
  app.use(errorHandler);
  return app;
}

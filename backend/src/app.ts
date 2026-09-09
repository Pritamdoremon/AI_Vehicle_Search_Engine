import express from 'express';
import path from 'path';
import { pool } from './db/pool';
import { errorHandler } from './middleware/errorHandler';
import { VehicleRepository } from './repositories/vehicleRepository';
import { createVehicleRoutes } from './routes/vehicleRoutes';
import { FilterParser, createFilterParser } from './services/llmFilterService';

export function createApp(repository = new VehicleRepository(pool), parser: FilterParser = createFilterParser()): express.Express {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));
  app.use('/api/vehicles', createVehicleRoutes(repository, parser));
  app.use(errorHandler);
  return app;
}
import express from 'express';
import path from 'path';
import { pool } from './db/pool';
import { errorHandler } from './middleware/errorHandler';
import { VehicleRepository } from './repositories/vehicleRepository';
import { createAuthRoutes } from './routes/authRoutes';
import { createVehicleRoutes } from './routes/vehicleRoutes';
import { createUserRoutes } from './routes/userRoutes';
import { createVehicleAdvisorRoutes } from './routes/vehicleAdvisorRoutes';
import { FilterParser, createFilterParser } from './services/llmFilterService';

export function createApp(repository = new VehicleRepository(pool), parser: FilterParser = createFilterParser()): express.Express {
  const app = express();

  app.use(express.json());

  // Separate frontend URL(s), comma-separated. Example:
  // FRONTEND_ORIGIN=https://my-ui.onrender.com,http://localhost:3000
  const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.use((request, response, next) => {
    const requestOrigin = request.headers.origin;

    if (requestOrigin && allowedOrigins.includes(requestOrigin.replace(/\/$/, ''))) {
      response.setHeader('Access-Control-Allow-Origin', requestOrigin);
    } else if (allowedOrigins.includes('*')) {
      response.setHeader('Access-Control-Allow-Origin', '*');
    } else if (allowedOrigins.length === 1) {
      // Keep previous behavior for a single configured origin
      response.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }

    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  });

  app.use('/api/auth', createAuthRoutes());
  app.use('/api/user', createUserRoutes());
  app.use('/api/vehicles', createVehicleRoutes(repository, parser));
  app.use('/api/vehicle-advisor', createVehicleAdvisorRoutes());

  // Only used for "one process" local/prod demos. Split Render deploy leaves this off.
  if (process.env.SERVE_FRONTEND === 'true') {
    const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
    app.use(express.static(frontendDist));
  }

  app.use(errorHandler);
  return app;
}

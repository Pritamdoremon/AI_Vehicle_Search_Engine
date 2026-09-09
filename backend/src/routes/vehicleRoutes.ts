import { Router } from 'express';
import { createVehicleController } from '../controllers/vehicleController';
import { VehicleRepository } from '../repositories/vehicleRepository';
import { VehicleSearchService } from '../services/vehicleSearchService';
import { FilterParser, OpenAiFilterParser } from '../services/llmFilterService';

export function createVehicleRoutes(repository: VehicleRepository, parser: FilterParser = new OpenAiFilterParser()): Router {
  const router = Router();
  const controller = createVehicleController(repository, new VehicleSearchService(repository, parser));

  router.post('/search', controller.search);
  router.get('/', controller.list);
  router.get('/:id', controller.findById);
  return router;
}
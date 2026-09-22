import { Router } from 'express';
import { createUserController } from '../controllers/userController';
import { authenticate } from '../middleware/authenticate';

export function createUserRoutes(): Router {
  const router = Router();
  const controller = createUserController();

  router.use(authenticate);

  router.post('/favourites', controller.addFavourite);
  router.get('/favourites', controller.getFavourites);
  router.delete('/favourites/:vehicleId', controller.removeFavourite);

  router.post('/search-history', controller.addSearchHistory);
  router.get('/search-history', controller.getSearchHistory);

  router.post('/saved-searches', controller.saveSearch);
  router.get('/saved-searches', controller.getSavedSearches);
  router.delete('/saved-searches/:id', controller.deleteSavedSearch);

  router.post('/saved-comparisons', controller.saveComparison);
  router.get('/saved-comparisons', controller.getSavedComparisons);
  router.delete('/saved-comparisons/:id', controller.deleteComparison);

  return router;
}
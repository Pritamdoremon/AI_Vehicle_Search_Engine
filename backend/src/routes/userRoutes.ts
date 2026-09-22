import { Router } from 'express';
import { createUserController } from '../controllers/userController';
import { authenticate } from '../middleware/authenticate';

export function createUserRoutes(): Router {
  const router = Router();
  const controller = createUserController();

  router.post(
    '/favourites',
    authenticate,
    controller.addFavourite
  );

  router.get(
    '/favourites',
    authenticate,
    controller.getFavourites
  );

  router.delete(
    '/favourites/:vehicleId',
    authenticate,
    controller.removeFavourite
  );

  router.post(
    '/search-history',
    authenticate,
    controller.addSearchHistory
  );

  router.get(
    '/search-history',
    authenticate,
    controller.getSearchHistory
  );

  router.post(
    '/saved-comparisons',
    authenticate,
    controller.saveComparison
  );

  router.get(
    '/saved-comparisons',
    authenticate,
    controller.getSavedComparisons
  );

  router.delete(
    '/saved-comparisons/:id',
    authenticate,
    controller.deleteComparison
  );

  return router;
}
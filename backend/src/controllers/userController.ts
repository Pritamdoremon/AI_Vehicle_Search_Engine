import { Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { AppError } from '../utils/errors';
import { AuthenticatedRequest } from '../middleware/authenticate';

function getUserId(request: AuthenticatedRequest): number {
  if (!request.userId) {
    throw new AppError(401, 'Authentication required.');
  }

  return request.userId;
}

export function createUserController() {
  return {
    addFavourite: async (
      request: AuthenticatedRequest,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const userId = getUserId(request);
        const vehicleId = Number(request.body.vehicleId);

        if (!Number.isInteger(vehicleId) || vehicleId < 1) {
          throw new AppError(400, 'Invalid vehicle id.');
        }

        const vehicle = await pool.query(
          'SELECT id FROM vehicles WHERE id = $1',
          [vehicleId]
        );

        if (vehicle.rows.length === 0) {
          throw new AppError(404, 'Vehicle not found.');
        }

        await pool.query(
          `
          INSERT INTO favourites (user_id, vehicle_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, vehicle_id) DO NOTHING
          `,
          [userId, vehicleId]
        );

        response.status(201).json({
          message: 'Vehicle added to favourites.'
        });
      } catch (error: unknown) {
        next(error);
      }
    },

    getFavourites: async (
      request: AuthenticatedRequest,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const userId = getUserId(request);

        const result = await pool.query(
          `
          SELECT
            v.id,
            v.make,
            v.model,
            v.variant,
            v.year,
            v.price,
            v.fuel_type AS "fuelType",
            v.transmission,
            v.body_type AS "bodyType",
            v.km_driven AS "kmDriven",
            v.safety_rating AS "safetyRating",
            v.seating_capacity AS "seatingCapacity",
            v.mileage,
            v.city,
            v.ownership
          FROM favourites f
          JOIN vehicles v
            ON v.id = f.vehicle_id
          WHERE f.user_id = $1
          ORDER BY f.created_at DESC
          `,
          [userId]
        );

        response.json({
          vehicles: result.rows
        });
      } catch (error: unknown) {
        next(error);
      }
    },

    removeFavourite: async (
      request: AuthenticatedRequest,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const userId = getUserId(request);
        const vehicleId = Number(request.params.vehicleId);

        if (!Number.isInteger(vehicleId) || vehicleId < 1) {
          throw new AppError(400, 'Invalid vehicle id.');
        }

        await pool.query(
          `
          DELETE FROM favourites
          WHERE user_id = $1 AND vehicle_id = $2
          `,
          [userId, vehicleId]
        );

        response.json({
          message: 'Vehicle removed from favourites.'
        });
      } catch (error: unknown) {
        next(error);
      }
    },

    addSearchHistory: async (
      request: AuthenticatedRequest,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const userId = getUserId(request);
        const query = String(request.body.query ?? '').trim();

        if (!query) {
          throw new AppError(400, 'Search query is required.');
        }

        await pool.query(
          `
          INSERT INTO search_history (user_id, query)
          VALUES ($1, $2)
          `,
          [userId, query]
        );

        response.status(201).json({
          message: 'Search saved.'
        });
      } catch (error: unknown) {
        next(error);
      }
    },

    getSearchHistory: async (
      request: AuthenticatedRequest,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const userId = getUserId(request);

        const result = await pool.query(
          `
          SELECT id, query, created_at
          FROM search_history
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 20
          `,
          [userId]
        );

        response.json({
          history: result.rows
        });
      } catch (error: unknown) {
        next(error);
      }
    },

    saveComparison: async (
      request: AuthenticatedRequest,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const userId = getUserId(request);

        const vehicleIds = Array.isArray(request.body.vehicleIds)
          ? request.body.vehicleIds.map(Number)
          : [];

        if (vehicleIds.length < 2 || vehicleIds.length > 3) {
          throw new AppError(
            400,
            'A comparison must contain 2 or 3 vehicles.'
          );
        }

        const uniqueIds = [...new Set(vehicleIds)];

        if (uniqueIds.length !== vehicleIds.length) {
          throw new AppError(
            400,
            'A comparison cannot contain duplicate vehicles.'
          );
        }

        const result = await pool.query(
          `
          SELECT id
          FROM vehicles
          WHERE id = ANY($1::int[])
          `,
          [uniqueIds]
        );

        if (result.rows.length !== uniqueIds.length) {
          throw new AppError(
            404,
            'One or more vehicles were not found.'
          );
        }

        const name =
          String(
            request.body.name ?? 'Vehicle comparison'
          ).trim() || 'Vehicle comparison';

        await pool.query(
          `
          INSERT INTO saved_comparisons
          (user_id, name, vehicle_ids)
          VALUES ($1, $2, $3)
          `,
          [userId, name, uniqueIds]
        );

        response.status(201).json({
          message: 'Comparison saved.'
        });
      } catch (error: unknown) {
        next(error);
      }
    },

    getSavedComparisons: async (
      request: AuthenticatedRequest,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const userId = getUserId(request);

        const result = await pool.query(
          `
          SELECT
            id,
            name,
            vehicle_ids,
            created_at
          FROM saved_comparisons
          WHERE user_id = $1
          ORDER BY created_at DESC
          `,
          [userId]
        );

        response.json({
          comparisons: result.rows
        });
      } catch (error: unknown) {
        next(error);
      }
    },

    deleteComparison: async (
      request: AuthenticatedRequest,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const userId = getUserId(request);
        const comparisonId = Number(request.params.id);

        if (!Number.isInteger(comparisonId) || comparisonId < 1) {
          throw new AppError(400, 'Invalid comparison id.');
        }

        await pool.query(
          `
          DELETE FROM saved_comparisons
          WHERE id = $1 AND user_id = $2
          `,
          [comparisonId, userId]
        );

        response.json({
          message: 'Comparison deleted.'
        });
      } catch (error: unknown) {
        next(error);
      }
    }
  };
}
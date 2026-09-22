import { Request, Response, NextFunction } from 'express';
import { VehicleRepository, VehicleSearchOptions } from '../repositories/vehicleRepository';
import { searchRequestSchema } from '../types/filters';
import { AppError } from '../utils/errors';
import { VehicleSearchService } from '../services/vehicleSearchService';

function parsePositiveInteger(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new AppError(400, 'Pagination values must be positive integers.');
  return parsed;
}

interface SearchOptionsInput {
  page?: unknown;
  limit?: unknown;
  sortBy?: unknown;
  sortOrder?: unknown;
}

function getSearchOptions(input: SearchOptionsInput): VehicleSearchOptions {
  const page = parsePositiveInteger(input.page, 1);
  const limit = parsePositiveInteger(input.limit, 20);
  if (limit > 100) throw new AppError(400, 'Limit cannot be greater than 100.');

  const sortBy = input.sortBy;
  const allowedSortBy = ['price', 'year', 'kmDriven', 'safetyRating', 'createdAt'];
  if (sortBy !== undefined && (typeof sortBy !== 'string' || !allowedSortBy.includes(sortBy))) {
    throw new AppError(400, 'Unsupported sort field.');
  }

  const sortOrder = input.sortOrder;
  if (sortOrder !== undefined && sortOrder !== 'asc' && sortOrder !== 'desc') {
    throw new AppError(400, 'Sort order must be asc or desc.');
  }

  return {
    page,
    limit,
    sortBy: (sortBy as VehicleSearchOptions['sortBy'] | undefined) ?? 'createdAt',
    sortOrder: (sortOrder as VehicleSearchOptions['sortOrder'] | undefined) ?? 'desc'
  };
}

export function createVehicleController(repository: VehicleRepository, searchService: VehicleSearchService) {
  return {
    search: async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const input = searchRequestSchema.parse({
          ...request.body,
          page: request.body?.page === undefined ? undefined : Number(request.body.page),
          limit: request.body?.limit === undefined ? undefined : Number(request.body.limit)
        });
        const options = getSearchOptions({
          page: input.page,
          limit: input.limit,
          sortBy: input.sortBy,
          sortOrder: input.sortOrder
        });
        response.json(await searchService.search(input.query, options, input.previousFilters));
      } catch (error: unknown) {
        next(error);
      }
    },
    list: async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const options = getSearchOptions(request.query);
        const result = await repository.search({}, options);
        response.json({ ...result, page: options.page, limit: options.limit, totalPages: Math.ceil(result.total / options.limit) });
      } catch (error: unknown) {
        next(error);
      }
    },
    findById: async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const id = Number(request.params.id);
        if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'Vehicle id must be a positive integer.');
        const vehicle = await repository.findById(id);
        if (!vehicle) throw new AppError(404, 'Vehicle not found.');

        const similarAveragePrice = await repository.getAveragePrice({
          bodyType: vehicle.bodyType,
          fuelType: vehicle.fuelType
        });

        response.json({
          ...vehicle,
          similarAveragePrice,
          priceDelta:
            similarAveragePrice === null
              ? null
              : vehicle.price - similarAveragePrice
        });
      } catch (error: unknown) {
        next(error);
      }
    }
  };
}
import { VehicleFilters, vehicleFiltersSchema } from '../types/filters';
import { Vehicle } from '../types/vehicle';
import { VehicleRepository, VehicleSearchOptions, VehicleSearchResult } from '../repositories/vehicleRepository';
import { FilterParser } from './llmFilterService';
import { AppError } from '../utils/errors';

export interface SearchResult extends VehicleSearchResult {
  filters: VehicleFilters;
  page: number;
  limit: number;
  totalPages: number;
}

function validateFilterRanges(filters: VehicleFilters): void {
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
    throw new AppError(400, 'Minimum price cannot be greater than maximum price.');
  }
  if (filters.minKmDriven !== undefined && filters.maxKmDriven !== undefined && filters.minKmDriven > filters.maxKmDriven) {
    throw new AppError(400, 'Minimum kilometres cannot be greater than maximum kilometres.');
  }
  if (filters.minYear !== undefined && filters.maxYear !== undefined && filters.minYear > filters.maxYear) {
    throw new AppError(400, 'Minimum year cannot be greater than maximum year.');
  }
}

/**
 * Simple weighted match score (no ML).
 * Weights used only when that filter is active:
 * Budget 30, Body Type 20, Km/Mileage 20, Transmission 10, Seats 10, Location 10.
 */
export function calculateMatchScore(vehicle: Vehicle, filters: VehicleFilters): number | null {
  let earned = 0;
  let possible = 0;

  if (filters.maxPrice !== undefined || filters.minPrice !== undefined) {
    possible += 30;
    if (filters.maxPrice !== undefined && vehicle.price <= filters.maxPrice) {
      // Cheaper under the same budget → slightly higher score (21–30).
      const ratio = filters.maxPrice > 0 ? vehicle.price / filters.maxPrice : 1;
      earned += Math.round(30 * (0.7 + 0.3 * (1 - Math.min(1, Math.max(0, ratio)))));
    } else if (filters.minPrice !== undefined && vehicle.price >= filters.minPrice) {
      earned += 25;
    }
  }

  if (filters.bodyType !== undefined) {
    possible += 20;
    if (vehicle.bodyType === filters.bodyType) {
      earned += 20;
    }
  }

  // "Mileage" weight maps to km driven filters (odometer), which exist in this project.
  if (filters.maxKmDriven !== undefined || filters.minKmDriven !== undefined) {
    possible += 20;
    if (filters.maxKmDriven !== undefined && vehicle.kmDriven <= filters.maxKmDriven) {
      const ratio = filters.maxKmDriven > 0 ? vehicle.kmDriven / filters.maxKmDriven : 1;
      earned += Math.round(20 * (0.7 + 0.3 * (1 - Math.min(1, Math.max(0, ratio)))));
    } else if (filters.minKmDriven !== undefined && vehicle.kmDriven >= filters.minKmDriven) {
      earned += 15;
    }
  }

  if (filters.transmission !== undefined) {
    possible += 10;
    if (vehicle.transmission === filters.transmission) {
      earned += 10;
    }
  }

  if (filters.seatingCapacity !== undefined) {
    possible += 10;
    if (vehicle.seatingCapacity === filters.seatingCapacity) {
      earned += 10;
    }
  }

  if (filters.city !== undefined) {
    possible += 10;
    if (vehicle.city === filters.city) {
      earned += 10;
    }
  }

  if (possible === 0) {
    return null;
  }

  return Math.round((earned / possible) * 100);
}

export class VehicleSearchService {
  public constructor(
    private readonly repository: VehicleRepository,
    private readonly filterParser: FilterParser
  ) {}

  public async search(
    query: string,
    options: VehicleSearchOptions,
    previousFilters?: VehicleFilters
  ): Promise<SearchResult> {
    const parsed = vehicleFiltersSchema.parse(await this.filterParser.parse(query));

    // Follow-up search: keep old filters, let new ones overwrite.
    const filters = vehicleFiltersSchema.parse({
      ...(previousFilters || {}),
      ...parsed
    });

    validateFilterRanges(filters);

    if (Object.keys(filters).length === 0) {
      throw new AppError(400, 'The query is not specific enough to search vehicles.');
    }

    const result = await this.repository.search(filters, options);
    const vehicles = await this.enrichVehicles(result.vehicles, filters);

    return {
      vehicles,
      total: result.total,
      filters,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(result.total / options.limit)
    };
  }

  private async enrichVehicles(vehicles: Vehicle[], filters: VehicleFilters): Promise<Vehicle[]> {
    const avgCache = new Map<string, number | null>();

    const enriched: Vehicle[] = [];
    for (const vehicle of vehicles) {
      const cacheKey = `${vehicle.bodyType}|${vehicle.fuelType}`;
      let similarAveragePrice = avgCache.get(cacheKey);
      if (similarAveragePrice === undefined) {
        similarAveragePrice = await this.repository.getAveragePrice({
          bodyType: vehicle.bodyType,
          fuelType: vehicle.fuelType
        });
        avgCache.set(cacheKey, similarAveragePrice);
      }

      enriched.push({
        ...vehicle,
        matchScore: calculateMatchScore(vehicle, filters),
        similarAveragePrice,
        priceDelta:
          similarAveragePrice === null || similarAveragePrice === undefined
            ? null
            : vehicle.price - similarAveragePrice
      });
    }

    return enriched;
  }
}

export { validateFilterRanges };

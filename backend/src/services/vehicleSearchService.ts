import { VehicleFilters, vehicleFiltersSchema } from '../types/filters';
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

export class VehicleSearchService {
  public constructor(
    private readonly repository: VehicleRepository,
    private readonly filterParser: FilterParser
  ) {}

  public async search(query: string, options: VehicleSearchOptions): Promise<SearchResult> {
    const filters = vehicleFiltersSchema.parse(await this.filterParser.parse(query));
    validateFilterRanges(filters);

    if (Object.keys(filters).length === 0) {
      throw new AppError(400, 'The query is not specific enough to search vehicles.');
    }

    const result = await this.repository.search(filters, options);
    return {
      ...result,
      filters,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(result.total / options.limit)
    };
  }
}

export { validateFilterRanges };
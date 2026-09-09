import { z } from 'zod';
import { bodyTypes, fuelTypes, transmissionTypes } from './vehicle';

export const vehicleFiltersSchema = z.object({
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  bodyType: z.enum(bodyTypes).optional(),
  fuelType: z.enum(fuelTypes).optional(),
  transmission: z.enum(transmissionTypes).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minKmDriven: z.number().int().min(0).optional(),
  maxKmDriven: z.number().int().min(0).optional(),
  minSafetyRating: z.number().min(0).max(5).optional(),
  seatingCapacity: z.number().int().min(2).max(12).optional(),
  city: z.string().min(1).optional(),
  minYear: z.number().int().min(1990).max(2030).optional(),
  maxYear: z.number().int().min(1990).max(2030).optional(),
  ownership: z.number().int().min(1).optional()
}).strict();

export type VehicleFilters = z.infer<typeof vehicleFiltersSchema>;

export const searchRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['price', 'year', 'kmDriven', 'safetyRating', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
}).strict();

export type SearchRequest = z.infer<typeof searchRequestSchema>;
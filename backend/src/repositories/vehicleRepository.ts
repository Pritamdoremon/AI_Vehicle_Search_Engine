import { Pool, QueryResultRow } from 'pg';
import { VehicleFilters } from '../types/filters';
import { Vehicle } from '../types/vehicle';

export type VehicleSortBy = 'price' | 'year' | 'kmDriven' | 'safetyRating' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface VehicleSearchOptions {
  page: number;
  limit: number;
  sortBy: VehicleSortBy;
  sortOrder: SortOrder;
}

export interface VehicleSearchResult {
  vehicles: Vehicle[];
  total: number;
}

const sortColumns: Record<VehicleSortBy, string> = {
  price: 'price',
  year: 'year',
  kmDriven: 'km_driven',
  safetyRating: 'safety_rating',
  createdAt: 'created_at'
};

const vehicleColumns = `
  id, make, model, variant, year, price, fuel_type, transmission,
  body_type, km_driven, safety_rating, seating_capacity, mileage,
  city, ownership, created_at
`;

function mapVehicle(row: QueryResultRow): Vehicle {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    variant: row.variant,
    year: row.year,
    price: Number(row.price),
    fuelType: row.fuel_type,
    transmission: row.transmission,
    bodyType: row.body_type,
    kmDriven: row.km_driven,
    safetyRating: Number(row.safety_rating),
    seatingCapacity: row.seating_capacity,
    mileage: Number(row.mileage),
    city: row.city,
    ownership: row.ownership,
    createdAt: row.created_at
  };
}

function buildWhereClause(filters: VehicleFilters): { clause: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];

  const addCondition = (column: string, operator: string, value: unknown): void => {
    values.push(value);
    conditions.push(`${column} ${operator} $${values.length}`);
  };

  if (filters.make !== undefined) addCondition('make', '=', filters.make);
  if (filters.model !== undefined) addCondition('model', '=', filters.model);
  if (filters.bodyType !== undefined) addCondition('body_type', '=', filters.bodyType);
  if (filters.fuelType !== undefined) addCondition('fuel_type', '=', filters.fuelType);
  if (filters.transmission !== undefined) addCondition('transmission', '=', filters.transmission);
  if (filters.minPrice !== undefined) addCondition('price', '>=', filters.minPrice);
  if (filters.maxPrice !== undefined) addCondition('price', '<=', filters.maxPrice);
  if (filters.minKmDriven !== undefined) addCondition('km_driven', '>=', filters.minKmDriven);
  if (filters.maxKmDriven !== undefined) addCondition('km_driven', '<=', filters.maxKmDriven);
  if (filters.minSafetyRating !== undefined) addCondition('safety_rating', '>=', filters.minSafetyRating);
  if (filters.seatingCapacity !== undefined) addCondition('seating_capacity', '=', filters.seatingCapacity);
  if (filters.city !== undefined) addCondition('city', '=', filters.city);
  if (filters.minYear !== undefined) addCondition('year', '>=', filters.minYear);
  if (filters.maxYear !== undefined) addCondition('year', '<=', filters.maxYear);
  if (filters.ownership !== undefined) addCondition('ownership', '=', filters.ownership);

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
}

export class VehicleRepository {
  public constructor(private readonly database: Pool) {}

  public async search(filters: VehicleFilters, options: VehicleSearchOptions): Promise<VehicleSearchResult> {
    const { clause, values } = buildWhereClause(filters);
    const offset = (options.page - 1) * options.limit;
    const orderColumn = sortColumns[options.sortBy];
    const orderDirection = options.sortOrder === 'desc' ? 'DESC' : 'ASC';

    const vehiclesQuery = `SELECT ${vehicleColumns} FROM vehicles ${clause} ORDER BY ${orderColumn} ${orderDirection} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const countQuery = `SELECT COUNT(*)::integer AS total FROM vehicles ${clause}`;
    const [vehiclesResult, countResult] = await Promise.all([
      this.database.query(vehiclesQuery, [...values, options.limit, offset]),
      this.database.query(countQuery, values)
    ]);

    return {
      vehicles: vehiclesResult.rows.map(mapVehicle),
      total: countResult.rows[0].total
    };
  }

  public async findById(id: number): Promise<Vehicle | null> {
    const result = await this.database.query(`SELECT ${vehicleColumns} FROM vehicles WHERE id = $1`, [id]);
    return result.rows.length === 0 ? null : mapVehicle(result.rows[0]);
  }
}

export { buildWhereClause };
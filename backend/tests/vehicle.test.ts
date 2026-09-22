import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { VehicleRepository, VehicleSearchOptions, VehicleSearchResult } from '../src/repositories/vehicleRepository';
import { FilterParser, LocalFilterParser } from '../src/services/llmFilterService';
import { VehicleFilters } from '../src/types/filters';
import { Vehicle } from '../src/types/vehicle';
import { buildWhereClause } from '../src/repositories/vehicleRepository';
import { AppError } from '../src/utils/errors';

const vehicle: Vehicle = {
  id: 1, make: 'Tata', model: 'Nexon', variant: 'XZ', year: 2023, price: 1200000,
  fuelType: 'petrol', transmission: 'automatic', bodyType: 'suv', kmDriven: 12000,
  safetyRating: 5, seatingCapacity: 5, mileage: 17, city: 'Bangalore', ownership: 1,
  imageUrl: null,
  createdAt: new Date('2024-01-01')
};

class FakeRepository {
  public lastOptions?: VehicleSearchOptions;
  public constructor(private readonly result: VehicleSearchResult = { vehicles: [vehicle], total: 1 }) {}
  public async search(_filters: VehicleFilters, options: VehicleSearchOptions): Promise<VehicleSearchResult> {
    this.lastOptions = options;
    return this.result;
  }
  public async findById(id: number): Promise<Vehicle | null> {
    return id === vehicle.id ? vehicle : null;
  }
  public async getAveragePrice(): Promise<number | null> {
    return 1300000;
  }
}

class FakeParser implements FilterParser {
  public constructor(private readonly filters: VehicleFilters | Error) {}
  public async parse(_query: string): Promise<VehicleFilters> {
    if (this.filters instanceof Error) throw this.filters;
    return this.filters;
  }
}

describe('vehicle search API', () => {
  it('returns filters, vehicles, and pagination', async () => {
    const repository = new FakeRepository();
    const app = createApp(repository as unknown as VehicleRepository, new FakeParser({ bodyType: 'suv', maxPrice: 1500000 }));
    const response = await request(app).post('/api/vehicles/search').send({ query: 'SUVs under 15 lakh', page: 2, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.filters).toEqual({ bodyType: 'suv', maxPrice: 1500000 });
    expect(response.body.totalPages).toBe(1);
    expect(repository.lastOptions).toMatchObject({ page: 2, limit: 10 });
  });

  it('rejects an empty query', async () => {
    const app = createApp(new FakeRepository() as unknown as VehicleRepository, new FakeParser({}));
    const response = await request(app).post('/api/vehicles/search').send({ query: '   ' });
    expect(response.status).toBe(400);
  });

  it('returns a vehicle by id and 404 for a missing vehicle', async () => {
    const repository = new FakeRepository();
    const app = createApp(repository as unknown as VehicleRepository, new FakeParser({ bodyType: 'suv' }));
    expect((await request(app).get('/api/vehicles/1')).status).toBe(200);
    expect((await request(app).get('/api/vehicles/999')).status).toBe(404);
  });

  it('maps an LLM failure to a clean upstream error', async () => {
    const app = createApp(new FakeRepository() as unknown as VehicleRepository, new FakeParser(new AppError(502, 'The language model returned invalid JSON.')));
    const response = await request(app).post('/api/vehicles/search').send({ query: 'electric cars' });
    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'The language model returned invalid JSON.' });
  });

  it('uses parameterized conditions and no user-controlled SQL identifiers', () => {
    const result = buildWhereClause({ fuelType: 'diesel', maxPrice: 800000, city: 'Bangalore' });
    expect(result.clause).toBe('WHERE fuel_type = $1 AND price <= $2 AND city = $3');
    expect(result.values).toEqual(['diesel', 800000, 'Bangalore']);
  });

  it('parses common searches locally without an LLM', async () => {
    const parser = new LocalFilterParser();
    await expect(parser.parse('Diesel automatic SUVs under 15 lakh in Bangalore')).resolves.toEqual({
      bodyType: 'suv',
      fuelType: 'diesel',
      transmission: 'automatic',
      maxPrice: 1500000,
      city: 'Bangalore'
    });
  });
  it('merges previousFilters with newly parsed filters', async () => {
    const repository = new FakeRepository();
    const app = createApp(
      repository as unknown as VehicleRepository,
      new FakeParser({ transmission: 'automatic' })
    );
    const response = await request(app).post('/api/vehicles/search').send({
      query: 'Only automatic',
      previousFilters: { bodyType: 'suv', maxPrice: 1500000, city: 'Bangalore' }
    });

    expect(response.status).toBe(200);
    expect(response.body.filters).toEqual({
      bodyType: 'suv',
      maxPrice: 1500000,
      city: 'Bangalore',
      transmission: 'automatic'
    });
    expect(response.body.vehicles[0].matchScore).toBeTypeOf('number');
    expect(response.body.vehicles[0].similarAveragePrice).toBe(1300000);
  });
});
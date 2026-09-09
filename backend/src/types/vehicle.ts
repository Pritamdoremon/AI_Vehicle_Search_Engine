export const fuelTypes = ['petrol', 'diesel', 'electric', 'hybrid', 'cng'] as const;
export type FuelType = (typeof fuelTypes)[number];

export const transmissionTypes = ['manual', 'automatic', 'amt', 'cvt', 'dct'] as const;
export type Transmission = (typeof transmissionTypes)[number];

export const bodyTypes = ['hatchback', 'sedan', 'suv', 'muv', 'coupe', 'convertible'] as const;
export type BodyType = (typeof bodyTypes)[number];

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  variant: string;
  year: number;
  price: number;
  fuelType: FuelType;
  transmission: Transmission;
  bodyType: BodyType;
  kmDriven: number;
  safetyRating: number;
  seatingCapacity: number;
  mileage: number;
  city: string;
  ownership: number;
  createdAt: Date;
}
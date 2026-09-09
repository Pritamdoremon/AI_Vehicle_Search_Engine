import 'dotenv/config';
import { pool } from '../src/db/pool';

type SeedVehicle = [string, string, string, number, number, string, string, string, number, number, number, number, string, number];

const models: SeedVehicle[] = [
  ['Maruti Suzuki', 'Brezza', 'Zxi', 2022, 950000, 'petrol', 'automatic', 'suv', 24000, 4.5, 5, 19.8, 'Bangalore', 1],
  ['Hyundai', 'Creta', 'SX Diesel', 2021, 1420000, 'diesel', 'automatic', 'suv', 41000, 4.5, 5, 18.5, 'Delhi', 1],
  ['Tata', 'Nexon', 'XZ Plus EV', 2023, 1650000, 'electric', 'automatic', 'suv', 12000, 5, 5, 312, 'Mumbai', 1],
  ['Honda', 'City', 'ZX CVT', 2020, 1180000, 'petrol', 'cvt', 'sedan', 36000, 5, 5, 17.8, 'Pune', 2],
  ['Toyota', 'Innova Crysta', 'ZX 7 Seater', 2022, 2250000, 'diesel', 'automatic', 'muv', 28000, 5, 7, 15.6, 'Hyderabad', 1],
  ['Kia', 'Seltos', 'GTX Plus', 2021, 1550000, 'petrol', 'dct', 'suv', 33000, 3, 5, 16.8, 'Chennai', 1],
  ['Mahindra', 'XUV700', 'AX7 Diesel', 2022, 1980000, 'diesel', 'automatic', 'suv', 19000, 5, 7, 15.0, 'Bangalore', 1],
  ['Volkswagen', 'Virtus', 'Topline', 2023, 1450000, 'petrol', 'automatic', 'sedan', 9000, 5, 5, 18.4, 'Gurgaon', 1],
  ['Renault', 'Kwid', 'Climber', 2020, 480000, 'petrol', 'amt', 'hatchback', 44000, 2, 5, 22.0, 'Kolkata', 2],
  ['MG', 'ZS EV', 'Exclusive', 2023, 2450000, 'electric', 'automatic', 'suv', 8000, 5, 5, 461, 'Mumbai', 1]
];

async function seed(): Promise<void> {
  await pool.query('TRUNCATE TABLE vehicles RESTART IDENTITY');

  for (let cityIndex = 0; cityIndex < 6; cityIndex += 1) {
    for (const model of models) {
      const vehicle = [...model];
      vehicle[3] = Math.max(2018, Number(vehicle[3]) - cityIndex % 4);
      vehicle[4] = Number(vehicle[4]) - cityIndex * 25000;
      vehicle[8] = Number(vehicle[8]) + cityIndex * 11000;
      vehicle[12] = ['Bangalore', 'Delhi', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai'][cityIndex];
      vehicle[13] = (Number(vehicle[13]) + cityIndex) % 3 + 1;

      await pool.query(
        `INSERT INTO vehicles (make, model, variant, year, price, fuel_type, transmission, body_type, km_driven, safety_rating, seating_capacity, mileage, city, ownership)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        vehicle
      );
    }
  }

  console.log('Inserted 60 vehicles.');
  await pool.end();
}

seed().catch(async (error: unknown) => {
  console.error('Seed failed:', error);
  await pool.end();
  process.exitCode = 1;
});
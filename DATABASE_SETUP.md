# pgAdmin4 Database Setup

The application does not create or migrate the database. Create the table manually in pgAdmin4 using the structure below, then point the application at that database with `DATABASE_URL`.

## Database

Create a PostgreSQL database named `vehicle_search`.

## Table: `vehicles`

| Column | Data type | Length/precision | Not null | Default | Constraint |
| --- | --- | --- | --- | --- | --- |
| `id` | `integer` | - | Yes | identity / auto-increment | Primary key |
| `make` | `character varying` | 50 | Yes | - | - |
| `model` | `character varying` | 80 | Yes | - | - |
| `variant` | `character varying` | 120 | Yes | - | - |
| `year` | `integer` | - | Yes | - | 1990 to 2030 |
| `price` | `numeric` | 12,2 | Yes | - | Must be zero or greater |
| `fuel_type` | `character varying` | 20 | Yes | - | petrol, diesel, electric, hybrid, cng |
| `transmission` | `character varying` | 20 | Yes | - | manual, automatic, amt, cvt, dct |
| `body_type` | `character varying` | 20 | Yes | - | hatchback, sedan, suv, muv, coupe, convertible |
| `km_driven` | `integer` | - | Yes | - | Must be zero or greater |
| `safety_rating` | `numeric` | 2,1 | Yes | - | 0 to 5 |
| `seating_capacity` | `integer` | - | Yes | - | 2 to 12 |
| `mileage` | `numeric` | 5,2 | Yes | - | Must be zero or greater |
| `city` | `character varying` | 50 | Yes | - | - |
| `ownership` | `integer` | - | Yes | - | 1 or greater |
| `created_at` | `timestamp without time zone` | - | Yes | `CURRENT_TIMESTAMP` | - |

In pgAdmin4, set `id` to **Identity > Always** or **Identity > By default**, and mark it as the primary key. Set `created_at`'s default value to `CURRENT_TIMESTAMP`.

## Recommended indexes

Create these indexes in the table's **Indexes** section:

- `vehicles_price_idx` on `price`
- `vehicles_year_idx` on `year`
- `vehicles_city_body_type_idx` on `city, body_type`
- `vehicles_fuel_transmission_idx` on `fuel_type, transmission`

## Check constraints

Add these in **Constraints > Check**:

```text
year BETWEEN 1990 AND 2030
price >= 0
fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid', 'cng')
transmission IN ('manual', 'automatic', 'amt', 'cvt', 'dct')
body_type IN ('hatchback', 'sedan', 'suv', 'muv', 'coupe', 'convertible')
km_driven >= 0
safety_rating BETWEEN 0 AND 5
seating_capacity BETWEEN 2 AND 12
mileage >= 0
ownership >= 1
```

## Connect the application

Copy `.env.example` to `.env` and update:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/vehicle_search
```

The app expects the exact table and column names above. It reads from the table; it does not create, alter, truncate, or migrate it during startup.

## Optional sample data

After manually creating the table, you may run:

```bash
npm run seed:existing-table
```

This inserts 100 realistic vehicles into the existing table and clears existing rows first. Do not run it on a database containing data you want to keep. You can skip it and insert your own vehicles through pgAdmin4.
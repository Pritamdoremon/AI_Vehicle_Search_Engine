import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { pool } from '../src/db/pool';

async function seedFromSqlFile(): Promise<void> {
  const seedFilePath = path.join(__dirname, '..', '..', 'database', 'seed.sql');
  const sql = await fs.readFile(seedFilePath, 'utf8');

  await pool.query(sql);
  console.log('Inserted 100 vehicles from database/seed.sql.');
  await pool.end();
}

seedFromSqlFile().catch(async (error: unknown) => {
  console.error('SQL seed failed:', error);
  await pool.end();
  process.exitCode = 1;
});

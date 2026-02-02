// src/db.ts
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '../env.ts'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
})

export const db = drizzle(pool)

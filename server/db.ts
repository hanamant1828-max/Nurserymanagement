import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionConfig = process.env.PGHOST
  ? {
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || "5432"),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    }
  : { connectionString: process.env.DATABASE_URL };

if (!process.env.PGHOST && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL or PG environment variables must be set");
}

export const pool = new Pool(connectionConfig);
export const db = drizzle(pool, { schema });

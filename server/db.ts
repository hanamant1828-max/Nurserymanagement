import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString = "postgresql://neondb_owner:npg_T5EAU4uJzctO@ep-dry-lake-a6wzec6x.us-west-2.aws.neon.tech/neondb?sslmode=require";

export const pool = new Pool({ 
  connectionString,
  ssl: true
});
export const db = drizzle(pool, { schema });

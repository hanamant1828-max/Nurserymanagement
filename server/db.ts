import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

const dbPath = process.env.NODE_ENV === "production" 
  ? path.resolve(process.cwd(), "sqlite.db")
  : path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "sqlite.db");

export const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

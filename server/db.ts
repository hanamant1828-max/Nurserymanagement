import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

let dbPath: string;
if (process.env.NODE_ENV === "production") {
  dbPath = path.resolve(process.cwd(), "sqlite.db");
} else {
  // Use a string literal that esbuild won't try to transform or complain about
  // relative to the current working directory in dev
  dbPath = path.resolve(process.cwd(), "sqlite.db");
}

export const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

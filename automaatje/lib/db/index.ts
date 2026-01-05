import "server-only";

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Get database path - use absolute path for reliability
const dbPath = process.env.DATABASE_URL
  ? (path.isAbsolute(process.env.DATABASE_URL)
      ? process.env.DATABASE_URL
      : path.join(process.cwd(), process.env.DATABASE_URL))
  : path.join(process.cwd(), "sqlite.db");

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Singleton pattern using global to prevent multiple connections during build
// In development, module reloads can create multiple connections
const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

// Create or reuse SQLite database connection
if (!globalForDb.sqlite) {
  globalForDb.sqlite = new Database(dbPath);
  // Enable WAL mode for better concurrent access
  globalForDb.sqlite.pragma("journal_mode = WAL");
  // Set busy timeout to 10 seconds to handle concurrent access during builds
  globalForDb.sqlite.pragma("busy_timeout = 10000");
}

// Create or reuse Drizzle instance with schema
if (!globalForDb.db) {
  globalForDb.db = drizzle(globalForDb.sqlite, { schema });
}

export const db = globalForDb.db;

// Export schema for use in queries
export { schema };

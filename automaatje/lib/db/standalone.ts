/**
 * Standalone Database Connection
 *
 * For use in scripts that run outside of Next.js (job processors, migrations, etc.)
 * Does NOT import 'server-only' - can be used in any Node.js context
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Read DATABASE_URL from environment or use default
const databasePath = process.env.DATABASE_URL?.replace("file:", "") || "./sqlite.db";

// Singleton pattern using global to prevent multiple connections
const globalForDb = globalThis as unknown as {
  standaloneDb?: ReturnType<typeof drizzle<typeof schema>>;
  standaloneSqlite?: Database.Database;
};

// Create or reuse SQLite database connection
if (!globalForDb.standaloneSqlite) {
  globalForDb.standaloneSqlite = new Database(databasePath);
  // Enable WAL mode for better concurrency
  globalForDb.standaloneSqlite.pragma("journal_mode = WAL");
  // Set busy timeout to handle concurrent access
  globalForDb.standaloneSqlite.pragma("busy_timeout = 10000");
}

// Create or reuse Drizzle instance
if (!globalForDb.standaloneDb) {
  globalForDb.standaloneDb = drizzle(globalForDb.standaloneSqlite, { schema });
}

export const db = globalForDb.standaloneDb;
export { schema };

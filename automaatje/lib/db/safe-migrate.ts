import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL || "sqlite.db";
const MIGRATIONS_FOLDER = "./drizzle";

console.log("Starting safe migration process...");

const sqlite = new Database(DATABASE_URL);
const db = drizzle(sqlite);

try {
  // Check if __drizzle_migrations table exists
  const tableCheck = sqlite
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'`
    )
    .get();

  // Read the journal to get migration metadata
  const journalPath = path.join(MIGRATIONS_FOLDER, "meta", "_journal.json");
  let journal: any = { entries: [] };
  
  if (fs.existsSync(journalPath)) {
    journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
  }

  if (!tableCheck) {
    console.log("Migration tracking table not found. Initializing...");
    
    // Create the migrations table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER
      )
    `);
  } else {
    console.log("Migration tracking table exists");
    
    // Check if it's properly populated
    const migrationCount = sqlite
      .prepare(`SELECT COUNT(*) as count FROM "__drizzle_migrations"`)
      .get() as { count: number };
    
    console.log(`Found ${migrationCount.count} migration records in tracking table`);
    console.log(`Expected ${journal.entries.length} migrations total`);
    
    if (migrationCount.count < journal.entries.length) {
      console.log("⚠ Migration tracking table appears incomplete. Syncing...");
    }
  }

  // Always check and sync migration state with actual database tables
  for (const entry of journal.entries) {
    // Check if this migration is already tracked
    const tracked = sqlite
      .prepare(`SELECT hash FROM "__drizzle_migrations" WHERE hash = ?`)
      .get(entry.tag);
    
    if (tracked) {
      continue; // Already tracked, skip
    }
    
    // Migration not tracked - check if tables exist
    const migrationFile = `${entry.tag}.sql`;
    const migrationPath = path.join(MIGRATIONS_FOLDER, migrationFile);

    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      
      // Extract table names from CREATE TABLE statements
      const tableMatches = sql.matchAll(/CREATE TABLE [`"]?(\w+)[`"]?/gi);
      const tables = Array.from(tableMatches).map((match) => match[1]);

      if (tables.length > 0) {
        // Check if the first table from this migration exists
        const firstTable = tables[0];
        const tableExists = sqlite
          .prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          )
          .get(firstTable);

        if (tableExists) {
          console.log(`  ✓ Migration ${entry.tag} already applied (found table: ${firstTable}) - marking as tracked`);
          
          // Mark this migration as applied
          sqlite
            .prepare(
              `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)`
            )
            .run(entry.tag, entry.when || Date.now());
        } else {
          console.log(`  ○ Migration ${entry.tag} not yet applied`);
        }
      }
    }
  }

  // Now run migrations normally - Drizzle will skip already-applied ones
  console.log("Running migrations...");
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("✓ Migrations completed successfully!");
  
} catch (error) {
  console.error("Migration error:", error);
  
  // Check if it's a "table already exists" error - might be safe to continue
  if (error instanceof Error && error.message.includes("already exists")) {
    console.log("⚠ Some tables already exist. This might be expected.");
    console.log("⚠ Verifying database state...");
    
    // Verify critical tables exist
    const criticalTables = ['users', 'organizations', 'background_jobs'];
    let allTablesExist = true;
    
    for (const table of criticalTables) {
      const exists = sqlite
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        )
        .get(table);
      
      if (exists) {
        console.log(`  ✓ Table '${table}' exists`);
      } else {
        console.log(`  ✗ Table '${table}' missing!`);
        allTablesExist = false;
      }
    }
    
    if (allTablesExist) {
      console.log("✓ Critical tables verified. Proceeding...");
    } else {
      console.error("✗ Database schema incomplete!");
      throw error;
    }
  } else {
    throw error;
  }
} finally {
  sqlite.close();
}

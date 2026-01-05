#!/usr/bin/env node

/**
 * Initialize SQLite database with proper WAL mode
 * This ensures the database is ready for concurrent access during builds
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const dbPath = path.join(projectRoot, 'sqlite.db');

console.log('Initializing database...');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');
  console.log('✓ Enabled WAL mode');

  // Set busy timeout to handle concurrent access
  db.pragma('busy_timeout = 10000');
  console.log('✓ Set busy timeout to 10 seconds');

  // Checkpoint WAL file
  db.pragma('wal_checkpoint(FULL)');
  console.log('✓ Checkpointed WAL');

  // Close connection
  db.close();
  console.log('✓ Database initialized successfully');

} catch (error) {
  console.error('Error initializing database:', error);
  process.exit(1);
}

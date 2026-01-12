#!/usr/bin/env tsx

/**
 * One-time migration script to add avatar seeds to existing users
 * Run with: npx tsx scripts/migrate-avatars.ts
 */

import { addAvatarSeedToExistingUsers } from "../lib/db/migrations/add-avatar-seed";

async function main() {
  console.log("Running avatar migration...\n");

  const result = await addAvatarSeedToExistingUsers();

  if (result.success) {
    console.log("\nMigration completed successfully!");
    process.exit(0);
  } else {
    console.error("\nMigration failed:", result.error);
    process.exit(1);
  }
}

main();

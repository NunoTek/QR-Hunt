import { initializeDatabase, closeDatabase } from "./database.js";

async function main() {
  console.log("Running database migrations...");
  await initializeDatabase();
  console.log("Migrations complete.");
  closeDatabase();
}

main().catch(console.error);

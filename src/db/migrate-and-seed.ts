import { initializeDatabase } from "./init";
import { seedSampleOperationalData } from "./seed-sample-data";

async function run() {
  console.log("=== Initializing Sai Waters ERP Database ===");
  await initializeDatabase();
  console.log("=== Seeding Initial Operational and Accounting Data ===");
  await seedSampleOperationalData();
  console.log("=== Database Ready! ===");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed message:", err.message);
  console.error("Migration failed cause:", err.cause);
  if (err.cause?.message) console.error("Cause message:", err.cause.message);
  process.exit(1);
});

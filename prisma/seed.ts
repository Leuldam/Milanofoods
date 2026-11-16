import "dotenv/config";
import { seedPermissions } from "../src/lib/admin-seed";

async function main() {
  console.log("Seeding admin permissions...");
  await seedPermissions();
  console.log("Seeding complete!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

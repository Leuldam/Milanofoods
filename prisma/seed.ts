import "dotenv/config";
import { seedPermissionsAndOwner } from "../src/lib/admin-seed";

async function main() {
  console.log("Seeding admin permissions and owner...");
  await seedPermissionsAndOwner();
  console.log("Seeding complete!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

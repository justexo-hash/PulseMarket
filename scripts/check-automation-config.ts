import { db } from "../db/index";
import { automatedMarketsConfig } from "../shared/schema";

async function checkConfig() {
  try {
    const config = await db.select().from(automatedMarketsConfig).limit(1);
    if (config[0]) {
      console.log("Automation Config:");
      console.log(`  Enabled: ${config[0].enabled === 1 ? "YES" : "NO"}`);
      console.log(`  Last Run: ${config[0].lastRun || "Never"}`);
      console.log(`  Created: ${config[0].createdAt}`);
      console.log(`  Updated: ${config[0].updatedAt}`);
    } else {
      console.log("No automation config found in database");
    }
    process.exit(0);
  } catch (error) {
    console.error("Error checking config:", error);
    process.exit(1);
  }
}

checkConfig();


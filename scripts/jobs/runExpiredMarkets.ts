import "dotenv/config";
import { runExpiredMarketsJob } from "../../lib/jobs/expiredMarkets";

async function main() {
  console.log("[Jobs] Starting expired markets run...");
  await runExpiredMarketsJob();
  console.log("[Jobs] Expired markets run complete");
}

main().catch((error) => {
  console.error("[Jobs] Expired markets job failed:", error);
  process.exit(1);
});


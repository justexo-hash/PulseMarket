/**
 * Test script to fetch and display graduating tokens
 * Shows top 5 tokens with market cap, age, and name
 * 
 * Run with: npx tsx scripts/test-graduating-tokens.ts
 */

import "dotenv/config";
import { getGraduatingTokens } from "../server/solanaTracker";

async function testGraduatingTokens() {
  console.log("🔍 Fetching Graduating Tokens...\n");

  try {
    const tokens = await getGraduatingTokens();
    
    if (!tokens || tokens.length === 0) {
      console.log("❌ No graduating tokens found");
      return;
    }

    console.log(`Found ${tokens.length} graduating tokens\n`);
    console.log("=".repeat(80));
    console.log("TOP 5 GRADUATING TOKENS");
    console.log("=".repeat(80));
    console.log("");

    const top5 = tokens.slice(0, 5);

    top5.forEach((token, index) => {
      const marketCap = token.pools?.[0]?.marketCap?.usd || 0;
      const createdTime = token.token?.creation?.created_time || 0;
      const now = Math.floor(Date.now() / 1000);
      const ageSeconds = now - createdTime;
      
      // Calculate age in a readable format
      let ageStr = "";
      if (ageSeconds < 60) {
        ageStr = `${ageSeconds}s`;
      } else if (ageSeconds < 3600) {
        ageStr = `${Math.floor(ageSeconds / 60)}m`;
      } else if (ageSeconds < 86400) {
        ageStr = `${Math.floor(ageSeconds / 3600)}h`;
      } else {
        ageStr = `${Math.floor(ageSeconds / 86400)}d`;
      }

      // Format market cap
      let mcStr = "";
      if (marketCap >= 1000000) {
        mcStr = `$${(marketCap / 1000000).toFixed(2)}M`;
      } else if (marketCap >= 1000) {
        mcStr = `$${(marketCap / 1000).toFixed(2)}K`;
      } else {
        mcStr = `$${marketCap.toFixed(2)}`;
      }

      console.log(`${index + 1}. ${token.token.name || "Unknown"} (${token.token.symbol || "N/A"})`);
      console.log(`   Market Cap: ${mcStr}`);
      console.log(`   Age: ${ageStr}`);
      console.log(`   Address: ${token.token.mint}`);
      console.log("");
    });

    console.log("=".repeat(80));
    console.log("✅ Test complete!");
    
  } catch (error: any) {
    console.error("\n❌ Error fetching graduating tokens:", error.message);
    console.error(error);
    process.exit(1);
  }
}

testGraduatingTokens().then(() => {
  process.exit(0);
}).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});


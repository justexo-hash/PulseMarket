/**
 * Database Verification Script for Automated Markets
 * 
 * Runs SQL queries to verify:
 * - Markets table data integrity
 * - Config table state
 * - Logs table completeness
 * - Resolution tracking accuracy
 * 
 * Run with: npx tsx scripts/verify-database.ts
 */

import "dotenv/config";
import { db } from "../db/index";
import { sql } from "drizzle-orm";

async function verifyDatabase() {
  console.log("🔍 Running Database Verification for Automated Markets\n");

  try {
    // Test 3.1: Markets Table Verification
    console.log("=".repeat(60));
    console.log("Test 3.1: Markets Table Verification");
    console.log("=".repeat(60));
    
    const markets = await db.execute(sql`
      SELECT 
        id, 
        question, 
        category, 
        is_automated,
        token_address,
        token_address2,
        status,
        expires_at,
        created_at,
        image
      FROM markets 
      WHERE is_automated = 1 
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log(`\nFound ${markets.rows.length} automated markets:\n`);
    
    let checks = {
      allHaveIsAutomated: true,
      allMemecoins: true,
      battleMarketsHaveBothAddresses: true,
      singleTokenMarketsHaveOneAddress: true,
      expirationTimesSet: true,
      statusActive: true,
      imagesPresent: true,
    };

    markets.rows.forEach((market: any) => {
      console.log(`Market #${market.id}:`);
      console.log(`  Question: ${market.question?.substring(0, 60)}...`);
      console.log(`  Category: ${market.category} ${market.category === 'memecoins' ? '✓' : '✗'}`);
      console.log(`  is_automated: ${market.is_automated} ${market.is_automated === 1 ? '✓' : '✗'}`);
      console.log(`  Status: ${market.status}`);
      console.log(`  Token Address: ${market.token_address ? 'Present ✓' : 'Missing ✗'}`);
      console.log(`  Token Address 2: ${market.token_address2 ? 'Present ✓' : 'N/A'}`);
      console.log(`  Image: ${market.image ? 'Present ✓' : 'Missing ✗'}`);
      console.log(`  Expires At: ${market.expires_at ? new Date(market.expires_at).toLocaleString() : 'Missing ✗'}`);
      console.log("");

      if (market.is_automated !== 1) checks.allHaveIsAutomated = false;
      if (market.category !== 'memecoins') checks.allMemecoins = false;
      if (market.token_address2 && !market.token_address) checks.battleMarketsHaveBothAddresses = false;
      if (!market.token_address2 && !market.token_address) checks.singleTokenMarketsHaveOneAddress = false;
      if (!market.expires_at) checks.expirationTimesSet = false;
      if (market.status !== 'active') checks.statusActive = false;
      if (!market.image) checks.imagesPresent = false;
    });

    console.log("\nVerification Results:");
    console.log(`  [${checks.allHaveIsAutomated ? '✓' : '✗'}] All markets have is_automated = 1`);
    console.log(`  [${checks.allMemecoins ? '✓' : '✗'}] All markets in "memecoins" category`);
    console.log(`  [${checks.battleMarketsHaveBothAddresses ? '✓' : '✗'}] Battle markets have both addresses`);
    console.log(`  [${checks.singleTokenMarketsHaveOneAddress ? '✓' : '✗'}] Single token markets have address`);
    console.log(`  [${checks.expirationTimesSet ? '✓' : '✗'}] Expiration times are set`);
    console.log(`  [${checks.statusActive ? '✓' : '✗'}] Status is "active" for new markets`);
    console.log(`  [${checks.imagesPresent ? '✓' : '✗'}] Images are present`);

    // Test 3.2: Config Table Verification
    console.log("\n" + "=".repeat(60));
    console.log("Test 3.2: Config Table Verification");
    console.log("=".repeat(60));
    
    const config = await db.execute(sql`
      SELECT * FROM automated_markets_config
    `);

    if (config.rows.length === 0) {
      console.log("\n⚠️  No config record found!");
    } else {
      const cfg = config.rows[0] as any;
      console.log("\nConfig Record:");
      console.log(`  Enabled: ${cfg.enabled === 1 ? 'ON ✓' : 'OFF'}`);
      console.log(`  Last Run: ${cfg.last_run ? new Date(cfg.last_run).toLocaleString() : 'Never'}`);
      console.log(`  Created At: ${cfg.created_at ? new Date(cfg.created_at).toLocaleString() : 'N/A'}`);
    }

    // Test 3.3: Logs Table Verification
    console.log("\n" + "=".repeat(60));
    console.log("Test 3.3: Logs Table Verification");
    console.log("=".repeat(60));
    
    const logs = await db.execute(sql`
      SELECT 
        id,
        execution_time,
        market_id,
        question_type,
        token_address,
        token_address2,
        success,
        error_message,
        created_at
      FROM automated_markets_log 
      ORDER BY execution_time DESC 
      LIMIT 20
    `);

    console.log(`\nFound ${logs.rows.length} log entries:\n`);
    
    const successCount = logs.rows.filter((log: any) => log.success === true).length;
    const failureCount = logs.rows.filter((log: any) => log.success === false).length;
    
    console.log(`  Success: ${successCount}`);
    console.log(`  Failures: ${failureCount}`);
    console.log("\nRecent Logs:");
    
    logs.rows.slice(0, 5).forEach((log: any) => {
      console.log(`  [${log.success ? '✓' : '✗'}] ${log.question_type || 'error'} - Market #${log.market_id || 'N/A'} - ${new Date(log.execution_time).toLocaleString()}`);
      if (log.error_message) {
        console.log(`      Error: ${log.error_message}`);
      }
    });

    // Test 3.4: Resolution Tracking Verification
    console.log("\n" + "=".repeat(60));
    console.log("Test 3.4: Resolution Tracking Verification");
    console.log("=".repeat(60));
    
    const resolutions = await db.execute(sql`
      SELECT 
        id,
        market_id,
        market_type,
        target_value,
        token_address,
        token_address2,
        last_checked,
        status,
        created_at,
        updated_at
      FROM automated_market_resolutions 
      ORDER BY created_at DESC
    `);

    console.log(`\nFound ${resolutions.rows.length} resolution tracking records:\n`);
    
    resolutions.rows.slice(0, 5).forEach((res: any) => {
      console.log(`  Market #${res.market_id}:`);
      console.log(`    Type: ${res.market_type}`);
      console.log(`    Target: ${res.target_value}`);
      console.log(`    Status: ${res.status}`);
      console.log(`    Last Checked: ${res.last_checked ? new Date(res.last_checked).toLocaleString() : 'Never'}`);
      console.log("");
    });

    // Cross-Reference Verification
    console.log("\n" + "=".repeat(60));
    console.log("Cross-Reference Verification");
    console.log("=".repeat(60));
    
    const crossRef = await db.execute(sql`
      SELECT 
        m.id as market_id,
        m.question,
        m.is_automated,
        m.status,
        l.execution_time,
        l.question_type,
        l.success
      FROM markets m
      LEFT JOIN automated_markets_log l ON m.id = l.market_id
      WHERE m.is_automated = 1
      ORDER BY m.created_at DESC
      LIMIT 10
    `);

    console.log(`\nMarket-Log Cross-Reference (${crossRef.rows.length} markets):\n`);
    
    crossRef.rows.forEach((row: any) => {
      console.log(`  Market #${row.market_id}: ${row.question?.substring(0, 50)}...`);
      console.log(`    Logged: ${row.execution_time ? 'Yes ✓' : 'No ✗'}`);
      console.log(`    Type: ${row.question_type || 'N/A'}`);
      console.log("");
    });

    console.log("\n✅ Database verification complete!");
    
  } catch (error: any) {
    console.error("\n❌ Error during verification:", error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyDatabase().then(() => {
  process.exit(0);
}).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});


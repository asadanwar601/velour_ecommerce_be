/**
 * VELOUR QA AUTOMATION ORCHESTRATOR
 * Standard: production-qa-testing skill (< 250 LOC ceiling).
 */

import { runAdminQASuite } from './qa-admin-suite.mjs';
import { runCustomerQASuite } from './qa-customer-suite.mjs';

const API_BASE = process.env.API_URL || 'http://localhost:4000';
const WEB_BASE = process.env.WEB_URL || 'http://localhost:3000';

let totalTests = 0;
let passedTests = 0;

function logAssert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`  ✅ PASS: ${message}`);
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║ 🛡️  VELOUR FULL-STACK E2E QA AUTOMATION AGENT     ║');
  console.log('║ Target API : ' + API_BASE.padEnd(36) + ' ║');
  console.log('║ Target Web : ' + WEB_BASE.padEnd(36) + ' ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  let adminFixtures = { testProdId: null, createdCatId: null, testCouponCode: null };

  try {
    // 1. Run Admin QA Suite (Logins, Category/Subcategory Creation, Product Creation/Update, Inventory, CMS)
    adminFixtures = await runAdminQASuite(API_BASE, logAssert);

    // 2. Run Customer QA Suite (Browsing, Search, Coupon Validation, Order Checkout, Reviews)
    await runCustomerQASuite(API_BASE, WEB_BASE, logAssert, adminFixtures);

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`🎉 ALL ${passedTests}/${totalTests} FULL-STACK QA TESTS PASSED CLEANLY!`);
    console.log('═══════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n🚨 QA AUTOMATION AUDIT ENCOUNTERED FAILURE:');
    console.error(error.message);
    process.exit(1);
  }
}

main();

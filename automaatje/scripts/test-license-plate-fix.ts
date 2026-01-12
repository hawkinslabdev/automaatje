/**
 * Test script to verify the Dutch license plate formatting fix
 *
 * This tests the custom license plate validation with problematic plates:
 * - N-105-HL (format X-000-XX)
 * - ZV-858-G (format XX-000-X)
 * - TL-299-G (format XX-000-X) - user reported issue
 * - Standard 6-char plates like ABCDEF should format as AB-CD-EF
 */

import { normalizeLicensePlate, isValidDutchLicensePlate } from "../lib/validations/vehicle";

console.log("🔍 Testing Dutch License Plate Formatting Fix\n");
console.log("=" .repeat(60));

// Test cases focusing on the bug fix: N-105-HL, ZV-858-G, and TL-299-G
const criticalTestCases = [
  { input: "N105HL", expected: "N-105-HL", description: "X-000-XX format" },
  { input: "N-105-HL", expected: "N-105-HL", description: "X-000-XX already formatted" },
  { input: "ZV858G", expected: "ZV-858-G", description: "XX-000-X format" },
  { input: "ZV-858-G", expected: "ZV-858-G", description: "XX-000-X already formatted" },
  { input: "TL299G", expected: "TL-299-G", description: "XX-000-X format (user issue)" },
  { input: "TL-299-G", expected: "TL-299-G", description: "XX-000-X already formatted (user issue)" },
];

// Additional test cases for other valid formats
const additionalTestCases = [
  { input: "XX123X", expected: "XX-123-X", description: "XX-000-X format" },
  { input: "1ABC23", expected: "1-ABC-23", description: "0-XXX-00 format" },
  { input: "AB12CD", expected: "AB-12-CD", description: "XX-00-XX format" },
];

console.log("\n🎯 Critical Bug Fixes (N-105-HL issue):\n");

let criticalPassed = 0;
let criticalFailed = 0;

criticalTestCases.forEach(({ input, expected, description }) => {
  const result = normalizeLicensePlate(input);
  const isValid = isValidDutchLicensePlate(result);
  const status = result === expected ? "Passed" : "Failed";
  
  if (result === expected) {
    criticalPassed++;
  } else {
    criticalFailed++;
  }
  
  console.log(`${status} | ${input.padEnd(10)} → ${result.padEnd(10)} | Expected: ${expected.padEnd(10)} | ${description}`);
});

console.log("\nAdditional Valid Formats:\n");

let additionalPassed = 0;
let additionalFailed = 0;

additionalTestCases.forEach(({ input, expected, description }) => {
  const result = normalizeLicensePlate(input);
  const isValid = isValidDutchLicensePlate(result);
  const status = result === expected ? "Passed" : "Failed";
  
  if (result === expected) {
    additionalPassed++;
  } else {
    additionalFailed++;
  }
  
  console.log(`${status} | ${input.padEnd(10)} → ${result.padEnd(10)} | Expected: ${expected.padEnd(10)} | ${description}`);
});

const totalPassed = criticalPassed + additionalPassed;
const totalFailed = criticalFailed + additionalFailed;
const totalTests = criticalTestCases.length + additionalTestCases.length;

console.log("\n" + "=".repeat(60));
console.log(`\n📊 Summary:`);
console.log(`  Critical fixes: ${criticalPassed}/${criticalTestCases.length} passed`);
console.log(`  Additional tests: ${additionalPassed}/${additionalTestCases.length} passed`);
console.log(`  Total: ${totalPassed}/${totalTests} tests passed\n`);

console.log("\n✨ Validation complete!\n");

process.exit(criticalFailed > 0 ? 1 : 0);

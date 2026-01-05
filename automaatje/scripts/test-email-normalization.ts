/**
 * Manual test script for email normalization
 * Run with: tsx scripts/test-email-normalization.ts
 */

import { normalizeEmail } from '../lib/utils/email';

console.log('🧪 Testing Email Normalization\n');

const tests = [
  {
    name: 'Lowercase conversion',
    input: 'User@Example.Com',
    expected: 'user@example.com',
  },
  {
    name: 'Whitespace trimming',
    input: '  user@example.com  ',
    expected: 'user@example.com',
  },
  {
    name: 'Gmail dot removal',
    input: 'user.name@gmail.com',
    expected: 'username@gmail.com',
  },
  {
    name: 'Gmail multiple dots',
    input: 'u.s.e.r@gmail.com',
    expected: 'user@gmail.com',
  },
  {
    name: 'GoogleMail dot removal',
    input: 'user.name@googlemail.com',
    expected: 'username@googlemail.com',
  },
  {
    name: 'Plus addressing removal',
    input: 'user+tag@example.com',
    expected: 'user@example.com',
  },
  {
    name: 'Gmail plus addressing',
    input: 'user+newsletter@gmail.com',
    expected: 'user@gmail.com',
  },
  {
    name: 'Gmail dots AND plus addressing',
    input: 'user.name+tag@gmail.com',
    expected: 'username@gmail.com',
  },
  {
    name: 'Non-Gmail dots preserved',
    input: 'user.name@example.com',
    expected: 'user.name@example.com',
  },
  {
    name: 'Complex real-world case',
    input: 'John.Doe+Work@Gmail.Com',
    expected: 'johndoe@gmail.com',
  },
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  const result = normalizeEmail(test.input);
  const success = result === test.expected;
  
  if (success) {
    console.log(`✅ Test ${index + 1}: ${test.name}`);
    console.log(`   Input:    "${test.input}"`);
    console.log(`   Output:   "${result}"`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${test.name}`);
    console.log(`   Input:    "${test.input}"`);
    console.log(`   Expected: "${test.expected}"`);
    console.log(`   Got:      "${result}"`);
    failed++;
  }
  console.log('');
});

// Test that variations normalize to the same value
console.log('🔍 Testing duplicate detection\n');

const duplicates = [
  'john.doe@gmail.com',
  'johndoe@gmail.com',
  'John.Doe@gmail.com',
  'john.doe+work@gmail.com',
  'JohnDoe+newsletter@Gmail.Com',
  '  john.doe@gmail.com  ',
];

const normalized = duplicates.map(normalizeEmail);
const uniqueNormalized = new Set(normalized);

console.log('Original variations:');
duplicates.forEach((email, i) => {
  console.log(`  ${i + 1}. "${email}" -> "${normalized[i]}"`);
});
console.log('');

if (uniqueNormalized.size === 1) {
  console.log(`✅ All ${duplicates.length} variations normalize to: "${normalized[0]}"`);
  passed++;
} else {
  console.log(`❌ Expected 1 unique value, got ${uniqueNormalized.size}:`);
  uniqueNormalized.forEach(val => console.log(`   - "${val}"`));
  failed++;
}

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✨ All tests passed!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed\n');
  process.exit(1);
}

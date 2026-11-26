const assert = require('assert');
const fs = require('fs');

console.log('=== TEST SUITE: INTRODUCTORY & ASK FLOW VERIFICATION ===\n');

const indexCode = fs.readFileSync('index.js', 'utf8');

function extractSnippet(startStr, endStr) {
    const s = indexCode.indexOf(startStr);
    assert(s !== -1, `Could not find start: "${startStr}"`);
    const e = indexCode.indexOf(endStr, s);
    assert(e !== -1, `Could not find end: "${endStr}"`);
    return indexCode.substring(s, e);
}

// 1. Test isEscalationQuery
const fnSnippet = extractSnippet('function isEscalationQuery', '// ==========================================\n// 😡 DETEKSI CHAT DENGAN NADA MARAH');
eval(fnSnippet);

const escalationCases = [
    { text: 'saya indah', expected: false, desc: 'Introducing name must NOT escalate' },
    { text: 'saya ingin bertanya', expected: false, desc: '"saya ingin bertanya" must NOT escalate' },
    { text: 'ingin bertanya', expected: false, desc: '"ingin bertanya" must NOT escalate' },
    { text: 'mau tanya', expected: false, desc: '"mau tanya" must NOT escalate' },
    { text: 'saya mau nanya', expected: false, desc: '"saya mau nanya" must NOT escalate' },
    { text: 'bisa tanya', expected: false, desc: '"bisa tanya" must NOT escalate' },
    { text: 'saya mau ngobrol dengan petugs', expected: true, desc: 'Petugas typo must escalate' },
    { text: 'mau bicara dengan admin', expected: true, desc: 'Admin intent must escalate' },
    { text: 'hubungi cs', expected: true, desc: 'CS intent must escalate' },
    { text: 'bisa ngomong langsung', expected: true, desc: 'Live talk intent must escalate' }
];

escalationCases.forEach((tc, idx) => {
    const res = isEscalationQuery(tc.text);
    assert.strictEqual(res, tc.expected, `Escalation test ${idx + 1} failed for "${tc.text}": got ${res}, expected ${tc.expected}`);
    console.log(`[PASS] Escalation check ${idx + 1}: "${tc.text}" -> isEscalation: ${res} (${tc.desc})`);
});

// 2. Test isIntroductoryOrAskQuery
console.log('\n--- Test 2: isIntroductoryOrAskQuery ---');
const introSnippet = extractSnippet('function isIntroductoryOrAskQuery', '// Variabel Anti-Spam');
eval(introSnippet);

const introCases = [
    { text: 'saya indah', expected: true, desc: 'Self intro "saya indah"' },
    { text: 'nama saya budi', expected: true, desc: 'Self intro "nama saya budi"' },
    { text: 'halo saya indah', expected: true, desc: 'Greeting + intro "halo saya indah"' },
    { text: 'saya ingin bertanya', expected: true, desc: 'Intent "saya ingin bertanya"' },
    { text: 'ingin bertanya', expected: true, desc: 'Intent "ingin bertanya"' },
    { text: 'mau tanya', expected: true, desc: 'Intent "mau tanya"' },
    { text: 'saya mau nanya', expected: true, desc: 'Intent "saya mau nanya"' },
    { text: 'bisa tanya', expected: true, desc: 'Intent "bisa tanya"' },
    { text: 'bagaimana cara daftar izin kapal 30 GT', expected: false, desc: 'Real question must not be intro' },
    { text: 'apa syarat bantuan budidaya nila', expected: false, desc: 'Real question must not be intro' }
];

introCases.forEach((tc, idx) => {
    const res = isIntroductoryOrAskQuery(tc.text);
    assert.strictEqual(res, tc.expected, `Intro test ${idx + 1} failed for "${tc.text}": got ${res}, expected ${tc.expected}`);
    console.log(`[PASS] Intro check ${idx + 1}: "${tc.text}" -> isIntro: ${res} (${tc.desc})`);
});

console.log('\n=============================================');
console.log('🎉 ALL INTRODUCTORY & ASK TESTS PASSED 100%!');
console.log('=============================================\n');

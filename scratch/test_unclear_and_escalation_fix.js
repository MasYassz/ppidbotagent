const assert = require('assert');
const fs = require('fs');

console.log('=== TEST SUITE: UNCLEAR PROMPT & ESCALATION FIX ===\n');

// 1. Test isEscalationQuery directly from index.js
const indexCode = fs.readFileSync('index.js', 'utf8');

// Extract isEscalationQuery
const fnStart = indexCode.indexOf('function isEscalationQuery');
const fnEnd = indexCode.indexOf('// ==========================================\n// 😡 DETEKSI CHAT DENGAN NADA MARAH');
const fnCode = indexCode.substring(fnStart, fnEnd);
eval(fnCode);

const testCases = [
    { text: 'saya mau ngobrol dengan petugs', expected: true, desc: 'Exact user screenshot typo (petugs)' },
    { text: 'saya mau ngobrol dengan petugas', expected: true, desc: 'Exact sentence with correct spelling' },
    { text: 'mau ngobrol', expected: true, desc: 'Intent phrase (mau ngobrol)' },
    { text: 'bisa ngomong langsung', expected: true, desc: 'Intent phrase (bisa ngomong langsung)' },
    { text: 'chat sama orang', expected: true, desc: 'Intent phrase (chat sama orang)' },
    { text: 'ada orang ga disini', expected: true, desc: 'Intent phrase (ada orang)' },
    { text: 'petugs', expected: true, desc: 'Typo petugs' },
    { text: 'ptugas', expected: true, desc: 'Typo ptugas' },
    { text: 'petgas', expected: true, desc: 'Typo petgas' },
    { text: 'ngobrol dong min', expected: true, desc: 'Colloquial (ngobrol dong min)' },
    { text: 'mau bicara dengan admin', expected: true, desc: 'Admin intent' },
    { text: 'hubungi cs', expected: true, desc: 'CS intent' },
    { text: '1', expected: false, desc: 'Menu number 1 (handled at state level)' },
    // Safeguards for bantuan pemerintah
    { text: 'info bantuan kapal', expected: false, desc: 'Bantuan kapal is KKP program' },
    { text: 'bagaimana syarat bantuan benih ikan', expected: false, desc: 'Bantuan benih is KKP program' },
    { text: 'bantuan alat tangkap nelayan', expected: false, desc: 'Bantuan alat tangkap is KKP program' }
];

let passCount = 0;
testCases.forEach((tc, idx) => {
    const result = isEscalationQuery(tc.text);
    if (result === tc.expected) {
        console.log(`[PASS] Case ${idx + 1}: "${tc.text}" -> ${result} (${tc.desc})`);
        passCount++;
    } else {
        console.error(`[FAIL] Case ${idx + 1}: "${tc.text}" -> Got ${result}, expected ${tc.expected} (${tc.desc})`);
    }
});

console.log(`\nisEscalationQuery Results: ${passCount}/${testCases.length} Passed.\n`);
assert.strictEqual(passCount, testCases.length, 'All isEscalationQuery test cases must pass');

// 2. Test FAQ matching for "apakah ini bot"
console.log('--- Testing FAQ for Bot Identity ---');
const faqData = JSON.parse(fs.readFileSync('faq.json', 'utf8'));

const botQueries = [
    'apakah ini bot',
    'kamu bot',
    'ini bot ya',
    'apakah ini robot',
    'kamu siapa',
    'ini ai'
];

botQueries.forEach(q => {
    const matched = faqData.find(item => item.keywords.some(k => q.toLowerCase().includes(k)));
    assert(matched, `Query "${q}" should match FAQ entry`);
    assert(matched.answer.includes('Asisten Virtual AI resmi dari PPID Kementerian Kelautan dan Perikanan (KKP)'), 'Answer must explain identity');
    assert(matched.answer.includes('*BANTUAN*'), 'Answer must offer BANTUAN to human officer');
    assert(!matched.answer.includes('**'), 'Answer must NOT use double asterisks');
    console.log(`[PASS] FAQ matched for "${q}":\n"${matched.answer.substring(0, 75)}..."`);
});

// 3. Test UNCLEAR_PROMPT logic
console.log('\n--- Testing UNCLEAR_PROMPT Logic Flow ---');

function simulateUnclearPrompt(inputText) {
    const text = inputText.toLowerCase().trim();
    const wantsExit = ['0', 'selesai', 'batal', 'keluar', 'akhiri', 'tidak', 'bukan', 'tutup', 'stop', 'cukup', 'end', 'sudah'];
    const isExit = wantsExit.includes(text) || text === '0';

    const wantsOfficer = text === '1' ||
        isEscalationQuery(text) ||
        /\b(petug[a-z]*|ngobrol|bicara|ngomong|admin|cs|operator|manusia|orang|helpdesk|livechat|kontak|hubungi|sambung)\b/i.test(text);

    if (wantsOfficer) {
        return 'CONNECT_PETUGAS';
    } else if (isExit) {
        return 'CLOSE_SESSION';
    } else if (text === '2') {
        return 'PROMPT_KKP_QUESTION';
    } else {
        return 'ANSWER_WITH_AI_OR_FAQ';
    }
}

const flowTests = [
    { input: 'saya mau ngobrol dengan petugs', expected: 'CONNECT_PETUGAS' },
    { input: '1', expected: 'CONNECT_PETUGAS' },
    { input: 'hubungi petugas', expected: 'CONNECT_PETUGAS' },
    { input: 'mau bicara langsung', expected: 'CONNECT_PETUGAS' },
    { input: '2', expected: 'PROMPT_KKP_QUESTION' },
    { input: '0', expected: 'CLOSE_SESSION' },
    { input: 'selesai', expected: 'CLOSE_SESSION' },
    { input: 'batal', expected: 'CLOSE_SESSION' },
    { input: 'bagaimana cara daftar permohonan informasi publik', expected: 'ANSWER_WITH_AI_OR_FAQ' }
];

flowTests.forEach((ft, idx) => {
    const action = simulateUnclearPrompt(ft.input);
    assert.strictEqual(action, ft.expected, `Input "${ft.input}" should result in ${ft.expected}`);
    console.log(`[PASS] Flow Test ${idx + 1}: "${ft.input}" -> ${action}`);
});

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');

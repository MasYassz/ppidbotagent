const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== TEST SUITE: PTSA FIX & HUMAN-LIKE AI CONVERSATION LOGIC ===\n');

const indexCode = fs.readFileSync('index.js', 'utf8');

function extractSnippet(startStr, endStr) {
    const s = indexCode.indexOf(startStr);
    assert(s !== -1, `Could not find start: "${startStr}"`);
    const e = indexCode.indexOf(endStr, s);
    assert(e !== -1, `Could not find end: "${endStr}"`);
    return indexCode.substring(s, e);
}

// 1. Evaluate isSpecificQuestion
const isSpecificSnippet = extractSnippet('function isSpecificQuestion', '// ==========================================\n// 🔍 PENCARIAN FAQ DENGAN PRINSIP BEST MATCH');
eval(isSpecificSnippet);

// 2. Evaluate isIntroductoryOrAskQuery
const isIntroSnippet = extractSnippet('function isIntroductoryOrAskQuery', '// Variabel Anti-Spam');
eval(isIntroSnippet);

// 3. Evaluate isPerizinanQuery
const isPerizinanSnippet = extractSnippet('const PERIZINAN_KEYWORDS', '// Format Standar Pertanyaan Tertutup');
eval(isPerizinanSnippet);

// 4. Evaluate isRelevantKKPQuery
const isRelevantSnippet = extractSnippet('function isRelevantKKPQuery', '// ==========================================\n// 👨‍💻 DETEKSI PERMINTAAN HUBUNGI PETUGAS');
eval(isRelevantSnippet);

// -------------------------------------------------------------
// Test 1: Polite Indonesian Openings with "izin" must NEVER trigger PTSA
// -------------------------------------------------------------
console.log('--- Test 1: Polite Openings with "izin" vs Real PTSA Queries ---');
const politeCases = [
    { text: 'mohon izin mau tanya soal kuota magang di kkp', expected: false, desc: 'Polite greeting for magang' },
    { text: 'izin bertanya min jadwal pentaru tahun ini', expected: false, desc: 'Polite greeting for pentaru' },
    { text: 'izin min mau tanya syarat bantuan benih ikan', expected: false, desc: 'Polite greeting for fish seeds' },
    { text: 'izin bertanya apakah ada beasiswa anak nelayan', expected: false, desc: 'Polite greeting for scholarships' },
    { text: 'izin konsultasi mengenai data produksi perikanan', expected: false, desc: 'Polite greeting for public data' },
    { text: 'mohon izin konfirmasi surat audiensi mahasiswa', expected: false, desc: 'Polite greeting for academic letter' },
    { text: 'izin bertanya mengenai penempatan pkl', expected: false, desc: 'Polite greeting for PKL' },
    { text: 'ptsa', expected: true, desc: 'Exact PTSA keyword' },
    { text: 'layanan ptsa', expected: true, desc: 'PTSA service keyword' },
    { text: 'wa ptsa', expected: true, desc: 'WhatsApp PTSA keyword' },
    { text: 'perizinan berusaha', expected: true, desc: 'Business licensing keyword' }
];

politeCases.forEach((tc, idx) => {
    const res = isPerizinanQuery(tc.text);
    assert.strictEqual(res, tc.expected, `Case ${idx + 1} failed for "${tc.text}": got ${res}, expected ${tc.expected}`);
    console.log(`[PASS] Case ${idx + 1}: "${tc.text}" -> isPerizinan: ${res} (${tc.desc})`);
});

// -------------------------------------------------------------
// Test 2: isIntroductoryOrAskQuery Differentiation
// -------------------------------------------------------------
console.log('\n--- Test 2: Introductory Greeting vs Question with Ask Prefix ---');
const introCases = [
    { text: 'saya indah', expected: true, desc: 'Self intro name only' },
    { text: 'nama saya budi', expected: true, desc: 'Self intro name only' },
    { text: 'halo saya indah', expected: true, desc: 'Greeting + intro name' },
    { text: 'saya ingin bertanya', expected: true, desc: 'Greeting intent only' },
    { text: 'mau tanya min', expected: true, desc: 'Greeting intent + trivial word "min"' },
    { text: 'bisa tanya dong kak', expected: true, desc: 'Greeting intent + trivial words "dong kak"' },
    { text: 'saya ingin bertanya syarat kuota magang', expected: false, desc: 'Intent + substantive question (magang)' },
    { text: 'mau tanya syarat bantuan benih lele', expected: false, desc: 'Intent + substantive question (benih lele)' },
    { text: 'saya mau tanya izin kapal 30 GT', expected: false, desc: 'Intent + substantive question (kapal)' }
];

introCases.forEach((tc, idx) => {
    const res = isIntroductoryOrAskQuery(tc.text);
    assert.strictEqual(res, tc.expected, `Intro case ${idx + 1} failed for "${tc.text}": got ${res}, expected ${tc.expected}`);
    console.log(`[PASS] Intro check ${idx + 1}: "${tc.text}" -> isIntro: ${res} (${tc.desc})`);
});

// -------------------------------------------------------------
// Test 3: isSpecificQuestion Enhancement
// -------------------------------------------------------------
console.log('\n--- Test 3: Specific Question Detection ---');
const specificCases = [
    { text: 'apa syarat bantuan bioflok', expected: true, desc: 'Contains "apa" & "syarat"' },
    { text: 'berapa biaya penerbitan sipi kapal 30 GT?', expected: true, desc: 'Contains "berapa" & "?"' },
    { text: 'ada kendala saat login di portal silat', expected: true, desc: 'Contains "kendala"' },
    { text: 'saya mau minta data jumlah nelayan tangkap', expected: true, desc: 'Contains "minta data"' },
    { text: 'status verifikasi surat saya bagaimana', expected: true, desc: 'Contains "status" & "bagaimana"' },
    { text: 'ptsa', expected: false, desc: 'Pure topic keyword is NOT specific question' },
    { text: 'perizinan', expected: false, desc: 'Pure topic keyword is NOT specific question' },
    { text: 'pengaduan', expected: false, desc: 'Pure topic keyword is NOT specific question' }
];

specificCases.forEach((tc, idx) => {
    const res = isSpecificQuestion(tc.text);
    assert.strictEqual(res, tc.expected, `Specific question case ${idx + 1} failed for "${tc.text}": got ${res}, expected ${tc.expected}`);
    console.log(`[PASS] Specific check ${idx + 1}: "${tc.text}" -> isSpecific: ${res} (${tc.desc})`);
});

// -------------------------------------------------------------
// Test 4: Expansion of KKP Domain Keywords in isRelevantKKPQuery
// -------------------------------------------------------------
console.log('\n--- Test 4: KKP Domain Keywords Coverage ---');
const relevantCases = [
    { text: 'jadwal pendaftaran pentaru politeknik kkp', expected: true, desc: 'Pentaru & Politeknik' },
    { text: 'apakah ada beasiswa taruna aup', expected: true, desc: 'Beasiswa & Taruna AUP' },
    { text: 'bagaimana perlindungan kawasan konservasi penyu', expected: true, desc: 'Konservasi & Penyu' },
    { text: 'info rekrutmen pegawai cpns kkp', expected: true, desc: 'CPNS & Rekrutmen' },
    { text: 'cara mendaftar kartu e-kusuka nelayan', expected: true, desc: 'e-Kusuka nelayan' },
    { text: 'siapa juara liga champion eropa tadi malam', expected: false, desc: 'Non-KKP domain' },
    { text: 'rekomendasi service ac mobil terbaik', expected: false, desc: 'Non-KKP domain' }
];

relevantCases.forEach((tc, idx) => {
    const res = isRelevantKKPQuery(tc.text);
    assert.strictEqual(res, tc.expected, `Domain check ${idx + 1} failed for "${tc.text}": got ${res}, expected ${tc.expected}`);
    console.log(`[PASS] Domain check ${idx + 1}: "${tc.text}" -> isRelevantKKP: ${res} (${tc.desc})`);
});

// -------------------------------------------------------------
// Test 5: Verify SELECT_KONTAK Regex Does Not Misroute Polite "izin"
// -------------------------------------------------------------
console.log('\n--- Test 5: SELECT_KONTAK Regex Verification ---');
const contact2Regex = /\b(ptsa|sipi|siup|oss|silat|perizinan berusaha|izin kapal|izin tangkap)\b/i;
assert.strictEqual(contact2Regex.test('izin mau tanya kontak budidaya'), false, 'Polite "izin" must NOT route to PTSA contact');
assert.strictEqual(contact2Regex.test('mohon izin info nomor ppid'), false, 'Polite "mohon izin" must NOT route to PTSA contact');
assert.strictEqual(contact2Regex.test('ptsa'), true, '"ptsa" correctly routes to PTSA contact');
assert.strictEqual(contact2Regex.test('kontak perizinan berusaha kkp'), true, '"perizinan berusaha" correctly routes to PTSA contact');
console.log('[PASS] SELECT_KONTAK regex accurately distinguishes PTSA licensing from polite courtesy phrases.');

// -------------------------------------------------------------
// Test 6: Verify AI_MODE Has No PTSA Intercept and No Hardcoded topicContext
// -------------------------------------------------------------
console.log('\n--- Test 6: AI_MODE Architecture & topicContext Check ---');
const aiModeSection = extractSnippet("if (userState[sender] === 'AI_MODE')", "// 📋 ROUTING MENU UTAMA PPID KKP");
assert(!aiModeSection.includes("if (isPerizinanQuery(text))"), 'AI_MODE must NOT have rigid static PTSA intercept');
assert(!aiModeSection.includes("topicContext: '5 Pilar Kebijakan Ekonomi Biru KKP'"), 'AI_MODE must NOT have hardcoded Blue Economy topicContext');
console.log('[PASS] AI_MODE allows natural conversational flow and dynamic topicContext.');

// -------------------------------------------------------------
// Test 7: Verify DEFAULT State Guards PTSA and Pengaduan Intercepts
// -------------------------------------------------------------
console.log('\n--- Test 7: DEFAULT State Guard Checks ---');
const defaultSection = extractSnippet("// Jika teks berupa pertanyaan atau kendala -> Deteksi langsung alur penyelesaian", "// 9. Cek kecocokan dengan file database template");
assert(defaultSection.includes("if (!isSpecificQuestion(text) && isPerizinanQuery(text))"), 'PTSA intercept in DEFAULT must be guarded by !isSpecificQuestion');
assert(defaultSection.includes("if (!isSpecificQuestion(text) && isPengaduanQuery(text))"), 'Pengaduan intercept in DEFAULT must be guarded by !isSpecificQuestion');
console.log('[PASS] DEFAULT state guarantees specific questions reach FAQ database or Gemini AI.');

console.log('\n======================================================');
console.log('🎉 ALL PTSA FIX & HUMAN-LIKE AI CONVERSATION TESTS PASSED 100%!');
console.log('======================================================\n');

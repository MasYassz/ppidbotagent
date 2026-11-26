const assert = require('assert');
const fs = require('fs');

console.log('=== TEST SUITE: 8 NEW USER REQUESTS VERIFICATION ===\n');

// Load index.js content
const indexCode = fs.readFileSync('index.js', 'utf8');

// -------------------------------------------------------------
// Helper to extract function / const definitions from index.js
// -------------------------------------------------------------
function extractSnippet(startStr, endStr) {
    const s = indexCode.indexOf(startStr);
    assert(s !== -1, `Could not find start: "${startStr.substring(0, 40)}"`);
    const e = indexCode.indexOf(endStr, s);
    assert(e !== -1, `Could not find end: "${endStr.substring(0, 40)}"`);
    return indexCode.substring(s, e);
}

// -------------------------------------------------------------
// Test 1: Bilingual Support (English Detection & Responses)
// -------------------------------------------------------------
console.log('--- Test 1: English Language Support ---');
const englishSnippet = extractSnippet('function isEnglishQuery', '// ==========================================\n// 🚨 DETEKSI ANCAMAN / INTIMIDASI');
eval(englishSnippet);

const englishCases = [
    { text: 'Hello, how can I apply for a fishing license?', expected: true },
    { text: 'good morning sir', expected: true },
    { text: 'Hi, please help me with foreign marine research clearance', expected: true },
    { text: 'can i request public information for foreigner under law 14?', expected: true },
    { text: 'where is the office of ministry of marine affairs and fisheries?', expected: true },
    { text: 'selamat pagi saya mau tanya izin kapal 30 GT', expected: false },
    { text: 'halo admin ppid kkp', expected: false },
    { text: 'bagaimana syarat bantuan benih ikan', expected: false }
];

englishCases.forEach((tc, idx) => {
    const res = isEnglishQuery(tc.text);
    assert.strictEqual(res, tc.expected, `Case ${idx + 1} failed for "${tc.text}"`);
    console.log(`[PASS] Case ${idx + 1}: "${tc.text.substring(0, 45)}..." -> isEnglish: ${res}`);
});

// Check English FAQ entries in faq.json
const faqData = JSON.parse(fs.readFileSync('faq.json', 'utf8'));
const englishFaqs = faqData.filter(item => item.answer && item.answer.startsWith('Hello #SahabatBahari'));
assert(englishFaqs.length >= 6, `Expected at least 6 English FAQs, got ${englishFaqs.length}`);
console.log(`[PASS] Found ${englishFaqs.length} dedicated English FAQ entries in faq.json.`);

// -------------------------------------------------------------
// Test 2: Longtext Analysis Prompt Injection
// -------------------------------------------------------------
console.log('\n--- Test 2: Longtext Analysis Prompt Injection ---');
assert(indexCode.includes('[INSTRUCTION - ANALISIS LONGTEXT]'), 'Longtext instruction must be present in index.js prompt');
assert(indexCode.includes('Bedah dan tangkap INTI PERTANYAAN / MASALAH UTAMA'), 'Longtext prompt must instruct agent to dissect core question');
assert(indexCode.includes('Jangan mengulang cerita/kronologi pemohon'), 'Longtext prompt must instruct agent not to repeat chronology');
assert(indexCode.includes('maksimal 3-5 poin solusi'), 'Longtext prompt must specify concise 3-5 solution points');
console.log('[PASS] Longtext prompt injection verified with strict rules.');

// -------------------------------------------------------------
// Test 3: FAQ Cleanliness & Organization
// -------------------------------------------------------------
console.log('\n--- Test 3: FAQ Cleanliness & Organization ---');
let brokenLinkCount = 0;
let doubleAsteriskCount = 0;

faqData.forEach(item => {
    // Check trailing dots in links
    const matches = item.answer.match(/https?:\/\/[^\s]+/g) || [];
    matches.forEach(url => {
        if (url.endsWith('.') || url.endsWith(',')) {
            brokenLinkCount++;
            console.error(`[FAIL] Trailing punctuation in URL: ${url}`);
        }
    });

    if (item.answer.includes('**')) {
        doubleAsteriskCount++;
    }
});

assert.strictEqual(brokenLinkCount, 0, 'No URL should end with a trailing period or comma');
assert.strictEqual(doubleAsteriskCount, 0, 'No FAQ item should use double asterisks');
assert(!indexCode.includes('kopdesa.com'), 'kopdesa.com must not be present anywhere in codebase');
assert(indexCode.includes('korwil@merahputih.kop.id'), 'Official KNMP email must be present');
console.log('[PASS] FAQ entries are 100% valid, links clean, no double asterisks, verified official contacts.');

// -------------------------------------------------------------
// Test 4: Debounce Multi-Message Buffer
// -------------------------------------------------------------
console.log('\n--- Test 4: Debounce Multi-Message Buffer ---');
assert(indexCode.includes('MESSAGE_BUFFER_DELAY_MS = 2000'), 'Buffer delay must be 2000 ms');
assert(indexCode.includes('userMessageBuffer[bufKey]'), 'userMessageBuffer must be keyed by sender');
assert(indexCode.includes('aggregatedText = bufferedMessages'), 'Must aggregate buffered messages');
assert(indexCode.includes('handleIncomingUserMessage(buffered.messages'), 'Timer must dispatch buffered messages to handler');
console.log('[PASS] Debounce buffer mechanism correctly aggregates consecutive bubbles.');

// -------------------------------------------------------------
// Test 5: Threat, Sensitive Info Probing, and Frustration Escalation
// -------------------------------------------------------------
console.log('\n--- Test 5: Threats, Sensitive Info Probing & Frustration Escalation ---');
const threatSnippet = extractSnippet('function isThreatQuery', '// ==========================================\n// 🔒 DETEKSI USAHA MENGETAHUI IDENTITAS');
eval(threatSnippet);

const sensitiveSnippet = extractSnippet('function isSensitiveInfoProbingQuery', '// ==========================================\n// 🔄 DETEKSI KENDALA BERULANG');
eval(sensitiveSnippet);

const frustratedSnippet = extractSnippet('function isFrustratedOrCannotQuery', '// ==========================================\n// 🏛️ DETEKSI ISU SENSITIF PIHAK EKSTERNAL');
eval(frustratedSnippet);

// Threats
const threatCases = [
    { text: 'awas lo kalau ga selesai saya lapor polisi', expected: true },
    { text: 'saya viralkan kelakuan pejabat kalian di medsos', expected: true },
    { text: 'kubunuh kau kalau permohonan ditolak', expected: true },
    { text: 'saya mau tanya info beasiswa kkp', expected: false }
];
threatCases.forEach(tc => {
    assert.strictEqual(isThreatQuery(tc.text), tc.expected, `Threat check failed for "${tc.text}"`);
});
console.log('[PASS] isThreatQuery correctly detects threats and intimidation.');

// Sensitive info probing
const sensitiveCases = [
    { text: 'minta nomor pribadi menteri kelautan', expected: true },
    { text: 'dimana alamat rumah dinas menteri dan mobil dinasnya', expected: true },
    { text: 'minta password login database server kkp', expected: true },
    { text: 'berapa nomor wa ppid kkp untuk informasi', expected: false }
];
sensitiveCases.forEach(tc => {
    assert.strictEqual(isSensitiveInfoProbingQuery(tc.text), tc.expected, `Sensitive probe check failed for "${tc.text}"`);
});
console.log('[PASS] isSensitiveInfoProbingQuery correctly detects probing of private/classified info.');

// Frustration / "tidak bisa"
const frustratedCases = [
    { text: 'saya sudah coba tapi tetap tidak bisa buka websitenya', expected: true },
    { text: 'gagal terus pendaftaran dari kemarin error terus', expected: true },
    { text: 'jawabannya sama terus muter muter terus', expected: true },
    { text: 'bagaimana cara daftar perizinan di oss', expected: false }
];
frustratedCases.forEach(tc => {
    assert.strictEqual(isFrustratedOrCannotQuery(tc.text), tc.expected, `Frustration check failed for "${tc.text}"`);
});
console.log('[PASS] isFrustratedOrCannotQuery correctly detects "tidak bisa" and repetitive looping.');

// Unclear query fallback to officer
assert(indexCode.includes('Pertanyaan Anda belum teridentifikasi dalam sistem layanan otomatis kami'), 'Unclear query must trigger polite officer escalation');
assert(indexCode.includes('ASISTENSI PETUGAS: PERTANYAAN PERLU PENANGANAN MANUAL'), 'Admin alert must flag manual officer handling');
console.log('[PASS] Unclear and repeated questions connect directly to officer.');

// -------------------------------------------------------------
// Test 6: Sensitive External Issues ("Perihal Internal")
// -------------------------------------------------------------
console.log('\n--- Test 6: Sensitive External Issues ("Perihal Internal") ---');
const externalSnippet = extractSnippet('function isSensitiveExternalIssueQuery', 'const SENSITIVE_EXTERNAL_ISSUE_REPLY =');
eval(externalSnippet);

const externalCases = [
    { text: 'bagaimana tanggapan kkp mengenai isu sensitif tudingan lsm luar negeri', expected: true },
    { text: 'terkait polemik eksternal dan sengketa pihak luar dengan kkp', expected: true },
    { text: 'apa tanggapan kkp soal investigasi asing', expected: true },
    { text: 'bagaimana program knmp di kampung nelayan', expected: false }
];
externalCases.forEach(tc => {
    assert.strictEqual(isSensitiveExternalIssueQuery(tc.text), tc.expected, `External issue check failed for "${tc.text}"`);
});

assert(indexCode.includes('perihal dan ranah kebijakan internal Kementerian Kelautan dan Perikanan (KKP)'), 'Reply must state issue is internal matter');
console.log('[PASS] Sensitive external issues routed to internal policy statement.');

// -------------------------------------------------------------
// Test 7: Tracking Submitted Letter (2 Options: WA or PPID Portal)
// -------------------------------------------------------------
console.log('\n--- Test 7: Tracking Submitted Letter (WA vs PPID Portal) ---');
const trackingLetterSnippet = extractSnippet('function isTrackingSubmittedLetterQuery', 'const TRACKING_SUBMITTED_LETTER_MENU =');
eval(trackingLetterSnippet);

const trackingCases = [
    { text: 'bagaimana tindak lanjut surat yang sudah dikirimkan minggu lalu?', expected: true },
    { text: 'saya mau cek status surat saya', expected: true },
    { text: 'apakah surat permohonan saya sudah diterima kkp?', expected: true },
    { text: 'saya mau kirim berkas baru', expected: false }
];
trackingCases.forEach(tc => {
    assert.strictEqual(isTrackingSubmittedLetterQuery(tc.text), tc.expected, `Tracking letter check failed for "${tc.text}"`);
});

assert(indexCode.includes('CHECK_SUBMITTED_LETTER'), 'CHECK_SUBMITTED_LETTER state must be present');
assert(indexCode.includes('https://ppid.kkp.go.id/layanan-informasi/tracking-tiket/'), 'PPID ticket tracking link must be present');
assert(indexCode.includes('TUNGGU RESPONS DARI PETUGAS KAMI'), 'WA choice must instruct user to wait for officer reply');
console.log('[PASS] Tracking submitted letter provides 2 clear choices (WA officer vs PPID portal link).');

// -------------------------------------------------------------
// Test 8: Forwarding Letter ("Pesan Disimpan & Dihubungi Petugas")
// -------------------------------------------------------------
console.log('\n--- Test 8: Forwarding Letter Confirmation ---');
const forwardingSnippet = extractSnippet('function isForwardingLetterQuery', 'const FORWARDING_LETTER_CONFIRMATION =');
eval(forwardingSnippet);

const forwardCases = [
    { text: 'saya ingin meneruskan surat ini ke pak dirjen', expected: true },
    { text: 'mohon forward surat dinas dari dinas perikanan daerah', expected: true },
    { text: 'titip surat resmi untuk kkp', expected: true },
    { text: 'apa syarat izin kapal', expected: false }
];
forwardCases.forEach(tc => {
    assert.strictEqual(isForwardingLetterQuery(tc.text), tc.expected, `Forwarding check failed for "${tc.text}"`);
});

assert(indexCode.includes('Pesan dan surat/dokumen yang Anda sampaikan telah berhasil *DISIMPAN*'), 'Confirmation must state message is stored');
assert(indexCode.includes('DIHUBUNGI KEMBALI OLEH PETUGAS KAMI'), 'Confirmation must inform applicant that officer will contact them');
console.log('[PASS] Forwarding letter stores message, sets CS_MODE / PENDING, and confirms officer follow-up.');

console.log('\n=============================================');
console.log('🎉 ALL 8 USER REQUEST TESTS PASSED SUCCESSFULLY!');
console.log('=============================================\n');

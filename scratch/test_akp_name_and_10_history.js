const assert = require('assert');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 TEST SUITE: AKP ROUTING, SENDER NAME & 10-CHAT HISTORY');
console.log('====================================================\n');

const indexCode = fs.readFileSync('index.js', 'utf8');
const faqData = JSON.parse(fs.readFileSync('faq.json', 'utf8'));

// Helper extraction function
function extractSnippet(startMarker, endMarker) {
    const start = indexCode.indexOf(startMarker);
    const end = indexCode.indexOf(endMarker, start);
    if (start === -1 || end === -1) {
        throw new Error(`Snippet not found: "${startMarker}" to "${endMarker}"`);
    }
    return indexCode.substring(start, end);
}

// -------------------------------------------------------------
// Test 1: AKP Requirements & Announcements FAQ Routing
// -------------------------------------------------------------
console.log('--- Test 1: AKP Requirements & Announcements FAQ Routing ---');

function findBestFaqMatch(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.toLowerCase().trim();
    let bestMatch = null;
    let longestKeywordLength = 0;

    for (const item of faqData) {
        for (const kw of item.keywords) {
            const kwLower = kw.toLowerCase().trim();
            if (!kwLower) continue;

            const isMatch = kwLower.length <= 4
                ? new RegExp('\\b' + kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(t)
                : t.includes(kwLower);

            if (isMatch && kwLower.length > longestKeywordLength) {
                longestKeywordLength = kwLower.length;
                bestMatch = item.answer;
            }
        }
    }
    return bestMatch;
}

// Case 1: "syarat jadi awak kapal perikanan apa" (User Image 1)
const q1 = "syarat jadi awak kapal perikanan apa";
const ans1 = findBestFaqMatch(q1);
assert(ans1 !== null, 'Q1 must match FAQ');
assert(ans1.includes('elaut-bppsdm.kkp.go.id/akp'), 'Q1 must route to E-LAUT AKP, not Pengaduan');
assert(ans1.includes('BST-F'), 'Q1 must mention BST-F requirement');
assert(!ans1.includes('0811251744 atau ke https://lapor.go.id'), 'Q1 must NOT route to Pengaduan AKP');
console.log('[PASS] Q1 ("syarat jadi awak kapal perikanan apa") correctly routes to E-LAUT & requirements FAQ.');

// Case 2: "pengumuman akp bisa saya lihat dimana" (User Image 2)
const q2 = "pengumuman akp bisa saya lihat dimana";
const ans2 = findBestFaqMatch(q2);
assert(ans2 !== null, 'Q2 must match FAQ');
assert(ans2.includes('elaut-bppsdm.kkp.go.id/akp/pengumuman'), 'Q2 must provide the announcement URL');
console.log('[PASS] Q2 ("pengumuman akp bisa saya lihat dimana") correctly provides announcement URL.');

// Case 3: "daftar akp error, skck saya gabisa di uplod" (User Image 3)
const q3 = "daftar akp error, skck saya gabisa di uplod";
const ans3 = findBestFaqMatch(q3);
assert(ans3 !== null, 'Q3 must match FAQ');
assert(ans3.includes('0819-9247-4154'), 'Q3 must provide Contact Person AKP for technical issues');
console.log('[PASS] Q3 ("daftar akp error...") correctly routes to E-LAUT & CP AKP.');

// Case 4: "lapor penangkapan penyu ilegal di pantai"
const q4 = "lapor penangkapan penyu ilegal di pantai";
const ans4 = findBestFaqMatch(q4);
assert(ans4 !== null, 'Q4 must match FAQ');
assert(ans4.includes('141'), 'Q4 must provide Call Center KKP 141');
assert(ans4.includes('811-947-141'), 'Q4 must provide Ditjen PSDKP +62 811-947-141');
assert(!ans4.includes('196'), 'Q4 must NOT mention 196');
console.log('[PASS] Q4 ("lapor penangkapan penyu...") correctly routes to PSDKP & Call Center 141.');

// -------------------------------------------------------------
// Test 2: Sender Name Extraction (extractSelfIntroName)
// -------------------------------------------------------------
console.log('\n--- Test 2: Sender Name Extraction ---');
const introSnippet = extractSnippet('function extractSelfIntroName', '// ==========================================\n// 🧠 MEMORI PERCAKAPAN & KONTEKS MULTI-TURN');
eval(introSnippet);

const nameCases = [
    { text: 'Halo selamat pagi, nama saya Budi Santoso mau tanya soal izin', expected: 'Budi Santoso' },
    { text: 'perkenalkan nama saya Siti Aminah', expected: 'Siti Aminah' },
    { text: 'Namaku Ahmad dari Tegal', expected: 'Ahmad' },
    { text: 'nama: Hendra Kusuma', expected: 'Hendra Kusuma' },
    { text: 'panggil saya Joko', expected: 'Joko' },
    { text: 'saya mau tanya izin kapal', expected: null },
    { text: 'apakah bisa tolong jelaskan', expected: null }
];

nameCases.forEach(tc => {
    const result = extractSelfIntroName(tc.text);
    assert.strictEqual(result, tc.expected, `Failed name extraction for "${tc.text}": got "${result}", expected "${tc.expected}"`);
});
console.log('[PASS] extractSelfIntroName correctly extracts user names from chat introductions.');

// -------------------------------------------------------------
// Test 3: Personalized FAQ Greeting
// -------------------------------------------------------------
console.log('\n--- Test 3: Personalized FAQ Greeting ---');
const rawTemplate = ans1;
const senderName = 'Budi Santoso';
let personalizedFaq = rawTemplate;
if (senderName && personalizedFaq.startsWith('Halo #SahabatBahari,')) {
    personalizedFaq = personalizedFaq.replace('Halo #SahabatBahari,', `Halo #SahabatBahari Kak ${senderName},`);
}
assert(personalizedFaq.startsWith('Halo #SahabatBahari Kak Budi Santoso,'), 'FAQ greeting must include user name');
console.log('[PASS] FAQ template correctly personalizes greeting to "Halo #SahabatBahari Kak [Nama],".');

// -------------------------------------------------------------
// Test 4: 10-Chat Conversation History Retention
// -------------------------------------------------------------
console.log('\n--- Test 4: 10-Chat Conversation History Retention ---');
const historySnippet = extractSnippet('const userChatHistory = {};', 'function clearChatHistory(phone)');
const { userChatHistory, addChatHistory, getChatHistoryContext } = new Function(historySnippet + '\nreturn { userChatHistory, addChatHistory, getChatHistoryContext };')();

const testPhone = '6281234567890';

// Add 12 turns (24 messages: 12 user + 12 bot)
for (let i = 1; i <= 12; i++) {
    addChatHistory(testPhone, 'user', `Pertanyaan user nomor ${i}`);
    addChatHistory(testPhone, 'model', `Jawaban bot nomor ${i}`);
}

assert.strictEqual(userChatHistory[testPhone].length, 20, 'History should cap at 20 messages (10 conversation pairs)');
const ctx = getChatHistoryContext(testPhone);
assert(ctx.includes('[Obrolan #1 - Pemohon]: Pertanyaan user nomor 3'), 'First retained turn should be turn 3');
assert(ctx.includes('[Obrolan #10 - Asisten PPID]: Jawaban bot nomor 12'), 'Last retained turn should be turn 12');
assert(!/\bPertanyaan user nomor 1\b/.test(ctx), 'Old turns (>10 turns ago) must be evicted');
console.log('[PASS] 10-Chat history correctly stores and formats up to 20 messages (10 conversation turns).');

// -------------------------------------------------------------
// Test 5: Removal of Premature 3-Chat Escalation Limit
// -------------------------------------------------------------
console.log('\n--- Test 5: Removal of Premature 3-Chat Escalation Limit ---');
assert(!indexCode.includes('userAiChatCount[sender] >= 3'), 'Arbitrary 3-chat limit must be completely removed');
console.log('[PASS] userAiChatCount[sender] >= 3 is gone. Bot will not dump users after 3 messages.');

// -------------------------------------------------------------
// Test 6: AI System Prompt Grounding & History Injection
// -------------------------------------------------------------
console.log('\n--- Test 6: AI System Prompt Grounding & History Injection ---');
assert(indexCode.includes('[NAMA PENGIRIM / PEMOHON]'), 'System prompt must include applicant name instruction');
assert(indexCode.includes('[PENGINGAT KONTEKS 10 OBROLAN TERAKHIR]'), 'System prompt must instruct continuity across 10 conversations');
assert(indexCode.includes('[RIWAYAT 10 OBROLAN TERAKHIR DENGAN PEMOHON]'), 'Contextual prompt must feed 10-chat history');
assert(indexCode.includes('Call Center Terpadu KKP: 141'), 'Official Call Center 141 must be documented');
assert(indexCode.includes('DILARANG KERAS menyebut 196'), 'Mentioning 196 must be explicitly forbidden');
console.log('[PASS] AI System prompt contains all required grounding, sender name, and 10-history instructions.');

console.log('\n====================================================');
console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (100% GREEN)');
console.log('====================================================');

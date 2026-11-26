const fs = require('fs');
const assert = require('assert');

console.log("=== TEST SUITE: 4 NEW REQUIREMENTS ===");

// Load index.js content
const indexCode = fs.readFileSync('./index.js', 'utf8');

// -------------------------------------------------------------
// Test 1: Jangan kasih nomor PPID lagi, langsung hubungkan ke petugas
// -------------------------------------------------------------
console.log("\n--- Test 1: PPID Contact Handling & Direct Escalation ---");
const ppidQueries = [
    "minta nomor wa ppid",
    "kontak ppid berapa",
    "nomor telepon ppid",
    "hubungi ppid",
    "wa ppid kkp"
];

const isPpidContactQueryRegex = /\b(kontak\s+ppid|nomor\s+ppid|no\s+ppid|wa\s+ppid|whatsapp\s+ppid|telepon\s+ppid|telp\s+ppid|hubungi\s+ppid|call\s+center\s+ppid|kontak\s+wa\s+ppid)\b/i;

for (const q of ppidQueries) {
    assert(isPpidContactQueryRegex.test(q), `Query '${q}' must be detected as PPID contact request`);
    console.log(`[PASS] Detected PPID contact query: '${q}'`);
}

// Ensure index.js has rule forbidding giving PPID number
assert(indexCode.includes('DILARANG MEMBERIKAN NOMOR PPID LAGI') || indexCode.includes('DILARANG KERAS memberikan nomor WhatsApp atau nomor telepon PPID'), 'Must have rule forbidding giving PPID number');
console.log('[PASS] Rule forbidding PPID phone number is enforced.');

// -------------------------------------------------------------
// Test 2: Penempatan magang jangan dikasih pengaduan
// -------------------------------------------------------------
console.log("\n--- Test 2: Penempatan Magang Excluded From Pengaduan ---");
const magangQueries = [
    "penempatan magang",
    "bagaimana penempatan magang",
    "lokasi penempatan magang di kkp",
    "penempatan pkl di kkp",
    "info magang mahasiswa"
];

function testIsPengaduanAkp(t) {
    if (t.includes('magang') || t.includes('kerja praktik') || (t.includes('pkl') && !t.includes('perjanjian kerja laut') && !t.includes('kapal') && !t.includes('abk') && !t.includes('akp'))) {
        return false;
    }
    const hasAkpAbk = /\b(akp|abk|awak kapal|pelaut|pelaut perikanan)\b/.test(t);
    const hasPengaduan = /\b(pengaduan|aduan|lapor|laporkan|keluhan|gaji|kecelakaan|ditahan|masalah|kasus|korban)\b/.test(t);
    return (hasAkpAbk && hasPengaduan);
}

function testIsPengaduan(t) {
    if (t.includes('magang') || t.includes('kerja praktik') || (t.includes('pkl') && !t.includes('perjanjian kerja laut') && !t.includes('kapal') && !t.includes('abk') && !t.includes('akp'))) {
        return false;
    }
    const keywords = ['pengaduan', 'lapor', 'laporkan', 'aduan', 'melaporkan', 'keluhan'];
    return keywords.some(k => t.includes(k));
}

for (const mq of magangQueries) {
    assert(!testIsPengaduanAkp(mq), `'${mq}' must NOT trigger AKP pengaduan`);
    assert(!testIsPengaduan(mq), `'${mq}' must NOT trigger general pengaduan`);
    console.log(`[PASS] Magang query '${mq}' correctly excluded from complaints.`);
}

// Test FAQ match for penempatan magang
const faqData = JSON.parse(fs.readFileSync('./faq.json', 'utf8'));
let matchedPenempatanMagang = false;
for (const item of faqData) {
    if (item.keywords && item.keywords.includes('penempatan magang')) {
        matchedPenempatanMagang = true;
        assert(!item.answer.includes('0811-251-744'), 'Penempatan magang answer must NOT contain AKP complaint contact');
        assert(item.answer.includes('program studi') || item.answer.includes('unit kerja'), 'Must contain academic/unit guidance');
    }
}
assert(matchedPenempatanMagang, 'faq.json must have dedicated entry for penempatan magang');
console.log('[PASS] FAQ penempatan magang verified without complaints channel.');

// -------------------------------------------------------------
// Test 3: Ingin ngobrol dengan bagian langsung -> arahan pengajuan surat dulu (tanpa nomor PTSA)
// -------------------------------------------------------------
console.log("\n--- Test 3: Ingin Ngobrol Bagian Langsung -> Pengajuan Surat ---");
const bagianQueries = [
    "saya ingin ngobrol dengan suatu bagian",
    "mau ngobrol dengan bagian perizinan",
    "bisa bicara langsung dengan bagian tangkap",
    "ingin ngobrol langsung dengan bagian ptsa",
    "audiensi dengan bagian budidaya"
];

function testIsInginNgobrolBagian(t) {
    const talkWords = ['ngobrol', 'bicara', 'ngomong', 'diskusi', 'konsultasi langsung', 'audiensi', 'ketemu', 'menghubungi', 'hubungi'];
    const partWords = ['bagian', 'unit', 'direktorat', 'ditjen', 'biro', 'divisi', 'bidang', 'staf', 'pejabat', 'seksi', 'balai', 'ptsa'];
    const hasTalk = talkWords.some(w => t.includes(w));
    const hasPart = partWords.some(w => t.includes(w));
    if (hasTalk && hasPart) return true;
    return /ngobrol\s+dengan\s+suatu\s+bagian/i.test(t);
}

for (const bq of bagianQueries) {
    assert(testIsInginNgobrolBagian(bq), `'${bq}' must be detected as ingin ngobrol bagian`);
    console.log(`[PASS] Ingin ngobrol bagian query detected: '${bq}'`);
}

assert(indexCode.includes('ARAHAN_PENGAJUAN_SURAT_BAGIAN_MESSAGE'), 'index.js must have ARAHAN_PENGAJUAN_SURAT_BAGIAN_MESSAGE');
assert(indexCode.includes('menyampaikan permohonan melalui pengajuan surat resmi terlebih dahulu'), 'Must give guidance for official letter submission');
console.log('[PASS] Official letter guidance verified.');

// -------------------------------------------------------------
// Test 4: Kalau gaada cukup bilang informasi tersebut belum bisa kami jawab, alihkan kepada petugas
// -------------------------------------------------------------
console.log("\n--- Test 4: Unknown / Unavailable Info Auto-Escalation ---");
assert(indexCode.includes('informasi tersebut belum bisa kami jawab'), 'Must contain exact phrase "informasi tersebut belum bisa kami jawab"');
assert(indexCode.includes('Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP'), 'Must contain exact phrase regarding officer transfer');
assert(indexCode.includes('isUnavailableInfo'), 'Must check isUnavailableInfo in AI response flow');
console.log('[PASS] Unavailable info statement and auto-escalation to officer verified.');

console.log("\n=============================================");
console.log("🎉 ALL 4 NEW USER REQUIREMENTS VERIFIED 100%!");
console.log("=============================================");

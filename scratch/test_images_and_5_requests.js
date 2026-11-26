const fs = require('fs');
const assert = require('assert');

// Baca index.js
let indexCode = fs.readFileSync('index.js', 'utf8');

// Update formatReply in index.js to clean footer without duplicate Salam hormat
const formatReplyOld = `    // Bersihkan footer '💡 Apakah...' jika masih terbawa
    cleaned = cleaned.replace(/\\n*━━━━━━━━━━━━━━━━━━━━━━━━━\\n*💡\\s*\\*?Apakah[\\s\\S]*?(?:Salam hormat\\.|$)/i, '\\n\\nSalam hormat.').trim();
    cleaned = cleaned.replace(/\\n*───────────────────────────\\n*💡\\s*\\*?Has this information[\\s\\S]*?(?:Best regards\\.|$)/i, '\\n\\nBest regards.').trim();
    cleaned = cleaned.replace(/\\n+💡\\s*\\*?Apakah[\\s\\S]*?(?:Salam hormat\\.|$)/i, '\\n\\nSalam hormat.').trim();`;

const formatReplyNew = `    // Bersihkan footer '💡 Apakah...' jika masih terbawa
    cleaned = cleaned.replace(/\\n*━━━━━━━━━━━━━━━━━━━━━━━━━\\n*💡\\s*\\*?Apakah[\\s\\S]*$/i, '').trim();
    cleaned = cleaned.replace(/\\n*───────────────────────────\\n*💡\\s*\\*?Has this information[\\s\\S]*$/i, '').trim();
    cleaned = cleaned.replace(/\\n+💡\\s*\\*?Apakah[\\s\\S]*$/i, '').trim();`;

if (indexCode.includes(formatReplyOld)) {
    indexCode = indexCode.replace(formatReplyOld, formatReplyNew);
    fs.writeFileSync('index.js', indexCode, 'utf8');
    console.log('✓ Updated formatReply footer stripping');
}

// Simulasi lingkungan dasar
let tracker = {
    cleanWhatsAppFormatting: (t) => t.replace(/\*\*(.*?)\*\*/g, '*$1*'),
    recordConversation: () => {},
    closeUserSession: () => {}
};

function evalSnippet(regex) {
    const match = indexCode.match(regex);
    if (!match) throw new Error('Regex failed: ' + regex);
    return match[0];
}

const getFaqDataCode = evalSnippet(/function getFaqData[\s\S]*?\n\}/);
const findBestFaqMatchCode = evalSnippet(/function findBestFaqMatch[\s\S]*?\n\}/);
const isPengaduanAkpQueryCode = evalSnippet(/function isPengaduanAkpQuery[\s\S]*?\n\}/);
const isPengaduanQueryCode = evalSnippet(/function isPengaduanQuery[\s\S]*?\n\}/);
const isGenericReportInquiryCode = evalSnippet(/function isGenericReportInquiry[\s\S]*?\n\}/);
const formatReplyCode = evalSnippet(/function formatReply[\s\S]*?\n\}/);
const getResolutionFooterCode = evalSnippet(/function getResolutionFooter[\s\S]*?\n\}/);

let cachedFaqData = null;
eval(getFaqDataCode);
eval(findBestFaqMatchCode);
eval(isPengaduanAkpQueryCode);
eval(isPengaduanQueryCode);
eval(isGenericReportInquiryCode);
eval(formatReplyCode);
eval(getResolutionFooterCode);

console.log('=== RUNNING COMPREHENSIVE VERIFICATION SUITE ===\n');

// 1. TEST IMAGE 1: "syarat jadi awak kapal perikanan apa"
console.log('--- TEST 1: Image 1 - Syarat jadi awak kapal perikanan ---');
const q1 = 'syarat jadi awak kapal perikanan apa';
const isAkpPengaduan1 = isPengaduanAkpQuery(q1);
console.log('isPengaduanAkpQuery("syarat jadi awak kapal perikanan apa"):', isAkpPengaduan1);
assert.strictEqual(isAkpPengaduan1, false, 'Harus FALSE (bukan pengaduan)');

const match1 = findBestFaqMatch(q1);
console.log('findBestFaqMatch result snippet:', match1.substring(0, 120).replace(/\n/g, ' '));
assert.ok(match1.includes('elaut-bppsdm.kkp.go.id'), 'Harus menyertakan portal E-LAUT');
assert.ok(match1.includes('BST-F'), 'Harus menyertakan syarat BST-F');
assert.ok(!match1.includes('0811251744'), 'TIDAK boleh memberikan nomor pengaduan AKP!');
console.log('✓ PASS Test 1\n');

// 2. TEST IMAGE 2: "pengumuman akp bisa saya lihat dimana"
console.log('--- TEST 2: Image 2 - Pengumuman AKP ---');
const q2 = 'pengumuman akp bisa saya lihat dimana';
const isAkpPengaduan2 = isPengaduanAkpQuery(q2);
assert.strictEqual(isAkpPengaduan2, false);
const match2 = findBestFaqMatch(q2);
console.log('findBestFaqMatch result snippet:', match2.substring(0, 120).replace(/\n/g, ' '));
assert.ok(match2.includes('elaut-bppsdm.kkp.go.id'), 'Harus menyertakan portal E-LAUT');
assert.ok(!match2.includes('0811251744'), 'TIDAK boleh memberikan nomor pengaduan AKP!');
console.log('✓ PASS Test 2\n');

// 3. TEST IMAGE 3: "daftar akp error, skck saya gabisa di uplod"
console.log('--- TEST 3: Image 3 - Kendala teknis daftar AKP ---');
const q3 = 'daftar akp error, skck saya gabisa di uplod';
const isAkpPengaduan3 = isPengaduanAkpQuery(q3);
assert.strictEqual(isAkpPengaduan3, false);
const match3 = findBestFaqMatch(q3);
console.log('findBestFaqMatch result snippet:', match3.substring(0, 120).replace(/\n/g, ' '));
assert.ok(match3.includes('0819-9247-4154'), 'Harus menyertakan CP kendala pendaftaran AKP 0819-9247-4154');
console.log('✓ PASS Test 3\n');

// 4. TEST IMAGE 4: Header Formatting & Footer Removal
console.log('--- TEST 4: Image 4 - Format Header Kak Mila & Penghapusan Footer ---');
const rawReplyWithFooterAndTwoLineHeader = 
    `Halo #SahabatBahari,\n\n` +
    `Kak Mila Akmalia,\n\n` +
    `Pendaftaran, persyaratan, dan pengumuman Awak Kapal Perikanan (AKP) dapat diakses melalui portal resmi E-LAUT:\n` +
    `🔗 https://elaut-bppsdm.kkp.go.id/akp/\n\n` +
    `Salam hormat.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 Apakah penjelasan di atas sudah menyelesaikan kebutuhan Anda?\n` +
    `• Balas YA jika kendala sudah tuntas / selesai.\n` +
    `• Balas BANTUAN jika ingin terhubung langsung ke Petugas PPID.\n` +
    `• Ketik 0 untuk kembali ke Menu Utama.`;

const formattedReply = formatReply(rawReplyWithFooterAndTwoLineHeader);
console.log('Formatted output:\n' + formattedReply);

assert.ok(formattedReply.startsWith('Halo #SahabatBahari Kak Mila Akmalia,\n\n'), 'Header harus dalam 1 baris rapi!');
assert.ok(!formattedReply.includes('💡 Apakah penjelasan di atas'), 'Footer "💡 Apakah..." harus terhapus bersih!');
assert.ok(!formattedReply.includes('Balas YA jika kendala'), 'Instruksi "Balas YA" harus terhapus!');
assert.ok(formattedReply.trim().endsWith('Salam hormat.'), 'Harus berakhir di Salam hormat.');
const countSalam = (formattedReply.match(/Salam hormat\./g) || []).length;
assert.strictEqual(countSalam, 1, 'Hanya boleh ada tepat satu Salam hormat.');
console.log('✓ PASS Test 4\n');

// 5. TEST USER REQUEST #10 - POINT 1: Nomor SDMAO 0851-5889-8203
console.log('--- TEST 5: Biro SDMAO WhatsApp 0851-5889-8203 ---');
const qSdmao = 'nomor wa biro sdmao kkp berapa';
const matchSdmao = findBestFaqMatch(qSdmao);
console.log('matchSdmao snippet:', matchSdmao.substring(0, 150).replace(/\n/g, ' '));
assert.ok(matchSdmao.includes('0851-5889-8203'), 'Harus memuat nomor 0851-5889-8203');
assert.ok(indexCode.includes('0851-5889-8203'), 'index.js harus memuat 0851-5889-8203');
console.log('✓ PASS Test 5\n');

// 6. TEST USER REQUEST #10 - POINT 2: Generic Report vs Specific Report
console.log('--- TEST 6: Generic Report vs Specific Report ---');
const genericQueries = ['ingin laporan', 'mau lapor', 'saya mau laporan', 'lapor min', 'mau pengaduan'];
genericQueries.forEach(gq => {
    assert.strictEqual(isGenericReportInquiry(gq), true, `Query "${gq}" harus TRUE (Generic Report)`);
});

const specificQueries = [
    'saya melihat ada penangkapan penyu',
    'saya ingin bertanya terkait dengan penggunaan pulau',
    'ada penangkapan hiu di perairan',
    'ada bom ikan di raja ampat',
    'gaji abk saya belum dibayar',
    'pemanfaatan pulau kecil tanpa izin'
];
specificQueries.forEach(sq => {
    assert.strictEqual(isGenericReportInquiry(sq), false, `Query "${sq}" harus FALSE (Specific domain topic)`);
});

// Pastikan penyu langsung dapat PSDKP/PRL
const matchPenyu = findBestFaqMatch('saya melihat ada penangkapan penyu');
console.log('matchPenyu snippet:', matchPenyu.substring(0, 120).replace(/\n/g, ' '));
assert.ok(matchPenyu.includes('Ditjen PSDKP') || matchPenyu.includes('Hotline Pengendalian Ruang Laut'));

// Pastikan penggunaan pulau langsung dapat Hotline Ruang Laut
const matchPulau = findBestFaqMatch('saya ingin bertanya terkait dengan penggunaan pulau');
console.log('matchPulau snippet:', matchPulau.substring(0, 120).replace(/\n/g, ' '));
assert.ok(matchPulau.includes('877-6225-0001') || matchPulau.includes('Ditjen PKRL'));
console.log('✓ PASS Test 6\n');

// 7. TEST USER REQUEST #10 - POINT 3: Kunjungan & Pengajuan Surat ke GMB 4 Lt 1
console.log('--- TEST 7: Persuratan & Audiensi GMB IV Lt 1 ---');
assert.ok(indexCode.includes('Gedung Mina Bahari (GMB) IV Lantai 1'), 'Harus menyebutkan GMB IV Lantai 1');
assert.ok(indexCode.includes('Senin–Kamis pukul 08.00–15.30 WIB'), 'Harus menyebutkan jam operasional Senin-Kamis 08.00-15.30 WIB');
console.log('✓ PASS Test 7\n');

// 8. TEST USER REQUEST #10 - POINT 4: Satgas Pembangunan KNMP Instagram & Kalimantan Fakhri
console.log('--- TEST 8: Satgas KNMP Instagram & Kalimantan Fakhri ---');
const qKnmp = 'kontak satgas pembangunan knmp';
const matchKnmp = findBestFaqMatch(qKnmp);
console.log('matchKnmp snippet:', matchKnmp.substring(0, 150).replace(/\n/g, ' '));
assert.ok(matchKnmp.includes('https://www.instagram.com/p/DeB4FFpmnJg/?utm_source=ig_web_copy_link&gwpx=NTc4MTIwNjQ2YQ=='));
assert.ok(matchKnmp.includes('0852-8734-7969'));
assert.ok(matchKnmp.includes('Fakhri'));
console.log('✓ PASS Test 8\n');

// 9. TEST USER REQUEST #10 - POINT 5: Sensitive Probing Query without UU 14/2008 disclaimer
console.log('--- TEST 9: Sensitive Probing Query without UU 14/2008 disclaimer ---');
assert.ok(!indexCode.includes('sesuai ketentuan UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik (Kategori Informasi yang Dikecualikan)'), 'Disclaimer UU 14/2008 harus dihapus!');
assert.ok(indexCode.includes('Pesan Anda langsung kami alihkan dan hubungkan ke *Petugas Layanan PPID KKP* agar dapat dibantu lebih lanjut secara resmi'), 'Harus dialihkan langsung ke petugas PPID!');
console.log('✓ PASS Test 9\n');

console.log('====================================================');
console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (100% GREEN)');
console.log('====================================================');

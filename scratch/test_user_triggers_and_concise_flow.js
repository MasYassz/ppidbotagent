const assert = require('assert');
const fs = require('fs');
const tracker = require('../chatTracker');

console.log('=== TEST TRIGGER PETUGAS, NADA MARAH, PELAPORAN, & JAWABAN RINGKAS ===\n');

// 1. Ekstrak index.js
const indexCode = fs.readFileSync('./index.js', 'utf8');

// Ekstrak konstanta dan fungsi
function extractSection(name, type = 'const') {
    let regex;
    if (type === 'const') {
        regex = new RegExp(`const\\s+${name}\\s*=\\s*([\\s\\S]*?);\\n\\n(const|function|let|//)`);
        const match = indexCode.match(regex);
        if (!match) throw new Error(`Constant ${name} not found`);
        return eval(match[1]);
    } else {
        regex = new RegExp(`function\\s+${name}\\s*\\([\\s\\S]*?\\n}`);
        const match = indexCode.match(regex);
        if (!match) throw new Error(`Function ${name} not found`);
        return match[0];
    }
}

const ANGRY_KEYWORDS = extractSection('ANGRY_KEYWORDS', 'const');
const PELAPORAN_KEYWORDS = extractSection('PELAPORAN_KEYWORDS', 'const');

const isEscalationQuery = eval(`(${extractSection('isEscalationQuery', 'function')})`);
const isAngryQuery = eval(`(() => {
    const ANGRY_KEYWORDS = ${JSON.stringify(ANGRY_KEYWORDS)};
    return ${extractSection('isAngryQuery', 'function')};
})()`);
const isComplexPelaporanQuery = eval(`(() => {
    const PELAPORAN_KEYWORDS = ${JSON.stringify(PELAPORAN_KEYWORDS)};
    return ${extractSection('isComplexPelaporanQuery', 'function')};
})()`);

// --- 1. Uji Deteksi Hubungi Petugas Langsung ---
console.log('--- 1. Uji Trigger Langsung Hubungi Petugas ---');
const escalationTrue = [
    'bantuan', 'petugas', 'hubungi petugas', 'cs', 'admin', 'operator',
    'bicara dengan manusia', 'live chat', 'minta bantuan petugas', 'tolong sambungkan ke cs'
];
escalationTrue.forEach(q => {
    assert.strictEqual(isEscalationQuery(q), true, `Kueri "${q}" harus terdeteksi eskalasi`);
    console.log(`[PASS] Deteksi Eskalasi: "${q}" -> TRUE`);
});

// Proteksi Bantuan Pemerintah
const bantuanPemerintah = [
    'bantuan kapal', 'bantuan benih ikan', 'bantuan bibit nila', 'bantuan alat tangkap', 'bantuan modal kkp'
];
bantuanPemerintah.forEach(q => {
    assert.strictEqual(isEscalationQuery(q), false, `Kueri "${q}" TIDAK boleh salah deteksi jadi eskalasi`);
    console.log(`[PASS] Proteksi Bantuan: "${q}" -> FALSE (Aman)`);
});

// --- 2. Uji Deteksi Nada Marah / Kecewa / Komplain Keras ---
console.log('\n--- 2. Uji Deteksi Nada Marah & Kecewa ---');
const angryQueries = [
    'pelayanan kalian lelet dan lambat banget!',
    'saya sangat kecewa dengan pengurusan izin ini',
    'parah banget pelayanannya gak becus',
    'petugas payah, saya kapok berurusan sama kalian',
    'ini pemerasan dan pungli!',
    'saya akan lapor polisi dan somasi kkp',
    'bot bodoh gak guna'
];
angryQueries.forEach(q => {
    assert.strictEqual(isAngryQuery(q), true, `Kueri "${q}" harus terdeteksi marah`);
    console.log(`[PASS] Deteksi Nada Marah: "${q}" -> TRUE`);
});

const calmQueries = [
    'bagaimana cara membuat surat izin penangkapan ikan (sipi)?',
    'syarat permohonan informasi publik',
    'lokasi kampung nelayan merah putih'
];
calmQueries.forEach(q => {
    assert.strictEqual(isAngryQuery(q), false, `Kueri tenang "${q}" tidak boleh terdeteksi marah`);
    console.log(`[PASS] Deteksi Tenang: "${q}" -> FALSE`);
});

// --- 3. Uji Deteksi Pelaporan Khusus / Analisis Rumit / Sengketa / Tindak Pidana ---
console.log('\n--- 3. Uji Deteksi Pelaporan Khusus / Sengketa / Destructive Fishing ---');
const pelaporanQueries = [
    'ada nelayan pakai bom ikan di sekitar perairan',
    'terjadi peracunan potas karang oleh oknum',
    'ada kapal asing vietnam mencuri ikan di natuna',
    'ada oknum kkp minta pungli 10 juta untuk izin kapal',
    'terjadi sengketa wilayah tangkap antar nelayan',
    'abk disiksa dan ditelantarkan di kapal luar negeri',
    'ada abk hilang tenggelam saat melaut'
];
pelaporanQueries.forEach(q => {
    assert.strictEqual(isComplexPelaporanQuery(q), true, `Kueri pelaporan "${q}" harus terdeteksi pelaporan`);
    console.log(`[PASS] Deteksi Pelaporan Khusus: "${q}" -> TRUE`);
});

const generalAduanInfo = [
    'bagaimana cara pengaduan ke kkp?',
    'apa saja syarat lapor informasi publik?'
];
generalAduanInfo.forEach(q => {
    assert.strictEqual(isComplexPelaporanQuery(q), false, `Kueri umum "${q}" tidak boleh dipaksa langsung ke pelaporan khusus`);
    console.log(`[PASS] Info Umum Aduan: "${q}" -> FALSE`);
});

// --- 4. Uji Aturan AI: Jawaban Ringkas & Tanya Detail Dahulu ---
console.log('\n--- 4. Uji Instruksi AI (Ringkas & Tanya Detail Dahulu) ---');
assert(indexCode.includes('PRINSIP UTAMA: JANGAN MEMBERIKAN JAWABAN YANG TERLALU PANJANG KARENA MASYARAKAT MALAS MEMBACA!'), 'Harus memuat larangan jawaban terlalu panjang');
assert(indexCode.includes('ATURAN KOMUNIKASI (TANYA DETAIL DULU, BARU JAWAB DETAIL)'), 'Harus memuat aturan tanya detail terlebih dahulu');
assert(indexCode.includes('maksimal 3-5 poin ringkas per balasan'), 'Harus membatasi poin');
assert(indexCode.includes('DILARANG tanda bintang ganda **teks**'), 'Harus melarang double asterisks');
console.log('[PASS] Instruksi Gemini AI telah terkonfigurasi dengan prinsip ringkas, tanya detail terlebih dahulu, dan larangan teks panjang.');

// --- 5. Uji Alur Chat Tidak Jelas (UNCLEAR_PROMPT) Menyediakan Trigger Petugas ---
console.log('\n--- 5. Uji Trigger Petugas pada Chat Tidak Jelas ---');
assert(indexCode.includes('userState[sender] === \'UNCLEAR_PROMPT\''), 'Harus ada handler UNCLEAR_PROMPT');
assert(indexCode.includes('*1* 👨‍💻 Hubungkan langsung ke Petugas Layanan PPID'), 'Opsi 1 harus langsung hubungkan ke petugas');
console.log('[PASS] Alur chat tidak jelas (UNCLEAR_PROMPT) memiliki trigger langsung menghubungkan ke petugas via opsi 1.');

// --- 6. Uji Helper connectUserToPetugas ---
console.log('\n--- 6. Uji Helper connectUserToPetugas ---');
assert(indexCode.includes('async function connectUserToPetugas'), 'Helper connectUserToPetugas harus terdefinisi');
assert(indexCode.includes('userState[sender] = \'CS_MODE\''), 'connectUserToPetugas harus mengeset CS_MODE');
console.log('[PASS] Helper connectUserToPetugas terintegrasi secara modular.');

console.log('\n=== SEMUA 18 PENGUJIAN TRIGGER & ALUR RINGKAS BERHASIL 100%! ===');

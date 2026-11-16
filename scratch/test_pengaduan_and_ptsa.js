const fs = require('fs');

// Copy detection logic from index.js to test
const PERIZINAN_KEYWORDS = [
    'perizinan', 'izin', 'sipi', 'siup', 'surat izin', 'lisensi', 'permit',
    'oss', 'silat', 'pkkprl', 'izin usaha', 'izin kapal', 'izin penangkapan',
    'izin budidaya', 'izin berlayar', 'izin operasi', 'izin perikanan',
    'licensing', 'permohonan izin', 'perijinan', 'ijin', 'izin tangkap',
    'izin pemanfaatan', 'sertifikat kelayakan', 'skp perizinan'
];

function isPerizinanQuery(text) {
    const t = (text || '').toLowerCase();
    return PERIZINAN_KEYWORDS.some(k => t.includes(k));
}

function isPengaduanAkpQuery(text) {
    const t = (text || '').toLowerCase();
    const hasAkpAbk = /\b(akp|abk|awak kapal|pelaut|pelaut perikanan)\b/.test(t);
    const hasPengaduan = /\b(pengaduan|aduan|lapor|laporkan|keluhan|gaji|kecelakaan|ditahan|masalah|kasus|korban)\b/.test(t);
    const specificKeywords = [
        'pengaduan akp', 'pengaduan abk', 'lapor akp', 'lapor abk',
        'gaji abk', 'gaji akp', 'abk ditahan', 'abk disiksa', 'abk terlantar',
        'kecelakaan kapal abk', 'kecelakaan akp', 'masalah abk', 'masalah akp',
        'gangguan operasional akp', 'aduan akp', 'aduan abk'
    ];
    return specificKeywords.some(k => t.includes(k)) || (hasAkpAbk && hasPengaduan);
}

function isPengaduanQuery(text) {
    const t = (text || '').toLowerCase();
    const keywords = [
        'pengaduan', 'lapor', 'laporkan', 'aduan', 'melaporkan', 'keluhan',
        'pungli', 'whistleblower', 'wbs', 'pelanggaran perikanan', 'lapor.go.id'
    ];
    return keywords.some(k => t.includes(k));
}

const testCases = [
    "Saya mau bikin pengaduan terkait pungli di pelabuhan",
    "Gaji suami saya sebagai ABK kapal belum dibayarkan oleh agen",
    "Bagaimana cara pengaduan akp?",
    "Saya mau tanya tentang perizinan SIPI kapal 30 GT",
    "Apakah ada kuota magang di KKP untuk tahun 2026?",
    "Halo admin, mau lapor ada kapal tangkap pakai bom ikan",
    "Kecelakaan kapal awak kapal perikanan di laut arafura lapor kemana?"
];

console.log("=== HASIL PENGUJIAN LOGIKA ===");
testCases.forEach((query, i) => {
    let route = "FAQ / AI";
    if (isPengaduanAkpQuery(query)) {
        route = "🚨 PENGADUAN AKP / ABK";
    } else if (isPengaduanQuery(query)) {
        route = "📋 PENGADUAN UMUM";
    } else if (isPerizinanQuery(query)) {
        route = "🏢 PERIZINAN PTSA";
    }
    console.log(`[Test ${i+1}] "${query}" -> ${route}`);
});


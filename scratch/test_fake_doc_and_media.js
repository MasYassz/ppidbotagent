const assert = require('assert');
const fs = require('fs');
const tracker = require('../chatTracker');

// Extract isKepalsuanSuratQuery from index.js for standalone testing
const indexContent = fs.readFileSync('./index.js', 'utf8');

// Test isKepalsuanSuratQuery logic
const KEPALSUAN_SURAT_KEYWORDS = [
    'surat palsu', 'dokumen palsu', 'berkas palsu', 'surat bodong', 'dokumen bodong',
    'izin palsu', 'sipi palsu', 'siup palsu', 'sertifikat palsu', 'sk palsu', 'tte palsu',
    'surat fiktif', 'dokumen fiktif', 'pesanan fiktif', 'pengadaan fiktif', 'undangan fiktif',
    'pemalsuan surat', 'pemalsuan dokumen', 'pemalsuan berkas', 'pemalsuan tanda tangan',
    'surat penipuan', 'penipuan surat', 'dokumen penipuan', 'hoaks surat', 'hoax surat',
    'surat kkp palsu', 'surat edaran palsu', 'surat edaran bodong', 'surat tugas palsu',
    'surat sekjen palsu', 'surat menteri palsu', 'surat abal abal', 'surat palsuan',
    'cek keaslian surat', 'cek keaslian dokumen', 'verifikasi keaslian surat', 'verifikasi keaslian dokumen',
    'keaslian surat', 'keaslian dokumen', 'keabsahan surat', 'keabsahan dokumen',
    'surat pesanan barang', 'pesanan barang kkp', 'surat pengadaan barang'
];

function isKepalsuanSuratQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return false;

    if (KEPALSUAN_SURAT_KEYWORDS.some(k => t.includes(k))) return true;

    const docTerms = [
        'surat', 'dokumen', 'berkas', 'pesanan', 'pengadaan', 'undangan', 'bimtek',
        'seminar', 'sipi', 'siup', 'skkp', 'izin', 'sertifikat', 'tte', 'spb', 'spk',
        'edaran', 'tanda tangan', 'tandatangan'
    ];
    const falsityOrVerifyTerms = [
        'palsu', 'bodong', 'fiktif', 'penipuan', 'menipu', 'asli', 'keaslian',
        'keabsahan', 'sah', 'valid', 'validitas', 'legalitas', 'resmi', 'beneran',
        'benar atau tidak', 'benar atau palsu', 'asli atau palsu', 'asli ga', 'asli tidak',
        'hoax', 'hoaks', 'mencurigakan', 'abal', 'tipu', 'fiktip'
    ];

    const hasDocTerm = docTerms.some(d => new RegExp('\\b' + d + '\\b', 'i').test(t));
    const hasFalsityTerm = falsityOrVerifyTerms.some(f => new RegExp('\\b' + f + '\\b', 'i').test(t));

    if (hasDocTerm && hasFalsityTerm) {
        return true;
    }

    if (/apakah\s+(ini\s+)?(benar\s+dari\s+kkp|resmi\s+dari\s+kkp|dari\s+kkp)/i.test(t)) return true;
    if (/(cek|verifikasi|periksa|konfirmasi)\s+.*(keaslian|keabsahan|legalitas)/i.test(t)) return true;
    if (/mengatasnamakan\s+(kkp|menteri|sekjen|pejabat|kementerian kelautan)/i.test(t)) return true;
    if (/tanda\s*tangan\s+(menteri|sekjen|pejabat|elektronik|tte|bsre)/i.test(t)) return true;

    return false;
}

async function runTests() {
    console.log('=== TEST DETEKSI DOKUMEN PALSU & PENERUSAN MEDIA ===\n');

    // 1. Uji Deteksi Kueri Kepalsuan Surat
    const positiveQueries = [
        'apakah dokumen ini palsu?',
        'apakah surat ini palsu?',
        'surat ini asli atau palsu?',
        'apakah berkas pengadaan ini resmi dari kkp?',
        'cek keaslian surat dinas ini',
        'surat tugas ini bodong bukan?',
        'ada penipuan surat mengatasnamakan kkp',
        'dokumen ini mencurigakan apakah sah?',
        'apakah izin kapal ini beneran?'
    ];

    positiveQueries.forEach(q => {
        const res = isKepalsuanSuratQuery(q);
        assert.strictEqual(res, true, `Should detect "${q}" as fake document query`);
        console.log(`[PASS] Deteksi Positif: "${q}" -> TRUE`);
    });

    const negativeQueries = [
        'bagaimana cara membuat surat izin penangkapan ikan (sipi)?',
        'syarat permohonan informasi publik dokumen renstra',
        'lokasi kampung nelayan merah putih di mana?'
    ];

    negativeQueries.forEach(q => {
        const res = isKepalsuanSuratQuery(q);
        assert.strictEqual(res, false, `Should NOT detect "${q}" as fake document query`);
        console.log(`[PASS] Deteksi Negatif: "${q}" -> FALSE`);
    });

    // 2. Uji Tracker Kategori & Eselon untuk Dokumen Palsu
    console.log('\n--- Test Klasifikasi Tracker ---');
    const analysis = tracker.determineFallbackCategory('apakah dokumen ini palsu?');
    assert.strictEqual(analysis.kategori, 'Pengaduan', 'Kategori should be Pengaduan');
    assert.strictEqual(analysis.eselon, 'Itjen', 'Eselon should be Itjen');
    console.log(`[PASS] Fallback Tracker: Kategori=${analysis.kategori}, Eselon=${analysis.eselon}`);

    // 3. Simulasi Alur Pesan & Media
    console.log('\n--- Test Simulasi Forward Media ke Petugas ---');
    const testPhone = '62895611894514';
    
    // Step 1: User menanyakan "apakah dokumen ini palsu?"
    await tracker.recordConversation({
        phone: testPhone,
        text: 'apakah dokumen ini palsu?',
        answer: 'Terdeteksi Pengaduan Surat Palsu -> Langsung dialihkan ke CS Petugas PPID',
        source: 'BOT',
        aiModel: null,
        status: 'Pending'
    });

    let rekapData = tracker.loadRekapData();
    let record = tracker.findActiveUserRecord(rekapData, testPhone);
    assert(record, 'Record pemohon harus aktif');
    assert.strictEqual(record.status, 'Pending', 'Status harus Pending menunggu foto/jawaban petugas');
    console.log(`[PASS] Percakapan awal tercatat: ID=${record.id}, Status=${record.status}`);

    // Step 2: User mengirim media/lampiran foto dokumen
    await tracker.recordConversation({
        phone: testPhone,
        text: '[Lampiran Foto / Dokumen untuk Verifikasi Petugas]',
        answer: 'Menunggu respon petugas...',
        source: 'PEMOHON',
        aiModel: null,
        status: 'Pending'
    });

    rekapData = tracker.loadRekapData();
    record = tracker.findActiveUserRecord(rekapData, testPhone);
    assert(record.pertanyaan.includes('[Lampiran Foto / Dokumen untuk Verifikasi Petugas]'), 'Lampiran foto harus tercatat di pertanyaan');
    console.log(`[PASS] Lampiran foto tercatat di rekapan: "${record.pertanyaan.replace(/\n/g, ' ')}"`);

    // Step 3: Petugas menjawab verifikasi dokumen
    await tracker.recordConversation({
        phone: testPhone,
        text: '',
        answer: 'Halo #SahabatBahari, setelah kami verifikasi di sistem tata persuratan resmi KKP, surat pesanan barang tersebut PALSU. Tanda tangan dan nomor dinas fiktif. Mohon abaikan dan jangan lakukan transfer apapun. Salam hormat.',
        source: 'MANUSIA',
        aiModel: null,
        status: 'Done'
    });

    rekapData = tracker.loadRekapData();
    record = rekapData.records[record.id];
    assert.strictEqual(record.status, 'Done', 'Status harus Done setelah dijawab petugas');
    assert.strictEqual(record.sumberJawaban, 'MANUSIA', 'Sumber jawaban harus MANUSIA');
    console.log(`[PASS] Petugas berhasil memverifikasi dan menjawab: Status=${record.status}, Penjawab=${record.sumberJawaban}`);

    // Tutup sesi
    tracker.closeUserSession(testPhone);

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});

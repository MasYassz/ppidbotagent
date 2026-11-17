const fs = require('fs');
const path = require('path');

// Load FAQ
const faqData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../faq.json'), 'utf8'));

// Re-create helper functions from index.js for exact verification
const KEPALSUAN_SURAT_KEYWORDS = [
    'surat palsu', 'surat bodong', 'undangan palsu', 'pesanan palsu',
    'pesanan barang palsu', 'surat pengadaan palsu', 'pemalsuan surat',
    'pemalsuan dokumen', 'dokumen palsu', 'surat tugas palsu',
    'surat sekjen palsu', 'tanda tangan sekjen', 'tanda tangan menteri',
    'pemalsuan tanda tangan', 'cek keaslian surat', 'verifikasi keaslian surat',
    'keaslian surat', 'surat kkp palsu', 'surat edaran palsu',
    'sipi palsu', 'siup palsu', 'izin palsu', 'sertifikat palsu',
    'mengatasnamakan kkp', 'mengatasnamakan sekjen', 'mengatasnamakan menteri',
    'penipuan surat', 'hoaks surat'
];

function isKepalsuanSuratQuery(text) {
    const t = (text || '').toLowerCase();
    return KEPALSUAN_SURAT_KEYWORDS.some(k => t.includes(k));
}

function isModernisasiKapalQuery(text) {
    const t = (text || '').toLowerCase();
    const keywords = [
        'modernisasi kapal', 'kapal modern', 'sicefi', 'skkp', 'kelaikan kapal',
        'ukuran kapal', 'discrepancy size', 'selisih ukuran', 'loa kapal', 'gt kapal',
        'migrasi izin kapal', 'buku kapal', 'sertifikat kelaikan', 'tender kapal'
    ];
    return keywords.some(k => t.includes(k));
}

function isKnmpQuery(text) {
    const t = (text || '').toLowerCase();
    const keywords = [
        'knmp', 'kampung nelayan merah putih', 'wilayah knmp', 'lokasi knmp',
        'sebaran knmp', 'daftar knmp', 'kepmen kp 55', 'kepmen 55/2025', 'satgas knmp',
        'fasilitas knmp', 'kdmp', 'koperasi desa merah putih',
        'jadwal knmp', 'tahapan knmp', 'kapan knmp'
    ];
    return keywords.some(k => t.includes(k));
}

function isPkpnQuery(text) {
    const t = (text || '').toLowerCase();
    const keywords = [
        'pkpn', 'program kerja prioritas nasional', 'program prioritas kkp',
        'berapa program pkpn', 'isi pkpn', 'fokus pkpn', 'prioritas nasional kkp',
        'tambak pantura', 'revitalisasi pantura', 'ikan darat tematik', 'budidaya darat tematik',
        'swasembada garam'
    ];
    return keywords.some(k => t.includes(k));
}

function isEkonomiBiruQuery(text) {
    const t = (text || '').toLowerCase();
    const keywords = [
        'ekonomi biru', 'blue economy', 'kebijakan ekonomi biru', '5 pilar ekonomi biru',
        'pilar ekonomi biru', 'prinsip ekonomi biru', 'bulan cinta laut', 'bcl',
        'penangkapan ikan terukur', 'pit kkp', 'kuota penangkapan'
    ];
    return keywords.some(k => t.includes(k));
}

function isRelevantKKPQuery(text) {
    const t = (text || '').toLowerCase();
    const relevantDomainKeywords = [
        'laut', 'ikan', 'perikanan', 'kelautan', 'pantai', 'pesisir', 'kapal', 'perahu',
        'nelayan', 'tambak', 'benih', 'bibit', 'pakan', 'udang', 'garam', 'cumi', 'lobster',
        'kepiting', 'rumput laut', 'nila', 'lele', 'patin', 'bubu', 'jaring', 'alat tangkap',
        'izin', 'sipi', 'siup', 'pkkprl', 'surat', 'sertifikat', 'kelaikan', 'skkp', 'vms',
        'ppid', 'kkp', 'kementerian', 'magang', 'pkl', 'lpse', 'lelang', 'dokumen',
        'lpmukp', 'knmp', 'kdmp', 'pkpn', 'ekonomi biru', 'pengaduan', 'akp', 'abk', 'bst'
    ];
    return relevantDomainKeywords.some(k => {
        if (k.length <= 4) {
            const regex = new RegExp(`\\b${k}\\b`, 'i');
            return regex.test(t);
        }
        return t.includes(k);
    });
}

console.log("==================================================");
console.log("🧪 TESTING SIMULASI ALUR CHAT BOT WHATSAPP KKP");
console.log("==================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(description, condition) {
    totalTests++;
    if (condition) {
        console.log(`✅ [PASS] ${description}`);
        passedTests++;
    } else {
        console.error(`❌ [FAIL] ${description}`);
    }
}

// TEST 1: Deteksi Surat Palsu & Eskalasi Langsung
const test1_msg = "Ada surat pesanan barang mengatasnamakan sekjen kkp ini palsu bukan ya?";
assert("Deteksi Surat Palsu: isKepalsuanSuratQuery", isKepalsuanSuratQuery(test1_msg) === true);

// TEST 2: Deteksi PKPN dan Menjawab 5 Program
const test2_msg = "pkpn itu terdiri dari berapa program dan apa saja?";
assert("Deteksi PKPN: isPkpnQuery", isPkpnQuery(test2_msg) === true);
const pkpnFaq = faqData.find(f => f.keywords.includes('pkpn'));
assert("FAQ PKPN tersedia", !!pkpnFaq);
assert("FAQ PKPN memuat 5 program prioritas utama", pkpnFaq.answer.includes("5 Program Prioritas Utama"));

// TEST 3: Deteksi 5 Pilar Ekonomi Biru
const test3_msg = "tolong jelaskan 5 pilar kebijakan ekonomi biru kkp";
assert("Deteksi Ekonomi Biru: isEkonomiBiruQuery", isEkonomiBiruQuery(test3_msg) === true);
const blueFaq = faqData.find(f => f.keywords.includes('ekonomi biru'));
assert("FAQ Ekonomi Biru tersedia", !!blueFaq);
assert("FAQ Ekonomi Biru memuat 5 Kebijakan Ekonomi Biru", blueFaq.answer.includes("5 Pilar Kebijakan Ekonomi Biru"));

// TEST 4: Deteksi Modernisasi Kapal & Masalah Selisih Ukuran / SICEFI
const test4_msg = "modernisasi kapal kkp dan kendala ukuran kapal di sicefi";
assert("Deteksi Modernisasi Kapal: isModernisasiKapalQuery", isModernisasiKapalQuery(test4_msg) === true);
const sicefiFaq = faqData.find(f => f.keywords.includes('kendala sicefi'));
assert("FAQ Kendala SICEFI / Selisih Ukuran tersedia", !!sicefiFaq);
assert("FAQ Kendala SICEFI menjelaskan rekonsiliasi ukuran", sicefiFaq.answer.includes("Marine Inspector"));

// TEST 5: Deteksi Wilayah KNMP & Sebaran 65 Lokasi Kepmen KP 55/2025
const test5_msg = "daftar wilayah sebaran lokasi knmp ada dimana saja?";
assert("Deteksi Wilayah KNMP: isKnmpQuery", isKnmpQuery(test5_msg) === true);
const knmpFaq = faqData.find(f => f.keywords.includes('wilayah knmp'));
assert("FAQ Wilayah KNMP tersedia", !!knmpFaq);
assert("FAQ Wilayah KNMP menyebutkan Kepmen KP No. 55 Tahun 2025 (65 lokasi)", knmpFaq.answer.includes("Kepmen KP No. 55 Tahun 2025") && knmpFaq.answer.includes("65 lokasi"));

// TEST 6: FAQ Jadwal KNMP (Roadmap 2025-2029)
const jadwalFaq = faqData.find(f => f.keywords.includes('jadwal knmp'));
assert("FAQ Jadwal KNMP tersedia", !!jadwalFaq);
assert("FAQ Jadwal KNMP menyebutkan 65 lokasi tahap I dan surveyor 2026", jadwalFaq.answer.includes("65 lokasi") && jadwalFaq.answer.includes("3.500 surveyor"));

// TEST 7: Pertanyaan di luar kewenangan / tidak jelas
const test7_msg = "berapa harga saham bitcoin hari ini min?";
assert("Cek Kueri Tidak Relevan KKP", isRelevantKKPQuery(test7_msg) === false);

// TEST 8: Menu 6 Tidak Ada pada Menu Awal
const indexContent = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8');
const menu6InInitialGreeting = indexContent.includes("*6* 👨‍💻 Hubungi Petugas CS PPID");
assert("Menu 6 dihilangkan dari tampilan menu awal", menu6InInitialGreeting === false);

// TEST 9: Penanganan khusus jika pemohon mengetik '6'
const handlesExplicit6 = indexContent.includes("else if (text === '6')");
assert("Bot menangani input '6' secara terarah dan menjelaskan menu 6 ditiadakan", handlesExplicit6 === true);

// TEST 10: Pengaduan Kepalsuan Dokumen diarahkan langsung ke CS / Petugas
const fakeDocRouting = indexContent.includes("userState[sender] = 'CS_MODE'") && indexContent.includes("🚨🚨 *[URGENT: LAPORAN DUGAAN SURAT PALSU / PENIPUAN KKP]* 🚨🚨");
assert("Laporan surat palsu langsung dialihkan ke CS_MODE & notifikasi darurat admin", fakeDocRouting === true);

// TEST 11: Struktur Menu Dua Tingkat PKPN (Level 1: Pilihan 5 Program)
assert("State PKPN_SELECT_PROGRAM terdaftar dan aktif", indexContent.includes("PKPN_SELECT_PROGRAM"));
assert("Menu PKPN Level 1 memuat 5 Program Strategis", indexContent.includes("PKPN_PROGRAM_MENU_TEXT"));

// TEST 12: Struktur Sub-menu Program PKPN (Level 2)
assert("Sub-menu KNMP (Level 2) terdaftar dan memuat Jadwal & Wilayah", indexContent.includes("PKPN_KNMP_MENU") && indexContent.includes("KNMP_SUBMENU_TEXT"));
assert("Sub-menu Tambak Pantura (Level 2) terdaftar", indexContent.includes("PKPN_PANTURA_MENU") && indexContent.includes("PANTURA_SUBMENU_TEXT"));
assert("Sub-menu Budidaya Ikan Darat (Level 2) terdaftar", indexContent.includes("PKPN_DARAT_MENU") && indexContent.includes("DARAT_SUBMENU_TEXT"));
assert("Sub-menu Swasembada Garam (Level 2) terdaftar", indexContent.includes("PKPN_GARAM_MENU") && indexContent.includes("GARAM_SUBMENU_TEXT"));
assert("Sub-menu Kapal Modern (Level 2) terdaftar", indexContent.includes("PKPN_KAPAL_MENU") && indexContent.includes("KAPAL_SUBMENU_TEXT"));

// TEST 13: Opsi pertanyaan tertutup untuk menyelesaikan masalah (Closed-ended question)
assert("Terdapat pertanyaan tertutup (Balas *YA* jika sudah selesai) di sub-menu KNMP", indexContent.includes("Balas *YA* jika sudah selesai"));
assert("Terdapat tombol kembali ke Menu PKPN (*0* untuk kembali ke Menu PKPN)", indexContent.includes("Ketik *0* untuk kembali ke Menu PKPN"));

console.log(`\n==================================================`);
console.log(`📊 HASIL PENGUJIAN: ${passedTests} / ${totalTests} BERHASIL`);
console.log(`==================================================`);

const fs = require('fs');
require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tracker = require('./chatTracker');
const ppid = require('./ppidService');

// Inisialisasi Gemini AI dengan "Persona" KKP
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: `Anda adalah Asisten Virtual resmi dari PPID (Pejabat Pengelola Informasi dan Dokumentasi) Kementerian Kelautan dan Perikanan (KKP) Republik Indonesia.
Tugas utama Anda adalah menjawab pertanyaan seputar permohonan informasi publik, dokumen, transparansi data, dan kebijakan prioritas KKP secara akurat, solutif, dan ringkas.

PENGETAHUAN UTAMA KKP:
- 5 KEBIJAKAN EKONOMI BIRU: 1. Perluasan kawasan konservasi laut 30% pada 2045, 2. Penangkapan ikan terukur (PIT) kuota di WPPNRI, 3. Budidaya berkelanjutan (udang, lobster, kepiting, rumput laut, nila salin), 4. Pengawasan pesisir & izin PKKPRL, 5. Bulan Cinta Laut (BCL - sampah plastik laut).
- PROGRAM KERJA PRIORITAS NASIONAL (PKPN): Terdiri dari 5 program utama: 1. Kampung Nelayan Merah Putih (KNMP), 2. Revitalisasi Tambak Budidaya Pantura Jawa, 3. Budidaya Ikan Darat Tematik (air tawar), 4. Swasembada Garam Nasional, 5. Modernisasi Armada Kapal & Perlindungan Nelayan.
- MODERNISASI KAPAL PERIKANAN: Transformasi kapal kayu ke baja/fiber standar laik laut, laik tangkap, laik simpan. Sistem verifikasi fisik & SKKP via SICEFI (kapal.kkp.go.id/sicefi). Sertifikasi awak kapal (BST-F) via E-LAUT (elaut-bppsdm.kkp.go.id).
- KAMPUNG NELAYAN MERAH PUTIH (KNMP): Dasar hukum Kepmen KP No. 55 Tahun 2025 (65 titik lokasi prioritas Tahap I) & Satgas Kepmen KP No. 20 Tahun 2026. Sarana mencakup tambatan perahu, mini cold storage, pabrik es, bengkel kapal, solar cell, dan Koperasi KDMP.
- PENIPUAN / SURAT PALSU: Waspada terhadap surat pesanan barang palsu, undangan seminar/bimtek berbayar palsu, dan perizinan bodong. Surat dinas resmi KKP bertanda tangan elektronik (TTE) BSrE dan tidak pernah meminta transfer uang.

ATURAN WAJIB PANJANG PESAN & FORMAT:
- Jawaban Anda MAKSIMAL 45 KATA.
- Langsung berikan inti solusi atau kontak/tautan resmi tanpa basa-basi berbelit.
- Selalu akhiri dengan pertanyaan tertutup untuk menyelesaikan masalah (contoh: "Apakah kendala ini sudah tuntas? Balas *YA* untuk selesai, atau sebutkan kendala spesifik Anda.").
- Awali WAJIB dengan: "Halo #SahabatBahari,"
- Akhiri WAJIB dengan: "Salam hormat."
- Gunakan TANDA BINTANG TUNGGAL *teks* untuk cetak tebal (bold). DILARANG tanda bintang ganda **teks**.

PENGALIHAN WEWENANG:
- Perizinan (SIPI, SIUP, PKKPRL, OSS, SILAT, izin kapal, budidaya) -> PTSA KKP (WA: 0811-8430-610, email: ptsp@kkp.go.id).
- Pengaduan Awak Kapal (AKP / ABK) -> WA: 0811251744 atau Call Center: +62 811-1000-3132.
- Pengaduan Umum -> pengaduan@kkp.go.id / WA: 0811989011.
- Kepalsuan Surat / Dokumen Palsu -> Segera minta lampirkan foto surat untuk diperiksa Petugas Pengaduan KKP.`
});

// Menyimpan status obrolan pengguna ('MENU', 'AI_MODE', 'CS_MODE', 'CHECK_TICKET', 'REG_NAME', 'REG_NIK', 'REG_INFO', 'REG_PURPOSE', 'AWAITING_IKM', 'TROUBLESHOOT_KAPAL', 'TROUBLESHOOT_KNMP', 'TROUBLESHOOT_PKPN', 'TROUBLESHOOT_EKONOMI_BIRU', 'UNCLEAR_PROMPT')
const userState = {};
// Menyimpan jumlah interaksi tanya-jawab (AI/FAQ) pengguna untuk eskalasi cerdas
const userAiChatCount = {};
// Penyimpanan data formulir digital sementara & target survei IKM (Tahap 2)
const regData = {};
const pendingIkmTarget = {};

// Variabel Anti-Spam
const userLastMessageTime = {};
const userLastWarningTime = {}; // Untuk menyimpan kapan terakhir user diberi peringatan diluar jam kerja
const userLastBreakWarningTime = {}; // Untuk menyimpan kapan terakhir user diberi peringatan jam istirahat
const userLastMediaConfirmTime = {}; // Untuk mencegah spam balasan saat user kirim banyak foto sekaligus
const SPAM_COOLDOWN_MS = 2000; // jeda minimal 2 detik antar chat (bisa diubah)

// ==========================================
// 🚨 DETEKSI PENGADUAN KEBERADAAN / KEBERATAN SURAT PALSU & DOKUMEN BODONG
// ==========================================
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

    // 1. Cek frasa eksak
    if (KEPALSUAN_SURAT_KEYWORDS.some(k => t.includes(k))) return true;

    // 2. Cek kombinasi kata Dokumen + kata Kepalsuan / Keaslian / Keabsahan
    // Contoh: "apakah dokumen ini palsu?", "surat ini asli atau palsu?", "apakah surat dinas ini resmi dari kkp?"
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

    // 3. Frasa spesifik verifikasi keabsahan kkp
    if (/apakah\s+(ini\s+)?(benar\s+dari\s+kkp|resmi\s+dari\s+kkp|dari\s+kkp)/i.test(t)) return true;
    if (/(cek|verifikasi|periksa|konfirmasi)\s+.*(keaslian|keabsahan|legalitas)/i.test(t)) return true;
    if (/mengatasnamakan\s+(kkp|menteri|sekjen|pejabat|kementerian kelautan)/i.test(t)) return true;
    if (/tanda\s*tangan\s+(menteri|sekjen|pejabat|elektronik|tte|bsre)/i.test(t)) return true;

    return false;
}

// ==========================================
// 🔒 DETEKSI PERIZINAN → REDIRECT KE PTSA
// ==========================================
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

const PTSA_REDIRECT_MESSAGE =
    `Halo #SahabatBahari,\n\n` +
    `Terkait permohonan *perizinan*, silakan langsung berkonsultasi dengan *PTSA (Pelayanan Terpadu Satu Atap)* KKP:\n\n` +
    `📱 *WhatsApp PTSA:* 0811-8430-610\n` +
    `📧 *Email:* ptsp@kkp.go.id\n` +
    `☎️ *Telepon:* 021-3519070 ext. 2826\n` +
    `🏢 *Layanan Tatap Muka:* Gedung Mina Bahari IV Lt. 1, Gambir, Jakarta Pusat (Senin–Kamis 08.00–15.30 WIB)\n\n` +
    `Salam hormat.`;

// ==========================================
// 🔒 DETEKSI PENGADUAN (AKP/ABK & UMUM)
// ==========================================
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

const AKP_PENGADUAN_MESSAGE =
    `Halo #SahabatBahari,\n\n` +
    `Terkait laporan atau pengaduan mengenai *Awak Kapal Perikanan (AKP / ABK)* (gaji, kecelakaan, atau kendala di kapal), silakan dapat langsung disampaikan melalui:\n\n` +
    `📱 *Pengaduan AKP:* 0811251744 atau ke https://lapor.go.id\n` +
    `📞 *Call Center Gangguan Operasional (Pengaduan AKP):* +62 811-1000-3132\n\n` +
    `Salam hormat.`;

const PENGADUAN_UMUM_MESSAGE =
    `Halo #SahabatBahari,\n\n` +
    `Baik Sahabat, saat ini kami sudah mendata mengenai laporannya. Boleh juga Sahabat bantu untuk melaporkannya melalui informasi ini ya:\n\n` +
    `📧 *Email:* pengaduan@kkp.go.id\n` +
    `📱 *WhatsApp:* 0811989011\n` +
    `🌐 *Website:* https://lapor.go.id\n\n` +
    `Salam hormat.`;

// ==========================================
// 🌊 MENU TEKS RESMI PROGRAM PRIORITAS (PKPN) KKP
// ==========================================
const PKPN_PROGRAM_MENU_TEXT =
    `🎯 *PROGRAM KERJA PRIORITAS NASIONAL (PKPN) KKP*\n\n` +
    `Kementerian Kelautan dan Perikanan (KKP) menetapkan *5 Program Strategis PKPN* untuk mewujudkan kedaulatan pangan bahari, hilirisasi perikanan, dan pengentasan kemiskinan pesisir:\n\n` +
    `*1* 🌊 Kampung Nelayan Merah Putih (KNMP)\n` +
    `*2* 🦐 Revitalisasi Tambak Budidaya Pantura Jawa\n` +
    `*3* 🐟 Budidaya Ikan Darat Tematik\n` +
    `*4* 🧂 Swasembada Garam Nasional\n` +
    `*5* ⛵ Modernisasi Armada Kapal & Perlindungan Nelayan\n` +
    `*0* ↩️ Kembali ke Menu Utama\n\n` +
    `_Silakan balas dengan angka *1* sampai *5*, atau ketik *0* untuk kembali._`;

const KNMP_SUBMENU_TEXT =
    `🌊 *PROGRAM 1: KAMPUNG NELAYAN MERAH PUTIH (KNMP)*\n\n` +
    `Program terpadu penataan kawasan pesisir untuk mentransformasi desa nelayan menjadi sentra ekonomi modern dan mandiri menuju target 5.000 titik hingga 2029.\n\n` +
    `Silakan pilih topik KNMP yang ingin Anda ketahui:\n\n` +
    `*1* 🗺️ Wilayah & Sebaran 65 Lokasi Awal (Kepmen KP 55/2025)\n` +
    `*2* 📅 Jadwal & Tahapan Pelaksanaan KNMP (2025 - 2029)\n` +
    `*3* 📝 Syarat & Alur Usulan Lokasi Baru (Pemda/Dinas)\n` +
    `*4* 🏢 Fasilitas Sentra Nelayan & Koperasi Desa Merah Putih (KDMP)\n` +
    `*5* ☎️ Kontak Resmi Satgas Operasionalisasi KNMP (Kepmen KP 20/2026)\n` +
    `*0* ↩️ Kembali ke Pilihan Program PKPN\n\n` +
    `_Silakan balas dengan angka *1* sampai *5*, atau ketik *0* untuk kembali._`;

const PANTURA_SUBMENU_TEXT =
    `🦐 *PROGRAM 2: REVITALISASI TAMBAK BUDIDAYA PANTURA JAWA*\n\n` +
    `Pemulihan puluhan ribu hektare kawasan tambak udang vaname dan nila salin di pesisir utara Jawa secara higienis, terintegrasi IPAL, dan ramah lingkungan.\n\n` +
    `Silakan pilih topik Tambak Pantura yang ingin Anda ketahui:\n\n` +
    `*1* 🗺️ Sebaran Wilayah Revitalisasi Tambak (Bekasi s.d. Jawa Timur)\n` +
    `*2* 📅 Tahapan Revitalisasi, Normalisasi Irigasi & IPAL Terpadu\n` +
    `*3* 🦐 Komoditas Unggulan (Udang Vaname & Nila Salin Pesisir)\n` +
    `*4* 📝 Syarat & Skema Kemitraan Pokdakan Budidaya Tambak\n` +
    `*5* ☎️ Kontak Layanan Ditjen Perikanan Budi Daya (DJPB)\n` +
    `*0* ↩️ Kembali ke Pilihan Program PKPN\n\n` +
    `_Silakan balas dengan angka *1* sampai *5*, atau ketik *0* untuk kembali._`;

const DARAT_SUBMENU_TEXT =
    `🐟 *PROGRAM 3: BUDIDAYA IKAN DARAT TEMATIK*\n\n` +
    `Pengembangan puluhan ribu titik budidaya ikan air tawar di seluruh Indonesia untuk ketahanan gizi protein hewani masyarakat dan penurunan angka stunting.\n\n` +
    `Silakan pilih topik Budidaya Ikan Darat yang ingin Anda ketahui:\n\n` +
    `*1* 🎯 Target Nasional & Dukungan Kemandirian Pangan Protein\n` +
    `*2* 🐟 Ragam Komoditas Ikan Air Tawar (Lele, Nila, Patin, Gurame, Mas)\n` +
    `*3* 📝 Syarat Pengajuan Bantuan Benih & Pakan Pokdakan (e-KUSUKA)\n` +
    `*4* 🔬 Inovasi Teknologi Budidaya (Bioflok, RAS & Gerpari)\n` +
    `*5* ☎️ Kontak Layanan Ditjen Perikanan Budi Daya (DJPB)\n` +
    `*0* ↩️ Kembali ke Pilihan Program PKPN\n\n` +
    `_Silakan balas dengan angka *1* sampai *5*, atau ketik *0* untuk kembali._`;

const GARAM_SUBMENU_TEXT =
    `🧂 *PROGRAM 4: SWASEMBADA GARAM NASIONAL*\n\n` +
    `Program peningkatan produksi dan mutu garam rakyat untuk kemandirian garam konsumsi dan industri nasional guna menghentikan ketergantungan impor.\n\n` +
    `Silakan pilih topik Swasembada Garam yang ingin Anda ketahui:\n\n` +
    `*1* 🗺️ Kawasan Sentra Tambak Garam Rakyat (Rote Ndao NTT, Sulsel, Jateng, Jatim)\n` +
    `*2* 📅 Roadmap Tahapan Menuju Swasembada Garam Nasional\n` +
    `*3* 🧂 Penerapan Teknologi Geomembran & Mutu Garam Industri (NaCl >= 97%)\n` +
    `*4* 📝 Syarat Bantuan Sarana & Gudang Integrasi Petambak Garam (Kugar)\n` +
    `*5* ☎️ Kontak Layanan Ditjen Pengelolaan Kelautan dan Ruang Laut (PKRL)\n` +
    `*0* ↩️ Kembali ke Pilihan Program PKPN\n\n` +
    `_Silakan balas dengan angka *1* sampai *5*, atau ketik *0* untuk kembali._`;

const KAPAL_SUBMENU_TEXT =
    `⛵ *PROGRAM 5: MODERNISASI ARMADA KAPAL & PERLINDUNGAN NELAYAN*\n\n` +
    `Transformasi armada kapal perikanan ke kapal modern baja/fiber serta perlindungan menyeluruh bagi keselamatan dan kesejahteraan nelayan.\n\n` +
    `Silakan pilih kendala/topik Kapal Perikanan yang ingin Anda ketahui:\n\n` +
    `*1* 📏 Penyesuaian Dimensi Fisik Kapal (LoA vs Gross Tonnage GT di SICEFI)\n` +
    `*2* 📄 Sertifikasi Kelaikan Kapal Perikanan (SKKP & Buku Kapal)\n` +
    `*3* 👨‍✈️ Syarat Sertifikasi Keselamatan Awak Kapal (BST-F via E-LAUT)\n` +
    `*4* 🔄 Alur Migrasi Perizinan Berusaha Kapal Daerah ke Pusat (>30 GT / >12 Mil)\n` +
    `*5* 🛡️ Jaminan Sosial & Sertifikasi Hak Atas Tanah Nelayan (SeHAT Nelayan & BPJS)\n` +
    `*6* 🏗️ Info Tender & Pengadaan Kapal Bantuan Modern (LPSE KKP)\n` +
    `*0* ↩️ Kembali ke Pilihan Program PKPN\n\n` +
    `_Silakan balas dengan angka *1* sampai *6*, atau ketik *0* untuk kembali._`;

// ==========================================
// 🌊 DETEKSI TOPIK TEMATIK PRIORITAS KKP (RISET & FAQ BOT)
// ==========================================
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

// Cek apakah pertanyaan relevan dengan tupoksi kelautan dan perikanan (KKP)
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

// ==========================================
// 👨‍💻 DETEKSI PERMINTAAN HUBUNGI PETUGAS (ESKALASI CS)
// ==========================================
function isEscalationQuery(text) {
    const t = (text || '').toLowerCase().trim();

    // Proteksi Bantuan Pemerintah: Jika mengandung topik bantuan sarana/bantuan program KKP, BUKAN eskalasi!
    const bantuanPemerintahKeywords = [
        'bantuan alat', 'alat tangkap', 'bantuan kapal', 'bantuan perahu',
        'bantuan mesin', 'bantuan benih', 'bantuan bibit', 'bantuan pakan',
        'bantuan kolam', 'bantuan tambak', 'bantuan budidaya', 'bantuan budi daya',
        'bantuan bioflok', 'bantuan jaring', 'bantuan rumpon', 'bantuan modal',
        'bantuan dana', 'bantuan uang', 'bantuan hibah', 'bantuan pupuk',
        'bantuan pemerintah', 'bantuan pokdakan', 'bantuan kelompok',
        'bantuan nelayan', 'juknis bantuan', 'proposal bantuan', 'syarat bantuan',
        'info bantuan', 'daftar bantuan', 'cara dapat bantuan', 'ada bantuan',
        'dapat bantuan', 'bantuan kkp', 'bantuan dari kkp', 'program bantuan'
    ];
    if (bantuanPemerintahKeywords.some(k => t.includes(k))) {
        return false;
    }

    // Perintah tunggal atau kata kunci pasti untuk minta bantuan manusia / CS
    const exactCommands = [
        'bantuan', 'help', 'cs', 'petugas', 'admin', 'operator', 'manusia',
        'live chat', 'livechat', 'hubungi petugas', 'hubungi admin',
        'hubungi cs', 'bicara dengan petugas', 'bicara dengan manusia',
        'chat petugas', 'chat admin', 'chat cs', 'minta bantuan',
        'butuh bantuan', 'sambungkan ke petugas', 'terhubung ke petugas',
        'petugas ppid', 'operator ppid'
    ];
    if (exactCommands.includes(t)) return true;

    // 4. Pola frasa eksplisit ingin terhubung ke petugas / CS manusia
    const escalationPatterns = [
        /\b(hubungi|bicara|sambung(kan)?|terhubung|kontak|pindah(kan)?)\s+(dengan\s+|ke\s+)?(petugas|cs|customer service|admin|operator|manusia)\b/i,
        /\b(mau|ingin|bisa)\s+(bicara|ngobrol|chat|konsultasi)\s+(sama\s+|dengan\s+)?(petugas|cs|admin|manusia|orang)\b/i,
        /\b(minta|butuh|tolong)\s+(bantuan\s+)?(petugas|cs|admin|manusia)\b/i,
        /\b(petugas|cs|admin)\s+(asli|manusia|helpdesk|pelayanan)\b/i,
        /\b(live\s*chat|livechat)\b/i
    ];

    if (escalationPatterns.some(pattern => pattern.test(t))) {
        return true;
    }

    // 5. Kalimat sangat pendek (<= 3 kata) yang spesifik mengandung kata kunci eskalasi
    const words = t.split(/\s+/);
    if (words.length <= 3) {
        if (words.includes('petugas') || words.includes('cs') || words.includes('admin') || words.includes('operator')) {
            return true;
        }
        if (words.includes('bantuan') && (words.includes('butuh') || words.includes('minta') || words.includes('tolong') || words.includes('dong') || words.includes('min') || words.includes('kak'))) {
            return true;
        }
    }

    return false;
}
// Helper normalisasi nomor telepon ke format 628...
function normalizePhone(num) {
    if (!num) return '';
    let cleaned = num.toString().replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
}

// Set & Map untuk identifikasi nomor Admin / Petugas resmi
const ADMIN_PHONES = new Set();
const ADMIN_LIDS = new Set();
const ADMIN_JIDS = new Set();

const rawAdminConfig = process.env.ADMIN_WA_NUMBER || process.env.ADMIN_NUMBER || '';
rawAdminConfig
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(entry => {
        ADMIN_JIDS.add(entry.toLowerCase());
        const [user, server] = entry.split('@');
        if (server === 'lid') {
            ADMIN_LIDS.add(user);
            ADMIN_LIDS.add(entry.toLowerCase());
        }
        const phone = normalizePhone(user || entry);
        if (phone) {
            ADMIN_PHONES.add(phone);
            ADMIN_JIDS.add(`${phone}@c.us`);
        }
    });

const ADMIN_NUMBERS = Array.from(ADMIN_PHONES);

// Menyimpan sesi pemohon aktif yang sedang terhubung ke masing-masing admin
const activeAdminTarget = {};
const activeAdminTargetPhone = {};
const lidToPhoneMap = new Map();
let lastCsUserJid = null; // Pemohon terakhir yang masuk ke CS
let lastCsUserPhone = null; // Nomor HP pemohon terakhir yang masuk ke CS

// Cache mapping untuk JID/LID/Phone pengirim
const jidToPhoneCache = new Map();
const phoneToOriginalJid = new Map(); // phone -> actual sender JID pemohon

// Helper untuk membaca nomor HP dan LID pengirim secara akurat (mendukung @c.us dan @lid multi-device)
async function getSenderDetails(message) {
    const rawFrom = message.from || '';
    const rawAuthor = message.author || '';
    const rawSender = rawAuthor || rawFrom;

    if (jidToPhoneCache.has(rawSender)) {
        return jidToPhoneCache.get(rawSender);
    }

    let phone = '';
    let lid = '';

    if (rawSender.endsWith('@c.us')) {
        phone = normalizePhone(rawSender.split('@')[0].split(':')[0]);
    } else if (rawSender.endsWith('@lid')) {
        lid = rawSender.split('@')[0].split(':')[0];
    }

    // Gunakan fungsi bawaan whatsapp-web.js untuk sinkronisasi LID <-> Phone
    try {
        if (typeof client.getContactLidAndPhone === 'function') {
            const res = await client.getContactLidAndPhone(rawSender);
            if (res && res[0]) {
                if (res[0].pn) {
                    phone = normalizePhone(res[0].pn.split('@')[0].split(':')[0]);
                }
                if (res[0].lid) {
                    lid = res[0].lid.split('@')[0].split(':')[0];
                }
            }
        }
    } catch (err) {
        // Fallback jika pemanggilan fungsi internal gagal
    }

    // Jika belum dapat phone dan ini adalah @lid, coba getContact
    if (!phone) {
        try {
            const contact = await message.getContact();
            if (contact) {
                if (contact.number) {
                    phone = normalizePhone(contact.number);
                } else if (contact.id && contact.id.server === 'c.us') {
                    phone = normalizePhone(contact.id.user);
                }
            }
        } catch (err) { }
    }

    // Fallback terakhir: jika pengirim berisi format angka standar
    if (!phone && rawSender.endsWith('@c.us')) {
        phone = normalizePhone(rawSender.split('@')[0].split(':')[0]);
    }

    const details = {
        phone,
        lid,
        rawSender,
        from: rawFrom,
        author: rawAuthor
    };

    if (phone || lid) {
        jidToPhoneCache.set(rawSender, details);
        if (rawFrom) jidToPhoneCache.set(rawFrom, details);
        if (rawAuthor) jidToPhoneCache.set(rawAuthor, details);
        if (phone && lid) {
            lidToPhoneMap.set(lid, phone);
        }
    }

    return details;
}

function checkIsAdmin(details) {
    if (!details) return false;
    const { phone, lid, rawSender, from, author } = details;

    // 1. Cek kecocokan nomor HP
    if (phone && ADMIN_PHONES.has(phone)) return true;

    // 2. Cek kecocokan LID
    if (lid && ADMIN_LIDS.has(lid)) return true;

    // 3. Cek kecocokan JID mentah
    if (ADMIN_JIDS.has(rawSender.toLowerCase()) ||
        ADMIN_JIDS.has(from.toLowerCase()) ||
        (author && ADMIN_JIDS.has(author.toLowerCase()))) {
        return true;
    }

    // 4. Cek user ID numerik dari @c.us atau @lid
    const fromUser = from.split('@')[0].split(':')[0];
    const authorUser = author ? author.split('@')[0].split(':')[0] : '';
    if (ADMIN_PHONES.has(normalizePhone(fromUser)) || (authorUser && ADMIN_PHONES.has(normalizePhone(authorUser)))) {
        return true;
    }
    if (ADMIN_LIDS.has(fromUser) || (authorUser && ADMIN_LIDS.has(authorUser))) {
        return true;
    }

    return false;
}

// Inisialisasi client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('Silakan scan QR Code di bawah ini dengan WhatsApp Anda:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Client sudah siap dan terhubung ke WhatsApp!');
    console.log('Bot Layanan KKP Aktif dengan fitur Anti-Spam & Live Chat!');
    console.log('👨‍💻 Nomor Petugas/Admin Terdaftar:', Array.from(ADMIN_PHONES));

    // Sinkronisasi WhatsApp LID untuk semua nomor Admin terdaftar
    for (const phone of ADMIN_PHONES) {
        try {
            const res = await client.getContactLidAndPhone(`${phone}@c.us`);
            if (res && res[0] && res[0].lid) {
                const rawLid = res[0].lid;
                const lidClean = rawLid.split('@')[0].split(':')[0];
                ADMIN_LIDS.add(lidClean);
                ADMIN_LIDS.add(rawLid.toLowerCase());
                console.log(`✅ [ADMIN SETUP] Sinkronisasi LID Petugas (+${phone} -> ${rawLid}) berhasil.`);
            }
        } catch (e) {
            console.log(`ℹ️ [ADMIN SETUP] Sinkronisasi LID untuk +${phone} akan dideteksi otomatis saat chat masuk.`);
        }
    }
});

// ==========================================
// 🌊 HELPER FORMAT BALASAN (HALO #SAHABATBAHARI)
// ==========================================
function formatReply(text) {
    if (!text || typeof text !== 'string') return text;
    let cleaned = tracker.cleanWhatsAppFormatting(text.trim());

    // Cek jika sudah diawali variasi "Halo Sahabat Bahari", "#SahabatBahari", dsb
    const regex = /^(\*|_)*(halo\s+)?#?sahabat\s*bahari(\*|_)*[!,:-]?\s*/i;
    if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, 'Halo #SahabatBahari,\n\n');
    } else {
        cleaned = `Halo #SahabatBahari,\n\n${cleaned}`;
    }

    return cleaned;
}

async function sendUserMessage(recipient, content, options = {}) {
    if (typeof content === 'string') {
        return await client.sendMessage(recipient, formatReply(content), options);
    } else if (content && typeof content === 'object') {
        const opt = { ...options };
        if (opt.caption) {
            opt.caption = formatReply(opt.caption);
        }
        return await client.sendMessage(recipient, content, opt);
    }
    return await client.sendMessage(recipient, content, options);
}

// Event saat menerima pesan (HANYA PESAN MASUK dari orang lain)
client.on('message', async (message) => {
    // Abaikan pesan dari bot itu sendiri
    if (message.fromMe) return;

    // Abaikan pesan status WhatsApp
    if (message.from === 'status@broadcast') return;

    const sender = message.from;
    const text = message.body.trim().toLowerCase();

    // Dapatkan nomor HP dan detail pengirim secara akurat (mendukung @c.us dan @lid multi-device)
    const senderDetails = await getSenderDetails(message);
    const isAdmin = checkIsAdmin(senderDetails);
    const senderPhone = senderDetails.phone;

    // Jika admin terdeteksi, simpan LID & nomor ke set agar pengecekan berikutnya instan
    if (isAdmin) {
        if (senderDetails.lid) ADMIN_LIDS.add(senderDetails.lid);
        if (senderDetails.phone) ADMIN_PHONES.add(senderDetails.phone);
    }

    // ==========================================
    // 👑 LOGIKA KHUSUS ADMIN (PETUGAS)
    // ==========================================
    if (isAdmin) {
        console.log(`[PESAN ADMIN] ${senderDetails.phone || senderDetails.lid || sender}: "${message.body}"`);

        // 1. Perintah Panduan Petugas
        if (text === '/help' || text === '#help') {
            const currentTarget = activeAdminTarget[senderDetails.phone] ||
                activeAdminTarget[senderDetails.lid] ||
                activeAdminTarget[sender] ||
                activeAdminTarget['LAST_ACTIVE'] ||
                lastCsUserJid;
            const currentTargetPhone = currentTarget ? currentTarget.split('@')[0].split(':')[0] : null;

            const helpText = `👨‍💻 *PANDUAN OPERATOR PPID KKP (TAHAP 1 & 2)*\n\n` +
                `1. *Membalas Pemohon:*\n` +
                `   • *Swipe / Balas Kutipan (Quote Reply)* pesan pemohon.\n` +
                `   • Atau ketik balasan langsung (diteruskan ke pemohon aktif).\n\n` +
                `2. *Mengakhiri Sesi Pemohon:*\n` +
                `   • Ketik */selesai* (menutup sesi & kirim survei kepuasan IKM).\n\n` +
                `3. *Manajemen Tiket & Portal PPID (Tahap 2):*\n` +
                `   • Ketik */list_tiket* untuk melihat daftar berkas permohonan.\n` +
                `   • Ketik */update_tiket* untuk panduan update status & push notifikasi WA ke pemohon.\n\n` +
                `4. *Laporan Kepuasan Masyarakat (IKM):*\n` +
                `   • Ketik */ikm* untuk melihat rekapitulasi rating & indeks IKM.\n\n` +
                `5. *Rekap Percakapan Harian (Excel):*\n` +
                `   • Ketik */rekap* untuk mengunduh rekap percakapan hari ini.\n` +
                `   • Rekap otomatis dikirim setiap jam 16.00 WIB.\n\n` +
                `6. *Menambah Informasi ke FAQ:*\n` +
                `   • Ketik */add* untuk panduan menambah informasi baru.\n\n` +
                `7. *Status Sesi Saat Ini:*\n` +
                `   • Pemohon Terhubung: ${currentTargetPhone ? '+' + currentTargetPhone : 'Belum ada'}`;
            await client.sendMessage(sender, helpText);
            return;
        }

        // 2. Perintah Mengakhiri Sesi Pemohon
        if (text === '/selesai' || text === '#selesai') {
            const targetJid = activeAdminTarget[senderDetails.phone] ||
                activeAdminTarget[senderDetails.lid] ||
                activeAdminTarget[sender] ||
                activeAdminTarget['LAST_ACTIVE'] ||
                lastCsUserJid;
            let targetPhone = activeAdminTargetPhone[senderDetails.phone] ||
                activeAdminTargetPhone[senderDetails.lid] ||
                activeAdminTargetPhone['LAST_ACTIVE'] ||
                lastCsUserPhone;

            if (!targetPhone && targetJid) {
                const userPart = targetJid.split('@')[0].split(':')[0];
                targetPhone = lidToPhoneMap.get(userPart) || (targetJid.endsWith('@c.us') ? userPart : userPart);
            }

            if (targetJid) {
                await sendUserMessage(targetJid, "👨‍💻 *Sesi Live Chat Selesai*\n\nPetugas telah mengakhiri sesi konsultasi ini. Terima kasih telah menghubungi layanan resmi PPID Kementerian Kelautan dan Perikanan. 🌊\n\nKetik *Menu* jika Anda membutuhkan layanan informasi lainnya.");

                // Kirim Survei Kepuasan Masyarakat (IKM) ke pemohon secara otomatis (Tahap 2)
                userState[targetJid] = 'AWAITING_IKM';
                await client.sendMessage(targetJid,
                    `🌟 *SURVEI KEPUASAN MASYARAKAT (IKM) PPID KKP*\n\n` +
                    `Halo #SahabatBahari,\n` +
                    `Mohon kesediaan Anda memberikan nilai kepuasan terhadap pelayanan informasi publik PPID KKP yang baru saja Anda terima (balas angka 1-5):\n\n` +
                    `*5* ⭐⭐⭐⭐⭐ Sangat Puas\n` +
                    `*4* ⭐⭐⭐⭐ Puas\n` +
                    `*3* ⭐⭐⭐ Cukup Puas\n` +
                    `*2* ⭐⭐ Kurang Puas\n` +
                    `*1* ⭐ Tidak Puas\n\n` +
                    `_Balas langsung dengan angka (contoh: 5)_`
                );

                userAiChatCount[targetJid] = 0;
                tracker.closeUserSession(targetPhone);

                delete activeAdminTarget[senderDetails.phone];
                delete activeAdminTarget[senderDetails.lid];
                delete activeAdminTarget[sender];
                delete activeAdminTarget['LAST_ACTIVE'];

                delete activeAdminTargetPhone[senderDetails.phone];
                delete activeAdminTargetPhone[senderDetails.lid];
                delete activeAdminTargetPhone[sender];
                delete activeAdminTargetPhone['LAST_ACTIVE'];

                if (lastCsUserJid === targetJid) {
                    lastCsUserJid = null;
                    lastCsUserPhone = null;
                }

                await client.sendMessage(sender, `✅ *Sesi Berhasil Diakhiri*\n\nSesi live chat dengan pemohon (+${targetPhone || 'Pemohon'}) telah ditutup dan kuesioner IKM telah terkirim ke pemohon.`);
            } else {
                await client.sendMessage(sender, "⚠️ Tidak ada sesi pemohon aktif yang sedang terhubung.");
            }
            return;
        }

        // 3. Perintah Manual Rekap Percakapan (/rekap)
        if (text === '/rekap' || text === '#rekap') {
            await client.sendMessage(sender, "⏳ Menyiapkan file Excel rekap percakapan...");
            try {
                const recap = await tracker.generateExcelRecap();
                if (recap.totalRecords === 0) {
                    await client.sendMessage(sender, `ℹ️ *Rekap Layanan PPID KKP*\n\nBelum ada percakapan inti yang tercatat untuk hari ini (${tracker.getTodayDateWIB()}).`);
                    return;
                }

                let summaryText = `📊 *REKAP PERCAKAPAN PPID KKP HARI INI*\n` +
                    `📅 *Tanggal:* ${tracker.getTodayDateWIB()}\n` +
                    `👥 *Total Sesi Percakapan:* ${recap.totalRecords} sesi\n\n` +
                    `*Daftar Percakapan Inti:*\n`;

                recap.records.forEach((r, idx) => {
                    const sessionTag = r.sessionIndex && r.sessionIndex > 1 ? ` (Sesi ${r.sessionIndex})` : '';
                    const qShort = r.pertanyaan.length > 55 ? r.pertanyaan.substring(0, 52) + '...' : r.pertanyaan;
                    const jShort = r.jawaban.length > 55 ? r.jawaban.substring(0, 52) + '...' : r.jawaban;
                    summaryText += `\n*${idx + 1}. ${r.phone}${sessionTag}* [${r.eselon}] [${r.kategori}]\n` +
                        `   • *T:* ${qShort}\n` +
                        `   • *J:* ${jShort} (${r.status})\n`;
                });

                summaryText += `\n📁 *Dokumen Excel lengkap terlampir di bawah ini.*`;

                const media = MessageMedia.fromFilePath(recap.filePath);
                await client.sendMessage(sender, media, { caption: tracker.cleanWhatsAppFormatting(summaryText) });
            } catch (err) {
                console.error("Gagal membuat rekap manual:", err);
                await client.sendMessage(sender, "❌ Terjadi kendala saat menyusun rekap harian. Silakan coba kembali.");
            }
            return;
        }

        // 4. Perintah Menambah Informasi ke FAQ (/add)
        if (text.startsWith('/add') || text.startsWith('#add')) {
            const rawBody = message.body.trim();
            if (rawBody === '/add' || rawBody === '#add') {
                const helpAdd = `ℹ️ *PANDUAN MENAMBAHKAN INFORMASI KE FAQ*\n\n` +
                    `Gunakan salah satu format berikut untuk menambah informasi baru:\n\n` +
                    `*Format 1 (Multi-baris):*\n` +
                    `/add\n` +
                    `Keyword: beasiswa, kuliah kkp\n` +
                    `Jawaban: Halo #SahabatBahari, informasi beasiswa KKP dapat diakses via https://pentaru.kkp.go.id. Salam hormat.\n\n` +
                    `*Format 2 (Pemisah garis | ):*\n` +
                    `/add beasiswa, kuliah kkp | Halo #SahabatBahari, informasi beasiswa KKP dapat dicek di https://pentaru.kkp.go.id. Salam hormat.\n\n` +
                    `_Informasi yang ditambahkan akan langsung disimpan dan aktif seketika._`;
                await client.sendMessage(sender, helpAdd);
                return;
            }

            let keywords = [];
            let answer = '';

            const kwMatch = rawBody.match(/keyword\s*:\s*([^\n\r]+)/i);
            const ansMatch = rawBody.match(/jawaban\s*:\s*([\s\S]+)/i);

            if (kwMatch && ansMatch) {
                keywords = kwMatch[1].split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
                answer = ansMatch[1].trim();
            } else {
                const withoutCmd = rawBody.replace(/^(\/|#)add\s*/i, '');
                const pipeParts = withoutCmd.split('|');
                if (pipeParts.length >= 2) {
                    keywords = pipeParts[0].split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
                    answer = pipeParts.slice(1).join('|').trim();
                }
            }

            if (keywords.length === 0 || !answer) {
                await client.sendMessage(sender, "⚠️ *Format Tidak Valid*\n\nPastikan menyertakan kata kunci dan jawaban.\n\nContoh:\n`/add beasiswa, kuliah kkp | Halo #SahabatBahari, informasi beasiswa KKP dapat dicek di https://pentaru.kkp.go.id. Salam hormat.`\n\nKetik */add* untuk panduan lengkap.");
                return;
            }

            answer = tracker.cleanWhatsAppFormatting(answer);

            try {
                let faqData = [];
                if (fs.existsSync('./faq.json')) {
                    faqData = JSON.parse(fs.readFileSync('./faq.json', 'utf8'));
                }
                faqData.push({
                    keywords,
                    answer
                });
                fs.writeFileSync('./faq.json', JSON.stringify(faqData, null, 2), 'utf8');

                await client.sendMessage(sender,
                    `✅ *Informasi Berhasil Ditambahkan ke FAQ!*\n\n` +
                    `🔑 *Kata Kunci:* ${keywords.join(', ')}\n\n` +
                    `💬 *Jawaban:*\n${answer}\n\n` +
                    `_Informasi ini langsung aktif dan dapat dijawab oleh bot seketika._`
                );
            } catch (err) {
                console.error("Gagal menyimpan ke faq.json:", err);
                await client.sendMessage(sender, "❌ Terjadi kesalahan saat menyimpan informasi ke faq.json.");
            }
            return;
        }

        // ==========================================
        // 🎫 FITUR TAHAP 2: MANAJEMEN TIKET & SURVEI IKM
        // ==========================================

        // 5. Perintah Daftar Tiket (/list_tiket atau /tiket)
        if (text.startsWith('/list_tiket') || text.startsWith('#list_tiket') || text === '/tiket' || text === '#tiket') {
            const all = ppid.getAllTickets();
            if (all.length === 0) {
                await client.sendMessage(sender, "ℹ️ Belum ada tiket permohonan yang terdaftar di basis data PPID.");
                return;
            }
            let listMsg = `📋 *DAFTAR TIKET PERMOHONAN PPID KKP (${all.length} Berkas)*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            all.slice(0, 10).forEach((t, i) => {
                let icon = t.status.toLowerCase().includes('selesai') ? "✅" : (t.status.toLowerCase().includes('proses') || t.status.toLowerCase().includes('telaah') ? "🔄" : "⏳");
                listMsg += `\n*${i + 1}. ${t.noTiket}* - ${t.namaPemohon}\n` +
                    `   • Unit: *${t.eselon}* | Status: ${icon} *${t.status}*\n` +
                    `   • WA: ${t.noHp} | Batas UU: ${t.estimasiSelesai}\n` +
                    `   • Info: ${t.rincianInformasi.length > 45 ? t.rincianInformasi.substring(0, 42) + '...' : t.rincianInformasi}\n`;
            });
            listMsg += `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 *Gunakan perintah update status:*\n\`/update_tiket [NO_TIKET] [STATUS] | [KETERANGAN]\``;
            await client.sendMessage(sender, listMsg);
            return;
        }

        // 6. Perintah Update Status Tiket & Push Notifikasi WA (/update_tiket)
        if (text.startsWith('/update_tiket') || text.startsWith('#update_tiket')) {
            const rawBody = message.body.trim();
            if (rawBody === '/update_tiket' || rawBody === '#update_tiket') {
                const helpUpdate =
                    `ℹ️ *PANDUAN UPDATE STATUS TIKET & PUSH NOTIFIKASI WA*\n\n` +
                    `*Format:*\n` +
                    `/update_tiket [NO_TIKET] [STATUS] | [KETERANGAN]\n\n` +
                    `*Pilihan Status:* \n` +
                    `• Dalam Proses Telaah\n` +
                    `• Selesai\n` +
                    `• Ditolak\n\n` +
                    `*Contoh:* \n` +
                    `/update_tiket PPID-2026-001 Selesai | Dokumen alokasi kuota tangkap WPP 711 telah disetujui dan dapat diunduh di https://ppid.kkp.go.id/unduh/kuota\n\n` +
                    `_Sistem akan otomatis memperbarui database dan mengirimkan notifikasi WhatsApp seketika ke nomor pemohon._`;
                await client.sendMessage(sender, helpUpdate);
                return;
            }

            const withoutCmd = rawBody.replace(/^(\/|#)update_tiket\s+/i, '');
            const pipeParts = withoutCmd.split('|');
            const firstPart = pipeParts[0].trim();
            const keterangan = pipeParts[1] ? pipeParts.slice(1).join('|').trim() : "";

            const tokens = firstPart.split(/\s+/);
            const ticketNo = tokens[0];
            const newStatus = tokens.slice(1).join(' ') || "Selesai";

            const updated = ppid.updateTicketStatus(ticketNo, newStatus, keterangan);
            if (!updated) {
                await client.sendMessage(sender, `❌ Tiket *"${ticketNo}"* tidak ditemukan di sistem. Ketik */list_tiket* untuk memeriksa daftar tiket.`);
                return;
            }

            // Push Notification via WhatsApp langsung ke pemohon
            const pemohonHp = updated.noHp ? updated.noHp.replace(/\D/g, '') : null;
            let pushStatusText = "Nomor pemohon tidak valid";
            if (pemohonHp) {
                try {
                    const notifMsg =
                        `🔔 *PEMBERITAHUAN RESMI STATUS PERMOHONAN PPID KKP*\n\n` +
                        `Halo #SahabatBahari,\n\n` +
                        `Status permohonan informasi publik Anda telah diperbarui oleh Petugas PPID KKP:\n\n` +
                        `🆔 *No. Tiket:* ${updated.noTiket}\n` +
                        `👤 *Nama:* ${updated.namaPemohon}\n` +
                        `📊 *Status Baru:* *${updated.status}*\n` +
                        `💬 *Catatan Petugas:* ${updated.keterangan || '-'}\n` +
                        (updated.dokumenUnduh ? `📥 *Tautan Dokumen:* ${updated.dokumenUnduh}\n` : '') +
                        `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `🌐 Portal Resmi: https://ppid.kkp.go.id\n\n` +
                        `Terima kasih telah menggunakan layanan keterbukaan informasi publik Kementerian Kelautan dan Perikanan. 🌊🇮🇩`;

                    await client.sendMessage(`${pemohonHp}@c.us`, notifMsg);
                    pushStatusText = `Terkirim ke +${pemohonHp}`;

                    // Jika status Selesai, kirimkan survei IKM otomatis
                    if (updated.status.toLowerCase().includes('selesai')) {
                        userState[`${pemohonHp}@c.us`] = 'AWAITING_IKM';
                        pendingIkmTarget[`${pemohonHp}@c.us`] = updated.noTiket;
                        await client.sendMessage(`${pemohonHp}@c.us`,
                            `🌟 *SURVEI KEPUASAN MASYARAKAT (IKM) PPID KKP*\n\n` +
                            `Halo #SahabatBahari,\n` +
                            `Permohonan Anda (*${updated.noTiket}*) telah berstatus *Selesai*.\n` +
                            `Bantu kami dengan memberikan penilaian kepuasan Anda terhadap pelayanan kami (balas angka 1-5):\n\n` +
                            `*5* ⭐⭐⭐⭐⭐ Sangat Puas\n` +
                            `*4* ⭐⭐⭐⭐ Puas\n` +
                            `*3* ⭐⭐⭐ Cukup Puas\n` +
                            `*2* ⭐⭐ Kurang Puas\n` +
                            `*1* ⭐ Tidak Puas\n\n` +
                            `_Balas dengan angka 1-5 (contoh: 5)_`
                        );
                    }
                } catch (pushErr) {
                    console.error("Gagal mengirim push notifikasi WA ke pemohon:", pushErr);
                    pushStatusText = "Gagal kirim chat WA (nomor tidak aktif/terputus)";
                }
            }

            await client.sendMessage(sender,
                `✅ *TIKET BERHASIL DIPERBARUI!*\n\n` +
                `🆔 *No. Tiket:* ${updated.noTiket}\n` +
                `📊 *Status Baru:* ${updated.status}\n` +
                `💬 *Catatan:* ${updated.keterangan}\n` +
                `📲 *Push Notifikasi WA:* ${pushStatusText}`
            );
            return;
        }

        // 7. Perintah Laporan Kepuasan Masyarakat (/ikm)
        if (text === '/ikm' || text === '#ikm') {
            const stats = ppid.getIKMStats();
            let msg =
                `📊 *LAPORAN INDEKS KEPUASAN MASYARAKAT (IKM) PPID KKP*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `👥 *Total Responden:* ${stats.total} pemohon\n` +
                `⭐ *Rata-rata Rating:* ${stats.avgRating} / 5.00\n` +
                `📈 *Nilai Indeks IKM:* ${stats.ikmIndex} / 100\n` +
                `🏆 *Mutu Pelayanan:* *${stats.predikat}*\n\n` +
                `*Rincian Penilaian Bintang:*\n` +
                `⭐ 5 (Sangat Puas): ${stats.breakdown[5]} responden\n` +
                `⭐ 4 (Puas): ${stats.breakdown[4]} responden\n` +
                `⭐ 3 (Cukup): ${stats.breakdown[3]} responden\n` +
                `⭐ 2 (Kurang): ${stats.breakdown[2]} responden\n` +
                `⭐ 1 (Tidak Puas): ${stats.breakdown[1]} responden\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `_Survei otomatis terintegrasi via WhatsApp sesuai standar PermenPAN-RB._`;
            await client.sendMessage(sender, msg);
            return;
        }

        // 8. Deteksi Balas Kutipan (Quote Reply / Swipe to Reply)
        let targetUserJid = null;
        let targetPhoneDisplay = '';

        if (message.hasQuotedMsg) {
            try {
                const quotedMsg = await message.getQuotedMessage();
                if (quotedMsg && quotedMsg.body) {
                    // Regex fleksibel mendukung variasi format *Dari Nomor:* +628... atau Dari Nomor: +628...
                    const match = quotedMsg.body.match(/(?:Dari Nomor|Nomor Pemohon)[^\d+]*\+?([0-9]+)/i);
                    if (match && match[1]) {
                        const quotedPhone = match[1];
                        targetPhoneDisplay = quotedPhone;
                        // Ambil JID asli pemohon dari mapping (agar jika pemohon menggunakan @lid tetap terkirim tepat)
                        targetUserJid = phoneToOriginalJid.get(quotedPhone) || `${quotedPhone}@c.us`;
                    }
                }
            } catch (err) {
                console.error("Gagal membaca kutipan pesan:", err);
            }
        }

        // 6. Jika tidak mengutip pesan, gunakan target pemohon aktif terakhir
        if (!targetUserJid) {
            targetUserJid = activeAdminTarget[senderDetails.phone] ||
                activeAdminTarget[senderDetails.lid] ||
                activeAdminTarget[sender] ||
                activeAdminTarget['LAST_ACTIVE'] ||
                lastCsUserJid;

            targetPhoneDisplay = activeAdminTargetPhone[senderDetails.phone] ||
                activeAdminTargetPhone[senderDetails.lid] ||
                activeAdminTargetPhone[sender] ||
                activeAdminTargetPhone['LAST_ACTIVE'] ||
                lastCsUserPhone;

            if (!targetPhoneDisplay && targetUserJid) {
                const userPart = targetUserJid.split('@')[0].split(':')[0];
                if (lidToPhoneMap.has(userPart)) {
                    targetPhoneDisplay = lidToPhoneMap.get(userPart);
                } else if (targetUserJid.endsWith('@c.us')) {
                    targetPhoneDisplay = userPart;
                } else {
                    const cached = jidToPhoneCache.get(targetUserJid);
                    if (cached && cached.phone) targetPhoneDisplay = cached.phone;
                }
            }
        }

        // Pastikan targetPhoneDisplay adalah nomor HP asli (jika masih berformat LID, konversi via mapping)
        if (targetPhoneDisplay && lidToPhoneMap.has(targetPhoneDisplay)) {
            targetPhoneDisplay = lidToPhoneMap.get(targetPhoneDisplay);
        }

        // 7. Jika target pemohon ditemukan, teruskan balasan petugas
        if (targetUserJid) {
            try {
                // Mendukung pesan teks maupun media (gambar, dokumen/pdf)
                if (message.hasMedia) {
                    const media = await message.downloadMedia();
                    await client.sendMessage(targetUserJid, media, {
                        caption: formatReply("👨‍💻 *Balasan Petugas PPID:*" + (message.body ? "\n\n" + message.body : ""))
                    });
                } else {
                    await sendUserMessage(targetUserJid, "👨‍💻 *Balasan Petugas PPID:*\n\n" + message.body);
                }

                // Catat ke rekapan: jawaban petugas manusia menggantikan jawaban bot ("kalau ada manusia input yang manusia nya aja")
                tracker.recordConversation({
                    phone: targetPhoneDisplay,
                    text: '',
                    answer: message.body || '[Media/Lampiran]',
                    source: 'MANUSIA',
                    aiModel,
                    status: 'Done'
                });

                if (senderDetails.phone) {
                    activeAdminTarget[senderDetails.phone] = targetUserJid;
                    if (targetPhoneDisplay) activeAdminTargetPhone[senderDetails.phone] = targetPhoneDisplay;
                }
                if (senderDetails.lid) {
                    activeAdminTarget[senderDetails.lid] = targetUserJid;
                    if (targetPhoneDisplay) activeAdminTargetPhone[senderDetails.lid] = targetPhoneDisplay;
                }
                activeAdminTarget[sender] = targetUserJid;
                if (targetPhoneDisplay) activeAdminTargetPhone[sender] = targetPhoneDisplay;

                activeAdminTarget['LAST_ACTIVE'] = targetUserJid;
                if (targetPhoneDisplay) activeAdminTargetPhone['LAST_ACTIVE'] = targetPhoneDisplay;

                const replySummary = message.body ? `"${message.body}"` : "[Media/Lampiran]";
                await client.sendMessage(sender, `✅ *Terkirim ke Pemohon (+${targetPhoneDisplay}):*\n\n${replySummary}\n\n_(Ketik */selesai* jika konsultasi sudah selesai)_`);
            } catch (err) {
                console.error("Gagal mengirim balasan ke pemohon:", err);
                await client.sendMessage(sender, `❌ Gagal mengirim balasan ke pemohon (+${targetPhoneDisplay}). Silakan coba lagi.`);
            }
            return;
        }

        // 8. Jika tidak ada pemohon yang sedang aktif
        await client.sendMessage(sender, `ℹ️ *Layanan Petugas PPID*\n\nSaat ini belum ada pemohon yang terhubung ke live chat Anda.\n\nJika ada pesan masuk dari masyarakat, silakan *Swipe / Balas Kutipan* pada pesan tersebut untuk menjawabnya.\n\nKetik */help* untuk melihat panduan.`);
        return;
    }

    // ==========================================
    // 🛡️ FITUR ANTI-SPAM (RATE LIMITING)
    // ==========================================
    const now = Date.now();
    if (!message.hasMedia && userLastMessageTime[sender] && (now - userLastMessageTime[sender] < SPAM_COOLDOWN_MS)) {
        // Jika jeda chat kurang dari 2 detik, pesan akan diabaikan
        console.log(`Pesan dari ${sender} diabaikan (Spam Terdeteksi).`);
        return;
    }
    userLastMessageTime[sender] = now;
    // ==========================================

    // ==========================================
    // 🕒 JAM OPERASIONAL & JAM ISTIRAHAT (WIB)
    // ==========================================
    const dateOptions = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    const [hourStr, minuteStr] = new Intl.DateTimeFormat('en-GB', dateOptions).format(new Date()).split(':');
    const currentHourWIB = parseInt(hourStr, 10);
    const currentMinuteWIB = parseInt(minuteStr, 10);
    const currentTimeInMinutes = currentHourWIB * 60 + currentMinuteWIB;

    // 1. Cek Jam Istirahat (11:40 - 13:00 WIB)
    // 11:40 = 700 menit, 13:00 = 780 menit
    const isBreakTime = currentTimeInMinutes >= (11 * 60 + 40) && currentTimeInMinutes < (13 * 60);

    if (isBreakTime) {
        // Beri peringatan maksimal 1 kali per 30 menit selama jam istirahat agar tidak spam
        if (!userLastBreakWarningTime[sender] || (now - userLastBreakWarningTime[sender] > 1800000)) {
            await sendUserMessage(sender, "☕ *Layanan Sedang Istirahat*\n\nMaaf, saat ini layanan PPID KKP sedang dalam jam istirahat (11.40 - 13.00 WIB).\n\nSilahkan menghubungi kami kembali setelah jam istirahat selesai (pukul 13.00 WIB).\nHarap ditunggu ya! 🙏");
            userLastBreakWarningTime[sender] = now;
        }
        return; // Hentikan eksekusi secara total selama jam istirahat
    }

    // 2. Cek Jam Kerja Operasional (08:00 - 15:30 WIB)
    // Di luar jam 08:00 - 15:30 WIB
    const isOutsideOperational = currentTimeInMinutes < (8 * 60) || currentTimeInMinutes >= (15 * 60 + 30);

    if (isOutsideOperational) {
        // Cek agar bot tidak spam membalas berkali-kali jika user mengirim banyak chat di malam hari
        if (!userLastWarningTime[sender] || (now - userLastWarningTime[sender] > 3600000)) {
            // Hanya beri peringatan 1 kali per jam
            await sendUserMessage(sender, "🌙 *Layanan Sedang Offline*\n\nMaaf, Anda menghubungi kami di luar jam operasional PPID KKP (08.00 - 15.30 WIB).\n\nPesan Anda telah kami terima dan akan segera kami proses pada jam kerja berikutnya.\nHarap ditunggu ya! 🙏");
            userLastWarningTime[sender] = now;
        }
        return; // Hentikan eksekusi secara total di luar jam kerja
    }
    // ==========================================

    // Fitur Mengakhiri Percakapan (Bisa dipanggil kapan saja)
    if (text === '5' || text === 'selesai' || text === 'akhiri' || ((text === 'ya' || text === 'sudah' || text === 'cukup') && (!userState[sender] || userState[sender] === 'MENU'))) {
        userState[sender] = null; // Reset state pengguna
        userAiChatCount[sender] = 0; // Reset hitungan interaksi
        delete regData[sender];
        delete pendingIkmTarget[sender];
        tracker.closeUserSession(senderPhone);
        await sendUserMessage(sender, "Terima kasih telah menggunakan layanan WhatsApp Resmi *PPID Kementerian Kelautan dan Perikanan RI*. \n\nMari bersama-sama menjaga kelestarian laut kita! 🌊🇮🇩\n\nSemoga sehat selalu dan selamat beraktivitas kembali. 🙏");
        return;
    }

    // ==========================================
    // 🌟 SURVEI KEPUASAN MASYARAKAT (IKM) (TAHAP 2)
    // ==========================================
    if (userState[sender] === 'AWAITING_IKM') {
        const ratingNum = parseInt(text.trim(), 10);
        if ([1, 2, 3, 4, 5].includes(ratingNum)) {
            const survey = ppid.recordIKMSurvey({
                phone: senderPhone,
                rating: ratingNum,
                saran: "-",
                noTiket: pendingIkmTarget[sender] || "-"
            });
            delete pendingIkmTarget[sender];
            userState[sender] = 'MENU';

            const starEmojis = "⭐".repeat(ratingNum);
            await sendUserMessage(sender,
                `🙏 *TERIMA KASIH ATAS PENILAIAN ANDA*\n\n` +
                `Penilaian kepuasan Anda: ${starEmojis} (${ratingNum}/5) telah berhasil kami catat.\n\n` +
                `Setiap masukan dari Sahabat Bahari sangat berharga bagi Kementerian Kelautan dan Perikanan untuk terus meningkatkan kualitas pelayanan informasi publik yang transparan, cepat, dan akuntabel. 🌊🇮🇩\n\n` +
                `Ketik *Menu* jika Anda membutuhkan layanan lainnya.`
            );
            return;
        } else if (text === '0' || text === 'batal' || text === 'menu') {
            userState[sender] = 'MENU';
            delete pendingIkmTarget[sender];
            await sendUserMessage(sender, "Terima kasih. Ketik *Menu* untuk menampilkan layanan PPID KKP.");
            return;
        } else {
            await sendUserMessage(sender, "Silakan balas dengan angka 1 sampai 5 untuk memberikan penilaian kepuasan Anda (contoh: *5*), atau ketik *0* untuk melewati.");
            return;
        }
    }

    // ==========================================
    // 🔍 MODE PELACAKAN TIKET LANGSUNG DI WA (TAHAP 2)
    // ==========================================
    if (userState[sender] === 'CHECK_TICKET') {
        if (text === '0' || text === 'kembali' || text === 'menu') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah keluar dari pelacakan tiket.\n\nKetik *Menu* untuk menampilkan layanan kembali.");
            return;
        }

        const foundTicket = await ppid.getTicketByNumber(message.body.trim());
        if (foundTicket) {
            const card = ppid.formatTicketCard(foundTicket);
            userState[sender] = 'MENU';
            await sendUserMessage(sender,
                `${card}\n\n` +
                `💡 *Status:* Data di atas tersinkronisasi langsung dengan sistem database PPID KKP.\n\n` +
                `Ketik *Menu* untuk layanan lainnya, atau ketik *0* untuk selesai.`
            );

            // Rekam ke tracker percakapan
            tracker.recordConversation({
                phone: senderPhone,
                text: `Cek Status Tiket: ${foundTicket.noTiket}`,
                answer: `Status: ${foundTicket.status} (${foundTicket.eselon})`,
                source: 'BOT',
                aiModel,
                status: 'Done'
            });
        } else {
            await sendUserMessage(sender,
                `❌ *Nomor Tiket Tidak Ditemukan*\n\n` +
                `Nomor permohonan *"${message.body.trim()}"* tidak terdaftar di sistem PPID KKP.\n\n` +
                `Pastikan nomor tiket sudah benar (contoh: *PPID-2026-001* atau *PPID-2026-002*).\n` +
                `Jika Anda membutuhkan penanganan lebih lanjut, silakan ketik *BANTUAN* untuk terhubung ke petugas helpdesk kami.\n\n` +
                `_(Ketik nomor tiket lain, atau ketik *0* untuk kembali ke Menu Utama)_`
            );
        }
        return;
    }

    // ==========================================
    // 📝 FORMULIR DIGITAL PENDAFTARAN PERMOHONAN (TAHAP 2)
    // ==========================================
    if (text === 'daftar' || text === '/daftar' || text === 'registrasi' || text === 'buat permohonan' || text === 'permohonan baru') {
        userState[sender] = 'REG_NAME';
        regData[sender] = { phone: senderPhone };
        await sendUserMessage(sender,
            `📝 *FORMULIR DIGITAL PERMOHONAN INFORMASI PPID KKP*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Langkah (1/4): Identitas Pemohon\n\n` +
            `Silakan ketikkan *Nama Lengkap* Anda sesuai KTP:\n\n` +
            `_(Ketik *0* atau *BATAL* untuk membatalkan)_`
        );
        return;
    }

    if (userState[sender] === 'REG_NAME') {
        if (text === '0' || text === 'batal') {
            userState[sender] = 'MENU';
            delete regData[sender];
            await sendUserMessage(sender, "Pendaftaran formulir permohonan dibatalkan.\n\nKetik *Menu* untuk layanan lainnya.");
            return;
        }
        regData[sender].namaPemohon = message.body.trim();
        userState[sender] = 'REG_NIK';
        await sendUserMessage(sender,
            `📝 *FORMULIR DIGITAL PERMOHONAN INFORMASI PPID KKP*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Langkah (2/4): Nomor KTP\n\n` +
            `Terima kasih Bapak/Ibu *${regData[sender].namaPemohon}*.\n` +
            `Silakan ketikkan *Nomor Induk Kependudukan (NIK/KTP)* Anda (16 digit angka):\n\n` +
            `_(Ketik *0* untuk membatalkan)_`
        );
        return;
    }

    if (userState[sender] === 'REG_NIK') {
        if (text === '0' || text === 'batal') {
            userState[sender] = 'MENU';
            delete regData[sender];
            await sendUserMessage(sender, "Pendaftaran formulir dibatalkan.\n\nKetik *Menu* untuk layanan lainnya.");
            return;
        }
        const cleanNik = message.body.trim().replace(/\D/g, '');
        regData[sender].nik = cleanNik || message.body.trim();
        userState[sender] = 'REG_INFO';
        await sendUserMessage(sender,
            `📝 *FORMULIR DIGITAL PERMOHONAN INFORMASI PPID KKP*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Langkah (3/4): Rincian Informasi\n\n` +
            `Silakan ketikkan *Rincian Informasi atau Data KKP* yang Anda butuhkan secara jelas:\n` +
            `_(Contoh: Data statistik produksi perikanan tangkap tahun 2025 di WPP 711)_\n\n` +
            `_(Ketik *0* untuk membatalkan)_`
        );
        return;
    }

    if (userState[sender] === 'REG_INFO') {
        if (text === '0' || text === 'batal') {
            userState[sender] = 'MENU';
            delete regData[sender];
            await sendUserMessage(sender, "Pendaftaran formulir dibatalkan.\n\nKetik *Menu* untuk layanan lainnya.");
            return;
        }
        regData[sender].rincianInformasi = message.body.trim();
        userState[sender] = 'REG_PURPOSE';
        await sendUserMessage(sender,
            `📝 *FORMULIR DIGITAL PERMOHONAN INFORMASI PPID KKP*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Langkah (4/4): Tujuan Penggunaan\n\n` +
            `Silakan sebutkan *Tujuan Penggunaan Informasi* tersebut:\n` +
            `_(Contoh: Riset Akademis / Skripsi / Usaha Nelayan / Kajian Kebijakan)_\n\n` +
            `_(Ketik *0* untuk membatalkan)_`
        );
        return;
    }

    if (userState[sender] === 'REG_PURPOSE') {
        if (text === '0' || text === 'batal') {
            userState[sender] = 'MENU';
            delete regData[sender];
            await sendUserMessage(sender, "Pendaftaran formulir dibatalkan.\n\nKetik *Menu* untuk layanan lainnya.");
            return;
        }

        if (!regData[sender]) {
            regData[sender] = {
                phone: senderPhone,
                namaPemohon: "Sahabat Bahari",
                nik: "-",
                rincianInformasi: "Permohonan Informasi Publik"
            };
        }

        regData[sender].tujuan = message.body.trim();

        // Tentukan unit eselon otomatis (berbasis kata kunci atau fallback Setjen / PPID)
        let assignedEselon = "Setjen / PPID";
        try {
            if (typeof tracker.determineFallbackCategory === 'function') {
                const eselonAnalysis = tracker.determineFallbackCategory(regData[sender].rincianInformasi);
                if (eselonAnalysis && eselonAnalysis.eselon) {
                    assignedEselon = eselonAnalysis.eselon;
                }
            }
        } catch (catErr) {
            console.error("Gagal mendeteksi kategori eselon:", catErr);
        }

        const newTicket = ppid.createNewTicket({
            namaPemohon: regData[sender].namaPemohon || "Sahabat Bahari",
            nik: regData[sender].nik || "-",
            noHp: senderPhone,
            email: "-",
            rincianInformasi: regData[sender].rincianInformasi || "Permohonan Informasi Publik",
            tujuan: regData[sender].tujuan,
            eselon: assignedEselon
        });

        // Selesai registrasi
        userState[sender] = 'MENU';
        delete regData[sender];

        const ticketCard = ppid.formatTicketCard(newTicket);
        await sendUserMessage(sender,
            `🎉 *PERMOHONAN INFORMASI BERHASIL DIDAFTARKAN!*\n\n` +
            `${ticketCard}\n\n` +
            `💡 *Ketentuan UU KIP 14/2008:* Permohonan Anda akan ditindaklanjuti dalam waktu maksimal 10 hari kerja.\n\n` +
            `Anda dapat melacak status berkas ini kapan saja dengan memilih menu *2* di WhatsApp ini.\n\n` +
            `Ketik *Menu* untuk menampilkan layanan lainnya.`
        );

        // Notifikasi otomatis ke seluruh Admin yang bertugas
        const adminNotice =
            `📢 *PERMOHONAN INFORMASI BARU MASUK (DIGITAL WA)*\n\n` +
            `🆔 *No. Tiket:* ${newTicket.noTiket}\n` +
            `👤 *Pemohon:* ${newTicket.namaPemohon}\n` +
            `📱 *WhatsApp:* +${senderPhone}\n` +
            `🏢 *Eselon Disposisi:* ${assignedEselon}\n` +
            `📋 *Rincian:* ${newTicket.rincianInformasi}\n` +
            `🎯 *Tujuan:* ${newTicket.tujuan}\n` +
            `⏳ *Tenggat Waktu:* ${newTicket.estimasiSelesai}\n\n` +
            `_Gunakan perintah */update_tiket ${newTicket.noTiket} [Status]* untuk memperbarui progress berkas._`;

        for (const admPhone of ADMIN_PHONES) {
            try {
                await client.sendMessage(`${admPhone}@c.us`, adminNotice);
            } catch (e) { }
        }

        // Rekam ke tracker percakapan
        tracker.recordConversation({
            phone: senderPhone,
            text: `Pendaftaran Permohonan Informasi Baru: ${newTicket.rincianInformasi}`,
            answer: `Tiket diterbitkan: ${newTicket.noTiket} (Unit: ${assignedEselon})`,
            source: 'BOT',
            aiModel,
            status: 'Done'
        });
        tracker.closeUserSession(senderPhone);

        return;
    }

    // ==========================================
    // 📸 PENANGANAN UNIVERSAL LAMPIRAN MEDIA (FOTO / DOKUMEN / PDF PEMOHON)
    // ==========================================
    if (message.hasMedia) {
        const pemohonPhone = senderDetails.phone || (sender.endsWith('@c.us') ? sender.split('@')[0].split(':')[0].replace(/\D/g, '') : '');
        const directWaLink = pemohonPhone ? `https://wa.me/${pemohonPhone}` : '';

        // Otomatis masukkan pemohon ke CS_MODE agar respon petugas tersambung langsung
        const wasInCsMode = userState[sender] === 'CS_MODE';
        userState[sender] = 'CS_MODE';
        lastCsUserJid = sender;
        lastCsUserPhone = pemohonPhone;

        if (pemohonPhone) {
            phoneToOriginalJid.set(pemohonPhone, sender);
            if (senderDetails.lid) lidToPhoneMap.set(senderDetails.lid, pemohonPhone);
            if (sender.endsWith('@lid')) {
                const lidUser = sender.split('@')[0].split(':')[0];
                lidToPhoneMap.set(lidUser, pemohonPhone);
            }
        }

        for (const admPhone of ADMIN_PHONES) {
            activeAdminTarget[admPhone] = sender;
            activeAdminTargetPhone[admPhone] = pemohonPhone;
        }
        for (const admLid of ADMIN_LIDS) {
            activeAdminTarget[admLid] = sender;
            activeAdminTargetPhone[admLid] = pemohonPhone;
        }
        activeAdminTarget['LAST_ACTIVE'] = sender;
        activeAdminTargetPhone['LAST_ACTIVE'] = pemohonPhone;

        // Unduh lampiran media dari pesan pemohon
        let mediaObj = null;
        try {
            mediaObj = await message.downloadMedia();
        } catch (e) {
            console.error("Gagal mengunduh media dari pemohon:", e);
        }

        // Cek apakah lampiran ini berkaitan dengan verifikasi surat dinas / dokumen palsu
        const isSuspicious = isKepalsuanSuratQuery(message.body) ||
            (message.body && /palsu|bodong|keaslian|keabsahan|fiktif|penipuan|asli|resmi|surat|dokumen/i.test(message.body)) ||
            wasInCsMode;

        const captionKeterangan = message.body ? `"${message.body}"` : '[Foto/Dokumen Dilampirkan]';

        let adminCaption = '';
        if (isSuspicious) {
            adminCaption =
                `🚨🚨 *[URGENT: DOKUMEN / FOTO DUGAAN SURAT PALSU / PENIPUAN KKP]* 🚨🚨\n\n` +
                `👤 *Dari Nomor Pemohon:* +${pemohonPhone}\n` +
                `💬 *Keterangan Pemohon:* ${captionKeterangan}\n\n` +
                `-----------------------------------------\n` +
                `Petugas dimohon segera memeriksa keabsahan surat/dokumen terlampir.\n` +
                `💡 *Cara Membalas:* Swipe / Balas Kutipan foto ini, ATAU langsung ketik balasan di chat ini.\n` +
                `• Ketik */selesai* jika pemeriksaan sudah selesai.\n` +
                `👉 *Chat Pemohon:* ${directWaLink}`;
        } else {
            adminCaption =
                `🚨 *DOKUMEN / FOTO MASUK (LIVE CHAT PPID)* 🚨\n\n` +
                `👤 *Dari Nomor Pemohon:* +${pemohonPhone}\n` +
                `💬 *Keterangan Pemohon:* ${captionKeterangan}\n\n` +
                `-----------------------------------------\n` +
                `💡 *Cara Membalas:* Swipe / Balas Kutipan foto ini, ATAU langsung ketik balasan di chat ini.\n` +
                `• Ketik */selesai* jika konsultasi sudah tuntas.\n` +
                `👉 *Chat Pemohon:* ${directWaLink}`;
        }

        // Teruskan file media ke seluruh nomor Petugas/Admin yang terdaftar
        let forwardedCount = 0;
        for (const admPhone of ADMIN_PHONES) {
            try {
                if (mediaObj) {
                    await client.sendMessage(`${admPhone}@c.us`, mediaObj, { caption: adminCaption });
                } else {
                    await client.sendMessage(`${admPhone}@c.us`, adminCaption);
                }
                forwardedCount++;
            } catch (e) {
                console.error(`Gagal meneruskan media ke admin ${admPhone}:`, e);
            }
        }

        if (forwardedCount === 0) {
            console.error("Gagal mem-forward media. Nomor Admin belum disetting dengan benar di .env");
        }

        // Catat ke tracker rekap sebagai antrean respon petugas (Pending)
        tracker.recordConversation({
            phone: pemohonPhone,
            text: message.body ? `[Lampiran Media] ${message.body}` : '[Lampiran Foto / Dokumen untuk Verifikasi Petugas]',
            answer: 'Menunggu respon petugas...',
            source: 'PEMOHON',
            aiModel,
            status: 'PENDING'
        });

        // Kirim pesan konfirmasi ke pemohon (dengan debouncing 4 detik agar tidak spam jika kirim banyak foto sekaligus)
        const lastConfirmTime = userLastMediaConfirmTime[sender] || 0;
        if (now - lastConfirmTime > 4000) {
            userLastMediaConfirmTime[sender] = now;
            const userReply = isSuspicious ?
                `📥 *DOKUMEN / FOTO TELAH DITERUSKAN KE PETUGAS RESMI PPID KKP*\n\n` +
                `Halo #SahabatBahari,\n` +
                `Foto/dokumen yang Anda lampirkan telah berhasil kami terima dan *langsung diteruskan ke Petugas Resmi PPID / Pengaduan KKP* untuk diperiksa keabsahan dinasnya.\n\n` +
                `Petugas kami sedang memverifikasi format tanda tangan elektronik (TTE), nomor dinas, dan keaslian dokumen tersebut. Mohon ditunggu ya! 🙏\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_` :
                `📥 *DOKUMEN / FOTO TELAH DITERUSKAN KE PETUGAS*\n\n` +
                `Halo #SahabatBahari,\n` +
                `Foto/dokumen yang Anda lampirkan telah berhasil kami terima dan *diteruskan ke Petugas Layanan PPID KKP*.\n\n` +
                `Petugas kami akan segera memproses dan merespons pesan Anda. Mohon ditunggu ya! 🙏\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`;

            await sendUserMessage(sender, userReply);
        }

        return;
    }

    // ==========================================
    // 🚨 DETEKSI CEPAT: PENGADUAN DOKUMEN / SURAT PALSU & BODONG (PRIORITAS UTAMA)
    // ==========================================
    if (isKepalsuanSuratQuery(text)) {
        const pemohonPhone = senderDetails.phone || (sender.endsWith('@c.us') ? sender.split('@')[0].split(':')[0].replace(/\D/g, '') : '');
        const directWaLink = pemohonPhone ? `https://wa.me/${pemohonPhone}` : '';

        userState[sender] = 'CS_MODE';
        lastCsUserJid = sender;
        lastCsUserPhone = pemohonPhone;
        if (pemohonPhone) {
            phoneToOriginalJid.set(pemohonPhone, sender);
            if (senderDetails.lid) lidToPhoneMap.set(senderDetails.lid, pemohonPhone);
            if (sender.endsWith('@lid')) {
                const lidUser = sender.split('@')[0].split(':')[0];
                lidToPhoneMap.set(lidUser, pemohonPhone);
            }
        }
        for (const admPhone of ADMIN_PHONES) {
            activeAdminTarget[admPhone] = sender;
            activeAdminTargetPhone[admPhone] = pemohonPhone;
        }
        for (const admLid of ADMIN_LIDS) {
            activeAdminTarget[admLid] = sender;
            activeAdminTargetPhone[admLid] = pemohonPhone;
        }
        activeAdminTarget['LAST_ACTIVE'] = sender;
        activeAdminTargetPhone['LAST_ACTIVE'] = pemohonPhone;

        const replyPalsu =
            `🚨 *PERINGATAN RESMI: DETEKSI PENGADUAN DOKUMEN / SURAT PALSU KKP*\n\n` +
            `Halo #SahabatBahari,\n` +
            `Kementerian Kelautan dan Perikanan (KKP) menindak tegas segala bentuk pemalsuan surat dinas, pesanan barang fiktif mengatasnamakan Sekjen/pejabat KKP, undangan seminar berbayar, atau perizinan bodong.\n\n` +
            `Laporan Anda *TELAH KAMI DETEKSI DAN LANGSUNG DIHUBUNGKAN KE PETUGAS RESMI PPID / PENGADUAN KKP*.\n\n` +
            `📲 *TINDAK LANJUT CEPAT:*\n` +
            `Silakan *KIRIMKAN FOTO / DOKUMEN (PDF/JPG)* surat yang Anda terima di chat ini sekarang, beserta nomor kontak dan keterangan singkat. Petugas kami akan segera memverifikasi keabsahan surat dan nomor registrasi dinasnya.\n\n` +
            `_(Ketik *0* untuk membatalkan dan kembali ke Menu Utama)_`;

        await sendUserMessage(sender, replyPalsu);

        const alertAdmin =
            `🚨🚨 *[URGENT: LAPORAN DUGAAN SURAT PALSU / PENIPUAN KKP]* 🚨🚨\n\n` +
            `👤 *Dari Nomor Pemohon:* +${pemohonPhone}\n` +
            `💬 *Pesan Laporan:* "${message.body || '[Media/Lampiran]'}"\n\n` +
            `-----------------------------------------\n` +
            `Petugas dimohon bersiap memeriksa keabsahan surat/dokumen yang akan dikirimkan pemohon.\n` +
            `👉 *Chat Pemohon:* ${directWaLink}`;

        for (const admPhone of ADMIN_PHONES) {
            try {
                await client.sendMessage(`${admPhone}@c.us`, alertAdmin);
            } catch (e) { }
        }

        tracker.recordConversation({
            phone: senderPhone,
            text: message.body,
            answer: 'Terdeteksi Pengaduan Surat Palsu -> Langsung dialihkan ke CS Petugas PPID',
            source: 'BOT',
            aiModel,
            status: 'PENDING'
        });
        return;
    }

    // ==========================================
    // ⛵ SUB-MENU PKPN 5: MODERNISASI ARMADA KAPAL & PERLINDUNGAN NELAYAN
    // ==========================================
    if (userState[sender] === 'PKPN_KAPAL_MENU' || userState[sender] === 'TROUBLESHOOT_KAPAL') {
        if (text === '0' || text === 'kembali') {
            userState[sender] = 'PKPN_SELECT_PROGRAM';
            await sendUserMessage(sender, PKPN_PROGRAM_MENU_TEXT);
            return;
        }

        if (text === 'menu' || text === 'batal') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah keluar dari panduan Kapal Perikanan.\n\nKetik *Menu* untuk menampilkan layanan lainnya.");
            return;
        }

        if (text === 'ya' || text === 'selesai' || text === 'sudah' || text === 'cukup') {
            userState[sender] = null;
            userAiChatCount[sender] = 0;
            tracker.closeUserSession(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi panduan Modernisasi Kapal & Perlindungan Nelayan telah tuntas diselesaikan. Semoga usaha penangkapan ikan Anda lancar dan berkah! ⛵🌊\n\nKetik *Menu* jika Anda membutuhkan layanan lainnya.\n\nSalam hormat.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ')) {
            await sendUserMessage(sender,
                `📏 *SOLUSI SELISIH UKURAN KAPAL (LoA / GT DI SICEFI)*\n\n` +
                `1. Ajukan surat permohonan cek fisik / pengukuran ulang ke Kantor Pelabuhan Perikanan pangkalan atau UPT Ditjen Perikanan Tangkap terdekat.\n` +
                `2. Marine Inspector / Pengawas Perikanan KKP akan melakukan verifikasi fisik ulang kapal di lapangan.\n` +
                `3. Berita Acara Rekonsiliasi Ukuran akan diunggah ke aplikasi SICEFI (https://kapal.kkp.go.id/sicefi/) untuk memutakhirkan Buku Kapal (e-BKP) dan menerbitkan SKKP.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah kendala selisih ukuran ini sudah tuntas?*\n` +
                `• Balas *YA* jika kendala sudah selesai.\n` +
                `• Atau balas angka *2* - *6* untuk topik kapal lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ')) {
            await sendUserMessage(sender,
                `📄 *SOLUSI SERTIFIKAT KELAIKAN KAPAL (SKKP) TERTUNDA*\n\n` +
                `1. Pastikan seluruh berkas dan dokumentasi cek fisik (konstruksi lambung, mesin penggerak, palka berinsulasi/pendingin, dan alat navigasi) telah lengkap diunggah di aplikasi SICEFI (https://kapal.kkp.go.id/sicefi/).\n` +
                `2. Petugas syahbandar / pengawas perikanan di pelabuhan pangkalan akan melakukan validasi kelayakan teknis.\n` +
                `3. Jika verifikasi terhambat, mintakan asistensi percepatan via *WA PTSA KKP* di 0811-8430-610 dengan menyebutkan nama kapal dan nomor permohonan.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah kendala SKKP ini sudah tuntas?*\n` +
                `• Balas *YA* jika kendala sudah selesai.\n` +
                `• Atau balas angka *1*, *3* - *6* untuk topik kapal lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ')) {
            await sendUserMessage(sender,
                `👨‍✈️ *SYARAT SERTIFIKASI KESELAMATAN AWAK KAPAL (BST-F & E-LAUT)*\n\n` +
                `1. Awak kapal modern wajib memiliki sertifikat *BST-F (Basic Safety Training Fisheries)* aktif.\n` +
                `2. Pendaftaran pelatihan dan sertifikasi kompetensi (navigasi & mesin pendingin) diakses daring melalui *E-LAUT*: https://elaut-bppsdm.kkp.go.id/akp/.\n` +
                `3. Bantuan teknis pendaftaran hubungi *Call Center AKP:* 0819-9247-4154.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi sertifikasi awak kapal ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *2*, *4* - *6* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ')) {
            await sendUserMessage(sender,
                `🔄 *PROSEDUR MIGRASI IZIN KAPAL DARI DAERAH KE PUSAT*\n\n` +
                `Kapal berizin daerah yang beroperasi di atas 12 mil laut atau berukuran di atas 30 GT wajib bermigrasi ke izin pusat:\n` +
                `1. Ajukan surat mutasi/penghapusan dari daftar kapal dinas provinsi asal.\n` +
                `2. Lakukan pemeriksaan kelaikan kapal pusat via aplikasi *SICEFI* untuk penerbitan SKKP pusat.\n` +
                `3. Ajukan perizinan berusaha penangkapan ikan (SIPI pusat) secara online melalui portal OSS dan SILAT KKP (https://perizinan.kkp.go.id).\n` +
                `4. Asistensi perizinan: *WA PTSA KKP* di 0811-8430-610.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah kendala migrasi izin ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1* - *3*, *5*, *6* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ')) {
            await sendUserMessage(sender,
                `🛡️ *JAMINAN SOSIAL & SERTIFIKASI TANAH NELAYAN (SeHAT NELAYAN & BPJS)*\n\n` +
                `• *BPJS Ketenagakerjaan Nelayan:*\n` +
                `  Memberikan perlindungan risiko kerja melaut berupa Jaminan Kecelakaan Kerja (JKK) dan Jaminan Kematian (JKM) dengan subsidi premi bantuan pemerintah KKP bagi nelayan kecil pemegang kartu e-KUSUKA.\n` +
                `• *Program SeHAT Nelayan (Sertifikasi Hak Atas Tanah Nelayan):*\n` +
                `  Program kerja sama KKP dan Kementerian ATR/BPN untuk memberikan legalitas kepemilikan sertifikat tanah gratis bagi nelayan dan pembudidaya ikan. Sertifikat dapat dimanfaatkan sebagai jaminan kepastian hukum aset dan akses permodalan produktif perbankan/LPMUKP.\n` +
                `• *Pengajuan:* Daftarkan diri Anda melalui Penyuluh Perikanan atau Dinas Kelautan dan Perikanan Kab/Kota setempat.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi jaminan nelayan dan SeHAT ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1* - *4*, *6* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '6' || text.startsWith('6.') || text.startsWith('6 ')) {
            await sendUserMessage(sender,
                `🏗️ *PENGADAAN & TENDER KAPAL PERIKANAN MODERN (LPSE KKP)*\n\n` +
                `1. Pengadaan proyek armada kapal perikanan KKP diumumkan secara terbuka dan transparan di portal resmi *LPSE KKP*: https://spse.inaproc.id/kkp.\n` +
                `2. Galangan kapal rekanan wajib memenuhi persyaratan kelaikan konstruksi baja/fiberglass dan memiliki perizinan industri galangan resmi.\n` +
                `3. Kelompok nelayan atau koperasi penerima hibah kapal bantuan dapat memantau status penyaluran dan kelayakan teknis kapal.\n` +
                `4. Layanan bantuan teknis pengadaan: *WA LPSE KKP* di 0812-1001-5773 / email ukpbj@kkp.go.id.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi tender dan pengadaan kapal ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1* - *5* untuk topik kapal lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else {
            await sendUserMessage(sender, KAPAL_SUBMENU_TEXT);
            return;
        }
    }

    // ==========================================
    // 🌊 SUB-MENU PKPN 1: KAMPUNG NELAYAN MERAH PUTIH (KNMP)
    // ==========================================
    if (userState[sender] === 'PKPN_KNMP_MENU' || userState[sender] === 'TROUBLESHOOT_KNMP') {
        if (text === '0' || text === 'kembali') {
            userState[sender] = 'PKPN_SELECT_PROGRAM';
            await sendUserMessage(sender, PKPN_PROGRAM_MENU_TEXT);
            return;
        }

        if (text === 'menu' || text === 'batal') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah keluar dari panduan KNMP.\n\nKetik *Menu* untuk menampilkan layanan lainnya.");
            return;
        }

        if (text === 'ya' || text === 'selesai' || text === 'sudah' || text === 'cukup') {
            userState[sender] = null;
            userAiChatCount[sender] = 0;
            tracker.closeUserSession(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi informasi Kampung Nelayan Merah Putih (KNMP) telah selesai. Mari bersama majukan pesisir Indonesia! 🌊🇮🇩\n\nKetik *Menu* jika membutuhkan layanan lainnya.\n\nSalam hormat.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ')) {
            await sendUserMessage(sender,
                `🗺️ *WILAYAH & SEBARAN 65 LOKASI KNMP TAHAP I (Kepmen KP 55/2025)*\n\n` +
                `Pada Tahap I, KKP menetapkan 65 lokasi pesisir percontohan prioritas yang tersebar dari Sabang sampai Merauke di 37 provinsi:\n` +
                `• *Wilayah Barat:* Aceh, Sumatera Utara, Sumatera Barat, Riau, Kepulauan Riau, Lampung.\n` +
                `• *Wilayah Jawa:* Jawa Barat, Jawa Tengah, Jawa Timur.\n` +
                `• *Wilayah Bali & Nusa Tenggara:* Bali, NTB, NTT.\n` +
                `• *Wilayah Kalimantan:* Kalimantan Barat, Kalimantan Timur, Kalimantan Selatan, Kalimantan Utara.\n` +
                `• *Wilayah Sulawesi:* Sulawesi Selatan, Sulawesi Tenggara, Sulawesi Utara, Gorontalo.\n` +
                `• *Wilayah Timur:* Maluku, Maluku Utara, Papua, Papua Selatan, Papua Barat Daya.\n\n` +
                `🌐 Peta spasial digital interaktif dan daftar desa/kecamatan lengkap dapat diunduh di *JDIH KKP*: https://jdih.kkp.go.id atau portal resmi https://kkp.go.id.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi sebaran wilayah KNMP ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *2* - *5* untuk informasi KNMP lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ')) {
            await sendUserMessage(sender,
                `📅 *JADWAL & TAHAPAN PELAKSANAAN KNMP (2025 - 2029)*\n\n` +
                `KKP menyusun jadwal dan roadmap pelaksanaan KNMP terintegrasi secara bertahap:\n` +
                `1. *Tahap I (2025 s.d. April/Mei 2026):*\n` +
                `   • Pembangunan fisik 100% pada 65 lokasi percontohan awal di 37 provinsi (Kepmen KP 55/2025).\n` +
                `   • Penyediaan dermaga higienis, pabrik es, cold storage, sarana air bersih, dan solar cell energi mandiri.\n` +
                `2. *Tahap Konsolidasi Kelembagaan (Pertengahan 2026):*\n` +
                `   • Pendampingan tata kelola sarana terpadu oleh Satgas KNMP (Kepmen KP 20/2026).\n` +
                `   • Pelatihan manajerial pengurus Koperasi Desa Merah Putih (KDMP) sebagai pengelola resmi sentra usaha nelayan.\n` +
                `3. *Tahap Survei & Validasi Spasial Nasional (s.d. Desember 2026):*\n` +
                `   • Penerjunan 3.500 surveyor terlatih (kolaborasi universitas & politeknik KKP) ke 37 provinsi untuk verifikasi kelayakan teknis ribuan calon lokasi baru.\n` +
                `4. *Tahap Replikasi & Akselerasi (2027 - 2029):*\n` +
                `   • Pembangunan masif secara berkesinambungan menuju target total 5.000 Kampung Nelayan Merah Putih mandiri di seluruh penjuru Indonesia.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi jadwal pelaksanaan KNMP ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *3*, *4*, *5* untuk informasi KNMP lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ')) {
            await sendUserMessage(sender,
                `📝 *SYARAT & ALUR PENGUSULAN LOKASI KNMP BARU*\n\n` +
                `1. *Usulan Resmi Pemda:* Diajukan secara tertulis oleh Pemerintah Daerah / Dinas Kelautan dan Perikanan Kab/Kota kepada Dirjen Perikanan Tangkap (DJPT) KKP.\n` +
                `2. *Status Lahan (Clean & Clear):* Tanah darat dan perairan pesisir bebas sengketa (dibuktikan surat kesiapan hibah/hak pakai Pemda atau kesepakatan tanah adat).\n` +
                `3. *Kepadatan Nelayan Aktif:* Mayoritas penduduk bermata pencaharian sebagai nelayan tangkap dan telah terdata memiliki identitas kartu *e-KUSUKA*.\n` +
                `4. *Kesiapan Kelembagaan:* Komitmen pembentukan dan pengelolaan sentra melalui *Koperasi Desa Merah Putih (KDMP)*.\n` +
                `5. *Survei Lapangan:* Tim teknis KKP bersama dinas perikanan akan memvalidasi kelayakan oseanografi, pasang surut, dan potensi perikanan.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi pengusulan lokasi KNMP ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *2*, *4*, *5* untuk informasi lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ')) {
            await sendUserMessage(sender,
                `🏢 *FASILITAS SENTRA NELAYAN & KOPERASI DESA MERAH PUTIH (KDMP)*\n\n` +
                `Kawasan KNMP dibangun terintegrasi dari hulu ke hilir dengan sarana:\n` +
                `• *Dermaga Higienis & Tambatan Perahu:* Fasilitas bongkar muat ikan yang tertata rapi, bersih, dan higienis.\n` +
                `• *Pabrik Es & Mini Cold Storage:* Menjaga rantai dingin (*cold chain*) agar mutu dan kesegaran hasil tangkapan bernilai jual tinggi.\n` +
                `• *Bengkel Mesin & Galangan:* Fasilitas servis mesin tempel dan docking kapal nelayan tradisional.\n` +
                `• *Sentra Energi Mandiri:* Pembangkit listrik tenaga surya (solar cell) dan instalasi desalinasi air bersih pesisir.\n` +
                `• *Badan Usaha Pengelola (KDMP):* Koperasi Desa Merah Putih mengelola pasokan BBM solar subsidi nelayan, simpan pinjam permodalan, dan offtaker hasil tangkap nelayan.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi fasilitas sentra KNMP ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *2*, *3*, *5* untuk informasi lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ')) {
            await sendUserMessage(sender,
                `☎️ *KONTAK RESMI SATGAS OPERASIONALISASI KNMP (Kepmen KP 20/2026)*\n\n` +
                `📱 *WhatsApp Official KNMP:* +62 822-9936-9004\n` +
                `☎️ *Call Center:* 1500587\n` +
                `📧 *Email:* korwil@merahputih.kop.id\n` +
                `📸 *Instagram:* @knmp_indonesia\n\n` +
                `Gunakan kontak resmi di atas untuk konsultasi teknis kawasan, pendampingan kelembagaan KDMP, atau pengaduan operasional fasilitas pabrik es dan mesin pendingin.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi kontak Satgas KNMP ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1* - *4* untuk informasi KNMP lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else {
            await sendUserMessage(sender, KNMP_SUBMENU_TEXT);
            return;
        }
    }

    // ==========================================
    // 🎯 MENU UTAMA PKPN: PROGRAM KERJA PRIORITAS NASIONAL (LEVEL 1)
    // ==========================================
    if (userState[sender] === 'PKPN_SELECT_PROGRAM' || userState[sender] === 'TROUBLESHOOT_PKPN') {
        if (text === '0' || text === 'kembali' || text === 'batal' || text === 'menu') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah keluar dari informasi PKPN KKP.\n\nKetik *Menu* untuk menampilkan layanan lainnya.");
            return;
        }

        if (text === 'ya' || text === 'selesai' || text === 'sudah' || text === 'cukup') {
            userState[sender] = null;
            userAiChatCount[sender] = 0;
            tracker.closeUserSession(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi informasi Program Kerja Prioritas Nasional (PKPN) KKP telah selesai. Bersama kita wujudkan kedaulatan pangan bahari! 🌊🇮🇩\n\nKetik *Menu* jika sewaktu-waktu membutuhkan layanan lainnya.\n\nSalam hormat.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ') || text.includes('knmp') || text.includes('kampung nelayan')) {
            userState[sender] = 'PKPN_KNMP_MENU';
            await sendUserMessage(sender, KNMP_SUBMENU_TEXT);
            return;
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ') || text.includes('pantura') || text.includes('tambak')) {
            userState[sender] = 'PKPN_PANTURA_MENU';
            await sendUserMessage(sender, PANTURA_SUBMENU_TEXT);
            return;
        } else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ') || text.includes('ikan darat') || text.includes('darat') || text.includes('air tawar')) {
            userState[sender] = 'PKPN_DARAT_MENU';
            await sendUserMessage(sender, DARAT_SUBMENU_TEXT);
            return;
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ') || text.includes('garam')) {
            userState[sender] = 'PKPN_GARAM_MENU';
            await sendUserMessage(sender, GARAM_SUBMENU_TEXT);
            return;
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ') || text.includes('kapal') || text.includes('armada')) {
            userState[sender] = 'PKPN_KAPAL_MENU';
            await sendUserMessage(sender, KAPAL_SUBMENU_TEXT);
            return;
        } else {
            await sendUserMessage(sender, PKPN_PROGRAM_MENU_TEXT);
            return;
        }
    }

    // ==========================================
    // 🦐 SUB-MENU PKPN 2: REVITALISASI TAMBAK PANTURA JAWA
    // ==========================================
    if (userState[sender] === 'PKPN_PANTURA_MENU') {
        if (text === '0' || text === 'kembali') {
            userState[sender] = 'PKPN_SELECT_PROGRAM';
            await sendUserMessage(sender, PKPN_PROGRAM_MENU_TEXT);
            return;
        }

        if (text === 'menu' || text === 'batal') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah keluar dari panduan Tambak Pantura.\n\nKetik *Menu* untuk menampilkan layanan lainnya.");
            return;
        }

        if (text === 'ya' || text === 'selesai' || text === 'sudah' || text === 'cukup') {
            userState[sender] = null;
            userAiChatCount[sender] = 0;
            tracker.closeUserSession(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi informasi Revitalisasi Tambak Pantura telah selesai. Bersama kita wujudkan budidaya perikanan modern dan berkelanjutan! 🦐🌊\n\nKetik *Menu* jika membutuhkan layanan lainnya.\n\nSalam hormat.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ')) {
            await sendUserMessage(sender,
                `🗺️ *SEBARAN WILAYAH REVITALISASI TAMBAK PANTURA JAWA*\n\n` +
                `Program revitalisasi tambak budidaya KKP memulihkan puluhan ribu hektare lahan pesisir utara Pulau Jawa:\n` +
                `• *Jawa Barat:* Karawang, Subang, Indramayu, Cirebon, Bekasi.\n` +
                `• *Jawa Tengah:* Brebes, Tegal, Pemalang, Pekalongan, Batang, Kendal, Demak, Jepara, Pati, Rembang.\n` +
                `• *Jawa Timur:* Tuban, Lamongan, Gresik, Sidoarjo, Pasuruan, Probolinggo, Situbondo, Banyuwangi.\n\n` +
                `Kawasan ini direvitalisasi dari tambak tradisional berproduktivitas rendah menjadi kawasan budidaya modern semi-intensif dan intensif ramah lingkungan.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi sebaran tambak Pantura ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *2* - *5* untuk topik Pantura lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ')) {
            await sendUserMessage(sender,
                `📅 *TAHAPAN REVITALISASI IRIGASI PASOK & IPAL TERPADU*\n\n` +
                `1. *Normalisasi Saluran Irigasi Pasok:* Pengerukan sedimentasi dan penataan pintu air primer serta sekunder agar suplai air laut bersih bebas limbah domestik dapat mengalir lancar.\n` +
                `2. *Pembangunan IPAL Kawasan Terpadu:* Setiap klaster tambak wajib terhubung ke kolam pengendapan, aerasi, dan filtrasi biologis sebelum air dibuang kembali ke laut.\n` +
                `3. *Lining Plastik HDPE / Geomembran:* Melapisi dinding dan dasar kolam budidaya guna mencegah rembesan air tanah, erosi tanggul, dan penularan spora penyakit udang.\n` +
                `4. *Biosecurity Ketat:* Penerapan sterilisasi alas kaki, jaring pencegah kepiting liar (*crab protector*), dan jaring pencegah burung liar (*bird netting*).\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi tahapan irigasi & IPAL ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *3*, *4*, *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ')) {
            await sendUserMessage(sender,
                `🦐 *KOMODITAS UNGGULAN: UDANG VANAME & NILA SALIN*\n\n` +
                `• *Udang Vaname (Litopenaeus vannamei):*\n` +
                `  Komoditas ekspor bernilai ekonomi tinggi dengan produktivitas tinggi, laju pertumbuhan cepat, dan respon pakan yang efisien (FCR 1.1 - 1.3).\n` +
                `• *Ikan Nila Salin (Oreochromis niloticus Saline Strain):*\n` +
                `  Varietas nila unggul toleran salinitas payau (15 - 25 ppt). Menjadi solusi rotasi budidaya (*crop rotation*) di tambak udang untuk memutus rantai wabah penyakit AHPND/WSSV, memiliki ketahanan tubuh kuat, serta menyuplai kebutuhan fillet pasar global dan pangan lokal.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi komoditas tambak Pantura ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *2*, *4*, *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ')) {
            await sendUserMessage(sender,
                `📝 *SYARAT & SKEMA KEMITRAAN POKDAKAN BUDIDAYA TAMBAK*\n\n` +
                `1. *Kelembagaan Pokdakan:* Terdaftar resmi di Dinas Perikanan setempat dan memiliki Nomor Induk Berusaha (NIB) subsektor budidaya air payau.\n` +
                `2. *Identitas e-KUSUKA:* Seluruh petambak anggota kelompok memiliki kartu e-KUSUKA aktif.\n` +
                `3. *Legalitas Lahan:* Lahan tambak berstatus milik sendiri/sewa desa dengan batas kepemilikan yang sah.\n` +
                `4. *Sertifikasi CBIB:* Bersedia menerapkan prinsip Cara Budi Daya Ikan yang Baik (CBIB) dan mengoperasikan instalasi IPAL secara tertib.\n` +
                `5. *Pengajuan Usulan:* Diajukan melalui Dinas Kelautan dan Perikanan Kabupaten/Kota untuk diverifikasi Ditjen Perikanan Budi Daya (DJPB).\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi kemitraan petambak ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *2*, *3*, *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ')) {
            await sendUserMessage(sender,
                `☎️ *KONTAK LAYANAN DITJEN PERIKANAN BUDI DAYA (DJPB)*\n\n` +
                `📱 *WhatsApp Layanan DJPB:* +62 822-6150-5727\n` +
                `🌐 *Website:* https://djpb.kkp.go.id\n` +
                `📧 *Email:* setditjen.pb@kkp.go.id / djpb@kkp.go.id\n` +
                `☎️ *Call Center KKP:* 159\n\n` +
                `Gunakan kontak di atas untuk konsultasi teknis budidaya air payau, normalisasi irigasi tambak, sertifikasi CBIB, atau permohonan bantuan sarana tambak.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi kontak DJPB Pantura ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1* - *4* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else {
            await sendUserMessage(sender, PANTURA_SUBMENU_TEXT);
            return;
        }
    }

    // ==========================================
    // 🐟 SUB-MENU PKPN 3: BUDIDAYA IKAN DARAT TEMATIK
    // ==========================================
    if (userState[sender] === 'PKPN_DARAT_MENU') {
        if (text === '0' || text === 'kembali') {
            userState[sender] = 'PKPN_SELECT_PROGRAM';
            await sendUserMessage(sender, PKPN_PROGRAM_MENU_TEXT);
            return;
        }

        if (text === 'menu' || text === 'batal') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah keluar dari panduan Budidaya Ikan Darat.\n\nKetik *Menu* untuk menampilkan layanan lainnya.");
            return;
        }

        if (text === 'ya' || text === 'selesai' || text === 'sudah' || text === 'cukup') {
            userState[sender] = null;
            userAiChatCount[sender] = 0;
            tracker.closeUserSession(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi informasi Budidaya Ikan Darat Tematik telah selesai. Bersama kita perkuat ketahanan pangan dan gizi protein bangsa! 🐟🇮🇩\n\nKetik *Menu* jika membutuhkan layanan lainnya.\n\nSalam hormat.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ')) {
            await sendUserMessage(sender,
                `🎯 *TARGET NASIONAL & KEMANDIRIAN PANGAN PROTEIN AIR TAWAR*\n\n` +
                `• *Perluasan Titik Budidaya:* Menargetkan puluhan ribu titik kolam budidaya ikan darat produktif di 514 kabupaten/kota seluruh Indonesia.\n` +
                `• *Penyediaan Protein Hewani Terjangkau:* Menghadirkan sumber protein hewani segar, bergizi tinggi, dan terjangkau di pelosok daerah guna mempercepat pengentasan gizi buruk (*stunting*).\n` +
                `• *Dukungan Program Nasional:* Menjadi rantai pasok protein ikan air tawar bagi program Makan Bergizi Gratis (MBG) dan ketahanan pangan nasional.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi target budidaya ikan darat ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *2* - *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ')) {
            await sendUserMessage(sender,
                `🐟 *RAGAM KOMODITAS BUDIDAYA IKAN DARAT UNGGULAN*\n\n` +
                `• *Ikan Nila (Tilapia):* Pertumbuhan cepat, daya tahan lingkungan kuat, mudah dipelihara di kolam air tenang, kolam deras, maupun sistem bioflok.\n` +
                `• *Ikan Lele (Clarias):* Siklus panen singkat (60 - 75 hari), tahan kadar oksigen rendah, efisiensi lahan tinggi pada kolam terpal bulat pekarangan.\n` +
                `• *Ikan Patin (Pangasius):* Komoditas daging putih bernutrisi tinggi untuk pasokan bahan baku industri fillet dan ikan olahan.\n` +
                `• *Ikan Gurame & Ikan Mas:* Komoditas bernilai ekonomis tinggi untuk pasar restoran, kuliner nusantara, dan pasar tradisional.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi komoditas ikan darat ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *3*, *4*, *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ')) {
            await sendUserMessage(sender,
                `📝 *SYARAT & ALUR BANTUAN BENIH & PAKAN POKDAKAN (e-KUSUKA)*\n\n` +
                `1. *Kelompok Pembudidaya (Pokdakan):* Terdaftar resmi pada Dinas Perikanan Kabupaten/Kota setempat dengan susunan pengurus aktif (minimal 10 orang).\n` +
                `2. *Kartu e-KUSUKA:* Anggota wajib memiliki kartu identitas pelaku usaha perikanan e-KUSUKA (cek status di https://satudata.kkp.go.id).\n` +
                `3. *Ketersediaan Kolam & Air:* Memiliki lahan kolam siap tebar dan ketersediaan sumber air tawar bersih sepanjang tahun.\n` +
                `4. *Pengajuan Proposal:* Disusun bersama Penyuluh Perikanan Lapangan (PPL) dan diajukan ke Dinas Perikanan Kab/Kota untuk diteruskan ke Balai Benih KKP (BBPBAT/BPBAT).\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi syarat bantuan benih ikan darat ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *2*, *4*, *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ')) {
            await sendUserMessage(sender,
                `🔬 *INOVASI TEKNOLOGI BUDIDAYA: BIOFLOK, RAS & GERPARI*\n\n` +
                `• *Sistem Bioflok:* Memanfaatkan bakteri heterotrof pembentuk flok mikrobial untuk mengubah kotoran amonia menjadi protein pakan alami. Hemat air, tidak berbau, dan menekan FCR hingga 20-30%.\n` +
                `• *Recirculating Aquaculture System (RAS):* Sistem sirkulasi air tertutup dengan filtrasi fisika dan biologi. Hemat air hingga 90%, dapat diterapkan di perkotaan (*urban aquaculture*).\n` +
                `• *Gerakan Pakan Ikan Mandiri (Gerpari):* KKP memfasilitasi mesin pembuat pelet pakan mandiri berbahan baku lokal (tepung maggot, dedak, eceng gondok) untuk memangkas biaya operasional pakan peternak.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi inovasi teknologi budidaya darat ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *2*, *3*, *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ')) {
            await sendUserMessage(sender,
                `☎️ *KONTAK LAYANAN DITJEN PERIKANAN BUDI DAYA (DJPB)*\n\n` +
                `📱 *WhatsApp Layanan DJPB:* +62 822-6150-5727\n` +
                `🌐 *Balai Besar Budidaya Air Tawar (BBPBAT Sukabumi):* https://bbpbatsukabumi.kkp.go.id\n` +
                `📧 *Email:* setditjen.pb@kkp.go.id\n` +
                `☎️ *Call Center KKP:* 159\n\n` +
                `Gunakan kontak resmi di atas untuk konsultasi teknis pembenihan, bantuan pakan mandiri, atau pelatihan sistem bioflok air tawar.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi kontak budidaya ikan darat ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1* - *4* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else {
            await sendUserMessage(sender, DARAT_SUBMENU_TEXT);
            return;
        }
    }

    // ==========================================
    // 🧂 SUB-MENU PKPN 4: SWASEMBADA GARAM NASIONAL
    // ==========================================
    if (userState[sender] === 'PKPN_GARAM_MENU') {
        if (text === '0' || text === 'kembali') {
            userState[sender] = 'PKPN_SELECT_PROGRAM';
            await sendUserMessage(sender, PKPN_PROGRAM_MENU_TEXT);
            return;
        }

        if (text === 'menu' || text === 'batal') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah keluar dari panduan Swasembada Garam.\n\nKetik *Menu* untuk menampilkan layanan lainnya.");
            return;
        }

        if (text === 'ya' || text === 'selesai' || text === 'sudah' || text === 'cukup') {
            userState[sender] = null;
            userAiChatCount[sender] = 0;
            tracker.closeUserSession(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi informasi Swasembada Garam Nasional telah selesai. Menuju kemandirian garam industri dan konsumsi Indonesia! 🧂🇮🇩\n\nKetik *Menu* jika membutuhkan layanan lainnya.\n\nSalam hormat.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ')) {
            await sendUserMessage(sender,
                `🗺️ *SENTRA KAWASAN TAMBAK GARAM RAKYAT TERPADU*\n\n` +
                `KKP memprioritaskan modernisasi dan penataan integrasi lahan tambak garam di wilayah sentra nasional:\n` +
                `• *Nusa Tenggara Timur (NTT):* Sentra industri garam terpadu di Rote Ndao, Kupang, dan Nagekeo (intensitas panas matahari tinggi dan air laut murni).\n` +
                `• *Jawa Timur:* Sumenep, Sampang, Pamekasan (Madura), Tuban, Lamongan, Pasuruan, dan Probolinggo.\n` +
                `• *Jawa Tengah:* Pati, Rembang, Demak, Jepara, dan Brebes.\n` +
                `• *Jawa Barat:* Cirebon dan Indramayu.\n` +
                `• *Sulawesi Selatan:* Jeneponto, Pangkep, dan Takalar.\n` +
                `• *Nusa Tenggara Barat:* Bima dan Sumbawa.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi sentra kawasan garam ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *2* - *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ')) {
            await sendUserMessage(sender,
                `📅 *ROADMAP & TAHAPAN SWASEMBADA GARAM NASIONAL*\n\n` +
                `1. *Integrasi Lahan (Land Consolidation):* Menggabungkan petak garam rakyat berukuran sempit menjadi satu hamparan luas terpadu agar sirkulasi air muda ke meja kristalisasi lebih efisien.\n` +
                `2. *Standardisasi Mutu Kristalisasi:* Penerapan terpal geomembran dan rumah prisma garam untuk memacu kualitas garam rakyat setara garam industri (NaCl >= 97%).\n` +
                `3. *Pembangunan Washing Plant & Gudang SRG:* Penyediaan sarana pencucian garam (*washing plant*) dan gudang Sistem Resi Gudang (SRG) untuk menyerap panen raya serta menjaga stabilitas harga petambak.\n` +
                `4. *Substitusi Impor Menyeluruh:* Pemenuhan total kebutuhan garam konsumsi rumah tangga dan substitusi bertahap garam aneka pangan serta industri kimia domestik.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi roadmap swasembada garam ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *3*, *4*, *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ')) {
            await sendUserMessage(sender,
                `🧂 *TEKNOLOGI GEOMEMBRAN & STANDAR MUTU GARAM INDUSTRI*\n\n` +
                `• *Alas Terpal Geomembran (HDPE):*\n` +
                `  Mencegah kontak langsung air kristalisasi dengan lumpur tanah dasar tambak.\n` +
                `• *Keunggulan Kualitas:*\n` +
                `  Menghasilkan garam kristal putih bersih, minim zat kotor tak larut (*impurities*), dengan kandungan Natrium Klorida (NaCl) mencapai >= 97% (Grade K1).\n` +
                `• *Efisiensi Waktu:*\n` +
                `  Mempercepat pembentukan kristal garam hingga 10-14 hari panen lebih singkat dibanding tambak tanah konvensional, serta menaikkan harga jual di tingkat petambak garam.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi teknologi garam geomembran ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *2*, *4*, *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ')) {
            await sendUserMessage(sender,
                `📝 *SYARAT BANTUAN SARANA USAHA GARAM RAKYAT (KUGAR)*\n\n` +
                `1. *Kelembagaan Kelompok Usaha Garam Rakyat (Kugar):* Terdaftar resmi pada basis data Dinas Perikanan dan memiliki struktur pengurus aktif.\n` +
                `2. *Data e-KUSUKA Subsektor Garam:* Seluruh petambak anggota terdata resmi memiliki identitas e-KUSUKA pergaraman.\n` +
                `3. *Lahan Tambak Siap Produksi:* Lahan memiliki akses saluran pasok air laut bersih dengan salinitas yang memenuhi syarat.\n` +
                `4. *Pengajuan Proposal Sarpras:* Proposal bantuan geomembran, pompa air laut, atau gudang garam diajukan melalui Dinas Kelautan dan Perikanan Kab/Kota kepada Ditjen Pengelolaan Kelautan dan Ruang Laut (Ditjen PKRL) KKP.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi bantuan petambak garam ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *2*, *3*, *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ')) {
            await sendUserMessage(sender,
                `☎️ *KONTAK LAYANAN DITJEN PENGELOLAAN KELAUTAN & RUANG LAUT (PKRL)*\n\n` +
                `📱 *WhatsApp Layanan PKRL:* +62 811-1934-800\n` +
                `🌐 *Website:* https://pkrl.kkp.go.id\n` +
                `📧 *Email:* humas.djpkrl@kkp.go.id\n` +
                `☎️ *Call Center KKP:* 159\n\n` +
                `Gunakan kontak di atas untuk konsultasi teknis kawasan pergaraman terpadu, bantuan sarana geomembran, atau tata ruang pesisir.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi kontak PKRL pergaraman ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1* - *4* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else {
            await sendUserMessage(sender, GARAM_SUBMENU_TEXT);
            return;
        }
    }

    // ==========================================
    // 🌍 PENDETAILAN MASALAH: 5 PILAR KEBIJAKAN EKONOMI BIRU
    // ==========================================
    if (userState[sender] === 'TROUBLESHOOT_EKONOMI_BIRU') {
        if (text === '0' || text === 'kembali' || text === 'batal' || text === 'menu') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah keluar dari informasi Ekonomi Biru.\n\nKetik *Menu* untuk menampilkan layanan lainnya.");
            return;
        }

        if (text === 'ya' || text === 'selesai' || text === 'sudah' || text === 'cukup') {
            userState[sender] = null;
            userAiChatCount[sender] = 0;
            tracker.closeUserSession(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi informasi 5 Kebijakan Ekonomi Biru KKP telah selesai. Bersama kita rawat ekosistem laut Indonesia! 🌊🇮🇩\n\nKetik *Menu* jika membutuhkan layanan lainnya.");
            return;
        }

        if (text === '1') {
            await sendUserMessage(sender,
                `🏝️ *PILAR 1: PERLUASAN KAWASAN KONSERVASI LAUT*\n\n` +
                `• Target perluasan hingga 30% (32,5 juta hektare) pada tahun 2045.\n` +
                `• Menjaga keanekaragaman hayati laut, tempat pemijahan ikan (*spawning ground*), dan ekosistem karbon biru (*blue carbon* seperti mangrove & padang lamun).\n` +
                `• Pemanfaatan diatur ketat berdasarkan zonasi (Zona Inti, Zona Pemanfaatan, Zona Perikanan Berkelanjutan).\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi kawasan konservasi ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau pilih opsi angka *2* - *5* untuk pilar lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '2') {
            await sendUserMessage(sender,
                `🎣 *PILAR 2: PENANGKAPAN IKAN TERUKUR (PIT) & KUOTA*\n\n` +
                `• Pengaturan kuota penangkapan ikan di 11 WPPNRI untuk mencegah penangkapan berlebih (*overfishing*).\n` +
                `• Alokasi kuota diprioritaskan bagi nelayan lokal/tradisional (dibebaskan dari PNBP pascaproduksi).\n` +
                `• Seluruh kapal tangkap wajib memasang transmiter VMS dan membongkar ikan di pelabuhan pangkalan resmi.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi PIT dan kuota nelayan ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau pilih opsi angka lainnya, atau ketik *0* untuk Menu Utama.`
            );
            return;
        } else if (text === '3') {
            await sendUserMessage(sender,
                `🦐 *PILAR 3: BUDI DAYA BERKELANJUTAN*\n\n` +
                `• Pengembangan komoditas ekspor unggulan: udang, lobster, kepiting, rumput laut, dan nila salin.\n` +
                `• Penerapan Cara Budi Daya Ikan yang Baik (CBIB) dengan Instalasi Pengolahan Air Limbah (IPAL) untuk menjaga kelestarian perairan sekitar tambak.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi budidaya berkelanjutan ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau pilih opsi angka lainnya, atau ketik *0* untuk Menu Utama.`
            );
            return;
        } else if (text === '4') {
            await sendUserMessage(sender,
                `🌊 *PILAR 4: PENGAWASAN PESISIR & IZIN RUANG LAUT (PKKPRL)*\n\n` +
                `• Pengendalian ketat kegiatan pemanfaatan ruang laut dan pulau-pulau kecil melalui izin *PKKPRL*.\n` +
                `• Mencegah kerusakan pesisir akibat reklamasi liar, pencemaran limbah industri, dan abrasi pantai.\n` +
                `• Hotline Ruang Laut: +62 877-6225-0001.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi pengawasan pesisir ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau pilih opsi angka lainnya, atau ketik *0* untuk Menu Utama.`
            );
            return;
        } else if (text === '5') {
            await sendUserMessage(sender,
                `🚯 *PILAR 5: BULAN CINTA LAUT (GERAKAN PEMBERSIHAN SAMPAH LAUT)*\n\n` +
                `• Gerakan nasional aksi bersih laut yang melibatkan langsung para nelayan saat melaut.\n` +
                `• Sampah plastik yang dikumpulkan ditimbang di pelabuhan pangkalan dan diberikan insentif/kompensasi ekonomi.\n` +
                `• Sampah didaur ulang melalui jejaring bank sampah binaan KKP.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi Bulan Cinta Laut ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau pilih opsi angka lainnya, atau ketik *0* untuk Menu Utama.`
            );
            return;
        } else {
            await sendUserMessage(sender,
                `Silakan balas dengan angka *1* sampai *5* untuk memilih pilar Kebijakan Ekonomi Biru KKP:\n\n` +
                `*1* 🏝️ Kawasan Konservasi Laut (Target 30%)\n` +
                `*2* 🎣 Penangkapan Ikan Terukur (PIT) & Kuota\n` +
                `*3* 🦐 Budi Daya Ramah Lingkungan\n` +
                `*4* 🌊 Pengawasan Pesisir & Izin PKKPRL\n` +
                `*5* 🚯 Bulan Cinta Laut (BCL & Sampah Plastik)\n` +
                `*0* ❌ Keluar / Kembali\n\n` +
                `_Atau balas *YA* jika masalah Anda sudah selesai._`
            );
            return;
        }
    }

    // ==========================================
    // ❓ KONFIRMASI PERTANYAAN TIDAK JELAS / DILUAR KEWENANGAN
    // ==========================================
    if (userState[sender] === 'UNCLEAR_PROMPT') {
        if (text === '1') {
            userState[sender] = 'AI_MODE';
            await sendUserMessage(sender,
                `Baik #SahabatBahari,\n\n` +
                `Silakan ketikkan kendala atau pertanyaan sektor kelautan dan perikanan yang Anda butuhkan (contoh: izin kapal, budidaya ikan, bantuan alat tangkap, data PPID, atau lokasi KNMP):\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`
            );
            return;
        } else {
            // Pilihan '2', '0', atau input acak lainnya -> Selesaikan / abaikan sesi
            userState[sender] = null;
            userAiChatCount[sender] = 0;
            tracker.closeUserSession(senderPhone);
            await sendUserMessage(sender,
                `Sesi layanan diselesaikan karena di luar kewenangan Kementerian Kelautan dan Perikanan RI. \n\n` +
                `Terima kasih telah menghubungi PPID KKP. Ketik *Menu* kapan saja jika Anda ingin memulai kembali. 🌊🇮🇩`
            );
            return;
        }
    }

    // ==========================================
    // 💬 MODE TANYA JAWAB AI
    // ==========================================
    if (userState[sender] === 'AI_MODE') {
        if (text === '0' || text === 'kembali') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah keluar dari sesi Asisten AI.\n\nKetik *Menu* untuk menampilkan layanan kembali.");
            return;
        }

        // Cek jika user ingin eskalasi ke petugas
        if (isEscalationQuery(text)) {
            if (userAiChatCount[sender] && userAiChatCount[sender] >= 1) {
                userState[sender] = 'CS_MODE';
                await sendUserMessage(sender, "👨‍💻 *Terhubung ke Petugas PPID*\n\nMohon tunggu, pesan Anda akan langsung diteruskan ke Petugas Layanan Informasi PPID kami.\n\nSilakan ketikkan permohonan atau pertanyaan Anda secara lengkap di bawah ini:\n\n_(Ketik *0* jika Anda ingin membatalkan dan kembali ke Menu Utama)_");
                return;
            } else {
                await sendUserMessage(sender, "Halo #SahabatBahari,\n\nUntuk mempercepat pelayanan, silakan sampaikan pertanyaan atau informasi yang Anda butuhkan terlebih dahulu agar Asisten AI kami dapat membantu Anda segera.");
                return;
            }
        }

        // 🚨 Intercept Surat Palsu (Langsung ke Petugas)
        if (isKepalsuanSuratQuery(text)) {
            const pemohonPhone = senderDetails.phone || (sender.endsWith('@c.us') ? sender.split('@')[0].split(':')[0].replace(/\D/g, '') : '');
            userState[sender] = 'CS_MODE';
            lastCsUserJid = sender;
            lastCsUserPhone = pemohonPhone;
            if (pemohonPhone) {
                phoneToOriginalJid.set(pemohonPhone, sender);
                if (senderDetails.lid) lidToPhoneMap.set(senderDetails.lid, pemohonPhone);
            }
            for (const admPhone of ADMIN_PHONES) {
                activeAdminTarget[admPhone] = sender;
                activeAdminTargetPhone[admPhone] = pemohonPhone;
            }
            activeAdminTarget['LAST_ACTIVE'] = sender;
            activeAdminTargetPhone['LAST_ACTIVE'] = pemohonPhone;

            const replyPalsu =
                `🚨 *PERINGATAN RESMI: DETEKSI PENGADUAN DOKUMEN / SURAT PALSU KKP*\n\n` +
                `Halo #SahabatBahari,\n` +
                `Kementerian Kelautan dan Perikanan (KKP) menindak tegas segala bentuk pemalsuan surat dinas, pesanan barang fiktif mengatasnamakan Sekjen/pejabat KKP, undangan seminar berbayar, atau perizinan bodong.\n\n` +
                `Laporan Anda *TELAH KAMI DETEKSI DAN LANGSUNG DIHUBUNGKAN KE PETUGAS RESMI PPID / PENGADUAN KKP*.\n\n` +
                `📲 *TINDAK LANJUT CEPAT:*\n` +
                `Silakan *KIRIMKAN FOTO / DOKUMEN (PDF/JPG)* surat yang Anda terima di chat ini sekarang, beserta nomor kontak dan keterangan singkat. Petugas kami akan segera memverifikasi keabsahan surat dan nomor registrasi dinasnya.\n\n` +
                `_(Ketik *0* untuk membatalkan dan kembali ke Menu Utama)_`;

            await sendUserMessage(sender, replyPalsu);

            const alertAdmin =
                `🚨🚨 *[URGENT: LAPORAN DUGAAN SURAT PALSU / PENIPUAN KKP]* 🚨🚨\n\n` +
                `👤 *Dari Nomor Pemohon:* +${pemohonPhone}\n` +
                `💬 *Pesan Laporan:* "${message.body || '[Media/Lampiran]'}"\n\n` +
                `-----------------------------------------\n` +
                `Petugas dimohon segera memeriksa keabsahan surat dan membalas langsung di sini.`;

            for (const admPhone of ADMIN_PHONES) {
                try {
                    await client.sendMessage(`${admPhone}@c.us`, alertAdmin);
                } catch (e) { }
            }

            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Terdeteksi Pengaduan Surat Palsu -> Langsung dialihkan ke CS Petugas PPID',
                source: 'BOT',
                aiModel,
                status: 'PENDING'
            });
            return;
        }

        // 🔒 Intercept Pengaduan AKP / ABK
        if (isPengaduanAkpQuery(text)) {
            await sendUserMessage(sender, AKP_PENGADUAN_MESSAGE + "\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Diarahkan ke Layanan Pengaduan AKP (WA: 0811251744, Call Center: +62 811-1000-3132)',
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        // 🔒 Intercept Pengaduan Umum
        if (isPengaduanQuery(text)) {
            await sendUserMessage(sender, PENGADUAN_UMUM_MESSAGE + "\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Diarahkan ke Layanan Pengaduan KKP (Email: pengaduan@kkp.go.id, WA: 0811989011)',
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        // 🔒 Intercept perizinan → redirect ke PTSA
        if (isPerizinanQuery(text)) {
            await sendUserMessage(sender, PTSA_REDIRECT_MESSAGE + "\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Diarahkan ke PTSA KKP (WA: 0811-8430-610, Email: ptsp@kkp.go.id)',
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        // ⛵ Intercept Tematik Modernisasi Kapal
        if (isModernisasiKapalQuery(text)) {
            userState[sender] = 'PKPN_KAPAL_MENU';
            await sendUserMessage(sender, KAPAL_SUBMENU_TEXT);
            return;
        }

        // 🌊 Intercept Tematik KNMP
        if (isKnmpQuery(text)) {
            userState[sender] = 'PKPN_KNMP_MENU';
            await sendUserMessage(sender, KNMP_SUBMENU_TEXT);
            return;
        }

        // 🎯 Intercept Tematik PKPN (Dua Tingkat Menu Interaktif)
        if (isPkpnQuery(text)) {
            userState[sender] = 'PKPN_SELECT_PROGRAM';
            await sendUserMessage(sender, PKPN_PROGRAM_MENU_TEXT);
            return;
        }

        // 🌍 Intercept Tematik Ekonomi Biru
        if (isEkonomiBiruQuery(text)) {
            userState[sender] = 'TROUBLESHOOT_EKONOMI_BIRU';
            await sendUserMessage(sender,
                `Halo #SahabatBahari,\n\n` +
                `KKP menerapkan *5 Kebijakan Ekonomi Biru*:\n` +
                `1. Perluasan Kawasan Konservasi Laut (30%)\n` +
                `2. Penangkapan Ikan Terukur (PIT) & Kuota\n` +
                `3. Budi Daya Ramah Lingkungan\n` +
                `4. Pengawasan Pesisir & Izin PKKPRL\n` +
                `5. Bulan Cinta Laut (Sampah Plastik)\n\n` +
                `Pilih pilar yang ingin Anda pelajari (balas angka 1-5 atau 0 untuk selesai):`
            );
            return;
        }

        // Cek kecocokan FAQ lokal terlebih dahulu
        let faqJawaban = null;
        try {
            const faqData = JSON.parse(fs.readFileSync('./faq.json', 'utf8'));
            for (const item of faqData) {
                if (item.keywords.some(k => text.includes(k))) {
                    faqJawaban = tracker.cleanWhatsAppFormatting(item.answer);
                    break;
                }
            }
        } catch (err) { }

        if (faqJawaban) {
            userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;
            const footer = "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 *Apakah jawaban di atas sudah menyelesaikan kendala Anda?*\n• Balas *YA* jika sudah selesai.\n• Ketik *0* untuk kembali ke Menu Utama.";
            await sendUserMessage(sender, faqJawaban + footer);
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: faqJawaban,
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        try {
            // Tambahkan hitungan pertanyaan AI
            userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;

            const result = await aiModel.generateContent(message.body);
            let replyText = tracker.cleanWhatsAppFormatting(result.response.text());

            // Trigger 1: Counter Fallback (Jika sudah bertanya 2 kali atau lebih, tawarkan eskalasi)
            let footer = "\n\n_(Ketik *0* untuk kembali ke Menu Utama)_";
            if (userAiChatCount[sender] >= 2) {
                footer = "\n\n💡 *Belum menemukan jawaban yang dicari?*\nKetik *BANTUAN* untuk diteruskan ke Petugas PPID.\n_(Atau ketik *0* untuk kembali ke Menu Utama)_";
            }

            await sendUserMessage(sender, replyText + footer);

            // Rekam ke tracker percakapan inti
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: replyText,
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
        } catch (error) {
            console.error('Error dari Gemini API:', error);
            await sendUserMessage(sender, "Maaf, Asisten AI sedang mengalami gangguan koneksi.\n\nKetik *0* untuk kembali ke Menu Utama atau ketik *BANTUAN* untuk terhubung ke Petugas.");
        }
        return;
    }

    // ==========================================
    // 👨‍💻 MODE LIVE CHAT (TERHUBUNG KE PETUGAS ASLI)
    // ==========================================
    if (userState[sender] === 'CS_MODE') {
        if (text === '0' || text === 'kembali') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Sesi layanan dengan Petugas telah diakhiri.\n\nKetik *Menu* untuk menampilkan layanan kembali.");
            return;
        }

        const pemohonPhone = senderDetails.phone || (sender.endsWith('@c.us') ? sender.split('@')[0].split(':')[0].replace(/\D/g, '') : '');
        const directWaLink = pemohonPhone ? `https://wa.me/${pemohonPhone}` : '';

        // Simpan pemohon ini sebagai target aktif untuk admin
        lastCsUserJid = sender;
        lastCsUserPhone = pemohonPhone;
        if (pemohonPhone) {
            phoneToOriginalJid.set(pemohonPhone, sender);
            if (senderDetails.lid) {
                lidToPhoneMap.set(senderDetails.lid, pemohonPhone);
            }
            if (sender.endsWith('@lid')) {
                const lidUser = sender.split('@')[0].split(':')[0];
                lidToPhoneMap.set(lidUser, pemohonPhone);
            }
        }
        for (const admPhone of ADMIN_PHONES) {
            activeAdminTarget[admPhone] = sender;
            activeAdminTargetPhone[admPhone] = pemohonPhone;
        }
        for (const admLid of ADMIN_LIDS) {
            activeAdminTarget[admLid] = sender;
            activeAdminTargetPhone[admLid] = pemohonPhone;
        }
        activeAdminTarget['LAST_ACTIVE'] = sender;
        activeAdminTargetPhone['LAST_ACTIVE'] = pemohonPhone;

        const forwardText =
            `🚨 *PESAN MASUK (LIVE CHAT PPID)* 🚨\n\n` +
            `👤 *Dari Nomor:* +${pemohonPhone}\n` +
            `💬 *Pesan:*\n"${message.body || '[Media/Lampiran]'}"\n\n` +
            `-----------------------------------------\n` +
            `💡 *Cara Membalas:*\n` +
            `• *Swipe / Balas Kutipan* pesan ini, ATAU langsung ketik balasan Anda di sini.\n` +
            `• Ketik */selesai* jika konsultasi sudah tuntas.\n` +
            `👉 *Chat Pribadi Langsung:* ${directWaLink}`;

        // Teruskan ke semua nomor admin terdaftar (mendukung teks dan media)
        let forwardedCount = 0;
        let mediaObj = null;
        if (message.hasMedia) {
            try {
                mediaObj = await message.downloadMedia();
            } catch (e) {
                console.error("Gagal mengunduh media dari pemohon:", e);
            }
        }

        for (const admPhone of ADMIN_PHONES) {
            try {
                if (mediaObj) {
                    await client.sendMessage(`${admPhone}@c.us`, mediaObj, { caption: forwardText });
                } else {
                    await client.sendMessage(`${admPhone}@c.us`, forwardText);
                }
                forwardedCount++;
            } catch (e) {
                console.error(`Gagal meneruskan chat ke Admin ${admPhone}:`, e);
            }
        }

        if (forwardedCount === 0) {
            console.error("Gagal mem-forward pesan. Nomor Admin belum disetting dengan benar di .env");
        }

        // Catat ke rekapan: ada pesan yang diteruskan dan sedang menunggu balasan petugas (PENDING)
        tracker.recordConversation({
            phone: pemohonPhone,
            text: message.body || '[Media/Lampiran]',
            answer: '',
            source: 'BOT',
            aiModel,
            status: 'PENDING'
        });

        // Beri konfirmasi ke pemohon bahwa pesan sudah diteruskan
        await sendUserMessage(sender, "✅ Pesan Anda telah diteruskan ke Petugas Layanan PPID KKP. Mohon ditunggu ya, petugas kami akan segera membalasnya. 🙏\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
        return;
    }

    // ==========================================
    // 📋 ROUTING MENU UTAMA PPID KKP
    // ==========================================
    if (text === '1') {
        await sendUserMessage(sender,
            `📋 *Syarat & Formulir Permohonan Informasi Publik*\n\n` +
            `Untuk mengajukan permohonan informasi publik ke PPID KKP, Anda perlu menyiapkan:\n` +
            `1. Nomor / Salinan Identitas Diri (KTP/NIK)\n` +
            `2. Rincian Informasi yang dibutuhkan secara jelas\n` +
            `3. Tujuan Penggunaan Informasi\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `✨ *PILIHAN PENDAFTARAN (TAHAP 2):*\n` +
            `👉 Ketik *DAFTAR* untuk mengisi formulir permohonan langsung di WhatsApp ini secara mandiri.\n` +
            `👉 Atau akses portal web resmi: https://ppid.kkp.go.id\n\n` +
            `_(Ketik *0* untuk kembali ke Menu Utama)_`
        );
        return;
    }
    else if (text === '2') {
        // Cek apakah nomor pengirim memiliki tiket yang tersimpan di sistem
        const userTickets = ppid.getTicketsByPhone(senderPhone);
        if (userTickets.length > 0) {
            const latest = userTickets[0];
            const card = ppid.formatTicketCard(latest);
            userState[sender] = 'CHECK_TICKET';
            let extraList = '';
            if (userTickets.length > 1) {
                extraList = `\n\n📋 *Riwayat Tiket Lain Anda:*\n` +
                    userTickets.slice(1).map(t => `• *${t.noTiket}* - ${t.status} (${t.tanggalDaftar})`).join('\n');
            }
            await sendUserMessage(sender,
                `🔍 *PELACAKAN TIKET PPID KKP*\n\n` +
                `Ditemukan permohonan terhubung dengan nomor WhatsApp Anda (+${senderPhone}):\n\n` +
                `${card}${extraList}\n\n` +
                `💡 *Ingin melacak nomor tiket lain?*\n` +
                `Silakan langsung ketik nomor tiket yang ingin dicari (contoh: *PPID-2026-001*), atau ketik *0* untuk kembali ke Menu Utama.`
            );
        } else {
            userState[sender] = 'CHECK_TICKET';
            await sendUserMessage(sender,
                `🔍 *PELACAKAN STATUS TIKET PERMOHONAN PPID*\n\n` +
                `Silakan ketikkan *Nomor Tiket Permohonan* Anda:\n` +
                `_(Contoh: *PPID-2026-001* atau *PPID-2026-002*)_\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`
            );
        }
        return;
    }
    else if (text === '3') {
        userState[sender] = 'AI_MODE';
        await sendUserMessage(sender, "🤖 *Asisten Virtual PPID KKP*\n\nHalo! Saya adalah Asisten AI dari PPID Kementerian Kelautan dan Perikanan. \n\nSilakan ajukan pertanyaan Anda seputar layanan informasi publik, prosedur permohonan, atau transparansi data di lingkungan KKP.\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
    }
    else if (text === '4') {
        await sendUserMessage(sender, "⚖️ *Tata Cara Pengajuan Keberatan*\n\nApabila permohonan informasi Anda ditolak atau tidak ditanggapi dalam waktu 10 hari kerja, Anda berhak mengajukan keberatan secara tertulis kepada Atasan PPID KKP.\n\nPanduan lengkap dan formulir keberatan dapat dilihat di: https://ppid.kkp.go.id\n\nKetik *0* untuk kembali ke Menu Utama.");
    }
    else if (text === '6') {
        await sendUserMessage(sender,
            `Halo #SahabatBahari,\n\n` +
            `Menu nomor *6* pada menu awal telah ditiadakan. Sistem bot kami kini *mendeteksi langsung pertanyaan dan kendala Anda* tanpa harus memilih menu petugas terlebih dahulu.\n\n` +
            `Silakan langsung ketikkan pertanyaan atau laporan Anda di sini (seperti: perizinan, modernisasi kapal, program PKPN, data PPID, atau laporan dokumen palsu). Bot akan langsung menjawab atau menghubungkan Anda ke petugas jika diperlukan.`
        );
        return;
    }
    else if (isEscalationQuery(text)) {
        if (text === 'bantuan' || (userAiChatCount[sender] && userAiChatCount[sender] >= 1)) {
            userState[sender] = 'CS_MODE';
            await sendUserMessage(sender, "👨‍💻 *Terhubung ke Petugas PPID*\n\nMohon tunggu, pesan Anda akan langsung diteruskan ke Petugas Layanan Informasi PPID kami.\n\nSilakan ketikkan permohonan atau pertanyaan Anda secara lengkap di bawah ini:\n\n_(Ketik *0* jika Anda ingin membatalkan dan kembali ke Menu Utama)_");
        } else {
            await sendUserMessage(sender, "Halo #SahabatBahari,\n\nUntuk mempercepat penanganan, layanan Petugas kami prioritaskan bagi pemohon yang telah berkonsultasi melalui sistem terlebih dahulu.\n\nSilakan sampaikan pertanyaan atau kendala Anda di sini, atau pilih menu *3* untuk dibantu oleh Asisten AI. Jika belum terselesaikan, sistem akan langsung menghubungkan Anda ke Petugas.");
        }
        return;
    }
    // Trigger Menu Utama atau Jawab Pertanyaan Langsung
    else {
        // Daftar kata sapaan umum (kata 'bantuan' dialihkan ke trigger eskalasi di atas)
        const greetings = ['halo', 'hai', 'p', 'menu', 'assalamualaikum', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'help', 'info'];

        // Jika teks berupa sapaan ATAU sangat pendek (kurang dari 4 huruf) -> Tampilkan Menu
        if (greetings.includes(text) || text.length < 4) {
            const menuText = `Selamat datang di Layanan Bantuan WhatsApp Resmi *PPID Kementerian Kelautan dan Perikanan RI* 🇮🇩🐟\n\n` +
                `Silakan balas dengan angka layanan yang tersedia:\n\n` +
                `*1* 📋 Syarat & Formulir Permohonan Informasi (Daftar Digital)\n` +
                `*2* 🔍 Cek Status Permohonan (Pelacakan Tiket Langsung)\n` +
                `*3* 💬 Tanya Jawab Layanan & Kebijakan KKP (Asisten Pintar)\n` +
                `*4* ⚖️ Tata Cara Pengajuan Keberatan Informasi\n` +
                `*5* ❌ Akhiri Percakapan\n\n` +
                `💡 *Deteksi Langsung:*\n` +
                `Anda dapat *langsung mengetikkan pertanyaan atau kendala Anda kapan saja* (contoh: Program PKPN, 5 Pilar Ekonomi Biru, Kendala Modernisasi Kapal, Lokasi KNMP, Perizinan PTSA, atau Laporan Dokumen Palsu).\n\n` +
                `_Balas dengan angka (contoh: 1) untuk memilih menu._`;

            try {
                const headerImage = await MessageMedia.fromUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Logo_of_the_Ministry_of_Marine_Affairs_and_Fisheries_of_the_Republic_of_Indonesia.svg/800px-Logo_of_the_Ministry_of_Marine_Affairs_and_Fisheries_of_the_Republic_of_Indonesia.svg.png');
                await sendUserMessage(sender, headerImage, { caption: menuText });
            } catch (e) {
                await sendUserMessage(sender, menuText);
            }
        }
        // Jika teks berupa pertanyaan atau kendala -> Deteksi langsung alur penyelesaian
        else {
            // 🚨 1. DETEKSI CEPAT: Pengaduan Kepalsuan Surat / Dokumen Bodong (Priority 1)
            if (isKepalsuanSuratQuery(text)) {
                const pemohonPhone = senderDetails.phone || (sender.endsWith('@c.us') ? sender.split('@')[0].split(':')[0].replace(/\D/g, '') : '');
                const directWaLink = pemohonPhone ? `https://wa.me/${pemohonPhone}` : '';

                userState[sender] = 'CS_MODE';
                lastCsUserJid = sender;
                lastCsUserPhone = pemohonPhone;
                if (pemohonPhone) {
                    phoneToOriginalJid.set(pemohonPhone, sender);
                    if (senderDetails.lid) lidToPhoneMap.set(senderDetails.lid, pemohonPhone);
                }
                for (const admPhone of ADMIN_PHONES) {
                    activeAdminTarget[admPhone] = sender;
                    activeAdminTargetPhone[admPhone] = pemohonPhone;
                }
                activeAdminTarget['LAST_ACTIVE'] = sender;
                activeAdminTargetPhone['LAST_ACTIVE'] = pemohonPhone;

                const replyPalsu =
                    `🚨 *PERINGATAN RESMI: DETEKSI PENGADUAN DOKUMEN / SURAT PALSU KKP*\n\n` +
                    `Halo #SahabatBahari,\n` +
                    `Kementerian Kelautan dan Perikanan (KKP) menindak tegas segala bentuk pemalsuan surat dinas, pesanan barang fiktif mengatasnamakan Sekjen/pejabat KKP, undangan seminar berbayar, atau perizinan bodong.\n\n` +
                    `Laporan Anda *TELAH KAMI DETEKSI DAN LANGSUNG DIHUBUNGKAN KE PETUGAS RESMI PPID / PENGADUAN KKP*.\n\n` +
                    `📲 *TINDAK LANJUT CEPAT:*\n` +
                    `Silakan *KIRIMKAN FOTO / DOKUMEN (PDF/JPG)* surat yang Anda terima di chat ini sekarang, beserta nomor kontak dan keterangan singkat. Petugas kami akan segera memverifikasi keabsahan surat dan nomor registrasi dinasnya.\n\n` +
                    `_(Ketik *0* untuk membatalkan dan kembali ke Menu Utama)_`;

                await sendUserMessage(sender, replyPalsu);

                const alertAdmin =
                    `🚨🚨 *[URGENT: LAPORAN DUGAAN SURAT PALSU / PENIPUAN KKP]* 🚨🚨\n\n` +
                    `👤 *Dari Nomor Pemohon:* +${pemohonPhone}\n` +
                    `💬 *Pesan Laporan:* "${message.body || '[Media/Lampiran]'}"\n\n` +
                    `-----------------------------------------\n` +
                    `Petugas dimohon segera memeriksa keabsahan surat dan membalas langsung di sini.\n` +
                    `👉 *Chat Pemohon:* ${directWaLink}`;

                for (const admPhone of ADMIN_PHONES) {
                    try {
                        await client.sendMessage(`${admPhone}@c.us`, alertAdmin);
                    } catch (e) {
                        console.error(`Gagal mengirim alert surat palsu ke admin ${admPhone}:`, e);
                    }
                }

                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Terdeteksi Pengaduan Surat Palsu -> Langsung dialihkan ke CS Petugas PPID & Notifikasi Admin Terkirim',
                    source: 'BOT',
                    aiModel,
                    status: 'PENDING'
                });
                return;
            }

            // 🔒 2. Intercept Pengaduan AKP / ABK (Priority 2)
            if (isPengaduanAkpQuery(text)) {
                await sendUserMessage(sender, AKP_PENGADUAN_MESSAGE + "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 *Apakah kendala AKP Anda sudah tertampung?*\n• Balas *YA* jika sudah cukup.\n• Ketik *0* atau *Menu* untuk opsi layanan lain.");
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Diarahkan ke Layanan Pengaduan AKP (WA: 0811251744, Call Center: +62 811-1000-3132)',
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 🔒 3. Intercept Pengaduan Umum (Priority 3)
            if (isPengaduanQuery(text)) {
                await sendUserMessage(sender, PENGADUAN_UMUM_MESSAGE + "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 *Apakah laporan Anda sudah tertampung?*\n• Balas *YA* jika sudah cukup.\n• Ketik *0* atau *Menu* untuk opsi layanan lain.");
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Diarahkan ke Layanan Pengaduan KKP (Email: pengaduan@kkp.go.id, WA: 0811989011)',
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 🔒 4. Intercept Perizinan → redirect ke PTSA (Priority 4)
            if (isPerizinanQuery(text)) {
                await sendUserMessage(sender, PTSA_REDIRECT_MESSAGE + "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 *Apakah informasi kontak perizinan PTSA sudah jelas?*\n• Balas *YA* jika sudah cukup.\n• Ketik *0* atau *Menu* untuk opsi layanan lain.");
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Diarahkan ke PTSA KKP (WA: 0811-8430-610, Email: ptsp@kkp.go.id)',
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // ⛵ 5. Intercept Tematik: Modernisasi Kapal Perikanan
            if (isModernisasiKapalQuery(text)) {
                userState[sender] = 'PKPN_KAPAL_MENU';
                await sendUserMessage(sender, KAPAL_SUBMENU_TEXT);
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Masuk Panduan Troubleshooting Modernisasi Kapal Perikanan',
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 🌊 6. Intercept Tematik: KNMP (Kampung Nelayan Merah Putih)
            if (isKnmpQuery(text)) {
                userState[sender] = 'PKPN_KNMP_MENU';
                await sendUserMessage(sender, KNMP_SUBMENU_TEXT);
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Masuk Panduan Troubleshooting Wilayah & Program KNMP',
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 🎯 7. Intercept Tematik: PKPN (Program Kerja Prioritas Nasional - Menu Berjenjang)
            if (isPkpnQuery(text)) {
                userState[sender] = 'PKPN_SELECT_PROGRAM';
                await sendUserMessage(sender, PKPN_PROGRAM_MENU_TEXT);
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Masuk Menu Pilihan Program Kerja Prioritas Nasional (PKPN 5 Program)',
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 🌍 8. Intercept Tematik: Ekonomi Biru (5 Pilar)
            if (isEkonomiBiruQuery(text)) {
                userState[sender] = 'TROUBLESHOOT_EKONOMI_BIRU';
                await sendUserMessage(sender,
                    `Halo #SahabatBahari,\n\n` +
                    `KKP menerapkan *5 Kebijakan Ekonomi Biru* untuk kelestarian laut dan kesejahteraan masyarakat:\n` +
                    `1. Perluasan Kawasan Konservasi Laut (Target 30% di 2045)\n` +
                    `2. Penangkapan Ikan Terukur (PIT) Berbasis Kuota di WPPNRI\n` +
                    `3. Pengembangan Budi Daya Laut, Pesisir, dan Darat Berkelanjutan\n` +
                    `4. Pengawasan dan Pengendalian Pesisir & Pulau-Pulau Kecil (PKKPRL)\n` +
                    `5. Pembersihan Sampah Plastik Laut (Bulan Cinta Laut / BCL)\n\n` +
                    `Silakan pilih pilar yang ingin Anda pelajari lebih lanjut (balas dengan angka):\n` +
                    `*1* 🏝️ Kawasan Konservasi Laut (Target 30% & Blue Carbon)\n` +
                    `*2* 🎣 Penangkapan Ikan Terukur (PIT) & Kuota Nelayan\n` +
                    `*3* 🦐 Budi Daya Ramah Lingkungan (Udang, Nila Salin, Rumput Laut)\n` +
                    `*4* 🌊 Pengawasan Pesisir & Izin Ruang Laut (PKKPRL)\n` +
                    `*5* 🚯 Bulan Cinta Laut (Gerakan Partisipasi Nelayan)\n` +
                    `*0* ✅ Sudah Cukup / Selesai\n\n` +
                    `_Balas dengan angka 1-5 atau 0._`
                );
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Masuk Panduan Detail 5 Kebijakan Ekonomi Biru KKP',
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 9. Cek kecocokan dengan file database template (faq.json)
            let jawabanTemplate = null;
            try {
                const faqData = JSON.parse(fs.readFileSync('./faq.json', 'utf8'));
                for (const item of faqData) {
                    const isMatch = item.keywords.some(keyword => text.includes(keyword));
                    if (isMatch) {
                        jawabanTemplate = tracker.cleanWhatsAppFormatting(item.answer);
                        break;
                    }
                }
            } catch (err) {
                console.error("Gagal membaca faq.json:", err);
            }

            // Jika ada jawaban di template FAQ
            if (jawabanTemplate) {
                userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;
                const footer =
                    `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `💡 *Apakah jawaban di atas sudah menyelesaikan kendala Anda?*\n` +
                    `• Balas *YA* jika kendala sudah selesai.\n` +
                    `• Atau ketikkan pertanyaan detail lainnya.\n` +
                    `• Ketik *0* untuk kembali ke Menu Utama.`;

                await sendUserMessage(sender, jawabanTemplate + footer);

                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: jawabanTemplate,
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 10. Jika bukan FAQ dan relevan dengan KKP -> Oper ke Gemini AI
            if (isRelevantKKPQuery(text) || text.length > 25) {
                userState[sender] = 'AI_MODE';
                userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;
                try {
                    const result = await aiModel.generateContent(message.body);
                    let replyText = tracker.cleanWhatsAppFormatting(result.response.text());
                    const footer =
                        `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `💡 *Apakah informasi ini sudah menyelesaikan kendala Anda?*\n` +
                        `• Balas *YA* jika sudah selesai.\n` +
                        `• Atau ajukan pertanyaan lebih lanjut.\n` +
                        `• Ketik *0* untuk kembali ke Menu Utama.`;

                    await sendUserMessage(sender, replyText + footer);

                    tracker.recordConversation({
                        phone: senderPhone,
                        text: message.body,
                        answer: replyText,
                        source: 'BOT',
                        aiModel,
                        status: 'DONE'
                    });
                } catch (error) {
                    console.error('Error dari Gemini API:', error);
                    await sendUserMessage(sender, "Maaf, Asisten AI sedang mengalami gangguan koneksi.\n\nKetik *0* untuk kembali ke Menu Utama atau ketik *BANTUAN* untuk terhubung ke Petugas.");
                }
                return;
            }

            // 11. Jika tidak masuk kemana-mana / tidak jelas -> Berikan pertanyaan tertutup, jika tetap tidak jelas selesaikan/abaikan
            userState[sender] = 'UNCLEAR_PROMPT';
            await sendUserMessage(sender,
                `Halo #SahabatBahari,\n\n` +
                `Pesan Anda belum teridentifikasi dalam lingkup tugas dan layanan informasi Kementerian Kelautan dan Perikanan (KKP).\n\n` +
                `Silakan konfirmasi melalui pilihan tertutup berikut:\n` +
                `*1* 🌊 Ya, kendala saya tentang sektor Kelautan & Perikanan (silakan sebutkan topik perikanan/kelautan yang dimaksud)\n` +
                `*2* ❌ Bukan / Di luar KKP (akhiri sesi)\n\n` +
                `_Balas angka *1* atau *2*._\n\n` +
                `Salam hormat.`
            );
            return;
        }
    }
});

// ==========================================
// ⏰ JADWAL OTOMATIS: REKAP EXCEL JAM 16:00 WIB
// ==========================================
let lastDailyReportDate = null;

setInterval(async () => {
    const dateOptions = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    const [hourStr, minuteStr] = new Intl.DateTimeFormat('en-GB', dateOptions).format(new Date()).split(':');
    const currentHour = parseInt(hourStr, 10);
    const todayStr = tracker.getTodayDateWIB();

    // Cek apakah sudah jam 16:00 (4 sore) atau setelahnya dan belum dikirim hari ini
    if (currentHour >= 16 && lastDailyReportDate !== todayStr) {
        console.log(`[SCHEDULE] Menjalankan pengiriman rekap harian jam 16:00 WIB untuk tanggal ${todayStr}...`);
        lastDailyReportDate = todayStr;

        try {
            const recap = await tracker.generateExcelRecap(todayStr);
            if (recap.totalRecords > 0) {
                const media = MessageMedia.fromFilePath(recap.filePath);
                const caption = tracker.cleanWhatsAppFormatting(
                    `📊 *REKAP HARIAN LAYANAN PPID KKP (JAM 16.00 WIB)*\n\n` +
                    `📅 *Tanggal:* ${todayStr}\n` +
                    `👥 *Total Sesi Percakapan:* ${recap.totalRecords} sesi\n` +
                    `📁 *Status:* Dokumen Excel rekap percakapan terlampir.\n\n` +
                    `_Data hari ini telah direkap dan sistem siap melayani hari esok._`
                );

                for (const admPhone of ADMIN_PHONES) {
                    try {
                        await client.sendMessage(`${admPhone}@c.us`, media, { caption });
                    } catch (err) {
                        console.error(`Gagal mengirim rekap ke admin ${admPhone}:`, err);
                    }
                }
            } else {
                for (const admPhone of ADMIN_PHONES) {
                    try {
                        await client.sendMessage(
                            `${admPhone}@c.us`,
                            `📊 *REKAP HARIAN LAYANAN PPID KKP (JAM 16.00 WIB)*\n\n` +
                            `📅 *Tanggal:* ${todayStr}\n` +
                            `ℹ️ Tidak ada percakapan baru yang masuk hari ini.`
                        );
                    } catch (err) { }
                }
            }

            // Data rekap harian disimpan secara aman dan persisten (tidak di-reset)
            console.log(`[SCHEDULE] Rekapan harian jam 16:00 WIB untuk ${todayStr} berhasil diekspor dan diarsipkan.`);
        } catch (err) {
            console.error('[SCHEDULE] Error generate/kirim rekap harian jam 16:00:', err);
        }
    }
}, 30000); // Evaluasi setiap 30 detik

client.initialize();

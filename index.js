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

PRINSIP UTAMA: JANGAN MEMBERIKAN JAWABAN YANG TERLALU PANJANG KARENA MASYARAKAT MALAS MEMBACA!
Sajikan informasi secara RINGKAS, PADAT, JELAS, EDUKATIF, dan TO THE POINT (maksimal 3-5 poin ringkas per balasan, di bawah 100 kata).

ATURAN KOMUNIKASI (TANYA DETAIL DULU, BARU JAWAB DETAIL) & ALUR KERJA:
1. JIKA SUDAH INTI PERTANYAAN / MENGERUCUT:
   - JANGAN PERNAH MEMBERIKAN PILIHAN ATAU MENU LAGI!
   - Langsung berikan jawaban inti yang spesifik, solutif, ringkas, dan tuntas!
   - Contoh: jika pemohon bertanya "pengumumannya", "syaratnya apa", "jadwalnya kapan", "rekrutmen abk", "juknis budidaya", atau "kontak ptsa", langsung jawab informasi tersebut tanpa berputar-putar.

2. TANYA DETAIL DULU (HANYA jika pertanyaan pemohon benar-benar masih TERLALU UMUM / LUAS):
   - Contoh: pemohon hanya mengetik "mau tanya izin", "info bantuan", "soal kapal" tanpa kejelasan.
   - Ajukan 2-4 pilihan ringkas bernomor.
   - Begitu pemohon memilih atau mengerucutkan pertanyaan, LANGSUNG JAWAB INTI dan jangan beri pilihan berulang.

3. MEMORI PERCAKAPAN (MULTI-TURN CONTEXT):
   - Selalu sambungkan jawaban Anda dengan konteks pertanyaan dan jawaban sebelumnya.
   - Jika pemohon bertanya hal lanjutan (seperti "pengumumannya", "jadwalnya", "syaratnya"), pahami bahwa itu merujuk pada topik yang sedang dibahas sebelumnya.

4. INFO LOKER & REKRUTMEN ABK:
   - Pegawai Umum / ASN: Melalui seleksi resmi nasional (https://sdmao.kkp.go.id / IG: @rosdmaokkp).
   - Awak Kapal Perikanan (AKP / ABK): Pendaftaran pencari kerja & sertifikasi kompetensi dikelola via Portal E-LAUT KKP (https://elaut-bppsdm.kkp.go.id/akp/).
   - Syarat Utama: Sertifikat keselamatan BST-F Tingkat II, Buku Pelaut Perikanan, dan terdaftar di e-KUSUKA. Penyaluran resmi wajib melalui agen berizin SIUPPAK resmi. Waspada calo & penipuan.
   - Kontak AKP: 0819-9247-4154 / WA Aduan AKP: 0811-251-744.

5. BANTUAN USAHA BUDIDAYA & JUKNIS:
   - Jika ada permohonan bantuan usaha budidaya (benih, bibit, pakan mandiri, bioflok, tambak), WAJIB cantumkan:
     • Tautan Unduh Juknis Budidaya: https://ppid.kkp.go.id/upp/direktorat-jenderal-perikanan-budi-daya/regulasi/petunjuk-teknis/
     • Syarat kelompok Pokdakan ber-e-KUSUKA aktif terdaftar di Dinas Perikanan Kabupaten/Kota.
     • Pengajuan proposal melalui dinas perikanan daerah untuk diverifikasi ke Ditjen Perikanan Budi Daya (DJPB).
     • Alternatif modal usaha bunga 3% via BLU LPMUKP (0811-9877-676).

6. FORMATTING WHATSAPP:
   - Awali WAJIB dengan: "Halo #SahabatBahari," (atau "Hello #SahabatBahari," jika berbahasa Inggris)
   - Akhiri WAJIB dengan: "Salam hormat." (atau "Best regards, PPID MMAF / KKP RI." jika berbahasa Inggris)
   - Gunakan TANDA BINTANG TUNGGAL *teks* untuk cetak tebal (bold). DILARANG tanda bintang ganda **teks**.

7. DUKUNGAN BAHASA INGGRIS (BILINGUAL SUPPORT - ENGLISH):
   - Jika pemohon bertanya atau menyapa dalam BAHASA INGGRIS (English):
     • Berikan SELURUH respon dalam BAHASA INGGRIS yang fasih, sopan, formal, dan akurat.
     • Format pembuka WAJIB: "Hello #SahabatBahari,"
     • Format penutup WAJIB: "Best regards, PPID MMAF / KKP RI."
     • Gunakan format WhatsApp rapi (*bold* tunggal, tanpa **).
     • Jelaskan regulasi resmi Kementerian Kelautan dan Perikanan (MMAF/KKP).

8. ANALISIS INTI PERTANYAAN LONGTEXT:
   - Jika pemohon mengirimkan pesan yang panjang (berupa paragraf, cerita, kronologi kasus, atau gabungan beberapa kalimat/pertanyaan):
     1. Bedah dan identifikasi DENGAN CERMAT MASALAH INTI / PERTANYAAN UTAMA pemohon.
     2. JANGAN mengulang-ulang cerita atau latar belakang pemohon.
     3. Langsung jawab INTI MASALAH / SOLUSI KONKRETNYA secara terstruktur (maksimal 3-5 poin ringkas):
        • Solusi Utama (to the point)
        • Langkah / Syarat Konkret
        • Kanal Layanan Resmi terkait
     4. Jika terdapat lebih dari satu pertanyaan, jawab masing-masing poin secara ringkas dan lugas tanpa bertele-tele.

9. ISU SENSITIF PIHAK EKSTERNAL:
   - Jika ada pemohon yang menanyakan isu sensitif, polemik, sengketa, atau tudingan yang melibatkan pihak eksternal/pihak ketiga/LSM/kementerian lain/luar negeri:
     • TEGASKAN secara sopan bahwa hal tersebut merupakan *perihal dan ranah kebijakan internal Kementerian Kelautan dan Perikanan (KKP)*.
     • Arahkan bahwa informasi publik resmi KKP hanya diterbitkan melalui saluran resmi Humas KKP dan portal ppid.kkp.go.id.

10. DAFTAR RESMI KONTAK LAYANAN & PENGADUAN KKP (PATEN & WAJIB DIGUNAKAN):
   - Call Center Terpadu KKP: 141 (Satu-satunya nomor Call Center resmi KKP. DILARANG KERAS menyebut 196, 159, atau nomor lain).
   - WhatsApp Pengaduan Umum, PSDKP & Satwa Dilindungi (Penyu, Bom Ikan, dsb): 0811-9890-11 (Email: pengaduan@kkp.go.id / Portal: https://lapor.go.id).
   - WhatsApp Pelayanan Terpadu Satu Atap (PTSA / Perizinan Berusaha): 0811-8430-610 (Email: ptsp@kkp.go.id).
   - Layanan PPID KKP (Informasi Publik): Pemohon sudah berada di ruang WhatsApp resmi PPID KKP (Portal: https://ppid.kkp.go.id, Email: ppidkkp@kkp.go.id). DILARANG MEMBERIKAN NOMOR PPID LAGI! Jika ada pertanyaan atau kebutuhan yang mengharuskan kontak PPID, langsung alihkan/hubungkan ke Petugas Layanan PPID KKP.
   - Pengaduan Awak Kapal Perikanan (AKP / ABK): WA 0811-251-744 / Call Center: +62 811-1000-3132.
   - Pinjaman Modal Usaha BLU LPMUKP (Bunga Rendah 3%): WA 0811-9877-676 / 0856-2009-163.
   - Satgas Kampung Nelayan Merah Putih (KNMP): WA +62 822-9936-9004 / Email: korwil@merahputih.kop.id.
   - Ditjen Perikanan Budi Daya (DJPB): WA 0822-6150-5727.
   ATURAN MUTLAK NOMOR KONTAK (ANTI-HALUSINASI):
   DILARANG KERAS MENGARANG ATAU MENYEBUTKAN NOMOR SELAIN DAFTAR RESMI DI ATAS! Dilarang mengarang nomor telepon atau WhatsApp fiktif!

11. PENEMPATAN MAGANG & PKL MAHASISWA (JANGAN DIKASIH PENGADUAN):
   - Jika pemohon bertanya mengenai magang, PKL (Praktik Kerja Lapangan), atau penempatan magang, DILARANG KERAS memberikan informasi/kanal pengaduan atau kontak aduan AKP/ABK!
   - Jelaskan bahwa penempatan peserta magang disesuaikan dengan program studi dan kebutuhan kuota unit kerja KKP melalui surat pengantar resmi universitas/sekolah.

12. INGIN NGOBROL DENGAN SUATU BAGIAN LANGSUNG:
   - Jika pemohon ingin berbicara, berdiskusi, berkonsultasi langsung, atau ngobrol dengan suatu bagian/unit kerja di KKP:
   - JANGAN LANGSUNG MEMBERIKAN NOMOR PTSA ATAU KONTAK TEKNIS UNIT LAIN!
   - Berikan arahan untuk menyampaikan permohonan melalui surat resmi/audiensi terlebih dahulu (surat diajukan via portal ppid.kkp.go.id, email ppidkkp@kkp.go.id, atau loket persuratan Gedung Mina Bahari I).

13. JIKA INFORMASI TIDAK TERSEDIA / TIDAK DIKETAHUI / TIDAK ADA DALAM DATABASE:
   - Jika informasi tidak ada di database atau tidak diketahui: DILARANG mengarang jawaban!
   - CUKUP JAWAB DENGAN: "Halo #SahabatBahari,\n\nMohon maaf, informasi tersebut belum bisa kami jawab melalui sistem layanan otomatis kami.\n\nPesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat dibantu lebih lanjut secara resmi. Mohon ditunggu ya, petugas kami akan segera membalas pesan Anda. 🙏\n\n_(Ketik *0* untuk kembali ke Menu Utama)_"

14. ATURAN PENGGUNAAN KONTAK PTSA & ANALISIS KESOPANAN:
   - DILARANG KERAS memberikan nomor WhatsApp PTSA (0811-8430-610) kecuali pertanyaan pemohon secara spesifik menanyakan perizinan berusaha penangkapan kapal/usaha perikanan di PTSA!
   - Kata pembuka seperti "mohon izin bertanya...", "izin tanya...", "izin min..." adalah tata krama/kesopanan berbicara khas masyarakat Indonesia, BUKAN pertanyaan perizinan kapal. Analisislah inti pertanyaan sesungguhnya di balik kalimat tersebut.
   - Berbicaralah selayaknya manusia yang ramah, hangat, empatik, cerdas, dan to the point, bukan seperti bot penjawab kaku.

15. ATURAN SATU DATA & PERMOHONAN DATA KKP:
   - Portal satudata.kkp.go.id TIDAK AKTIF / TIDAK ADA. DILARANG KERAS memberikan tautan satudata.kkp.go.id!
   - Seluruh data statistik, agregat, dan dokumen kelautan perikanan masuk ke dalam ranah *Permohonan Informasi Publik PPID KKP* (https://ppid.kkp.go.id).
   - Jika pemohon menanyakan Satu Data KKP atau memerlukan data statistik/analisis yang tidak ada di database: JANGAN MENGARANG! Arahkan ke PPID dan alihkan langsung ke Petugas Layanan PPID KKP agar dibantu secara resmi.`
});

// Menyimpan status obrolan pengguna ('MENU', 'AI_MODE', 'CS_MODE', 'CHECK_TICKET', 'CHECK_SUBMITTED_LETTER', 'REG_NAME', 'REG_NIK', 'REG_INFO', 'REG_PURPOSE', 'AWAITING_IKM', 'TROUBLESHOOT_KAPAL', 'TROUBLESHOOT_KNMP', 'TROUBLESHOOT_PKPN', 'TROUBLESHOOT_EKONOMI_BIRU', 'UNCLEAR_PROMPT', 'SELECT_KONTAK', 'SELECT_LAPORAN')
const userState = {};
// Menyimpan jumlah interaksi tanya-jawab (AI/FAQ) pengguna untuk eskalasi cerdas
const userAiChatCount = {};
// Penyimpanan data formulir digital sementara & target survei IKM (Tahap 2)
const regData = {};
const pendingIkmTarget = {};

// ==========================================
// 👤 PENGINGAT IDENTITAS / NAMA PEMOHON
// ==========================================
const userKnownName = {}; // senderPhone / sender -> string

function extractSelfIntroName(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.trim();
    // contoh: "nama saya Budi Santoso", "namaku Siti", "nama saya: Ahmad dari Tegal", "perkenalkan nama saya Rizki", "panggil saya Joko"
    const match = t.match(/(?:nama saya|nama ku|namaku|nama\s*:|perkenalkan nama saya|perkenalkan saya|panggil saya(?: saja)?)\s+([A-Za-z\u00C0-\u017F]+(?:\s+[A-Za-z\u00C0-\u017F]+)?)/i);
    if (match && match[1]) {
        let candidate = match[1].trim();
        // Hentikan jika kata kedua adalah preposisi/kata hubung (misal 'dari', 'asal', 'mau', 'ingin', 'di')
        const parts = candidate.split(/\s+/);
        const stopWords = ['dari', 'asal', 'mau', 'ingin', 'di', 'yang', 'akan', 'sudah', 'adalah', 'tinggal', 'bisa', 'tolong'];
        if (parts.length > 1 && stopWords.includes(parts[1].toLowerCase())) {
            candidate = parts[0];
        }
        const blackList = ['mau', 'ingin', 'bisa', 'tolong', 'mohon', 'dari', 'akan', 'sudah', 'adalah', 'admin', 'petugas', 'sahabat', 'bahari', 'kak', 'pak', 'ibu', 'mas', 'mbak'];
        if (!blackList.includes(candidate.toLowerCase()) && candidate.length >= 2 && candidate.length <= 35) {
            return candidate;
        }
    }
    return null;
}

// ==========================================
// 🧠 MEMORI PERCAKAPAN & KONTEKS MULTI-TURN (10 OBROLAN TERAKHIR)
// ==========================================
const userChatHistory = {}; // senderPhone -> array of { role: 'user'|'model', text: string, timestamp: number }
const userActiveTopic = {}; // senderPhone -> { topic: string, name: string, updatedAt: number }

function addChatHistory(phone, role, text) {
    if (!phone) return;
    if (!userChatHistory[phone]) userChatHistory[phone] = [];
    userChatHistory[phone].push({
        role: role === 'user' ? 'user' : 'model',
        text: (text || '').trim(),
        timestamp: Date.now()
    });
    // Simpan hingga 20 entri (10 obrolan tanya-jawab pemohon & bot terakhir)
    if (userChatHistory[phone].length > 20) {
        userChatHistory[phone] = userChatHistory[phone].slice(-20);
    }
}

function getChatHistoryContext(phone, limit = 10) {
    if (!phone || !userChatHistory[phone] || userChatHistory[phone].length === 0) return '';
    // Ambil hingga 20 entri pesan (10 obrolan pemohon & bot terakhir)
    const recent = userChatHistory[phone].slice(-20);
    return recent.map((msg, idx) => `[Obrolan #${Math.floor(idx / 2) + 1} - ${msg.role === 'user' ? 'Pemohon' : 'Asisten PPID'}]: ${msg.text}`).join('\n');
}

function clearChatHistory(phone) {
    if (!phone) return;
    delete userChatHistory[phone];
    delete userActiveTopic[phone];
    // userKnownName sengaja tidak dihapus agar nama pemohon tetap diingat
}

// ==========================================
// 🕒 JAM OPERASIONAL KHUSUS CHAT PETUGAS PPID
// (Mode Testing: Diatur 24 Jam Nonstop)
// ==========================================
const OPERATIONAL_HOURS_24_HOURS_TESTING = true; // Set true untuk mematikan batasan jam operasional saat pengujian/testing

function getPetugasOperationalInfo() {
    // Mode testing: Layanan petugas diset aktif 24 jam penuh (tanpa batasan jam kerja / jam istirahat)
    if (OPERATIONAL_HOURS_24_HOURS_TESTING) {
        return {
            isOpen: true,
            isBreak: false,
            isWeekend: false,
            isOutsideHours: false,
            hour: 10,
            minute: 0
        };
    }

    const dateOptions = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' };
    const formatter = new Intl.DateTimeFormat('en-GB', dateOptions);
    const parts = formatter.formatToParts(new Date());
    const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
    const weekday = parts.find(p => p.type === 'weekday').value; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'

    const currentTimeInMinutes = hour * 60 + minute;
    const isWeekend = weekday === 'Sat' || weekday === 'Sun';

    // Jam istirahat: 11:40 - 13:00 WIB
    const isBreak = currentTimeInMinutes >= (11 * 60 + 40) && currentTimeInMinutes < (13 * 60);

    // Jam kerja resmi:
    // Senin - Kamis: 08:00 - 15:00 WIB
    // Jumat: 08:00 - 15:30 WIB
    let isWorkingHours = false;
    if (!isWeekend) {
        if (weekday === 'Fri') {
            isWorkingHours = currentTimeInMinutes >= (8 * 60) && currentTimeInMinutes < (15 * 60 + 30);
        } else {
            isWorkingHours = currentTimeInMinutes >= (8 * 60) && currentTimeInMinutes < (15 * 60);
        }
    }

    const isOpen = isWorkingHours && !isBreak;
    return {
        isOpen,
        isBreak,
        isWeekend,
        isOutsideHours: !isWorkingHours && !isWeekend,
        hour,
        minute
    };
}

// ==========================================
// 🎯 DETEKSI PERTANYAAN INTI / MENGERUCUT
// ==========================================
function isSpecificQuestion(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();
    if (t.includes('?')) return true;

    const specificIndicators = [
        'bagaimana', 'gimana', 'apa', 'apakah', 'kapan', 'dimana', 'di mana', 'berapa',
        'siapa', 'mengapa', 'kenapa', 'syarat', 'cara', 'prosedur', 'tata cara', 'alur',
        'jadwal', 'waktu', 'tanggal', 'pengumuman', 'pengumumannya', 'info pengumuman',
        'hasil', 'daftar', 'lokasi', 'tempat', 'biaya', 'tarif', 'kontak', 'nomor',
        'call center', 'email', 'website', 'link', 'portal', 'juknis', 'panduan', 'loker',
        'lowongan', 'rekrutmen', 'tender', 'lelang', 'penerima', 'pengadaan', 'gaji', 'upah',
        'bantuan', 'hibah', 'modal', 'pinjaman', 'formulir', 'form', 'unduh', 'download',
        'lpse', 'aturan', 'regulasi', 'permen', 'data', 'jumlah', 'dokumen', 'surat',
        'kendala', 'masalah', 'error', 'gagal', 'bisa tidak', 'bisa gak', 'status',
        'tanya', 'bertanya', 'konsultasi', 'solusi', 'rekomendasi', 'minta info', 'minta data'
    ];
    if (specificIndicators.some(w => t.includes(w))) return true;

    const words = t.split(/\s+/).filter(w => w.length > 1);
    if (words.length >= 5) return true;

    return false;
}

// ==========================================
// 🔍 PENCARIAN FAQ DENGAN PRINSIP BEST MATCH & RAG GROUNDING
// ==========================================
let cachedFaqData = null;
function getFaqData() {
    if (!cachedFaqData) {
        try {
            cachedFaqData = JSON.parse(fs.readFileSync('./faq.json', 'utf8'));
        } catch (err) {
            console.error("Gagal membaca faq.json:", err);
            cachedFaqData = [];
        }
    }
    return cachedFaqData;
}

function findBestFaqMatch(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.toLowerCase().trim();
    try {
        const faqData = getFaqData();
        let bestMatch = null;
        let longestKeywordLength = 0;

        for (const item of faqData) {
            if (!item.keywords || !Array.isArray(item.keywords)) continue;
            for (const keyword of item.keywords) {
                const kw = keyword.toLowerCase().trim();
                if (kw.length >= 3 && t.includes(kw) && kw.length > longestKeywordLength) {
                    longestKeywordLength = kw.length;
                    bestMatch = item;
                }
            }
        }
        return bestMatch ? tracker.cleanWhatsAppFormatting(bestMatch.answer) : null;
    } catch (err) {
        console.error("Gagal membaca atau mencocokkan faq.json:", err);
        return null;
    }
}

function getRelevantFaqContext(queryText, limit = 5) {
    if (!queryText || typeof queryText !== 'string') return '';
    try {
        const faqData = getFaqData();
        const cleanQuery = queryText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        const queryTokens = cleanQuery.split(/\s+/).filter(w => w.length > 2);

        // Stopwords Bahasa Indonesia & Inggris yang diabaikan dalam pembobotan
        const stopWords = new Set([
            'saya', 'kami', 'anda', 'kamu', 'ingin', 'mau', 'bisa', 'tolong', 'mohon',
            'tanya', 'bertanya', 'bagaimana', 'gimana', 'cara', 'caranya', 'apakah', 'apa',
            'kenapa', 'mengapa', 'kapan', 'dimana', 'mana', 'berapa', 'yang', 'dan', 'atau',
            'dengan', 'untuk', 'pada', 'dari', 'ke', 'di', 'ini', 'itu', 'ada', 'adalah',
            'akan', 'sudah', 'telah', 'bisa', 'dapat', 'halo', 'selamat', 'pagi', 'siang',
            'sore', 'malam', 'admin', 'petugas', 'pak', 'bu', 'bapak', 'ibu', 'mas', 'mba',
            'the', 'and', 'for', 'with', 'about', 'how', 'what', 'when', 'where', 'who', 'why'
        ]);

        const scoredItems = [];
        for (const item of faqData) {
            let score = 0;
            const keywords = Array.isArray(item.keywords) ? item.keywords : [];
            const answer = (item.answer || '').toLowerCase();

            // 1. Cek kecocokan frasa keyword lengkap
            for (const kw of keywords) {
                const kwLower = kw.toLowerCase().trim();
                if (cleanQuery.includes(kwLower)) {
                    score += 15 + kwLower.length;
                }
            }

            // 2. Cek token overlap dengan keywords
            for (const token of queryTokens) {
                if (stopWords.has(token)) continue;
                for (const kw of keywords) {
                    const kwTokens = kw.toLowerCase().split(/\s+/);
                    if (kwTokens.includes(token)) score += 5;
                }
                // 3. Cek kemunculan di teks jawaban
                if (answer.includes(token)) score += 1;
            }

            if (score > 0) scoredItems.push({ item, score });
        }

        scoredItems.sort((a, b) => b.score - a.score);
        const topMatches = scoredItems.slice(0, limit);
        if (topMatches.length === 0) return '';

        return topMatches.map((m, idx) => {
            const kwList = m.item.keywords.slice(0, 5).join(', ');
            return `[REFERENSI FAQ RESMI #${idx + 1} (Topik: ${kwList})]:\n${m.item.answer}`;
        }).join('\n\n');
    } catch (err) {
        console.error("Gagal mengambil konteks FAQ relevan:", err);
        return '';
    }
}

// ==========================================
// 🤖 GENERATOR RESPON AI TERGROUNDING (STRICT FAQ & DATABASE GROUNDED)
// ==========================================
async function generateGroundedAiResponse({
    sender,
    senderPhone,
    messageBody,
    text,
    topicContext = '',
    isMultiChat = false,
    multiChatCount = 1,
    isLongText = false
}) {
    const senderName = userKnownName[senderPhone] || userKnownName[sender] || '';
    const historyCtx = getChatHistoryContext(senderPhone);
    const isEnglish = isEnglishQuery(text);
    const faqContext = getRelevantFaqContext(messageBody, 5);

    let systemAdditions = '';
    if (senderName) {
        systemAdditions += `\n[NAMA PENGIRIM / PEMOHON]: Nama pemohon adalah "${senderName}". Sapa pemohon secara ramah, sopan, dan hangat di awal pesan dengan format: "Halo #SahabatBahari Kak ${senderName}," (atau sesuaikan bila bahasa Inggris: "Hello #SahabatBahari Mr./Ms. ${senderName},").`;
    } else {
        systemAdditions += `\n[SAPAAN PEMOHON]: Jika nama pemohon belum diketahui, gunakan sapaan ramah standar: "Halo #SahabatBahari,".`;
    }

    if (historyCtx) {
        systemAdditions += `\n[PENGINGAT KONTEKS 10 OBROLAN TERAKHIR]: Sistem merekam hingga 10 obrolan terakhir. Hubungkan konteks pertanyaan terkini pemohon dengan riwayat obrolan sebelumnya secara koheren, nyambung, dan konsisten. Jika pemohon merujuk pada hal yang telah dibahas sebelumnya (misalnya 'syaratnya apa saja?', 'bagaimana cara daftarnya?', 'bisa diulang?'), Anda WAJIB menjawab tuntas sesuai konteks yang sedang dibahas tanpa meminta pemohon mengulang penjelasannya.`;
    }
    systemAdditions += `\n[ATURAN KONTAK RESMI KKP]: Jika menyebutkan kontak atau saluran pelaporan, HANYA gunakan nomor resmi KKP: Call Center 141, WA Pengaduan/PSDKP 0811-9890-11, WA PTSA 0811-8430-610, WA Perlindungan Awak Kapal (AKP) 0811-251-744, WA Ditjen Budi Daya (DJPB) 0822-6150-5727, WA Pinjaman BLU LPMUKP 0811-9877-676, WA Biro SDMAO (Kepegawaian/CPNS/PPPK) 0851-5889-8203, WA Satgas KNMP +62 822-9936-9004. DILARANG KERAS MENGARANG nomor lain seperti 196, 159, atau nomor WhatsApp fiktif!`;
    systemAdditions += `\n[ATURAN PENGGUNAAN KONTAK PTSA]: DILARANG KERAS memberikan nomor WhatsApp PTSA (0811-8430-610) kecuali pertanyaan pemohon secara spesifik menanyakan perizinan berusaha penangkapan kapal/usaha perikanan di PTSA! Jika pertanyaan mengenai topik lain (misal izin riset/penelitian, magang, bantuan benih, modal usaha, surat audiensi, atau aduan), HANYA berikan kontak resmi sesuai database KKP di atas, BUKAN nomor PTSA!`;
    systemAdditions += `\n[ANALISIS BAHASA DAN KESOPANAN]: Frasa pembuka seperti "mohon izin bertanya...", "izin tanya...", "izin min...", "saya mau nanya..." adalah bentuk kesopanan bertutur kata khas Indonesia, BUKAN pertanyaan perizinan kapal/berusaha. Analisislah dan jawablah inti pertanyaan pemohon yang ada di balik kata pembuka tersebut secara cerdas, tepat sasaran, dan akurat.`;
    systemAdditions += `\n[GAYA PERCAKAPAN NATURAL & MANUSIAWI]: Berbicaralah selayaknya petugas customer service profesional PPID KKP yang ramah, hangat, empatik, cerdas, solutif, dan to the point. Jawablah langsung inti masalah dengan bahasa yang mengalir alami dan bersahabat. Hindari gaya bahasa yang kaku seperti robot, mesin penjawab, atau template otomatis.`;
    systemAdditions += `\n[ATURAN NOMOR PPID]: DILARANG KERAS memberikan nomor WhatsApp atau nomor telepon PPID kepada pemohon karena pemohon sudah berada di ruang WhatsApp resmi PPID KKP! Jika pemohon menanyakan kontak PPID atau memerlukan penanganan PPID langsung, arahkan bahwa pemohon sudah berada di layanan resmi PPID dan langsung hubungkan ke petugas.`;
    systemAdditions += `\n[ATURAN PENEMPATAN MAGANG & PKL]: Jika pertanyaan terkait magang, PKL (Praktik Kerja Lapangan), atau penempatan magang mahasiswa/siswa, DILARANG KERAS memberikan saluran/kontak pengaduan atau hotline aduan AKP/ABK! Magang/PKL adalah perihal akademik kedinasan, bukan aduan ketenagakerjaan kapal. Jelaskan penempatan magang disesuaikan dengan program studi dan kuota unit kerja KKP melalui surat pengantar resmi kampus/sekolah.`;
    systemAdditions += `\n[ATURAN INGIN NGOBROL DENGAN SUATU BAGIAN LANGSUNG & KUNJUNGAN]: Jika pemohon ingin berbicara, berdiskusi, beraudiensi, berkunjung, atau ngobrol langsung dengan suatu bagian/direktorat/unit di KKP, JANGAN langsung memberikan nomor PTSA atau nomor telepon unit teknis! Berikan arahan untuk menyampaikan permohonan melalui surat resmi terlebih dahulu melalui email humas.kkp@kkp.go.id / portal PPID https://ppid.kkp.go.id, atau jika menyerahkan berkas langsung (hardcopy) bisa ke loket Bagian Persuratan di Gedung Mina Bahari (GMB) IV Lantai 1 (Senin-Kamis pukul 08.00-15.30 WIB).`;
    systemAdditions += `\n[ATURAN PENANGANAN LAPORAN]: Jika pemohon baru menyampaikan pernyataan awal ingin melapor (seperti "ingin laporan", "mau lapor"), sistem memberikan pilihan 3 kategori laporan: (1) Pengaduan Umum & Pelanggaran Perikanan/PSDKP/WBS, (2) Pengawasan & Pengendalian Ruang Laut (PRL) / Pemanfaatan Pulau-Pulau Kecil, (3) Pengaduan Awak Kapal Perikanan (AKP/ABK). Namun jika pemohon SUDAH langsung menyebutkan inti/tujuan laporannya (contoh: melihat penangkapan penyu, perburuan satwa dilindungi, bom ikan, atau pertanyaan pemanfaatan/penggunaan pulau), LANGSUNG identifikasi dan berikan informasi kanal laporan tersebut tanpa memberikan menu pilihan berulang!`;
    systemAdditions += `\n[ATURAN KONTAK SATGAS PEMBANGUNAN KNMP]: Jika pemohon menanyakan kontak Satgas Pembangunan KNMP, berikan tautan resmi Instagram: https://www.instagram.com/p/DeB4FFpmnJg/?utm_source=ig_web_copy_link&gwpx=NTc4MTIwNjQ2YQ== beserta kontak koreksi Regional Kalimantan: Fakhri (0852-8734-7969).`;
    systemAdditions += `\n[ATURAN JIKA INFORMASI TIDAK TERSEDIA / TIDAK ADA DALAM DATABASE]: Jika informasi yang ditanyakan pemohon TIDAK ADA dalam database resmi atau tidak diketahui jawabannya: DILARANG MENGARANG! CUKUP JAWAB DENGAN: "Halo #SahabatBahari,\n\nMohon maaf, informasi tersebut belum bisa kami jawab melalui sistem layanan otomatis kami.\n\nPesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat dibantu lebih lanjut secara resmi. Mohon ditunggu ya, petugas kami akan segera membalas pesan Anda. 🙏\n\n_(Ketik *0* untuk kembali ke Menu Utama)_"`;
    systemAdditions += `\n[ATURAN PORTAL SATU DATA]: Portal web satudata.kkp.go.id TIDAK AKTIF / TIDAK ADA. DILARANG KERAS memberikan tautan satudata.kkp.go.id! Seluruh permohonan data statistik dan informasi publik perikanan secara resmi berada di bawah mekanisme PPID KKP (https://ppid.kkp.go.id). Jika pemohon menanyakan portal Satu Data atau membutuhkan data statistik/analisis yang tidak ada di database, arahkan ke PPID dan alihkan permohonan ke Petugas Layanan PPID KKP.`;

    if (isMultiChat) {
        systemAdditions += `\n[INSTRUKSI MULTI-CHAT (${multiChatCount} PESAN BERUNTUN)]: Pemohon mengirimkan beberapa pesan chat berurutan. Anda WAJIB merespons layaknya petugas customer service manusia yang ramah, empatik, responsif, dan profesional (JANGAN TERLALU KAKU/ROBOT):\n1. Awali dengan merumuskan SATU kesimpulan kalimat inti kebutuhan pemohon di awal jawaban (contoh: "Halo #SahabatBahari,\\n\\nTerima kasih atas pesan yang Anda sampaikan. Dari rangkaian pesan yang Bapak/Ibu kirimkan, kami simpulkan bahwa Anda membutuhkan informasi/panduan terkait [inti kebutuhan pemohon]...").\n2. Berikan HANYA 1 RESPON TUNGGAL terpadu yang komprehensif, padat, dan menjawab tuntas seluruh pertanyaan/kendala pemohon dalam rangkaian pesan tersebut.\n3. Jangan memecah balasan atau memberikan menu berulang.`;
    }

    if (isLongText) {
        systemAdditions += `\n[INSTRUCTION - ANALISIS LONGTEXT]: Pesan pemohon memuat kronologi/teks panjang. Bedah dan tangkap INTI PERTANYAAN / MASALAH UTAMA. Jangan mengulang cerita/kronologi pemohon. Berikan jawaban langsung, terstruktur, ringkas (maksimal 3-5 poin solusi), dan to the point.`;
    }

    if (isEnglish) {
        systemAdditions += `\n[INSTRUCTION: The applicant is communicating in English. You MUST respond completely and fluently in English. Use official MMAF / KKP terminology (e.g. 'Ministry of Marine Affairs and Fisheries', 'Blue Economy', 'PPID MMAF'). Greeting: 'Hello #SahabatBahari,'. Closing: 'Best regards, PPID MMAF / KKP RI.']`;
    }

    let contextualPrompt = `[INSTRUKSI SISTEM TAMBAHAN]:${systemAdditions}\n\n`;
    if (topicContext) {
        contextualPrompt += `[KONTEKS MENU / TOPIK AKTIF]:\n${topicContext}\n\n`;
    }
    if (faqContext) {
        contextualPrompt += `[DATABASE RESMI KKP & FAQ TERVERIFIKASI]:\n${faqContext}\n\n`;
    }
    if (historyCtx) {
        contextualPrompt += `[RIWAYAT 10 OBROLAN TERAKHIR DENGAN PEMOHON]:\n${historyCtx}\n\n`;
    }
    contextualPrompt += `[PESAN PEMOHON]:\n${messageBody}\n\n`;
    contextualPrompt += isEnglish
        ? `Please provide a clear, direct, and concise solution in English. Do not show repetitive menus if there is already a specific question. Ensure all contact numbers strictly match the official KKP database above.`
        : `Jawablah pertanyaan pemohon secara ringkas, to the point, ramah dan manusiawi, serta pastikan seluruh nomor kontak dan prosedur 100% akurat sesuai Database KKP di atas. Jangan memberikan menu berulang jika sudah ada pertanyaan spesifik.`;

    const result = await aiModel.generateContent(contextualPrompt);
    return tracker.cleanWhatsAppFormatting(result.response.text());
}

// ==========================================
// 📞 PEMETAAN SALURAN KONTAK RESMI KKP
// ==========================================
const CONTACT_MENU_TEXT =
    `Halo #SahabatBahari,\n\n` +
    `Berikut pemetaan saluran kontak resmi layanan Kementerian Kelautan dan Perikanan (KKP):\n\n` +
    `*1* 🏢 *Layanan Informasi Publik & PPID KKP* (Informasi data, berkas publik, tatap muka)\n` +
    `*2* 📑 *Pelayanan Terpadu Satu Atap (PTSA)* (Perizinan berusaha, SIPI, SIUP, PKKPRL, OSS)\n` +
    `*3* 👨‍✈️ *Pengaduan & Perlindungan Awak Kapal (AKP / ABK)* (Darurat laut, gaji, E-LAUT)\n` +
    `*4* 🏘️ *Satgas Kampung Nelayan Merah Putih (KNMP)* (Program sarana nelayan & Koperasi KDMP)\n` +
    `*5* 🐟 *Ditjen Perikanan Budi Daya (DJPB)* (Konsultasi tambak, benih ikan & Juknis)\n` +
    `*6* 💰 *Permodalan Usaha Nelayan (BLU LPMUKP)* (Pinjaman modal usaha bunga rendah 3%)\n` +
    `*7* 🚨 *Pengaduan Umum, Saber Pungli & WBS Itjen* (Laporan pelanggaran & penipuan)\n` +
    `*8* 👥 *Biro SDM Aparatur dan Organisasi (SDMAO)* (Kepegawaian, CPNS, PPPK, mutasi)\n` +
    `*0* ↩️ *Kembali ke Menu Utama*\n\n` +
    `_Silakan balas dengan angka *1* sampai *8* untuk rincian kontak yang Anda butuhkan._\n\n` +
    `Salam hormat.`;

const CONTACT_DETAILS = {
    '1': `🏢 *LAYANAN INFORMASI PUBLIK & PPID KKP*\n\n` +
        `Anda saat ini sudah terhubung di ruang WhatsApp resmi PPID Kementerian Kelautan dan Perikanan.\n` +
        `• *Layanan Chat:* Ruang WhatsApp ini (langsung terhubung dengan Petugas PPID)\n` +
        `• *Email Resmi:* ppidkkp@kkp.go.id\n` +
        `• *Portal Web:* https://ppid.kkp.go.id\n` +
        `• *Desk Layanan:* Gedung Mina Bahari I Lantai 1, Jl. Medan Merdeka Timur No. 16, Jakarta Pusat\n` +
        `• *Jam Pelayanan:* Senin - Kamis (08.00 - 15.00 WIB), Jumat (08.00 - 15.30 WIB)`,

    '2': `📑 *KONTAK RESMI PTSA KKP (PELAYANAN PERIZINAN TERPADU)*\n\n` +
        `• *WhatsApp Helpdesk PTSA:* 0811-8430-610\n` +
        `• *Email:* ptsp@kkp.go.id\n` +
        `• *Portal Perizinan Kapal (SILAT):* https://perizinan.kkp.go.id\n` +
        `• *Portal Izin Berusaha (OSS RBA):* https://oss.go.id\n` +
        `• *Portal Cek Fisik Kapal (SICEFI):* https://kapal.kkp.go.id/sicefi`,

    '3': `👨‍✈️ *KONTAK RESMI PENGADUAN & PERLINDUNGAN AWAK KAPAL (AKP / ABK)*\n\n` +
        `• *WhatsApp Pengaduan AKP:* 0811-251-744\n` +
        `• *Call Center Darurat Pelaut:* +62 811-1000-3132\n` +
        `• *Helpdesk E-LAUT (Sertifikasi BST-F):* 0819-9247-4154\n` +
        `• *Portal Sertifikasi & Bursa Kerja:* https://elaut-bppsdm.kkp.go.id/akp/`,

    '4': `🏘️ *KONTAK RESMI SATGAS PEMBANGUNAN & OPERASIONALISASI KNMP*\n\n` +
        `Berikut informasi mengenai kontak Satgas Pembangunan KNMP sesuai kebutuhan Sahabat:\n` +
        `🔗 https://www.instagram.com/p/DeB4FFpmnJg/?utm_source=ig_web_copy_link&gwpx=NTc4MTIwNjQ2YQ==\n\n` +
        `*Koreksi Kontak Regional:*\n` +
        `• *Regional Kalimantan:* Fakhri (0852-8734-7969)\n\n` +
        `• *WhatsApp Official KNMP:* +62 822-9936-9004\n` +
        `• *Call Center:* 1500587\n` +
        `• *Email:* korwil@merahputih.kop.id\n` +
        `• *Instagram Official:* @knmp_indonesia\n` +
        `• *Sekretariat:* Gedung Mina Bahari II Lantai 10, Kantor Pusat KKP Jakarta`,

    '5': `🐟 *KONTAK RESMI DITJEN PERIKANAN BUDI DAYA (DJPB KKP)*\n\n` +
        `• *WhatsApp Layanan DJPB:* +62 822-6150-5727\n` +
        `• *Portal Web Resmi:* https://djpb.kkp.go.id\n` +
        `• *Unduh Juknis Bantuan Budidaya:* https://ppid.kkp.go.id/upp/direktorat-jenderal-perikanan-budi-daya/regulasi/petunjuk-teknis/\n` +
        `• *Email:* setditjen.pb@kkp.go.id / djpb@kkp.go.id\n` +
        `• *Call Center KKP:* 141`,

    '6': `💰 *KONTAK RESMI PERMODALAN NELAYAN (BLU LPMUKP KKP)*\n\n` +
        `• *WhatsApp Pengajuan Pinjaman (Bunga 3%):* 0811-9877-676 / 0856-2009-163\n` +
        `• *Call Center:* (021) 3864448 / 1550 480\n` +
        `• *Portal Resmi:* https://lpmukp.kkp.go.id\n` +
        `• *Email:* info@lpmukp.kkp.go.id\n` +
        `• *Alamat:* Gedung Mina Bahari IV Lt. 3, Jl. Medan Merdeka Timur No. 16, Jakarta Pusat`,

    '7': `🚨 *KONTAK RESMI PENGADUAN UMUM, SABER PUNGLI & WBS ITJEN KKP*\n\n` +
        `• *WhatsApp Pengaduan KKP:* 0811-9890-11\n` +
        `• *Email Pengaduan:* pengaduan@kkp.go.id\n` +
        `• *Portal Whistleblowing System (WBS):* https://wbs.kkp.go.id\n` +
        `• *Call Center KKP:* 141`,

    '8': `👥 *KONTAK RESMI BIRO SDM APARATUR & ORGANISASI (SDMAO KKP)*\n\n` +
        `• *WhatsApp SDMAO:* 0851-5889-8203\n` +
        `• *Portal Kepegawaian:* https://sdmao.kkp.go.id\n` +
        `• *Instagram Official:* @rosdmaokkp\n` +
        `• *Email:* ropeg@kkp.go.id\n` +
        `• *Telepon:* (021) 3519070 ext. 2524\n` +
        `• *Alamat:* Gedung Mina Bahari IV Lantai 3, Jl. Medan Merdeka Timur No. 16, Jakarta Pusat`
};

function isGeneralContactQuery(text) {
    const t = (text || '').toLowerCase().trim();
    const contactWords = ['kontak', 'hubungi', 'call center', 'callcenter', 'hotline', 'nomor wa', 'wa kkp', 'telepon', 'telp', 'email kkp'];
    const hasContactWord = contactWords.some(w => t.includes(w));
    if (!hasContactWord) return false;

    // Jika pemohon sudah spesifik menanyakan unit tertentu, biarkan ditangani handler spesifik
    const specificUnits = ['ppid', 'ptsa', 'perizinan', 'sipi', 'siup', 'akp', 'abk', 'knmp', 'kdmp', 'budidaya', 'djpb', 'lpmukp', 'modal', 'pungli', 'wbs'];
    if (specificUnits.some(u => t.includes(u))) {
        return false;
    }
    return true;
}

// ==========================================
// ⏱️ BUFFER PENGGABUNGAN CHAT BERUNTUN (DEBOUNCE AGGREGATION)
// ==========================================
const userMessageBuffer = {}; // sender -> { messages: [], senderDetails: null, timer: null }
const MESSAGE_BUFFER_DELAY_MS = 2000; // 2 detik jeda agregasi chat susulan

// ==========================================
// 🌐 DUKUNGAN BAHASA INGGRIS (BILINGUAL SUPPORT)
// ==========================================
function isEnglishQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();
    const englishGreetings = [
        'hello', 'hi', 'good morning', 'good afternoon', 'good evening',
        'dear sir', 'dear madam', 'excuse me'
    ];
    if (englishGreetings.some(g => t.startsWith(g) || t === g)) return true;

    const englishWords = [
        'what', 'how', 'when', 'where', 'who', 'why', 'which', 'can i', 'could i',
        'please', 'help me', 'permit', 'license', 'licensing', 'fishing', 'vessel',
        'ship', 'boat', 'information', 'ministry', 'marine', 'fisheries', 'regulation',
        'contact', 'foreigner', 'foreign', 'tourist', 'research', 'document', 'letter',
        'requirement', 'application', 'apply', 'procedure', 'office', 'service', 'public',
        'policy', 'indonesia', 'waters', 'ocean', 'blue economy', 'aquaculture', 'clearance'
    ];
    const tokens = t.split(/[^a-zA-Z]+/);
    let matchCount = 0;
    for (const token of tokens) {
        if (englishWords.includes(token)) matchCount++;
    }
    return matchCount >= 2;
}

// ==========================================
// 🚨 DETEKSI ANCAMAN / INTIMIDASI
// ==========================================
function isThreatQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();
    const threatKeywords = [
        'ancam', 'mengancam', 'kubunuh', 'hajar', 'serang', 'santet', 'mati kau',
        'awas kalian', 'awas kamu', 'awas lo', 'saya laporkan polisi', 'lapor polisi',
        'saya gugat', 'gugat kkp', 'somasi', 'bakar', 'demo', 'rusak', 'viralkan',
        'saya viralkan', 'tak viralkan', 'awas kalau tidak', 'tak laporkan', 'tuntut',
        'saya tuntut', 'penjarakan'
    ];
    return threatKeywords.some(k => t.includes(k));
}

// ==========================================
// 🔒 DETEKSI USAHA MENGETAHUI IDENTITAS / INFORMASI SENSITIF INTERNAL
// ==========================================
function isSensitiveInfoProbingQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();

    // Pola kombinasi rumah/kediaman/keluarga pejabat
    const isPrivateResidenceOrFamily = (t.includes('rumah') || t.includes('kediaman') || t.includes('keluarga') || t.includes('istri') || t.includes('suami') || t.includes('anak') || t.includes('mobil pribadi') || t.includes('mobil dinas')) &&
        (t.includes('menteri') || t.includes('pejabat') || t.includes('dirjen') || t.includes('sekjen') || t.includes('irjen'));
    if (isPrivateResidenceOrFamily) return true;

    // Pola kontak/rekening/gaji pribadi pejabat
    const isPrivateContactOrFinance = (t.includes('nomor pribadi') || t.includes('hp pribadi') || t.includes('wa pribadi') || t.includes('kontak pribadi') || t.includes('rekening') || t.includes('gaji') || t.includes('penghasilan') || t.includes('nik')) &&
        (t.includes('menteri') || t.includes('pejabat') || t.includes('dirjen') || t.includes('pegawai') || t.includes('pemeriksa'));
    if (isPrivateContactOrFinance) return true;

    const sensitiveProbingKeywords = [
        'nomor pribadi menteri', 'hp menteri', 'wa menteri', 'nomor pribadi pejabat',
        'rumah menteri', 'alamat menteri', 'rumah pejabat', 'alamat rumah pejabat',
        'nik menteri', 'nik pejabat', 'gaji menteri', 'gaji pejabat', 'rekening menteri',
        'rekening pejabat', 'nomor rekening dinas', 'password', 'kata sandi', 'login admin',
        'database kkp', 'server kkp', 'dokumen rahasia', 'data rahasia', 'intelijen kkp',
        'vms rahasia', 'radar rahasia', 'koordinat kapal rahasia', 'bocoran internal',
        'data pribadi pegawai', 'kontak pribadi pegawai', 'identitas pemeriksa', 'mobil dinas menteri'
    ];
    return sensitiveProbingKeywords.some(k => t.includes(k));
}

// ==========================================
// 🔄 DETEKSI KENDALA BERULANG / FRUSTRASI "TIDAK BISA"
// ==========================================
function isFrustratedOrCannotQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();
    const cannotPhrases = [
        'tetap tidak bisa', 'masih tidak bisa', 'masih gak bisa', 'masih ga bisa',
        'selalu gagal', 'gagal terus', 'error terus',
        'tidak membantu', 'ga membantu', 'gak ada gunanya', 'jawaban berulang',
        'jangan muter muter', 'muter muter terus', 'jawabannya sama terus'
    ];
    return cannotPhrases.some(p => t.includes(p));
}

// ==========================================
// 🏛️ DETEKSI ISU SENSITIF PIHAK EKSTERNAL (PERIHAL INTERNAL)
// ==========================================
function isSensitiveExternalIssueQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();
    const sensitiveExternalKeywords = [
        'isu sensitif', 'pihak eksternal', 'pihak ketiga', 'sengketa pihak luar',
        'polemik eksternal', 'polemik menteri', 'tudingan lsm', 'tuduhan lsm',
        'konflik dengan kementerian', 'konflik pemda', 'isu ekspor benih lobster',
        'polemik benih lobster', 'kasus bbl luar negeri', 'sengketa swasta',
        'tudingan korupsi luar', 'isu politik luar', 'investigasi asing',
        'intervensi asing', 'masalah dengan negara tetangga'
    ];
    return sensitiveExternalKeywords.some(k => t.includes(k));
}

const SENSITIVE_EXTERNAL_ISSUE_REPLY =
    `Halo #SahabatBahari,\n\n` +
    `Terkait pertanyaan atau informasi mengenai isu yang melibatkan pihak eksternal tersebut, hal tersebut merupakan *perihal dan ranah kebijakan internal Kementerian Kelautan dan Perikanan (KKP)* yang dikaji serta ditangani sesuai ketentuan kedinasan dan peraturan perundang-undangan yang berlaku.\n\n` +
    `Informasi resmi KKP kepada masyarakat hanya dipublikasikan secara resmi melalui Biro Humas dan Kerja Sama Luar Negeri KKP atau permohonan informasi publik resmi melalui portal https://ppid.kkp.go.id.\n\n` +
    `Apakah ada informasi publik resmi lainnya yang dapat kami bantu?\n\n` +
    `Salam hormat.`;

// ==========================================
// 📨 DETEKSI MENERUSKAN SURAT (FORWARDING LETTER)
// ==========================================
function isForwardingLetterQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();
    const forwardKeywords = [
        'meneruskan surat', 'teruskan surat', 'mau teruskan surat', 'ingin meneruskan surat',
        'forward surat', 'titip surat', 'kirimkan surat ini', 'sampaikan surat ini',
        'menyerahkan surat', 'kirim surat dinas', 'teruskan dokumen', 'meneruskan berkas',
        'teruskan ke menteri', 'teruskan ke pejabat', 'sampaikan ke menteri',
        'surat untuk menteri', 'surat untuk dirjen', 'kirim surat ke kkp'
    ];
    return forwardKeywords.some(k => t.includes(k));
}

const FORWARDING_LETTER_CONFIRMATION =
    `Halo #SahabatBahari,\n\n` +
    `Pesan dan surat/dokumen yang Anda sampaikan telah berhasil *DISIMPAN* dalam sistem layanan Kementerian Kelautan dan Perikanan (KKP).\n\n` +
    `Petugas kami akan segera menelaah isi surat tersebut dan Anda akan *DIHUBUNGI KEMBALI OLEH PETUGAS KAMI* melalui nomor kontak/WhatsApp ini.\n\n` +
    `Mohon pastikan nomor telepon Anda selalu aktif. Terima kasih atas kerja sama dan kepercayaannya kepada KKP. 🙏\n\n` +
    `Salam hormat.`;

// ==========================================
// 🔍 DETEKSI MENANYAKAN SURAT YANG SUDAH DIKIRIMKAN (TRACKING SUBMITTED LETTER)
// ==========================================
function isTrackingSubmittedLetterQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();
    const submittedLetterKeywords = [
        'surat yang sudah dikirim', 'surat yang saya kirim', 'surat sudah dikirim',
        'surat yang sudah kami kirim', 'status surat saya', 'cek surat saya',
        'surat permohonan saya', 'tindak lanjut surat saya', 'bagaimana surat saya',
        'apakah surat saya sudah diterima', 'surat saya sudah sampai mana',
        'konfirmasi surat masuk', 'cek status surat', 'surat dinas saya',
        'berkas yang saya kirim', 'berkas yang sudah dikirim', 'follow up surat'
    ];
    return submittedLetterKeywords.some(k => t.includes(k));
}

const TRACKING_SUBMITTED_LETTER_MENU =
    `Halo #SahabatBahari,\n\n` +
    `Untuk memeriksa tindak lanjut atau status surat/dokumen yang telah Anda kirimkan ke Kementerian Kelautan dan Perikanan (KKP), silakan pilih saluran pengiriman surat Anda:\n\n` +
    `*1* 📱 *Kirim melalui WhatsApp ini*\n` +
    `Silakan tunggu respons dari Petugas Layanan kami. Petugas kami sedang/akan memverifikasi dokumen Anda dan membalas langsung di ruang obrolan WhatsApp ini.\n\n` +
    `*2* 🌐 *Kirim melalui Portal Resmi PPID KKP*\n` +
    `Silakan lacak status permohonan surat informasi Anda secara berkala melalui tautan Pelacakan Tiket resmi kami:\n` +
    `🔗 https://ppid.kkp.go.id/layanan-informasi/tracking-tiket/\n` +
    `(Atau balas angka *2* untuk melacak nomor tiket Anda langsung di sini) dan tunggu konfirmasi hasil verifikasi dari Petugas PPID.\n\n` +
    `_Silakan balas angka *1* atau *2* sesuai jalur pengiriman surat Anda, atau ketik *0* untuk kembali ke Menu Utama._\n\n` +
    `Salam hormat.`;

// ==========================================
// 🙋 DETEKSI PEMBUKA CHAT / INGIN BERTANYA / PERKENALAN DIRI
// ==========================================
function isIntroductoryOrAskQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();

    // Sapaan / niat ingin bertanya belaka (tanpa pertanyaan substantif lanjutan)
    const askIntents = [
        'saya ingin bertanya', 'ingin bertanya', 'mau bertanya', 'saya mau bertanya',
        'mau tanya', 'saya mau tanya', 'mau nanya', 'saya mau nanya',
        'bisa tanya', 'bisa bertanya', 'ada yang mau saya tanyakan', 'ada yang ingin saya tanyakan',
        'mau konsultasi', 'saya mau konsultasi', 'ingin konsultasi', 'saya ingin konsultasi'
    ];

    for (const intent of askIntents) {
        if (t === intent) return true;
        if (t.startsWith(intent)) {
            const remainder = t.slice(intent.length).replace(/[^a-z0-9]/g, ' ').trim();
            const trivialWords = new Set(['', 'min', 'admin', 'dong', 'ya', 'kak', 'pak', 'bu', 'mas', 'mba', 'kkp', 'nih']);
            const words = remainder.split(/\s+/).filter(w => w.length > 0);
            if (words.every(w => trivialWords.has(w))) {
                return true;
            }
        }
    }

    // Perkenalan diri nama ("saya indah", "nama saya budi", "halo saya indah")
    const introMatch = t.match(/^(?:halo\s+|hai\s+|assalamualaikum\s+|selamat\s+(?:pagi|siang|sore|malam)\s+)?(?:saya|nama\s+saya|namaku)\s+([a-zA-Z\s]{2,20})$/i);
    if (introMatch && !/petugas|admin|cs|operator/i.test(t)) {
        const namePart = introMatch[1].trim().toLowerCase();
        if (!['mau', 'ingin', 'bisa', 'akan', 'ada', 'punya', 'butuh'].some(w => namePart.startsWith(w))) {
            return true;
        }
    }

    return false;
}

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
// 🔒 DETEKSI PERIZINAN BERUSAHA (PTSA KKP)
// ==========================================
const PERIZINAN_KEYWORDS = [
    'perizinan berusaha', 'izin berusaha', 'izin kapal', 'izin penangkapan',
    'izin tangkap', 'perizinan kapal', 'perizinan penangkapan', 'izin berlayar',
    'izin operasi kapal', 'izin perikanan', 'perizinan perikanan', 'perizinan kkp',
    'konsultasi perizinan', 'layanan perizinan', 'pengurusan perizinan',
    'izin usaha perikanan', 'ptsa kkp', 'layanan ptsa', 'wa ptsa', 'kontak ptsa',
    'loket ptsa', 'helpdesk ptsa', 'kantor ptsa', 'perizinan sipi', 'perizinan siup',
    'perizinan pkkprl', 'perizinan silat', 'perizinan oss'
];

function isPerizinanQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();

    // 1. Abaikan kalimat sapaan/kesopanan seperti "izin bertanya", "mohon izin", "izin tanya", "izin min", "izin mau tanya"
    const isPolitePrefix = /(mohon\s+)?(izin|ijin)\b/i.test(t) &&
        /(tanya|nanya|bertanya|minta|bicara|ngobrol|masuk|gabung|konsultasi|konfirmasi|menyampaikan|min|admin|pak|bu|kak)/i.test(t);
    if (isPolitePrefix && !t.includes('perizinan berusaha') && !t.includes('ptsa') && !t.includes('sipi') && !t.includes('siup') && !t.includes('izin kapal')) {
        return false;
    }

    // 2. Abaikan jika terkait izin non-PTSA (penelitian, riset, skripsi, magang, pkl, obat ikan, data)
    if (t.includes('penelitian') || t.includes('riset') || t.includes('skripsi') || t.includes('magang') || t.includes('pkl') || t.includes('obat ikan')) {
        return false;
    }

    // 3. Cek kata kunci spesifik perizinan berusaha / PTSA
    const hasPerizinanKw = PERIZINAN_KEYWORDS.some(k => t.includes(k));
    const isExactWord = (t === 'ptsa' || t === 'perizinan' || t === 'izin usaha' || t === 'perijinan' || t === 'konsultasi perizinan');

    return hasPerizinanKw || isExactWord;
}

// Format Standar Pertanyaan Tertutup Penyelesaian Masalah (Standar PKPN)
const CLOSED_RESOLUTION_FOOTER =
    `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 *Apakah penjelasan di atas sudah menyelesaikan kebutuhan Anda?*\n` +
    `• Balas *YA* jika kendala sudah tuntas / selesai.\n` +
    `• Balas *BANTUAN* jika ingin terhubung langsung ke Petugas PPID.\n` +
    `• Ketik *0* untuk kembali ke Menu Utama.`;

const ENGLISH_CLOSED_RESOLUTION_FOOTER =
    `\n\n───────────────────────────\n` +
    `💡 *Has this information resolved your inquiry?*\n` +
    `• Reply *YES* if resolved.\n` +
    `• Or submit further specific questions.\n` +
    `• Type *0* to return to Main Menu.`;

// Footer pertanyaan tertutup dinonaktifkan (dihapus) sesuai permintaan agar pesan lebih ringkas dan bersih di bawah Salam Hormat
function getResolutionFooter(text) {
    return '';
}

const PTSA_REDIRECT_MESSAGE =
    `Halo #SahabatBahari,\n\n` +
    `📋 *PANDUAN PERIZINAN BERUSAHA SEKTOR KELAUTAN & PERIKANAN (PTSA KKP)*\n\n` +
    `Seluruh pelayanan perizinan berusaha penangkapan ikan, pengangkutan, budidaya, dan pemanfaatan ruang laut dikelola secara terpadu melalui *PTSA (Pelayanan Terpadu Satu Atap) KKP* berbasis digital:\n\n` +
    `1. *Kanal Pendaftaran Mandiri (Online):*\n` +
    `   • Portal OSS RBA (Penerbitan NIB & Standar Usaha): https://oss.go.id\n` +
    `   • Portal SILAT KKP (SIPI / SIUP / SIKPI Kapal Perikanan): https://perizinan.kkp.go.id\n` +
    `   • Portal SICEFI (Verifikasi Fisik & SKKP Kapal): https://kapal.kkp.go.id/sicefi\n\n` +
    `2. *Alur & Persyaratan Permohonan:*\n` +
    `   • Pastikan telah memiliki Nomor Induk Berusaha (NIB) subsektor perikanan aktif dari portal OSS.\n` +
    `   • Siapkan dokumen teknis kapal (Buku Kapal, Berita Acara Cek Fisik SKKP, Surat Ukur Kemenhub, spesifikasi alat tangkap ramah lingkungan).\n` +
    `   • Pembayaran PNBP resmi disetor via kode billing Simponi/Kemenkeu (KKP tidak pernah meminta transfer ke rekening pribadi).\n\n` +
    `3. *Kontak Asistensi & Konsultasi Langsung:*\n` +
    `   📱 *WhatsApp PTSA:* 0811-8430-610\n` +
    `   📧 *Email:* ptsp@kkp.go.id\n` +
    `   ☎️ *Telepon:* 021-3519070 ext. 2826\n` +
    `   🏢 *Layanan Tatap Muka:* Gedung Mina Bahari IV Lt. 1, Gambir, Jakarta Pusat (Senin–Kamis 08.00–15.30 WIB, Jumat 08.00–16.00 WIB)\n\n` +
    `Salam hormat.`;

// ==========================================
// 🔒 DETEKSI PENGADUAN (AKP/ABK & UMUM)
// ==========================================
function isPengaduanAkpQuery(text) {
    const t = (text || '').toLowerCase();
    // Jika pertanyaan tentang magang/siswa/mahasiswa, JANGAN masukkan ke pengaduan AKP (Request 2)
    if (t.includes('magang') || t.includes('kerja praktik') || (t.includes('pkl') && !t.includes('perjanjian kerja laut') && !t.includes('kapal') && !t.includes('abk') && !t.includes('akp'))) {
        return false;
    }
    // Jika pertanyaan tentang pendaftaran, persyaratan, pengumuman, loker, portal e-laut, dll -> BUKAN pengaduan AKP
    const nonPengaduanTerms = [
        'syarat', 'persyaratan', 'daftar', 'pendaftaran', 'rekrutmen', 'lowongan', 'loker',
        'pengumuman', 'jadwal', 'e-laut', 'elaut', 'portal', 'bursa kerja', 'skck',
        'bst-f', 'sertifikat bst', 'biaya', 'cara jadi', 'gimana jadi', 'jadi awak kapal', 'jadi abk'
    ];
    if (nonPengaduanTerms.some(term => t.includes(term))) {
        return false;
    }
    const hasAkpAbk = /\b(akp|abk|awak kapal|pelaut|pelaut perikanan)\b/.test(t);
    const hasPengaduan = /\b(pengaduan|aduan|lapor|laporkan|keluhan|gaji|kecelakaan|ditahan|disiksa|terlantar|masalah|kasus|korban|hak|upah)\b/.test(t);
    const specificKeywords = [
        'pengaduan akp', 'pengaduan abk', 'lapor akp', 'lapor abk',
        'gaji abk', 'gaji akp', 'abk ditahan', 'abk disiksa', 'abk terlantar',
        'kecelakaan kapal abk', 'kecelakaan akp', 'masalah abk', 'masalah akp',
        'gangguan operasional akp', 'aduan akp', 'aduan abk', 'pengaduan awak kapal', 'lapor awak kapal'
    ];
    return specificKeywords.some(k => t.includes(k)) || (hasAkpAbk && hasPengaduan);
}

function isPengaduanQuery(text) {
    const t = (text || '').toLowerCase();
    // Jika pertanyaan tentang magang/siswa/mahasiswa, JANGAN masukkan ke pengaduan (Request 2)
    if (t.includes('magang') || t.includes('kerja praktik') || (t.includes('pkl') && !t.includes('perjanjian kerja laut') && !t.includes('kapal') && !t.includes('abk') && !t.includes('akp'))) {
        return false;
    }
    // Abaikan jika konteksnya adalah laporan data publik / statistik / keuangan / tahunan
    if (t.includes('laporan tahunan') || t.includes('laporan keuangan') || t.includes('laporan kinerja') || t.includes('laporan data')) {
        return false;
    }
    // Abaikan jika pertanyaan tentang syarat/daftar/informasi
    if (t.includes('syarat') || t.includes('daftar') || t.includes('pengumuman') || t.includes('jadwal')) {
        return false;
    }
    const keywords = [
        'pengaduan', 'lapor', 'laporkan', 'aduan', 'melaporkan', 'keluhan',
        'pungli', 'whistleblower', 'wbs', 'pelanggaran perikanan', 'lapor.go.id'
    ];
    return keywords.some(k => t.includes(k));
}

// ==========================================
// 📢 DETEKSI PERMINTAAN INGIN LAPORAN UMUM (PILIHAN 3 KATEGORI: UMUM, PRL, AKP)
// ==========================================
function isGenericReportInquiry(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();

    // Jika mengandung kata-kata spesifik perihal laporan (penyu, pulau, bom, kapal, gaji, pungli, dll), JANGAN tampilkan menu pilihan laporan
    const specificSubstanceTerms = [
        'penyu', 'hiu', 'paus', 'lumba', 'karang', 'terumbu', 'biota', 'satwa', 'mangrove',
        'pulau', 'ruang laut', 'pkkprl', 'reklamasi', 'pasir laut', 'sedimentasi', 'pesisir',
        'bom', 'dinamit', 'racun', 'potas', 'setrum', 'trawl', 'pukat', 'cantrang', 'alat tangkap',
        'kapal asing', 'illegal fishing', 'pencurian ikan', 'limbah', 'pencemaran',
        'abk', 'akp', 'gaji', 'upah', 'perjanjian kerja laut', 'pkl', 'buku pelaut', 'kecelakaan kapal',
        'surat palsu', 'dokumen palsu', 'bodong', 'penipuan', 'fiktif', 'pungli', 'suap', 'gratifikasi',
        'izin', 'sipi', 'siup', 'sicefi', 'skkp', 'magang'
    ];
    if (specificSubstanceTerms.some(term => t.includes(term))) {
        return false;
    }

    // Pola frasa umum ingin laporan
    const genericReportPatterns = [
        /^(saya\s+)?(ingin|mau|bisa|ada\s+mau|akan|pengen)\s+(bikin\s+|buat\s+|mengajukan\s+|menyampaikan\s+)?(laporan|lapor|pengaduan|aduan|melapor|melaporkan)(\s+dong|\s+min|\s+kak|\s+admin|\s+pak|\s+bu)?$/i,
        /^(lapor|laporan|pengaduan|aduan|melapor|melaporkan)(\s+dong|\s+min|\s+kak|\s+admin|\s+pak|\s+bu)?$/i,
        /^(bagaimana\s+|gimana\s+|tata\s+)?cara\s+(lapor|laporan|pengaduan|aduan|melapor|melaporkan)$/i,
        /^(layanan\s+|kanal\s+|menu\s+)?(laporan|pengaduan)$/i
    ];

    return genericReportPatterns.some(pattern => pattern.test(t));
}

const PILIHAN_LAPORAN_MENU_TEXT =
    `Halo #SahabatBahari,\n\n` +
    `Untuk memproses dan mengarahkan laporan/pengaduan Anda ke unit penanganan yang tepat dan cepat, silakan pilih kategori laporan berikut:\n\n` +
    `*1* 🚨 *Pengaduan Umum & Pelanggaran Perikanan (Ditjen PSDKP)*\n` +
    `   Laporan penangkapan ikan ilegal (*destructive fishing*, bom ikan, alat tangkap dilarang), kapal asing/tanpa izin, pencemaran laut, serta saluran WBS/pungli.\n\n` +
    `*2* 🏝️ *Pengawasan Ruang Laut & Pemanfaatan Pulau-Pulau Kecil (Ditjen PRL)*\n` +
    `   Laporan perusakan ekosistem pesisir, reklamasi tanpa izin, pelanggaran izin PKKPRL, pemanfaatan/penggunaan pulau-pulau kecil ilegal, dan biota/satwa laut dilindungi (penyu, hiu, paus).\n\n` +
    `*3* ⚓ *Pengaduan Awak Kapal Perikanan (AKP / ABK)*\n` +
    `   Laporan kendala ketenagakerjaan pelaut perikanan: gaji/upah tidak dibayar, penelantaran, kecelakaan kerja saat melaut, atau pelanggaran Perjanjian Kerja Laut (PKL).\n\n` +
    `_Balas dengan angka (*1*, *2*, atau *3*) sesuai kebutuhan laporan Anda, atau ketik langsung kronologi/kejadian spesifik Anda._\n\n` +
    `_(Ketik *0* untuk kembali ke Menu Utama)_`;

// ==========================================
// 🏢 DETEKSI INGIN NGOBROL DENGAN SUATU BAGIAN LANGSUNG (Request 3)
// ==========================================
function isInginNgobrolBagianQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();

    const talkWords = ['ngobrol', 'bicara', 'ngomong', 'diskusi', 'konsultasi langsung', 'audiensi', 'ketemu', 'menghubungi', 'hubungi'];
    const partWords = ['bagian', 'unit', 'direktorat', 'ditjen', 'biro', 'divisi', 'bidang', 'staf', 'pejabat', 'seksi', 'balai', 'ptsa'];

    const hasTalk = talkWords.some(w => t.includes(w));
    const hasPart = partWords.some(w => t.includes(w));
    if (hasTalk && hasPart) return true;

    const explicitPatterns = [
        /ngobrol\s+dengan\s+suatu\s+bagian/i,
        /ngobrol\s+(langsung\s+)?(dengan|sama|ke)?\s*(bagian|direktorat|ditjen|biro|unit|ptsa)/i,
        /bicara\s+(langsung\s+)?(dengan|sama|ke)?\s*(bagian|direktorat|ditjen|biro|unit|ptsa)/i,
        /hubungi\s+(langsung\s+)?(dengan|sama|ke)?\s*(bagian|direktorat|ditjen|biro|unit|ptsa)/i,
        /kontak\s+(langsung\s+)?(bagian|direktorat|ditjen|biro|unit|ptsa)/i,
        /audiensi\s+(dengan|sama|ke)?\s*(bagian|direktorat|ditjen|biro|unit|ptsa)/i
    ];

    return explicitPatterns.some(p => p.test(t));
}

const ARAHAN_PENGAJUAN_SURAT_BAGIAN_MESSAGE =
    `Halo #SahabatBahari,\n\n` +
    `Untuk berkomunikasi, berkoordinasi, berkonsultasi langsung, atau beraudiensi dengan suatu bagian/unit kerja di lingkungan Kementerian Kelautan dan Perikanan (KKP), prosedurnya adalah dengan *menyampaikan permohonan melalui pengajuan surat resmi terlebih dahulu* (tidak langsung melalui sambungan telepon/kontak teknis).\n\n` +
    `📄 *Tata Cara Pengajuan Surat:*\n` +
    `1. *Siapkan Surat Resmi/Kedinasan:*\n` +
    `   Cantumkan kop surat (bagi lembaga/organisasi/perusahaan) atau surat perorangan, nomor kontak aktif, perihal, serta maksud dan tujuan koordinasi/audiensi secara jelas.\n` +
    `2. *Tujukan Kepada Pimpinan Terkait:*\n` +
    `   Tujukan surat kepada Menteri Kelautan dan Perikanan atau pimpinan unit kerja/bagian yang dituju (seperti Ditjen, Biro, atau Balai terkait).\n` +
    `3. *Saluran Pengiriman Surat Resmi:*\n` +
    `   • 🌐 *Portal Resmi PPID KKP:* https://ppid.kkp.go.id/layanan-informasi/pemohonan-informasi/\n` +
    `   • 📧 *Email Resmi:* ppidkkp@kkp.go.id\n` +
    `   • 🏢 *Loket Persuratan & TU:* Gedung Mina Bahari (GMB) IV Lantai 1, Jl. Medan Merdeka Timur No. 16, Gambir, Jakarta Pusat (Senin–Kamis pukul 08.00–15.30 WIB).\n\n` +
    `Setelah surat resmi diterima dan didisposisi oleh pimpinan unit kerja, pihak bagian yang bersangkutan akan menghubungi Anda kembali untuk tindak lanjut.\n\n` +
    `Salam hormat.`;

// ==========================================
// 📞 DETEKSI PERMINTAAN KONTAK PPID LANGSUNG (Request 1)
// ==========================================
function isPpidContactQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();
    return /\b(kontak\s+ppid|nomor\s+ppid|no\s+ppid|wa\s+ppid|whatsapp\s+ppid|telepon\s+ppid|telp\s+ppid|hubungi\s+ppid|call\s+center\s+ppid|kontak\s+wa\s+ppid)\b/i.test(t);
}

// ==========================================
// 📊 DETEKSI PERTANYAAN SATU DATA / PORTAL DATA KKP
// ==========================================
function isSatuDataQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().trim();
    return /\b(satu\s*data|satudata(\.kkp\.go\.id)?)\b/i.test(t);
}

const AKP_PENGADUAN_MESSAGE =
    `Halo #SahabatBahari,\n\n` +
    `🛡️ *PANDUAN PERLINDUNGAN & PENGADUAN AWAK KAPAL PERIKANAN (AKP / ABK)*\n\n` +
    `Kementerian Kelautan dan Perikanan (KKP) menjamin perlindungan hak-hak ketenagakerjaan dan keselamatan kerja bagi awak kapal perikanan, baik di dalam negeri maupun luar negeri:\n\n` +
    `1. *Ruang Lingkup Pengaduan:*\n` +
    `   • Hak upah/gaji yang tidak dibayarkan, terlambat, atau dipotong sepihak oleh pemilik/agen kapal.\n` +
    `   • Kecelakaan kerja saat melaut, sakit, penelantaran, atau pemulangan (repatriasi) darurat.\n` +
    `   • Pelanggaran Perjanjian Kerja Laut (PKL) dan jaminan asuransi sosial ketenagakerjaan.\n\n` +
    `2. *Dokumen & Informasi yang Perlu Disiapkan:*\n` +
    `   • Identitas pelapor/korban (Nama lengkap, NIK, No. HP keluarga/kontak aktif).\n` +
    `   • Identitas kapal (Nama Kapal, Tanda Selar/GT, Nama Nakhoda/Pemilik/Perusahaan Keagenan).\n` +
    `   • Salinan PKL (Perjanjian Kerja Laut), Buku Pelaut, dan kronologi kejadian secara terperinci.\n\n` +
    `3. *Kanal Layanan & Hotline Pengaduan Resmi:*\n` +
    `   📱 *WhatsApp Hotline Pengaduan AKP:* 0811-251-744\n` +
    `   📞 *Call Center Gangguan Operasional AKP:* +62 811-1000-3132\n` +
    `   🌐 *Portal Nasional SP4N-LAPOR!:* https://lapor.go.id\n\n` +
    `Salam hormat.`;

const PENGADUAN_UMUM_MESSAGE =
    `Halo #SahabatBahari,\n\n` +
    `📢 *PANDUAN LAYANAN PENGADUAN MASYARAKAT KKP*\n\n` +
    `Kementerian Kelautan dan Perikanan (KKP) menyediakan kanal pengaduan resmi yang terintegrasi, transparan, dan terjamin kerahasiaan identitas pelapornya:\n\n` +
    `1. *Kategori Pengaduan yang Dapat Disampaikan:*\n` +
    `   • Keluhan pelayanan publik dan perizinan kelautan perikanan.\n` +
    `   • Dugaan pungutan liar (pungli), gratifikasi, atau pelanggaran disiplin ASN KKP (via Whistleblowing System / WBS).\n` +
    `   • Laporan tindak pidana perikanan (*destructive fishing*, penangkapan ikan ilegal/bom/racun).\n\n` +
    `2. *Tata Cara Penyusunan Laporan Efektif (Prinsip 4W + 1H):*\n` +
    `   • *Apa* kejadian atau pelanggaran yang diadukan?\n` +
    `   • *Siapa* pihak/oknum yang dilaporkan?\n` +
    `   • *Kapan* dan *Di mana* peristiwa tersebut terjadi?\n` +
    `   • *Bagaimana* kronologi kejadian serta lampirkan bukti pendukung (foto/video/dokumen surat).\n\n` +
    `3. *Kanal Resmi Pengaduan KKP:*\n` +
    `   📱 *WhatsApp Pengaduan KKP:* 0811-989-011\n` +
    `   📧 *Email:* pengaduan@kkp.go.id\n` +
    `   🌐 *Portal SP4N-LAPOR!:* https://lapor.go.id\n` +
    `   🔒 *Whistleblowing System (WBS Itjen):* https://wbs.kkp.go.id\n\n` +
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
        'lpmukp', 'knmp', 'kdmp', 'pkpn', 'ekonomi biru', 'pengaduan', 'akp', 'abk', 'bst',
        'konservasi', 'mangrove', 'terumbu karang', 'penyu', 'hiu', 'paus', 'biota', 'satwa',
        'pentaru', 'taruna', 'politeknik', 'aup', 'beasiswa', 'sekolah', 'pendidikan', 'pelatihan',
        'cpns', 'pppk', 'sdmao', 'kepegawaian', 'rekrutmen', 'loker', 'asn',
        'pelabuhan', 'dermaga', 'pendaratan ikan', 'tpi',
        'silat', 'oss', 'sicefi', 'elaut', 'kusuka', 'e-kusuka',
        'permen', 'kepmen', 'regulasi', 'peraturan', 'kebijakan', 'informasi', 'data'
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

    // Perintah tunggal atau kata kunci pasti untuk minta bantuan manusia / CS (termasuk variasi typo umum)
    const exactCommands = [
        'bantuan', 'help', 'cs', 'petugas', 'petugs', 'petgas', 'ptugas', 'petugasnya',
        'admin', 'min', 'adm', 'operator', 'manusia', 'orang',
        'live chat', 'livechat', 'hubungi petugas', 'hubungi admin',
        'hubungi cs', 'bicara dengan petugas', 'bicara dengan manusia',
        'chat petugas', 'chat admin', 'chat cs', 'minta bantuan',
        'butuh bantuan', 'sambungkan ke petugas', 'terhubung ke petugas',
        'petugas ppid', 'operator ppid', 'ngobrol', 'bicara', 'ngomong',
        'mau ngobrol', 'mau bicara', 'mau ngomong', 'tanya langsung',
        'chat langsung', 'ngobrol langsung'
    ];
    if (exactCommands.includes(t)) return true;

    // Pola frasa fleksibel ingin terhubung atau berbicara dengan petugas / CS manusia
    const escalationPatterns = [
        /\b(hubungi|bicara|sambung(kan)?|terhubung|kontak|pindah(kan)?)\s+(dengan\s+|ke\s+)?(petug[a-z]*|cs|customer service|admin|operator|manusia|orang)\b/i,
        /\b(mau|ingin|bisa|tolong|minta|butuh|pengen|mo)\s+(bicara|ngobrol|ngomong|chat|diskusi|konsultasi|tanya)\s*(sama\s+|dengan\s+|ke\s+)(petug[a-z]*|cs|admin|operator|manusia|orang)\b/i,
        /\b(mau|ingin|bisa)\s+(ngobrol|bicara\s+langsung|ngomong\s+langsung)\b/i,
        /\b(minta|butuh|tolong)\s+(bantuan\s+)?(petug[a-z]*|cs|admin|operator|manusia|orang)\b/i,
        /\b(petug[a-z]*|cs|admin|operator)\s+(asli|manusia|helpdesk|pelayanan|ppid)\b/i,
        /\b(chat|ngobrol|bicara|ngomong|tanya)\s+(sama|dengan|ke)\s+(petug[a-z]*|admin|cs|operator|manusia|orang)\b/i,
        /\b(ada\s+orang|ada\s+manusia|ngomong\s+sama\s+orang|ngobrol\s+sama\s+orang)\b/i,
        /\b(live\s*chat|livechat)\b/i
    ];

    if (escalationPatterns.some(pattern => pattern.test(t))) {
        return true;
    }

    // Kalimat pendek (<= 4 kata) yang mengandung kata kunci eskalasi/petugas (termasuk typo)
    const words = t.split(/\s+/);
    if (words.length <= 4) {
        if (words.some(w => /^petug[a-z]*$/.test(w) || w === 'cs' || w === 'admin' || w === 'operator')) {
            return true;
        }
        if (words.includes('bantuan') && (words.includes('butuh') || words.includes('minta') || words.includes('tolong') || words.includes('dong') || words.includes('min') || words.includes('kak'))) {
            return true;
        }
        if (words.includes('ngobrol') || words.includes('bicara') || words.includes('ngomong')) {
            return true;
        }
    }

    return false;
}

// ==========================================
// 😡 DETEKSI CHAT DENGAN NADA MARAH / KECEWA / KOMPLAIN KERAS
// ==========================================
const ANGRY_KEYWORDS = [
    'kecewa', 'marah', 'kesal', 'jengkel', 'geram', 'emosi', 'parah',
    'payah', 'lelet', 'lambat banget', 'lama banget', 'lama amat', 'gak becus',
    'nggak becus', 'tidak becus', 'bobrok', 'kapok', 'brengsek', 'bajingan',
    'anjing', 'babi', 'bangsat', 'sialan', 'goblok', 'tolol', 'bego',
    'penipu', 'nipu', 'pemeras', 'pemerasan', 'dipalak', 'minta duit',
    'lapor polisi', 'somasi', 'tuntut', 'pelayanan buruk', 'pelayanan jelek',
    'pelayanan lambat', 'ribet banget', 'ribet amat', 'dipersulit',
    'berbelit-belit', 'bot bodoh', 'bot gak guna', 'gak guna', 'merugikan'
];

function isAngryQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return false;

    // 1. Cek kata kunci kemarahan / komplain keras
    if (ANGRY_KEYWORDS.some(k => new RegExp('\\b' + k + '\\b', 'i').test(t))) {
        return true;
    }

    // 2. Pola kombinasi emosi negatif
    if (/(kecewa|marah|kesal|lelet|lama)\s+(banget|sekali|amat|parah)/i.test(t)) return true;
    if (/(tidak|nggak|gak)\s+(ada\s+tanggapan|direspon|dibalas|bisa\s+dipercaya)/i.test(t)) return true;
    if (/(mau|akan)\s+(lapor|viralkan|tuntut)/i.test(t)) return true;

    return false;
}

// ==========================================
// 📢 DETEKSI CHAT PELAPORAN KHUSUS / ANALISIS RUMIT / SENGKETA / TINDAK PIDANA
// ==========================================
const PELAPORAN_KEYWORDS = [
    'bom ikan', 'ngebom ikan', 'pengeboman ikan', 'potas', 'racun ikan',
    'meracun ikan', 'pukat harimau', 'trawl', 'cantrang ilegal', 'destructive fishing',
    'setrum ikan', 'penyetruman', 'kapal asing', 'kapal vietnam', 'kapal malaysia',
    'mencuri ikan', 'illegal fishing', 'iuu fishing', 'pungli', 'pungutan liar',
    'suap', 'gratifikasi', 'pemerasan oknum', 'korupsi', 'oknum kkp', 'oknum petugas',
    'sengketa', 'konflik nelayan', 'tabrakan kapal', 'abk disiksa', 'abk dianiaya',
    'abk meninggal', 'abk tewas', 'abk hilang', 'penelantaran abk', 'tumpahan minyak',
    'limbah beracun', 'pencemaran laut'
];

function isComplexPelaporanQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return false;

    // Kecualikan kueri informasional umum (e.g. cara lapor / info lapor)
    if (/^(bagaimana|apa|cara|syarat|info)\s+.*(lapor|pengaduan)/i.test(t)) {
        return false;
    }

    return PELAPORAN_KEYWORDS.some(k => new RegExp('\\b' + k + '\\b', 'i').test(t));
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
    let name = '';

    if (message._data && message._data.notifyName) {
        name = message._data.notifyName;
    }

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

    // Jika belum dapat phone atau name, coba getContact
    if (!phone || !name) {
        try {
            const contact = await message.getContact();
            if (contact) {
                if (!name) {
                    name = contact.pushname || contact.name || contact.shortName || '';
                }
                if (!phone) {
                    if (contact.number) {
                        phone = normalizePhone(contact.number);
                    } else if (contact.id && contact.id.server === 'c.us') {
                        phone = normalizePhone(contact.id.user);
                    }
                }
            }
        } catch (err) { }
    }

    // Fallback terakhir: jika pengirim berisi format angka standar
    if (!phone && rawSender.endsWith('@c.us')) {
        phone = normalizePhone(rawSender.split('@')[0].split(':')[0]);
    }

    const details = {
        name,
        phone,
        lid,
        rawSender,
        from: rawFrom,
        author: rawAuthor
    };

    if (name) {
        if (phone) userKnownName[phone] = name;
        if (rawSender) userKnownName[rawSender] = name;
    }

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

    // Bersihkan footer '💡 Apakah...' jika masih terbawa
    cleaned = cleaned.replace(/\n*━━━━━━━━━━━━━━━━━━━━━━━━━\n*💡\s*\*?Apakah[\s\S]*$/i, '').trim();
    cleaned = cleaned.replace(/\n*───────────────────────────\n*💡\s*\*?Has this information[\s\S]*$/i, '').trim();
    cleaned = cleaned.replace(/\n+💡\s*\*?Apakah[\s\S]*$/i, '').trim();

    // Cek jika sudah diawali variasi sapaan dengan nama "Halo #SahabatBahari Kak [Nama]," (baik satu baris maupun terpisah)
    const regexWithName = /^(\*|_)*(?:halo\s+)?#?sahabat\s*bahari(\*|_)*[!,:-]?\s*(?:\n+)?\s*(kak\s+[^\n,]+)[!,:-]?\s*(?:\n+)*/i;
    const matchName = cleaned.match(regexWithName);
    if (matchName) {
        cleaned = cleaned.replace(regexWithName, `Halo #SahabatBahari ${matchName[3].trim()},\n\n`);
        return cleaned;
    }

    // Cek jika sudah diawali variasi standar "Halo Sahabat Bahari", "#SahabatBahari", dsb
    const regex = /^(\*|_)*(?:halo\s+)?#?sahabat\s*bahari(\*|_)*[!,:-]?\s*(?:\n+)*/i;
    if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, 'Halo #SahabatBahari,\n\n');
    } else {
        cleaned = `Halo #SahabatBahari,\n\n${cleaned}`;
    }

    return cleaned;
}

async function sendUserMessage(recipient, content, options = {}) {
    let resultMsg;
    let textToRecord = '';

    if (typeof content === 'string') {
        textToRecord = content;
        resultMsg = await client.sendMessage(recipient, formatReply(content), options);
    } else if (content && typeof content === 'object') {
        const opt = { ...options };
        if (opt.caption) {
            textToRecord = opt.caption;
            opt.caption = formatReply(opt.caption);
        }
        resultMsg = await client.sendMessage(recipient, content, opt);
    } else {
        resultMsg = await client.sendMessage(recipient, content, options);
    }

    // Catat pesan balasan bot ke riwayat percakapan memori pemohon
    if (recipient && typeof recipient === 'string' && textToRecord) {
        let phone = '';
        if (recipient.endsWith('@c.us')) {
            phone = recipient.split('@')[0].split(':')[0].replace(/\D/g, '');
        } else if (recipient.endsWith('@lid')) {
            const lidUser = recipient.split('@')[0].split(':')[0];
            phone = lidToPhoneMap.get(lidUser) || (jidToPhoneCache.get(recipient) ? jidToPhoneCache.get(recipient).phone : '');
        } else {
            phone = phoneToOriginalJid.get(recipient) || recipient.replace(/\D/g, '');
        }
        if (phone) {
            addChatHistory(phone, 'model', textToRecord);
        }
    }

    return resultMsg;
}

// ==========================================
// 👨‍💻 HELPER PENGALIHAN LANGSUNG KE PETUGAS PPID
// ==========================================
async function connectUserToPetugas({ sender, senderDetails, text, userReply, adminAlertTitle, statusKategori = 'PENDING' }) {
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

    // 🕒 Cek jam operasional KHUSUS layanan petugas manusia (08.00 - 15.30 WIB, istirahat 11.40 - 13.00 WIB)
    const op = getPetugasOperationalInfo();
    let finalUserReply = userReply;
    let finalAdminAlertTitle = adminAlertTitle;

    if (!op.isOpen) {
        finalAdminAlertTitle = `${adminAlertTitle} ⚠️ [DILUAR JAM OPERASIONAL PETUGAS]`;
        if (op.isBreak) {
            finalUserReply =
                `☕ *PETUGAS SEDANG JAM ISTIRAHAT (11.40 - 13.00 WIB)*\n\n` +
                `Halo #SahabatBahari,\n` +
                `Saat ini Petugas Layanan Informasi PPID KKP sedang dalam jam istirahat dinas.\n\n` +
                `Pesan Anda telah kami catat dalam antrean dan akan direspons petugas setelah pukul 13.00 WIB. 🙏\n` +
                `Anda tetap dapat bertanya jawab seputar informasi KKP secara otomatis dengan Asisten AI kami 24/7 di sini.\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`;
        } else {
            finalUserReply =
                `🌙 *DI LUAR JAM OPERASIONAL PETUGAS PPID*\n\n` +
                `Halo #SahabatBahari,\n` +
                `Layanan konsultasi langsung Petugas PPID KKP saat ini sedang *OFFLINE* (di luar jam kerja).\n\n` +
                `🕰️ *Jadwal Kerja Petugas PPID:*\n` +
                `• *Senin - Kamis:* 08.00 - 15.00 WIB\n` +
                `• *Jumat:* 08.00 - 15.30 WIB\n` +
                `• *Jam Istirahat:* 11.40 - 13.00 WIB\n` +
                `• *Sabtu, Minggu & Libur Nasional:* Tutup\n\n` +
                `Pesan Anda telah kami catat dalam antrean sistem dan akan dibalas petugas pada hari kerja berikutnya.\n\n` +
                `💡 *Layanan 24 Jam:* Anda tetap dapat mengakses informasi publik, unduh regulasi, atau bertanya dengan Asisten AI kami kapan saja.\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`;
        }
    }

    await sendUserMessage(sender, finalUserReply);

    const alertAdmin =
        `${finalAdminAlertTitle}\n\n` +
        `👤 *Dari Nomor Pemohon:* +${pemohonPhone}\n` +
        `💬 *Pesan Pemohon:* "${text || '[Pesan/Lampiran]'}"\n\n` +
        `-----------------------------------------\n` +
        `💡 *Cara Membalas:* Swipe / Balas Kutipan pesan ini, ATAU langsung ketik balasan di chat ini.\n` +
        `• Ketik */selesai* jika konsultasi sudah tuntas.\n` +
        `👉 *Chat Pemohon:* ${directWaLink}`;

    for (const admPhone of ADMIN_PHONES) {
        try {
            await client.sendMessage(`${admPhone}@c.us`, alertAdmin);
        } catch (e) {
            console.error(`Gagal mengirim alert ke admin ${admPhone}:`, e);
        }
    }

    tracker.recordConversation({
        phone: pemohonPhone,
        text: text,
        answer: `Dialihkan ke Petugas PPID (${finalAdminAlertTitle.replace(/[\*\r\n]/g, '')})`,
        source: 'BOT',
        aiModel,
        status: statusKategori
    });
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
                        caption: message.body ? formatReply(message.body) : undefined
                    });
                } else {
                    await sendUserMessage(targetUserJid, message.body);
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
    // ⏱️ BUFFER PENGGABUNGAN CHAT BERUNTUN (DEBOUNCE AGGREGATION - REQUEST 4)
    // ==========================================
    // Mengumpulkan rangkaian chat pemohon dalam jeda 2 detik sebelum dianalisis secara menyeluruh
    const bufKey = sender;
    if (!userMessageBuffer[bufKey]) {
        userMessageBuffer[bufKey] = {
            messages: [],
            senderDetails,
            timer: null
        };
    }

    userMessageBuffer[bufKey].messages.push(message);
    userMessageBuffer[bufKey].senderDetails = senderDetails;

    // Reset timer jika pemohon mengirim chat susulan dalam jendela 2 detik
    if (userMessageBuffer[bufKey].timer) {
        clearTimeout(userMessageBuffer[bufKey].timer);
    }

    userMessageBuffer[bufKey].timer = setTimeout(async () => {
        const buffered = userMessageBuffer[bufKey];
        delete userMessageBuffer[bufKey];
        if (!buffered || buffered.messages.length === 0) return;

        try {
            await handleIncomingUserMessage(buffered.messages, buffered.senderDetails);
        } catch (handlerErr) {
            console.error("Error saat memproses rangkaian pesan pemohon:", handlerErr);
        }
    }, MESSAGE_BUFFER_DELAY_MS);
});

// ==========================================
// 📥 PENANGANAN PESAN PEMOHON (SETELAH DEBOUNCE AGREGASI)
// ==========================================
async function handleIncomingUserMessage(bufferedMessages, senderDetails) {
    if (!bufferedMessages || bufferedMessages.length === 0) return;

    // Ambil pesan utama (pesan terakhir dalam buffer untuk referensi sender & konteks)
    const primaryMsg = bufferedMessages[bufferedMessages.length - 1];
    const sender = primaryMsg.from;
    const senderPhone = senderDetails.phone;

    // Gabungkan seluruh teks chat dari rangkaian pesan (analisis keseluruhan chat - Request 4)
    const aggregatedText = bufferedMessages
        .map(m => (m.body || '').trim())
        .filter(b => b.length > 0)
        .join('\n');

    const effectiveBody = aggregatedText || primaryMsg.body || '';
    const text = effectiveBody.trim().toLowerCase();

    const isMultiChat = Boolean(bufferedMessages && bufferedMessages.length > 1);
    const multiChatCount = bufferedMessages ? bufferedMessages.length : 1;
    const isLongText = effectiveBody.length > 150 || (effectiveBody.includes('\n') && effectiveBody.split('\n').filter(l => l.trim().length > 0).length > 2);

    // Buat objek synthesizedMessage agar kompatibel dengan seluruh fungsi downstream
    const message = Object.assign(Object.create(Object.getPrototypeOf(primaryMsg)), primaryMsg, {
        body: effectiveBody,
        originalMessages: bufferedMessages,
        isMultiChat,
        multiChatCount,
        isLongText
    });

    // Jika salah satu dari kumpulan pesan memiliki media, teruskan kapabilitas media
    const mediaMsg = bufferedMessages.find(m => m.hasMedia);
    if (mediaMsg) {
        message.hasMedia = true;
        message.downloadMedia = () => mediaMsg.downloadMedia();
    }

    const now = Date.now();
    userLastMessageTime[sender] = now;

    // ==========================================
    // 🧠 CATAT PESAN PEMOHON KE MEMORI PERCAKAPAN & DETEKSI NAMA
    // ==========================================
    if (senderPhone && effectiveBody) {
        addChatHistory(senderPhone, 'user', effectiveBody);
    }
    const introName = extractSelfIntroName(effectiveBody);
    if (introName) {
        if (senderPhone) userKnownName[senderPhone] = introName;
        userKnownName[sender] = introName;
    } else if (senderDetails && senderDetails.name) {
        if (senderPhone && !userKnownName[senderPhone]) userKnownName[senderPhone] = senderDetails.name;
        if (!userKnownName[sender]) userKnownName[sender] = senderDetails.name;
    }
    // ==========================================

    // Fitur Mengakhiri Percakapan (Jawaban Tertutup Penyelesaian Masalah & English)
    const isRegistering = userState[sender] && userState[sender].startsWith('REG_');
    const isSurvey = userState[sender] === 'AWAITING_IKM';
    const isResolutionAnswer = [
        '5', 'selesai', 'akhiri', 'ya', 'sudah', 'cukup', 'terima kasih', 'makasih',
        'cukup terima kasih', 'sudah cukup', 'sudah jelas', 'sudah tuntas', 'tuntas',
        'ok terima kasih', 'oke terima kasih', 'siap terima kasih', 'ok', 'oke', 'siap',
        'yes', 'done', 'resolved', 'thank you', 'thanks', 'all good', 'ok thank you', 'okay thank you'
    ].includes(text);

    if (!isRegistering && !isSurvey && isResolutionAnswer) {
        userState[sender] = null; // Reset state pengguna
        userAiChatCount[sender] = 0; // Reset hitungan interaksi
        delete regData[sender];
        delete pendingIkmTarget[sender];
        tracker.closeUserSession(senderPhone);
        clearChatHistory(senderPhone); // Bersihkan memori percakapan saat sesi tuntas

        const isEnglish = isEnglishQuery(text) || ['yes', 'done', 'resolved', 'thank you', 'thanks', 'all good', 'ok thank you', 'okay thank you'].includes(text);
        if (isEnglish) {
            await sendUserMessage(sender, "Thank you for contacting the Official WhatsApp Service of *PPID Ministry of Marine Affairs and Fisheries (KKP RI)*.\n\nLet's preserve our marine ecosystem together! 🌊🇮🇩\n\nBest regards, PPID MMAF / KKP RI. 🙏");
        } else {
            await sendUserMessage(sender, "Terima kasih telah menggunakan layanan WhatsApp Resmi *PPID Kementerian Kelautan dan Perikanan RI*. \n\nMari bersama-sama menjaga kelestarian laut kita! 🌊🇮🇩\n\nSemoga sehat selalu dan selamat beraktivitas kembali. 🙏");
        }
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
    // 📨 PILIHAN JALUR CEK STATUS SURAT (REQUEST 7)
    // ==========================================
    if (userState[sender] === 'CHECK_SUBMITTED_LETTER') {
        if (text === '0' || text === 'kembali' || text === 'batal' || text === 'menu') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah kembali ke Menu Utama.\n\nKetik *Menu* untuk menampilkan daftar layanan.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ') || /wa|whatsapp|chat/i.test(text)) {
            userState[sender] = 'CS_MODE';
            lastCsUserJid = sender;
            lastCsUserPhone = senderPhone;
            for (const admPhone of ADMIN_PHONES) {
                activeAdminTarget[admPhone] = sender;
                activeAdminTargetPhone[admPhone] = senderPhone;
            }
            for (const admLid of ADMIN_LIDS) {
                activeAdminTarget[admLid] = sender;
                activeAdminTargetPhone[admLid] = senderPhone;
            }
            activeAdminTarget['LAST_ACTIVE'] = sender;
            activeAdminTargetPhone['LAST_ACTIVE'] = senderPhone;

            await sendUserMessage(sender,
                `📱 *PENGIRIMAN SURAT MELALUI WHATSAPP*\n\n` +
                `Halo #SahabatBahari,\n` +
                `Jika surat/dokumen telah Anda kirimkan melalui ruang obrolan WhatsApp ini, silakan *TUNGGU RESPONS DARI PETUGAS KAMI* di chat ini.\n\n` +
                `Petugas Layanan PPID KKP sedang/akan memverifikasi dokumen Anda dan membalas langsung di sini.\n\n` +
                `Silakan ketikkan perihal atau nomor surat Anda jika ingin melengkapi data. 🙏\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`
            );

            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Cek Surat Jalur WA: Menunggu respon petugas di ruang chat',
                source: 'BOT',
                aiModel,
                status: 'PENDING'
            });
            return;
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ') || /ppid|portal|web|link|lacak|tiket/i.test(text)) {
            userState[sender] = 'CHECK_TICKET';
            await sendUserMessage(sender,
                `🌐 *PENGIRIMAN SURAT MELALUI PORTAL PPID KKP*\n\n` +
                `Halo #SahabatBahari,\n` +
                `Untuk surat/permohonan yang didaftarkan melalui portal resmi PPID KKP, Anda dapat melacak progresnya secara langsung melalui tautan resmi:\n` +
                `🔗 https://ppid.kkp.go.id/layanan-informasi/tracking-tiket/\n\n` +
                `Atau *ketikkan Nomor Tiket Permohonan Anda* langsung di sini (contoh: *PPID-2026-001*) untuk pengecekan instan:\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`
            );
            return;
        } else {
            await sendUserMessage(sender,
                `Silakan balas dengan angka *1* (Kirim via WhatsApp) atau *2* (Kirim via Portal PPID), atau ketik *0* untuk kembali ke Menu Utama.`
            );
            return;
        }
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
    // 👨‍💻 1. MODE LIVE CHAT PEMOHON (SUDAH TERHUBUNG KE PETUGAS)
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

        tracker.recordConversation({
            phone: pemohonPhone,
            text: message.body || '[Media/Lampiran]',
            answer: '',
            source: 'BOT',
            aiModel,
            status: 'PENDING'
        });

        // Cek apakah chat masuk di luar jam operasional petugas
        const op = getPetugasOperationalInfo();
        if (!op.isOpen) {
            if (!userLastWarningTime[sender] || (now - userLastWarningTime[sender] > 3600000)) {
                userLastWarningTime[sender] = now;
                const offlineNote = op.isBreak ?
                    `☕ *Informasi:* Saat ini petugas sedang dalam jam istirahat dinas (11.40 - 13.00 WIB). Pesan Anda tetap diteruskan ke antrean dan akan dibalas setelah jam istirahat. 🙏\n\n_(Ketik *0* untuk kembali ke Menu Utama)_` :
                    `🌙 *Informasi:* Pesan Anda telah diteruskan ke antrean petugas. Saat ini layanan live chat sedang di luar jam kerja (08.00 - 15.30 WIB) dan akan dibalas pada hari kerja berikutnya. 🙏\n\n_(Ketik *0* untuk kembali ke Menu Utama)_`;
                await sendUserMessage(sender, offlineNote);
            } else {
                await sendUserMessage(sender, "✅ Pesan Anda telah diteruskan ke antrean Petugas Layanan PPID KKP. 🙏\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
            }
        } else {
            await sendUserMessage(sender, "✅ Pesan Anda telah diteruskan ke Petugas Layanan PPID KKP. Mohon ditunggu ya, petugas kami akan segera membalasnya. 🙏\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
        }
        return;
    }

    // ==========================================
    // 🚨 2. DETEKSI CEPAT: PENGADUAN SURAT PALSU / BODONG (PRIORITAS 1)
    // ==========================================
    if (isKepalsuanSuratQuery(text)) {
        await connectUserToPetugas({
            sender,
            senderDetails,
            text: message.body,
            userReply:
                `🚨 *PERINGATAN RESMI: DETEKSI PENGADUAN DOKUMEN / SURAT PALSU KKP*\n\n` +
                `Halo #SahabatBahari,\n` +
                `Kementerian Kelautan dan Perikanan (KKP) menindak tegas segala bentuk pemalsuan surat dinas, pesanan barang fiktif mengatasnamakan pejabat KKP, atau perizinan bodong.\n\n` +
                `Laporan Anda *TELAH KAMI DETEKSI DAN LANGSUNG DIHUBUNGKAN KE PETUGAS RESMI PPID / PENGADUAN KKP*.\n\n` +
                `📲 *TINDAK LANJUT CEPAT:*\n` +
                `Silakan *KIRIMKAN FOTO / DOKUMEN (PDF/JPG)* surat yang Anda terima di chat ini sekarang. Petugas kami akan segera memverifikasi keabsahan surat dan nomor registrasi dinasnya.\n\n` +
                `_(Ketik *0* untuk membatalkan dan kembali ke Menu Utama)_`,
            adminAlertTitle: `🚨🚨 *[URGENT: LAPORAN DUGAAN SURAT PALSU / PENIPUAN KKP]* 🚨🚨`
        });
        return;
    }

    // ==========================================
    // 🚨 2b. DETEKSI ANCAMAN / INTIMIDASI (PRIORITAS 1b - REQUEST 5)
    // ==========================================
    if (isThreatQuery(text)) {
        await connectUserToPetugas({
            sender,
            senderDetails,
            text: message.body,
            userReply:
                `Halo #SahabatBahari,\n\n` +
                `Pesan Anda mengandung indikasi ancaman atau intimidasi yang tidak diperkenankan dalam etika layanan publik Kementerian Kelautan dan Perikanan (KKP).\n\n` +
                `*Sesi percakapan ini langsung kami alihkan ke Petugas Resmi PPID KKP* untuk pencatatan dan penanganan kedinasan lebih lanjut sesuai prosedur hukum yang berlaku.\n\n` +
                `Mohon tetap menjaga ketertiban dan etika berkomunikasi.\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`,
            adminAlertTitle: `🚨🚨 *[URGENT: DETEKSI ANCAMAN / INTIMIDASI PEMOHON]* 🚨🚨`
        });
        return;
    }

    // ==========================================
    // 🔒 2c. DETEKSI USAHA MENGETAHUI IDENTITAS / DATA SENSITIF KKP (PRIORITAS 1c - REQUEST 5)
    // ==========================================
    if (isSensitiveInfoProbingQuery(text)) {
        await connectUserToPetugas({
            sender,
            senderDetails,
            text: message.body,
            userReply:
                `Halo #SahabatBahari,\n\n` +
                `Pesan Anda langsung kami alihkan dan hubungkan ke *Petugas Layanan PPID KKP* agar dapat dibantu lebih lanjut secara resmi. Mohon ditunggu ya, petugas kami akan segera membalas pesan Anda. 🙏\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`,
            adminAlertTitle: `🔒🚨 *[PERINGATAN: PERMINTAAN INFORMASI SENSITIF / DATA INTERNAL]* 🚨🔒`
        });
        return;
    }

    // ==========================================
    // 😡 3. DETEKSI CEPAT: NADA MARAH / KECEWA / KOMPLAIN KERAS (PRIORITAS 2)
    // ==========================================
    if (isAngryQuery(text)) {
        await connectUserToPetugas({
            sender,
            senderDetails,
            text: message.body,
            userReply:
                `Halo #SahabatBahari,\n\n` +
                `Kami memohon maaf yang sebesar-besarnya atas ketidaknyamanan atau kendala yang Anda alami. KKP sangat menghargai setiap masukan dan berkomitmen memberikan pelayanan terbaik.\n\n` +
                `Untuk memberikan penanganan yang cepat dan solutif, *chat Anda saat ini langsung kami alihkan ke Petugas PPID KKP* agar dapat ditangani secara personal.\n\n` +
                `Silakan sampaikan rincian permasalahan, nomor tiket/berkas, atau kendala spesifik yang dihadapi. Petugas kami akan segera merespons chat Anda. 🙏\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`,
            adminAlertTitle: `🚨🚨 *[PRIORITAS: KELUHAN / NADA MARAH PEMOHON]* 🚨🚨`
        });
        return;
    }

    // ==========================================
    // 🔄 3b. DETEKSI CEPAT: KENDALA BERULANG / "TIDAK BISA" / FRUSTRASI (PRIORITAS 2b - REQUEST 5)
    // ==========================================
    if (isFrustratedOrCannotQuery(text)) {
        // Jika ada jawaban FAQ yang spesifik, berikan bantuan teknis FAQ terlebih dahulu
        const directFaq = (!message.isMultiChat && !message.isLongText) ? findBestFaqMatch(text) : null;
        if (!directFaq) {
            await connectUserToPetugas({
                sender,
                senderDetails,
                text: message.body,
                userReply:
                    `Halo #SahabatBahari,\n\n` +
                    `Kami memahami Anda mengalami kendala berulang atau kesulitan dalam mengakses layanan / informasi yang dibutuhkan.\n\n` +
                    `Agar kendala ini segera tertangani dengan tepat, *chat Anda saat ini langsung kami alihkan ke Petugas Layanan PPID KKP* untuk dibantu secara langsung oleh petugas kami.\n\n` +
                    `Silakan jelaskan detail kendala teknis atau masalah yang Anda hadapi di bawah ini. Petugas kami akan segera membalas pesan Anda. 🙏\n\n` +
                    `_(Ketik *0* untuk kembali ke Menu Utama)_`,
                adminAlertTitle: `🔄🚨 *[KENDALA BERULANG: PEMOHON GAGAL / TIDAK BISA]* 🚨🔄`
            });
            return;
        }
    }

    // ==========================================
    // 👨‍💻 4. DETEKSI CEPAT: PERMINTAAN LANGSUNG KE PETUGAS (PRIORITAS 3)
    // ==========================================
    if (isEscalationQuery(text)) {
        await connectUserToPetugas({
            sender,
            senderDetails,
            text: message.body,
            userReply:
                `👨‍💻 *TERHUBUNG KE PETUGAS LAYANAN PPID KKP*\n\n` +
                `Halo #SahabatBahari,\n` +
                `Anda telah terhubung langsung ke antrean Petugas Layanan Informasi PPID KKP.\n\n` +
                `Silakan sampaikan pertanyaan, permohonan informasi, atau kendala Anda secara lengkap di bawah ini. Petugas kami akan segera membalas pesan Anda. 🙏\n\n` +
                `_(Ketik *0* jika ingin membatalkan dan kembali ke Menu Utama)_`,
            adminAlertTitle: `👨‍💻 *[PERMINTAAN KONSULTASI LIVE CHAT PPID]*`
        });
        return;
    }

    // ==========================================
    // 📢 5. DETEKSI CEPAT: PELAPORAN KHUSUS / SENGKETA / TINDAK PIDANA (PRIORITAS 4)
    // ==========================================
    if (isComplexPelaporanQuery(text)) {
        await connectUserToPetugas({
            sender,
            senderDetails,
            text: message.body,
            userReply:
                `📢 *LAYANAN PENGADUAN & PELAPORAN KHUSUS KKP*\n\n` +
                `Halo #SahabatBahari,\n` +
                `Laporan / aduan Anda teridentifikasi memerlukan penelaahan dan tindak lanjut langsung oleh Petugas Resmi Pengaduan KKP.\n\n` +
                `*Chat Anda LANGSUNG DIHUBUNGKAN KE PETUGAS PPID / PENGADUAN KKP*.\n\n` +
                `Silakan sampaikan data laporan pendukung di chat ini:\n` +
                `1. *Kronologi:* Waktu & lokasi kejadian secara jelas\n` +
                `2. *Pihak Terlapor:* Nama kapal / oknum / pihak yang dilaporkan\n` +
                `3. *Bukti Pendukung:* Foto, video, atau dokumen (jika ada)\n\n` +
                `Petugas kami akan segera menelaah laporan Anda. Kerahasiaan pelapor dijamin. 🙏\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`,
            adminAlertTitle: `📢🚨 *[URGENT: PELAPORAN / ADUAN KHUSUS MASYARAKAT]* 🚨📢`
        });
        return;
    }

    // ==========================================
    // 🏛️ 6. DETEKSI ISU SENSITIF PIHAK EKSTERNAL (PRIORITAS 5 - REQUEST 6)
    // ==========================================
    if (isSensitiveExternalIssueQuery(text)) {
        await sendUserMessage(sender, SENSITIVE_EXTERNAL_ISSUE_REPLY);
        tracker.recordConversation({
            phone: senderPhone,
            text: message.body,
            answer: 'Tanggapan Isu Sensitif Eksternal (Perihal & Ranah Kebijakan Internal KKP)',
            source: 'BOT',
            aiModel,
            status: 'DONE'
        });
        return;
    }

    // ==========================================
    // 📨 7. DETEKSI MENERUSKAN SURAT (PRIORITAS 6 - REQUEST 8)
    // ==========================================
    if (isForwardingLetterQuery(text)) {
        userState[sender] = 'CS_MODE';
        lastCsUserJid = sender;
        lastCsUserPhone = senderPhone;
        for (const admPhone of ADMIN_PHONES) {
            activeAdminTarget[admPhone] = sender;
            activeAdminTargetPhone[admPhone] = senderPhone;
        }
        for (const admLid of ADMIN_LIDS) {
            activeAdminTarget[admLid] = sender;
            activeAdminTargetPhone[admLid] = senderPhone;
        }
        activeAdminTarget['LAST_ACTIVE'] = sender;
        activeAdminTargetPhone['LAST_ACTIVE'] = senderPhone;

        await sendUserMessage(sender, FORWARDING_LETTER_CONFIRMATION);

        const adminAlert =
            `📨 *[SURAT / PESAN DITERUSKAN PEMOHON]* 📨\n\n` +
            `👤 *Dari Nomor:* +${senderPhone}\n` +
            `💬 *Isi Pesan:*\n"${message.body}"\n\n` +
            `-----------------------------------------\n` +
            `Pesan telah disimpan dalam sistem. Pemohon telah diinfokan bahwa petugas akan menghubungi mereka.\n` +
            `💡 *Cara Membalas:* Swipe / Balas Kutipan pesan ini, ATAU langsung ketik balasan di chat ini.`;
        for (const admPhone of ADMIN_PHONES) {
            try {
                await client.sendMessage(`${admPhone}@c.us`, adminAlert);
            } catch (e) { }
        }

        tracker.recordConversation({
            phone: senderPhone,
            text: message.body,
            answer: 'Pesan telah disimpan dan akan dihubungi oleh petugas',
            source: 'BOT',
            aiModel,
            status: 'PENDING'
        });
        return;
    }

    // ==========================================
    // 🔍 8. DETEKSI CEK STATUS SURAT YANG SUDAH DIKIRIMKAN (PRIORITAS 7 - REQUEST 7)
    // ==========================================
    if (isTrackingSubmittedLetterQuery(text)) {
        userState[sender] = 'CHECK_SUBMITTED_LETTER';
        await sendUserMessage(sender, TRACKING_SUBMITTED_LETTER_MENU);
        tracker.recordConversation({
            phone: senderPhone,
            text: message.body,
            answer: 'Menampilkan Pilihan Jalur Cek Status Surat (1. WA / 2. Portal PPID)',
            source: 'BOT',
            aiModel,
            status: 'DONE'
        });
        return;
    }

    // ==========================================
    // 📞 PEMILIHAN SALURAN KONTAK RESMI KKP
    // ==========================================
    if (userState[sender] === 'SELECT_KONTAK') {
        if (text === '0' || text === 'kembali' || text === 'menu' || text === 'batal') {
            userState[sender] = 'MENU';
            await sendUserMessage(sender, "Anda telah keluar dari daftar kontak.\n\nKetik *Menu* untuk menampilkan layanan lainnya.");
            return;
        }

        if (text === 'ya' || text === 'selesai' || text === 'sudah' || text === 'cukup') {
            userState[sender] = null;
            userAiChatCount[sender] = 0;
            tracker.closeUserSession(senderPhone);
            clearChatHistory(senderPhone);
            await sendUserMessage(sender, "Terima kasih telah menghubungi Layanan Informasi PPID KKP. Semoga informasi kontak ini membantu Anda! 🌊🇮🇩\n\nKetik *Menu* jika membutuhkan bantuan lainnya.\n\nSalam hormat.");
            return;
        }

        let contactKey = null;
        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ') || /ppid|informasi|dokumen/i.test(text)) {
            // Langsung hubungkan ke petugas layanan PPID KKP (Request 1: jangan kasih nomor PPID lagi)
            await connectUserToPetugas({
                sender,
                senderDetails,
                text: message.body,
                userReply:
                    `Halo #SahabatBahari,\n\n` +
                    `Anda saat ini sudah terhubung di ruang percakapan WhatsApp resmi PPID Kementerian Kelautan dan Perikanan.\n\n` +
                    `*Pesan Anda LANGSUNG KAMI HUBUNGKAN KE PETUGAS LAYANAN PPID KKP* agar dapat dibantu secara langsung.\n\n` +
                    `Silakan sampaikan pertanyaan atau informasi publik yang Anda butuhkan. Petugas kami akan segera membalas pesan Anda. 🙏\n\n` +
                    `_(Ketik *0* untuk kembali ke Menu Utama)_`,
                adminAlertTitle: `👨‍💻 *[LAYANAN PPID: PERMINTAAN INFORMASI / PETUGAS]*`
            });
            return;
        }
        else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ') || /\b(ptsa|sipi|siup|oss|silat|perizinan berusaha|izin kapal|izin tangkap)\b/i.test(text)) contactKey = '2';
        else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ') || /akp|abk|pelaut|darurat laut/i.test(text)) contactKey = '3';
        else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ') || /knmp|kdmp|kampung nelayan/i.test(text)) contactKey = '4';
        else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ') || /budidaya|djpb|tambak|juknis/i.test(text)) contactKey = '5';
        else if (text === '6' || text.startsWith('6.') || text.startsWith('6 ') || /lpmukp|modal|pinjaman|bunga/i.test(text)) contactKey = '6';
        else if (text === '7' || text.startsWith('7.') || text.startsWith('7 ') || /pengaduan|pungli|wbs|lapor/i.test(text)) contactKey = '7';
        else if (text === '8' || text.startsWith('8.') || text.startsWith('8 ') || /sdmao|biro sdm|kepegawaian|casn|cpns|pppk/i.test(text)) contactKey = '8';

        if (contactKey && CONTACT_DETAILS[contactKey]) {
            await sendUserMessage(sender, CONTACT_DETAILS[contactKey] + getResolutionFooter(text));
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: `Kontak KKP Pilihan #${contactKey}`,
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        } else {
            // Jika pemohon langsung mengetikkan pertanyaan spesifik / mengerucut
            userState[sender] = 'AI_MODE';
            const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
            const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;

            if (jawabanTemplate) {
                await sendUserMessage(sender, jawabanTemplate + getResolutionFooter(text));
                return;
            }

            try {
                const replyText = await generateGroundedAiResponse({
                    sender,
                    senderPhone,
                    messageBody: message.body,
                    text,
                    topicContext: 'Daftar Kontak Resmi Layanan KKP',
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });
                await sendUserMessage(sender, replyText + getResolutionFooter(text));
            } catch (err) {
                await sendUserMessage(sender, "Silakan pilih angka *1* sampai *8* untuk rincian kontak yang Anda butuhkan, atau ketik *0* untuk kembali ke Menu Utama.");
            }
            return;
        }
    }

    // ==========================================
    // 📢 SUB-MENU: PILIHAN KATEGORI LAPORAN / PENGADUAN
    // ==========================================
    if (userState[sender] === 'SELECT_LAPORAN') {
        if (text === '0' || text === 'kembali' || text === 'menu') {
            userState[sender] = 'MAIN_MENU';
            delete userActiveTopic[senderPhone];
            const menuText =
                `🌊 *LAYANAN INFORMASI PUBLIK DIGITAL PPID KKP* 🌊\n` +
                `Kementerian Kelautan dan Perikanan Republik Indonesia\n\n` +
                `Halo #SahabatBahari! Selamat datang di Pusat Layanan Informasi Resmi KKP. Silakan pilih menu di bawah ini:\n\n` +
                `*1* 📋 Alur & Prosedur Permohonan Informasi Publik (PPID)\n` +
                `*2* 🎯 Kebijakan Ekonomi Biru & Program Prioritas (PKPN)\n` +
                `*3* 📑 Regulasi, Juknis & Informasi Publik KKP\n` +
                `*4* 💼 Pendaftaran Awak Kapal Perikanan (AKP / E-LAUT)\n` +
                `*5* ⚖️ Pengajuan Keberatan Informasi Publik\n` +
                `*6* 📞 Saluran Pengaduan & Layanan Terpadu KKP\n\n` +
                `_Balas dengan mengetik angka (contoh: *1*) untuk memilih menu, atau ketik langsung pertanyaan/kendala spesifik Anda._\n\n` +
                `_(Ketik *BANTUAN* untuk terhubung langsung dengan Petugas PPID)_`;
            await sendUserMessage(sender, menuText);
            return;
        }

        // Pilihan 1: Pengaduan Umum & Pelanggaran Perikanan (Ditjen PSDKP)
        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ') || /\b(psdkp|bom|cantrang|racun|pencurian ikan|wbs|pungli|destructive fishing|umum)\b/i.test(text)) {
            userState[sender] = 'AI_MODE';
            const answerPilihan1 =
                `Halo #SahabatBahari,\n\n` +
                `🚨 *LAYANAN PENGADUAN UMUM & PELANGGARAN PERIKANAN (DITJEN PSDKP)*\n\n` +
                `Untuk menyampaikan laporan pelanggaran tindak pidana perikanan (*destructive fishing*, bom ikan, alat tangkap dilarang, kapal ikan ilegal) maupun pengaduan masyarakat umum, silakan hubungi kanal resmi berikut:\n\n` +
                `• 📞 *Call Center Terpadu KKP:* 141\n` +
                `• 📱 *Hotline Ditjen PSDKP:* +62 811-947-141\n` +
                `• 📧 *Email Pengaduan KKP:* pengaduan@kkp.go.id\n` +
                `• 🌐 *Portal SP4N-LAPOR!:* https://lapor.go.id\n` +
                `• 🔒 *Whistleblowing System (WBS Pungli/Korupsi):* https://wbs.kkp.go.id\n\n` +
                `Mohon sertakan kronologi kejadian, perkiraan lokasi koordinat, waktu, dan foto/video dokumentasi pendukung. Seluruh identitas pelapor dijamin kerahasiaannya.\n\n` +
                `Salam hormat.`;
            await sendUserMessage(sender, answerPilihan1);
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Diarahkan ke Pengaduan Umum & Pelanggaran Perikanan (PSDKP / WBS)',
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        // Pilihan 2: Pengawasan Ruang Laut & Pemanfaatan Pulau-Pulau Kecil (Ditjen PRL)
        if (text === '2' || text.startsWith('2.') || text.startsWith('2 ') || /\b(prl|ruang laut|pulau|pulau kecil|penyu|satwa|hiu|pkkprl|reklamasi|pesisir)\b/i.test(text)) {
            userState[sender] = 'AI_MODE';
            const answerPilihan2 =
                `Halo #SahabatBahari,\n\n` +
                `🏝️ *LAYANAN PENGAWASAN RUANG LAUT & PULAU-PULAU KECIL (DITJEN PRL)*\n\n` +
                `Terkait laporan pelanggaran izin ruang laut, pemanfaatan pulau-pulau kecil ilegal, reklamasi, pencemaran pesisir, maupun perlindungan satwa/biota laut dilindungi (seperti penyu dan hiu), silakan sampaikan melalui:\n\n` +
                `• 📱 *Hotline Pengendalian Ruang Laut:* +62 811-1012-0010\n` +
                `• 📱 *Hotline Pelayanan Ruang Laut (PRL):* +62 877-6225-0001\n` +
                `• 📞 *Call Center Terpadu KKP:* 141\n` +
                `• 📧 *Email:* humas.prl@kkp.go.id\n\n` +
                `Petugas pengawasan Ditjen Pengelolaan Kelautan dan Ruang Laut (PKRL) akan menindaklanjuti data lapangan dan perizinan terkait.\n\n` +
                `Salam hormat.`;
            await sendUserMessage(sender, answerPilihan2);
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Diarahkan ke Layanan Pengawasan Ruang Laut & Pulau Kecil (Ditjen PRL)',
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        // Pilihan 3: Pengaduan Awak Kapal Perikanan (AKP / ABK)
        if (text === '3' || text.startsWith('3.') || text.startsWith('3 ') || /\b(akp|abk|awak kapal|pelaut|gaji|upah|pkl|kecelakaan)\b/i.test(text)) {
            userState[sender] = 'AI_MODE';
            const answerPilihan3 =
                `Halo #SahabatBahari,\n\n` +
                `⚓ *LAYANAN PERLINDUNGAN & PENGADUAN AWAK KAPAL PERIKANAN (AKP / ABK)*\n\n` +
                `Bagi awak kapal atau keluarga yang ingin mengadukan permasalahan ketenagakerjaan di kapal (seperti penahanan gaji, kecelakaan kerja, penelantaran, atau pelanggaran Perjanjian Kerja Laut), silakan hubungi:\n\n` +
                `• 📱 *Hotline Pengaduan AKP:* 0811-251-744\n` +
                `• 📞 *Call Center Gangguan Operasional AKP:* +62 811-1000-3132\n` +
                `• 🌐 *Portal SP4N-LAPOR!:* https://lapor.go.id\n\n` +
                `Siapkan data pendukung berupa Nama Kapal, Nama Agen/Pemilik, Salinan PKL (Perjanjian Kerja Laut), dan kronologi kejadian.\n\n` +
                `Salam hormat.`;
            await sendUserMessage(sender, answerPilihan3);
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Diarahkan ke Layanan Perlindungan & Pengaduan AKP / ABK',
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        // Jika pemohon langsung mengetikkan deskripsi laporan yang spesifik
        userState[sender] = 'AI_MODE';
        const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
        const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;
        if (jawabanTemplate) {
            await sendUserMessage(sender, jawabanTemplate);
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

        try {
            const replyText = await generateGroundedAiResponse({
                sender,
                senderPhone,
                messageBody: message.body,
                text,
                topicContext: 'Layanan Pengaduan & Laporan KKP (Umum, PRL, AKP)',
                isMultiChat: message.isMultiChat,
                multiChatCount: message.multiChatCount,
                isLongText: message.isLongText
            });
            await sendUserMessage(sender, replyText);
            return;
        } catch (err) {
            await sendUserMessage(sender, `Silakan pilih angka *1* (Laporan Umum/PSDKP), *2* (Ruang Laut/Pulau), atau *3* (Awak Kapal/AKP), atau ketik langsung kendala spesifik Anda.`);
            return;
        }
    }

    // ==========================================
    // 📞 6. DETEKSI CEPAT: PERMINTAAN KONTAK / CALL CENTER RESMI KKP
    // ==========================================
    if (isGeneralContactQuery(text)) {
        userState[sender] = 'SELECT_KONTAK';
        userActiveTopic[senderPhone] = { topic: 'KONTAK', name: 'Saluran Kontak Resmi KKP' };
        await sendUserMessage(sender, CONTACT_MENU_TEXT);
        tracker.recordConversation({
            phone: senderPhone,
            text: message.body,
            answer: 'Menampilkan Pemetaan Saluran Kontak Resmi KKP (Pilihan 1-7)',
            source: 'BOT',
            aiModel,
            status: 'DONE'
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
            clearChatHistory(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi panduan Modernisasi Kapal & Perlindungan Nelayan telah tuntas diselesaikan. Semoga usaha penangkapan ikan Anda lancar dan berkah! ⛵🌊\n\nKetik *Menu* jika Anda membutuhkan layanan lainnya.\n\nSalam hormat.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ') || /dimensi|ukuran|loa|gt|sicefi|selisih/i.test(text)) {
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
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ') || /skkp|buku kapal|kelaikan/i.test(text)) {
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
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ') || /migrasi|izin pusat|izin daerah|30 gt|12 mil/i.test(text)) {
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
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ') || /jaminan|sehat|tanah|bpjs/i.test(text)) {
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
        } else if (text === '6' || text.startsWith('6.') || text.startsWith('6 ') || /tender|pengumuman|pengadaan|lpse|proyek|lelang|hibah/i.test(text)) {
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
            // Pemohon mengetikkan pertanyaan mengerucut / spesifik (JANGAN kirim ulang menu pilihan berulang!)
            const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
            const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;

            if (jawabanTemplate) {
                await sendUserMessage(sender, jawabanTemplate + getResolutionFooter(text));
                return;
            }

            try {
                const replyText = await generateGroundedAiResponse({
                    sender,
                    senderPhone,
                    messageBody: message.body,
                    text,
                    topicContext: 'Modernisasi Armada Kapal Perikanan & Perlindungan Nelayan',
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });
                await sendUserMessage(sender, replyText + getResolutionFooter(text));
            } catch (err) {
                await sendUserMessage(sender, "Pertanyaan Anda telah kami terima. Silakan ketik *0* untuk kembali ke Menu Utama atau ketik *BANTUAN* untuk terhubung ke Petugas.");
            }
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

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ') || /wilayah|sebaran|lokasi|titik|peta|kepmen 55/i.test(text)) {
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
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ') || /jadwal|tahapan|kapan|waktu|roadmap|surveyor/i.test(text)) {
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
        } else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ') || /syarat|alur|usulan|cara ajukan|pengusulan/i.test(text)) {
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
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ') || /fasilitas|sarana|kdmp|koperasi|pabrik es|cold storage/i.test(text)) {
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
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ') || /kontak|satgas|wa|call center|nomor/i.test(text)) {
            await sendUserMessage(sender,
                `☎️ *KONTAK RESMI SATGAS OPERASIONALISASI & PEMBANGUNAN KNMP*\n\n` +
                `Halo #SahabatBahari, berikut informasi yang kita dapatkan mengenai kontak Satgas Pembangunan KNMP sesuai kebutuhan sahabat:\n\n` +
                `🔗 *Tautan Informasi Resmi Satgas KNMP:*\n` +
                `https://www.instagram.com/p/DeB4FFpmnJg/?utm_source=ig_web_copy_link&gwpx=NTc4MTIwNjQ2YQ==\n\n` +
                `*Koreksi Kontak Wilayah:*\n` +
                `• *Regional Kalimantan:* Fakhri (0852-8734-7969)\n\n` +
                `Salam hormat.`
            );
            return;
        } else {
            // Pemohon mengetikkan pertanyaan mengerucut / spesifik (JANGAN kirim ulang menu pilihan berulang!)
            const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
            const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;

            if (jawabanTemplate) {
                await sendUserMessage(sender, jawabanTemplate + getResolutionFooter(text));
                return;
            }

            try {
                const replyText = await generateGroundedAiResponse({
                    sender,
                    senderPhone,
                    messageBody: message.body,
                    text,
                    topicContext: 'Kampung Nelayan Merah Putih (KNMP)',
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });
                await sendUserMessage(sender, replyText + getResolutionFooter(text));
            } catch (err) {
                await sendUserMessage(sender, "Pertanyaan Anda telah kami terima. Silakan ketik *0* untuk kembali ke Menu Utama atau ketik *BANTUAN* untuk terhubung ke Petugas.");
            }
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
            userActiveTopic[senderPhone] = { topic: 'MODERNISASI_KAPAL', name: 'Modernisasi Armada Kapal Perikanan' };
            await sendUserMessage(sender, KAPAL_SUBMENU_TEXT);
            return;
        } else {
            // Pemohon langsung menanyakan pertanyaan spesifik tentang PKPN
            const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
            const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;

            if (jawabanTemplate) {
                await sendUserMessage(sender, jawabanTemplate + getResolutionFooter(text));
                return;
            }

            try {
                const replyText = await generateGroundedAiResponse({
                    sender,
                    senderPhone,
                    messageBody: message.body,
                    text,
                    topicContext: 'Program Kerja Prioritas Nasional (PKPN KKP)',
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });
                await sendUserMessage(sender, replyText + getResolutionFooter(text));
            } catch (err) {
                await sendUserMessage(sender, "Silakan pilih angka *1* sampai *5* untuk program PKPN yang ingin Anda ketahui, atau ketik *0* untuk kembali ke Menu Utama.");
            }
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
            clearChatHistory(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi informasi Revitalisasi Tambak Pantura telah selesai. Bersama kita wujudkan budidaya perikanan modern dan berkelanjutan! 🦐🌊\n\nKetik *Menu* jika membutuhkan layanan lainnya.\n\nSalam hormat.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ') || /wilayah|sebaran|lokasi|pantura|titik/i.test(text)) {
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
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ') || /irigasi|ipal|geomembran|hdpe|tahapan/i.test(text)) {
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
        } else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ') || /komoditas|udang|vaname|nila|nila salin/i.test(text)) {
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
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ') || /syarat|kemitraan|pokdakan|kusuka|cbib/i.test(text)) {
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
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ') || /kontak|djpb|wa|call center/i.test(text)) {
            await sendUserMessage(sender,
                `☎️ *KONTAK LAYANAN DITJEN PERIKANAN BUDI DAYA (DJPB)*\n\n` +
                `📱 *WhatsApp Layanan DJPB:* +62 822-6150-5727\n` +
                `🌐 *Website:* https://djpb.kkp.go.id\n` +
                `📧 *Email:* setditjen.pb@kkp.go.id / djpb@kkp.go.id\n` +
                `☎️ *Call Center KKP:* 141\n\n` +
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
            // Pemohon mengetikkan pertanyaan mengerucut / spesifik (JANGAN kirim ulang menu pilihan berulang!)
            const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
            const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;

            if (jawabanTemplate) {
                await sendUserMessage(sender, jawabanTemplate + getResolutionFooter(text));
                return;
            }

            try {
                const replyText = await generateGroundedAiResponse({
                    sender,
                    senderPhone,
                    messageBody: message.body,
                    text,
                    topicContext: 'Revitalisasi Tambak Budidaya Pantura Jawa',
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });
                await sendUserMessage(sender, replyText + getResolutionFooter(text));
            } catch (err) {
                await sendUserMessage(sender, "Pertanyaan Anda telah kami terima. Silakan ketik *0* untuk kembali ke Menu Utama atau ketik *BANTUAN* untuk terhubung ke Petugas.");
            }
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
            clearChatHistory(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi informasi Budidaya Ikan Darat Tematik telah selesai. Bersama kita perkuat ketahanan pangan dan gizi protein bangsa! 🐟🇮🇩\n\nKetik *Menu* jika membutuhkan layanan lainnya.\n\nSalam hormat.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ') || /target|protein|air tawar|kemandirian/i.test(text)) {
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
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ') || /komoditas|nila|lele|patin|gurame|ikan mas/i.test(text)) {
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
        } else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ') || /syarat|bantuan|benih|bibit|pakan|pokdakan|kusuka/i.test(text)) {
            await sendUserMessage(sender,
                `📝 *SYARAT & ALUR BANTUAN BENIH & PAKAN POKDAKAN (e-KUSUKA)*\n\n` +
                `1. *Kelompok Pembudidaya (Pokdakan):* Terdaftar resmi pada Dinas Perikanan Kabupaten/Kota setempat dengan susunan pengurus aktif (minimal 10 orang).\n` +
                `2. *Kartu e-KUSUKA:* Anggota wajib terdaftar aktif memiliki kartu identitas pelaku usaha perikanan e-KUSUKA (pendaftaran/verifikasi status dikoordinasikan melalui Dinas Perikanan Kab/Kota atau Penyuluh Perikanan setempat).\n` +
                `3. *Ketersediaan Kolam & Air:* Memiliki lahan kolam siap tebar dan ketersediaan sumber air tawar bersih sepanjang tahun.\n` +
                `4. *Pengajuan Proposal:* Disusun bersama Penyuluh Perikanan Lapangan (PPL) dan diajukan ke Dinas Perikanan Kab/Kota untuk diteruskan ke Balai Benih KKP (BBPBAT/BPBAT).\n` +
                `5. *Petunjuk Teknis (Juknis) Resmi:* https://ppid.kkp.go.id/upp/direktorat-jenderal-perikanan-budi-daya/regulasi/petunjuk-teknis/\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 *Apakah informasi syarat bantuan benih ikan darat ini sudah tuntas?*\n` +
                `• Balas *YA* jika sudah selesai.\n` +
                `• Atau balas angka *1*, *2*, *4*, *5* untuk topik lainnya.\n` +
                `• Ketik *0* untuk kembali ke Menu PKPN.\n` +
                `• Ketik *MENU* untuk kembali ke Menu Utama.`
            );
            return;
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ') || /bioflok|ras|gerpari|teknologi|pakan mandiri/i.test(text)) {
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
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ') || /kontak|djpb|wa|call center/i.test(text)) {
            await sendUserMessage(sender,
                `☎️ *KONTAK LAYANAN DITJEN PERIKANAN BUDI DAYA (DJPB)*\n\n` +
                `📱 *WhatsApp Layanan DJPB:* +62 822-6150-5727\n` +
                `🌐 *Balai Besar Budidaya Air Tawar (BBPBAT Sukabumi):* https://bbpbatsukabumi.kkp.go.id\n` +
                `📧 *Email:* setditjen.pb@kkp.go.id\n` +
                `☎️ *Call Center KKP:* 141\n\n` +
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
            // Pemohon mengetikkan pertanyaan mengerucut / spesifik (JANGAN kirim ulang menu pilihan berulang!)
            const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
            const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;

            if (jawabanTemplate) {
                await sendUserMessage(sender, jawabanTemplate + getResolutionFooter(text));
                return;
            }

            try {
                const replyText = await generateGroundedAiResponse({
                    sender,
                    senderPhone,
                    messageBody: message.body,
                    text,
                    topicContext: 'Budidaya Ikan Darat Tematik KKP',
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });
                await sendUserMessage(sender, replyText + getResolutionFooter(text));
            } catch (err) {
                await sendUserMessage(sender, "Pertanyaan Anda telah kami terima. Silakan ketik *0* untuk kembali ke Menu Utama atau ketik *BANTUAN* untuk terhubung ke Petugas.");
            }
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
            clearChatHistory(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi informasi Swasembada Garam Nasional telah selesai. Menuju kemandirian garam industri dan konsumsi Indonesia! 🧂🇮🇩\n\nKetik *Menu* jika membutuhkan layanan lainnya.\n\nSalam hormat.");
            return;
        }

        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ') || /sentra|wilayah|sebaran|garam rakyat|madura|ntt/i.test(text)) {
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
        } else if (text === '2' || text.startsWith('2.') || text.startsWith('2 ') || /roadmap|tahapan|integrasi|washing plant|srg/i.test(text)) {
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
        } else if (text === '3' || text.startsWith('3.') || text.startsWith('3 ') || /teknologi|geomembran|mutu|nacl|k1/i.test(text)) {
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
        } else if (text === '4' || text.startsWith('4.') || text.startsWith('4 ') || /syarat|bantuan|kugar|proposal|pompa|gudang/i.test(text)) {
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
        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ') || /kontak|pkrl|ruang laut|wa|call center/i.test(text)) {
            await sendUserMessage(sender,
                `☎️ *KONTAK LAYANAN DITJEN PENGELOLAAN KELAUTAN & RUANG LAUT (PKRL)*\n\n` +
                `📱 *WhatsApp Layanan PKRL:* +62 811-1934-800\n` +
                `🌐 *Website:* https://pkrl.kkp.go.id\n` +
                `📧 *Email:* humas.djpkrl@kkp.go.id\n` +
                `☎️ *Call Center KKP:* 141\n\n` +
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
            // Pemohon mengetikkan pertanyaan mengerucut / spesifik (JANGAN kirim ulang menu pilihan berulang!)
            const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
            const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;

            if (jawabanTemplate) {
                await sendUserMessage(sender, jawabanTemplate + getResolutionFooter(text));
                return;
            }

            try {
                const replyText = await generateGroundedAiResponse({
                    sender,
                    senderPhone,
                    messageBody: message.body,
                    text,
                    topicContext: 'Swasembada Garam Nasional KKP',
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });
                await sendUserMessage(sender, replyText + getResolutionFooter(text));
            } catch (err) {
                await sendUserMessage(sender, "Pertanyaan Anda telah kami terima. Silakan ketik *0* untuk kembali ke Menu Utama atau ketik *BANTUAN* untuk terhubung ke Petugas.");
            }
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
            clearChatHistory(senderPhone);
            await sendUserMessage(sender, "Terima kasih! Sesi informasi 5 Kebijakan Ekonomi Biru KKP telah selesai. Bersama kita rawat ekosistem laut Indonesia! 🌊🇮🇩\n\nKetik *Menu* jika membutuhkan layanan lainnya.");
            return;
        }

        if (text === '1' || /konservasi|kawasan|laut 30|blue carbon|karbon biru/i.test(text)) {
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
        } else if (text === '2' || /pit|kuota|terukur|penangkapan ikan terukur/i.test(text)) {
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
        } else if (text === '3' || /budidaya|udang|lobster|kepiting|rumput laut|nila salin/i.test(text)) {
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
        } else if (text === '4' || /pkkprl|pesisir|ruang laut|izin ruang laut/i.test(text)) {
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
        } else if (text === '5' || /bcl|bulan cinta laut|sampah|plastik/i.test(text)) {
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
            // Pemohon mengetikkan pertanyaan mengerucut / spesifik (JANGAN kirim ulang menu pilihan berulang!)
            const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
            const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;

            if (jawabanTemplate) {
                await sendUserMessage(sender, jawabanTemplate + getResolutionFooter(text));
                return;
            }

            try {
                const replyText = await generateGroundedAiResponse({
                    sender,
                    senderPhone,
                    messageBody: message.body,
                    text,
                    topicContext: '5 Kebijakan Ekonomi Biru KKP',
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });
                await sendUserMessage(sender, replyText + getResolutionFooter(text));
            } catch (err) {
                await sendUserMessage(sender, "Pertanyaan Anda telah kami terima. Silakan ketik *0* untuk kembali ke Menu Utama atau ketik *BANTUAN* untuk terhubung ke Petugas.");
            }
            return;
        }
    }

    // ==========================================
    // ❓ KONFIRMASI PERTANYAAN TIDAK JELAS / DILUAR KEWENANGAN
    // ==========================================
    if (userState[sender] === 'UNCLEAR_PROMPT') {
        const wantsExit = ['0', 'selesai', 'batal', 'keluar', 'akhiri', 'tidak', 'bukan', 'tutup', 'stop', 'cukup', 'end', 'sudah'];
        const isExit = wantsExit.includes(text) || text === '0';

        const wantsOfficer = text === '1' ||
            isEscalationQuery(text) ||
            /\b(petug[a-z]*|ngobrol|bicara|ngomong|admin|cs|operator|manusia|orang|helpdesk|livechat|kontak|hubungi|sambung)\b/i.test(text);

        if (wantsOfficer) {
            await connectUserToPetugas({
                sender,
                senderDetails,
                text: message.body,
                userReply:
                    `👨‍💻 *TERHUBUNG KE PETUGAS LAYANAN PPID KKP*\n\n` +
                    `Halo #SahabatBahari,\n` +
                    `Anda telah terhubung langsung ke antrean Petugas Layanan Informasi PPID KKP.\n\n` +
                    `Silakan sampaikan pertanyaan atau kendala Anda di sini. Petugas kami akan segera merespons chat Anda. 🙏\n\n` +
                    `_(Ketik *0* untuk kembali ke Menu Utama)_`,
                adminAlertTitle: `👨‍💻 *[KONSULTASI PETUGAS: DARI PILIHAN PEMOHON]*`
            });
            return;
        } else if (isExit) {
            userState[sender] = null;
            userAiChatCount[sender] = 0;
            tracker.closeUserSession(senderPhone);
            await sendUserMessage(sender,
                `Sesi layanan diselesaikan. Terima kasih telah menghubungi PPID Kementerian Kelautan dan Perikanan RI. \n\n` +
                `Ketik *Menu* kapan saja jika Anda ingin memulai kembali. 🌊🇮🇩`
            );
            return;
        } else if (text === '2') {
            userState[sender] = 'AI_MODE';
            await sendUserMessage(sender,
                `Baik #SahabatBahari,\n\n` +
                `Silakan ketikkan kendala atau pertanyaan sektor kelautan dan perikanan yang Anda butuhkan (contoh: izin kapal, bantuan budidaya ikan, beasiswa, atau lokasi KNMP):\n\n` +
                `_(Ketik *0* untuk kembali ke Menu Utama)_`
            );
            return;
        } else {
            // Pemohon langsung mengetikkan pertanyaan lain atau penjelasan (Jangan selesaikan sesi secara sepihak!)
            userState[sender] = 'AI_MODE';
            userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;

            // 1. Cek FAQ template
            const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
            const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;

            if (jawabanTemplate) {
                const senderName = userKnownName[senderPhone] || userKnownName[sender] || senderDetails?.name || '';
                let personalizedFaq = jawabanTemplate;
                if (senderName && personalizedFaq.startsWith('Halo #SahabatBahari,')) {
                    personalizedFaq = personalizedFaq.replace('Halo #SahabatBahari,', `Halo #SahabatBahari Kak ${senderName},`);
                }
                await sendUserMessage(sender, personalizedFaq + getResolutionFooter(text));
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: personalizedFaq,
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 2. Oper ke Gemini AI
            try {
                const replyText = await generateGroundedAiResponse({
                    sender,
                    senderPhone,
                    messageBody: message.body,
                    text,
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });
                await sendUserMessage(sender, replyText + getResolutionFooter(text));
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: replyText,
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
            } catch (error) {
                console.error("Error AI fallback di UNCLEAR_PROMPT:", error);
                await sendUserMessage(sender,
                    `Halo #SahabatBahari,\n\n` +
                    `Pertanyaan Anda telah kami terima dalam sistem layanan informasi PPID KKP.\n\n` +
                    `Silakan pilih bantuan yang Anda butuhkan:\n` +
                    `*1* 👨‍💻 Hubungkan langsung ke Petugas Layanan PPID\n` +
                    `*2* 💬 Tuliskan pertanyaan lebih spesifik\n` +
                    `*0* ❌ Selesai / Menu Utama\n\n` +
                    `_Balas angka *1*, *2*, atau *0*._\n\n` +
                    `Salam hormat.`
                );
            }
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

        // 📢 Intercept Ingin Laporan Umum -> Tampilkan 3 Pilihan Laporan (Umum, PRL, AKP)
        if (isGenericReportInquiry(text)) {
            userState[sender] = 'SELECT_LAPORAN';
            await sendUserMessage(sender, PILIHAN_LAPORAN_MENU_TEXT);
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Menampilkan 3 Pilihan Menu Kategori Laporan (Umum/PSDKP, Ruang Laut/PRL, Awak Kapal/AKP)',
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        // 🔒 Intercept Pengaduan AKP / ABK
        if (isPengaduanAkpQuery(text)) {
            await sendUserMessage(sender, AKP_PENGADUAN_MESSAGE);
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

        // ⛵ Intercept Tematik Modernisasi Kapal
        if (!isSpecificQuestion(text) && isModernisasiKapalQuery(text)) {
            userState[sender] = 'PKPN_KAPAL_MENU';
            await sendUserMessage(sender, KAPAL_SUBMENU_TEXT);
            return;
        }

        // 🌊 Intercept Tematik KNMP
        if (!isSpecificQuestion(text) && isKnmpQuery(text)) {
            userState[sender] = 'PKPN_KNMP_MENU';
            await sendUserMessage(sender, KNMP_SUBMENU_TEXT);
            return;
        }

        // 🎯 Intercept Tematik PKPN (Dua Tingkat Menu Interaktif)
        if (!isSpecificQuestion(text) && isPkpnQuery(text)) {
            userState[sender] = 'PKPN_SELECT_PROGRAM';
            await sendUserMessage(sender, PKPN_PROGRAM_MENU_TEXT);
            return;
        }

        // 🌍 Intercept Tematik Ekonomi Biru
        if (!isSpecificQuestion(text) && isEkonomiBiruQuery(text)) {
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
        const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
        const faqJawaban = canUseDirectFaq ? findBestFaqMatch(text) : null;

        if (faqJawaban) {
            userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;
            const senderName = userKnownName[senderPhone] || userKnownName[sender] || senderDetails?.name || '';
            let personalizedFaq = faqJawaban;
            if (senderName && personalizedFaq.startsWith('Halo #SahabatBahari,')) {
                personalizedFaq = personalizedFaq.replace('Halo #SahabatBahari,', `Halo #SahabatBahari Kak ${senderName},`);
            }
            await sendUserMessage(sender, personalizedFaq + getResolutionFooter(text));
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: personalizedFaq,
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        try {
            // Tambahkan hitungan pertanyaan AI
            userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;

            const replyText = await generateGroundedAiResponse({
                sender,
                senderPhone,
                messageBody: message.body,
                text,
                topicContext: '',
                isMultiChat: message.isMultiChat,
                multiChatCount: message.multiChatCount,
                isLongText: message.isLongText
            });

            // Jika informasi tersebut tidak ada / belum bisa dijawab -> alihkan kepada petugas
            const isUnavailableInfo =
                replyText.includes('belum bisa kami jawab') ||
                replyText.includes('kami alihkan kepada petugas') ||
                replyText.includes('dialihkan kepada petugas');

            if (isUnavailableInfo) {
                await connectUserToPetugas({
                    sender,
                    senderDetails,
                    text: message.body,
                    userReply: replyText,
                    adminAlertTitle: `👨‍💻 *[ASISTENSI PETUGAS: INFORMASI BELUM TERSEDIA]*`
                });
                return;
            }

            await sendUserMessage(sender, replyText + getResolutionFooter(text));

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
    // 📋 ROUTING MENU UTAMA PPID KKP
    // ==========================================
    if (text === '1') {
        const menu1Detail =
            `📋 *PANDUAN LENGKAP PERMOHONAN INFORMASI PUBLIK (PPID KKP)*\n\n` +
            `Berdasarkan amanat *UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik (KIP)* dan Peraturan Menteri KP, setiap warga negara, akademisi/mahasiswa, pelaku usaha kelautan, maupun badan hukum berhak memperoleh informasi publik yang dikelola KKP secara transparan dan akuntabel.\n\n` +
            `1. *Syarat Dokumen Pemohon:*\n` +
            `   • *Individu/Perorangan:* Salinan KTP / NIK yang sah dan nomor kontak aktif.\n` +
            `   • *Mahasiswa/Peneliti:* Surat rekomendasi/pengantar dari kampus, KTP, dan daftar rincian data penelitian.\n` +
            `   • *Kelompok/Badan Usaha/LSM:* Akta pendirian/SK Kemenkumham, surat kuasa pimpinan, dan KTP penerima kuasa.\n\n` +
            `2. *Jangka Waktu & Biaya Layanan:*\n` +
            `   ⏱️ *Waktu Proses:* Maksimal *10 hari kerja* (dapat diperpanjang 7 hari kerja dengan pemberitahuan tertulis resmi).\n` +
            `   💰 *Biaya Layanan:* *100% GRATIS (Rp 0)*. KKP tidak memungut biaya apapun untuk penyediaan data softcopy/digital.\n\n` +
            `3. *Kanal Pengajuan Permohonan:*\n` +
            `   📲 *Melalui WhatsApp ini:* Ketik *DAFTAR* untuk mengisi formulir digital langsung sekarang (otomatis terbit nomor tiket registrasi).\n` +
            `   🌐 *Portal Web PPID:* https://ppid.kkp.go.id/layanan-informasi/pemohonan-informasi/\n` +
            `   📧 *Email Resmi:* ppidkkp@kkp.go.id\n` +
            `   🏛️ *Layanan Tatap Muka:* Desk Layanan Informasi PPID, Gedung Mina Bahari I Lt. 1, Jl. Medan Merdeka Timur No. 16, Jakarta Pusat.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 *Apakah panduan permohonan informasi publik ini sudah jelas?*\n` +
            `• Balas *DAFTAR* untuk langsung registrasi formulir di chat ini.\n` +
            `• Balas *YA* jika penjelasan sudah cukup / selesai.\n` +
            `• Balas *BANTUAN* jika ingin terhubung ke Petugas PPID.\n` +
            `• Ketik *0* untuk kembali ke Menu Utama.\n\n` +
            `Salam hormat.`;

        await sendUserMessage(sender, menu1Detail);
        tracker.recordConversation({
            phone: senderPhone,
            text: 'Menu 1: Syarat & Formulir Permohonan Informasi Publik',
            answer: 'Panduan Detail Permohonan Informasi Publik UU 14/2008',
            source: 'BOT',
            aiModel,
            status: 'DONE'
        });
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
        const menu4Detail =
            `⚖️ *PANDUAN TATA CARA PENGAJUAN KEBERATAN INFORMASI PUBLIK (PPID KKP)*\n\n` +
            `Sesuai mekanisme *UU No. 14 Tahun 2008 tentang KIP* dan Perki No. 1 Tahun 2021, Pemohon Informasi berhak mengajukan keberatan kepada *Atasan PPID KKP* apabila menemukan kendala dalam pelayanan informasi publik.\n\n` +
            `1. *Alasan Sah Pengajuan Keberatan:*\n` +
            `   • Permohonan informasi publik ditolak tanpa dasar alasan yang sah.\n` +
            `   • Informasi yang diminta tidak disediakan atau tidak ditanggapi dalam tenggat 10 (+7) hari kerja.\n` +
            `   • Permintaan informasi ditanggapi tidak sebagaimana yang diminta.\n` +
            `   • Permohonan informasi tidak dipenuhi sebagian atau seluruhnya.\n` +
            `   • Pengenaan biaya yang tidak wajar atau melampaui ketentuan peraturan.\n` +
            `   • Penyampaian informasi melebihi batas waktu yang ditetapkan undang-undang.\n\n` +
            `2. *Tahapan & Batas Waktu Penyelesaian:*\n` +
            `   ⏱️ *Batas Pengajuan:* Paling lambat *30 hari kerja* setelah ditemukannya alasan keberatan.\n` +
            `   🏛️ *Tanggapan Atasan PPID:* Wajib memberikan tanggapan/keputusan tertulis maksimal *30 hari kerja* sejak keberatan diterima.\n` +
            `   ⚖️ *Sengketa Informasi (KIP):* Jika tanggapan Atasan PPID belum memuaskan, pemohon berhak mendaftarkan sengketa ke *Komisi Informasi Pusat (KIP)* dalam tempo 14 hari kerja.\n\n` +
            `3. *Kanal Pengajuan Formulir Keberatan:*\n` +
            `   🌐 *Portal Web Pengajuan Keberatan:* https://ppid.kkp.go.id/layanan-informasi/pengajuan-keberatan/\n` +
            `   📧 *Email Pengaduan PPID:* ppidkkp@kkp.go.id\n` +
            `   🏛️ *Desk Layanan:* Gedung Mina Bahari I Lt. 1, Kantor Pusat KKP Jakarta.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 *Apakah panduan tata cara keberatan informasi ini sudah menyelesaikan kebutuhan Anda?*\n` +
            `• Balas *YA* jika informasi sudah cukup / tuntas.\n` +
            `• Balas *BANTUAN* untuk menyampaikan keberatan langsung ke Petugas PPID.\n` +
            `• Ketik *0* untuk kembali ke Menu Utama.\n\n` +
            `Salam hormat.`;

        await sendUserMessage(sender, menu4Detail);
        tracker.recordConversation({
            phone: senderPhone,
            text: 'Menu 4: Tata Cara Pengajuan Keberatan Informasi',
            answer: 'Panduan Detail Keberatan Informasi Publik UU KIP 14/2008',
            source: 'BOT',
            aiModel,
            status: 'DONE'
        });
        return;
    }
    else if (text === '6') {
        await sendUserMessage(sender,
            `Halo #SahabatBahari,\n\n` +
            `Menu nomor *6* pada menu awal telah ditiadakan. Sistem bot kami kini *mendeteksi langsung pertanyaan dan kendala Anda* tanpa harus memilih menu petugas terlebih dahulu.\n\n` +
            `Silakan langsung ketikkan pertanyaan atau laporan Anda di sini (seperti: perizinan, modernisasi kapal, program PKPN, data PPID, atau laporan dokumen palsu). Bot akan langsung menjawab atau menghubungkan Anda ke petugas jika diperlukan.`
        );
        return;
    }
    // Trigger Menu Utama atau Jawab Pertanyaan Langsung
    else {
        // 0. Deteksi pembuka percakapan / ingin bertanya / perkenalan nama (contoh: "saya indah", "saya ingin bertanya", "mau tanya")
        if (isIntroductoryOrAskQuery(text)) {
            const nameMatch = text.match(/(?:saya|nama\s+saya|namaku)\s+([a-zA-Z]+)/i);
            const pemohonName = nameMatch && nameMatch[1] && !['ingin', 'mau', 'bisa', 'akan', 'ada'].includes(nameMatch[1].toLowerCase())
                ? ` *${nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase()}*`
                : '';

            const introReply =
                `Halo #SahabatBahari${pemohonName},\n\n` +
                `Silakan langsung tuliskan pertanyaan, kendala, atau informasi yang Anda butuhkan seputar Kementerian Kelautan dan Perikanan (KKP).\n\n` +
                `💡 *Contoh topik layanan yang dapat Anda tanyakan:*\n` +
                `• Program Prioritas KKP (PKPN & Kampung Nelayan KNMP)\n` +
                `• Perizinan Kapal & Sertifikasi (SIPI, SIUP, SKKP via PTSA)\n` +
                `• Bantuan Usaha Budi Daya Ikan & Petunjuk Teknis DJPB\n` +
                `• Permohonan Informasi Publik PPID & Pelacakan Tiket\n` +
                `• Verifikasi Dokumen & Pengaduan Surat Palsu\n\n` +
                `Bot pintar kami siap menjawab dan membantu kendala Anda! 🌊🇮🇩\n\n` +
                `_(Ketik *0* untuk melihat Menu Utama)_`;

            await sendUserMessage(sender, introReply);
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: `Menyambut pembuka chat pemohon${pemohonName ? ` (${pemohonName.trim()})` : ''} & mengundang pertanyaan`,
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        // Daftar kata sapaan umum (kata 'bantuan' dialihkan ke trigger eskalasi di atas)
        const greetings = [
            'halo', 'hai', 'hey', 'p', 'menu', 'assalamualaikum', 'assalamu alaikum',
            'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
            'pagi', 'siang', 'sore', 'malam', 'help', 'info', 'permisi',
            'halo min', 'hai min', 'halo admin', 'hai admin', 'siang min', 'pagi min'
        ];

        // Jika pesan dalam bahasa Inggris dan bersifat sapaan / menu awal (Request 1)
        if (isEnglishQuery(text) && (text.length < 20 || ['hi', 'hello', 'good morning', 'good afternoon', 'good evening', 'dear sir', 'dear madam'].some(g => text.startsWith(g) || text === g))) {
            const englishMenuText =
                `Hello #SahabatBahari,\n\n` +
                `Welcome to the Official WhatsApp Service of *PPID Ministry of Marine Affairs and Fisheries (KKP RI)* 🇮🇩🐟\n\n` +
                `How can we assist you today?\n\n` +
                `*1* 📋 Public Information Service & Procedures (Law No. 14/2008)\n` +
                `*2* 🔍 Track Information Request Status / Ticket\n` +
                `*3* 💬 Inquire About Marine & Fisheries Policies, Permits & Blue Economy\n` +
                `*4* ⚖️ Public Information Dispute / Objection Procedure\n` +
                `*5* ❌ End Conversation\n\n` +
                `💡 *Direct Inquiry:*\n` +
                `You may directly type your specific question anytime (e.g. fishing vessel licensing, foreign marine research clearance, Blue Economy policies, or official MMAF contacts).\n\n` +
                `_Reply with a number (e.g. 1) to select an option, or type your question directly._\n\n` +
                `Best regards, PPID MMAF / KKP RI.`;

            await sendUserMessage(sender, englishMenuText);
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Menampilkan Menu Utama Versi Bahasa Inggris',
                source: 'BOT',
                aiModel,
                status: 'DONE'
            });
            return;
        }

        const isAllGreetings = bufferedMessages && bufferedMessages.every(m => {
            const t = (m.body || '').trim().toLowerCase();
            return greetings.includes(t) || t.length < 4;
        });

        // Jika teks berupa sapaan ATAU sangat pendek (kurang dari 4 huruf) -> Tampilkan Menu
        if (greetings.includes(text) || text.length < 4 || isAllGreetings) {
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
            // 📢 0. Intercept Ingin Laporan Umum -> Tampilkan 3 Pilihan Laporan (Umum, PRL, AKP)
            if (isGenericReportInquiry(text)) {
                userState[sender] = 'SELECT_LAPORAN';
                await sendUserMessage(sender, PILIHAN_LAPORAN_MENU_TEXT);
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Menampilkan 3 Pilihan Menu Kategori Laporan (Umum/PSDKP, Ruang Laut/PRL, Awak Kapal/AKP)',
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 🔒 1. Intercept Pengaduan AKP / ABK
            if (isPengaduanAkpQuery(text)) {
                await sendUserMessage(sender, AKP_PENGADUAN_MESSAGE);
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
            if (!isSpecificQuestion(text) && isPengaduanQuery(text)) {
                await sendUserMessage(sender, PENGADUAN_UMUM_MESSAGE);
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

            // 🔒 Intercept Ingin Ngobrol dengan Suatu Bagian Langsung (Request 3)
            if (isInginNgobrolBagianQuery(text)) {
                await sendUserMessage(sender, ARAHAN_PENGAJUAN_SURAT_BAGIAN_MESSAGE + getResolutionFooter(text));
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Diarahkan ke Prosedur Pengajuan Surat Resmi untuk Koordinasi/Audiensi Bagian KKP',
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 🔒 Intercept Permintaan Kontak PPID (Request 1)
            if (isPpidContactQuery(text)) {
                await connectUserToPetugas({
                    sender,
                    senderDetails,
                    text: message.body,
                    userReply:
                        `Halo #SahabatBahari,\n\n` +
                        `Anda saat ini sudah terhubung di ruang percakapan WhatsApp resmi PPID Kementerian Kelautan dan Perikanan.\n\n` +
                        `*Pesan Anda LANGSUNG KAMI HUBUNGKAN KE PETUGAS LAYANAN PPID KKP* agar dapat dibantu secara langsung.\n\n` +
                        `Silakan sampaikan pertanyaan atau informasi publik yang Anda butuhkan. Petugas kami akan segera membalas pesan Anda. 🙏\n\n` +
                        `_(Ketik *0* untuk kembali ke Menu Utama)_`,
                    adminAlertTitle: `👨‍💻 *[LAYANAN PPID: PERMINTAAN INFORMASI / PETUGAS]*`
                });
                return;
            }

            // 🔒 Intercept Pertanyaan Satu Data / Portal Data KKP
            if (isSatuDataQuery(text)) {
                await connectUserToPetugas({
                    sender,
                    senderDetails,
                    text: message.body,
                    userReply:
                        `Halo #SahabatBahari,\n\n` +
                        `Terkait permohonan data atau portal Satu Data KKP, seluruh permohonan data statistik dan informasi publik kelautan perikanan secara resmi berada di bawah tata kelola *PPID (Pejabat Pengelola Informasi dan Dokumentasi) KKP* (https://ppid.kkp.go.id).\n\n` +
                        `Portal satudata.kkp.go.id saat ini tidak aktif/tidak tersedia untuk umum. Agar kebutuhan data Anda dapat diverifikasi langsung melalui sistem data internal KKP, *Pesan Anda LANGSUNG KAMI HUBUNGKAN KE PETUGAS LAYANAN PPID KKP*.\n\n` +
                        `Silakan sampaikan rincian data (jenis komoditas, tahun, dan wilayah) yang Anda butuhkan. Petugas kami akan segera membalas pesan Anda. 🙏\n\n` +
                        `_(Ketik *0* untuk kembali ke Menu Utama)_`,
                    adminAlertTitle: `👨‍💻 *[LAYANAN PPID: PERMOHONAN DATA / SATU DATA]*`
                });
                return;
            }

            // 🔒 4. Intercept Perizinan → redirect ke PTSA (Priority 4)
            if (!isSpecificQuestion(text) && isPerizinanQuery(text)) {
                await sendUserMessage(sender, PTSA_REDIRECT_MESSAGE);
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
            if (!isSpecificQuestion(text) && isModernisasiKapalQuery(text)) {
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
            if (!isSpecificQuestion(text) && isKnmpQuery(text)) {
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
            if (!isSpecificQuestion(text) && isPkpnQuery(text)) {
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
            if (!isSpecificQuestion(text) && isEkonomiBiruQuery(text)) {
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

            // 9. Cek kecocokan dengan file database template (faq.json) dengan prinsip best match
            // HANYA gunakan template FAQ langsung jika BUKAN multi-chat dan BUKAN teks panjang naratif
            const canUseDirectFaq = !message.isMultiChat && !message.isLongText;
            const jawabanTemplate = canUseDirectFaq ? findBestFaqMatch(text) : null;

            // Jika ada jawaban di template FAQ
            if (jawabanTemplate) {
                userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;
                const senderName = userKnownName[senderPhone] || userKnownName[sender] || senderDetails?.name || '';
                let personalizedFaq = jawabanTemplate;
                if (senderName && personalizedFaq.startsWith('Halo #SahabatBahari,')) {
                    personalizedFaq = personalizedFaq.replace('Halo #SahabatBahari,', `Halo #SahabatBahari Kak ${senderName},`);
                }
                await sendUserMessage(sender, personalizedFaq + getResolutionFooter(text));

                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: personalizedFaq,
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 10. Oper ke Gemini AI (Mendukung Percakapan Natural, Bahasa Inggris, Multi-Chat Synthesis & Analisis Longtext)
            userState[sender] = 'AI_MODE';
            userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;

            // Jika pemohon mengirim karakter acak / tidak jelas (gibberish) yang berulang kali tidak teridentifikasi
            const isGibberish = text.length > 0 && !/[a-zA-Z]{3,}/.test(text) && !/^\d+$/.test(text);
            if (isGibberish && userAiChatCount[sender] >= 5) {
                await connectUserToPetugas({
                    sender,
                    senderDetails,
                    text: message.body,
                    userReply:
                        `Halo #SahabatBahari,\n\n` +
                        `Pertanyaan Anda belum teridentifikasi dalam sistem layanan otomatis kami setelah beberapa kali interaksi.\n\n` +
                        `*Pesan Anda LANGSUNG KAMI HUBUNGKAN KE PETUGAS RESMI PPID KKP* agar dapat dibantu secara personal.\n\n` +
                        `Silakan sampaikan pertanyaan atau kendala Anda secara lebih mendalam. Petugas kami akan segera membalas pesan Anda. 🙏\n\n` +
                        `_(Ketik *0* untuk kembali ke Menu Utama)_`,
                    adminAlertTitle: `👨‍💻 *[ASISTENSI PETUGAS: PERTANYAAN PERLU PENANGANAN MANUAL]*`
                });
                return;
            }

            try {
                const replyText = await generateGroundedAiResponse({
                    sender,
                    senderPhone,
                    messageBody: message.body,
                    text,
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });

                // Request 4: Jika informasi tersebut tidak ada / belum bisa dijawab -> alihkan kepada petugas
                const isUnavailableInfo =
                    replyText.includes('belum bisa kami jawab') ||
                    replyText.includes('kami alihkan kepada petugas') ||
                    replyText.includes('dialihkan kepada petugas');

                if (isUnavailableInfo) {
                    await connectUserToPetugas({
                        sender,
                        senderDetails,
                        text: message.body,
                        userReply: replyText,
                        adminAlertTitle: `👨‍💻 *[ASISTENSI PETUGAS: INFORMASI BELUM TERSEDIA]*`
                    });
                    return;
                }

                await sendUserMessage(sender, replyText + getResolutionFooter(text));

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
                await sendUserMessage(sender, isEnglishQuery(text)
                    ? "Sorry, the AI Assistant is currently experiencing connection issues.\n\nType *0* to return to Main Menu or type *HELP* to connect to an Officer."
                    : "Maaf, Asisten AI sedang mengalami gangguan koneksi.\n\nKetik *0* untuk kembali ke Menu Utama atau ketik *BANTUAN* untuk terhubung ke Petugas.");
            }
            return;
        }
    }
}

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

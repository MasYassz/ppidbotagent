const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const REKAP_FILE = path.join(__dirname, 'rekap_harian.json');
const EXPORT_DIR = path.join(__dirname, 'rekap_export');

// Pastikan direktori export tersedia
if (!fs.existsSync(EXPORT_DIR)) {
    try {
        fs.mkdirSync(EXPORT_DIR, { recursive: true });
    } catch (e) {}
}

// Helper mendapatkan tanggal hari ini dalam format YYYY-MM-DD (WIB)
function getTodayDateWIB() {
    const d = new Date();
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD
}

// Helper mendapatkan tanggal dalam format DD/MM/YYYY
function getDisplayDateWIB() {
    const d = new Date();
    const options = { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' };
    const parts = new Intl.DateTimeFormat('id-ID', options).formatToParts(d);
    const map = {};
    parts.forEach(p => map[p.type] = p.value);
    return `${map.day}/${map.month}/${map.year}`;
}

// Helper jam menit pembuatan WIB (HH:mm WIB)
function getCurrentTimeOnlyWIB() {
    const d = new Date();
    const options = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    const parts = new Intl.DateTimeFormat('id-ID', options).formatToParts(d);
    const map = {};
    parts.forEach(p => map[p.type] = p.value);
    return `${map.hour}:${map.minute} WIB`;
}

// Helper mendapatkan timestamp waktu sekarang (WIB): "DD/MM/YYYY HH:mm WIB"
function getCurrentTimeFormattedWIB() {
    return `${getDisplayDateWIB()} ${getCurrentTimeOnlyWIB()}`;
}

// Bersihkan format WhatsApp: ganti bintang ganda **teks** menjadi *teks*
function cleanWhatsAppFormatting(text) {
    if (!text || typeof text !== 'string') return text;
    let clean = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
    clean = clean.replace(/\*\*/g, '*');
    return clean;
}

// Muat data rekap harian dari file JSON dengan proteksi persistensi & arsip permanen
function loadRekapData() {
    const today = getTodayDateWIB();
    try {
        if (fs.existsSync(REKAP_FILE)) {
            const raw = fs.readFileSync(REKAP_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (data && typeof data === 'object') {
                data.archive = data.archive || {};
                data.records = data.records || {};

                // 1. Jika tanggal file sama dengan hari ini, gunakan langsung (tidak ada reset)
                if (data.date === today) {
                    return data;
                }

                // 2. Jika tanggal file adalah hari sebelumnya (rollover hari baru / restart di hari lain):
                // JANGAN HAPUS data hari sebelumnya! Simpan ke arsip dan export file cadangan harian.
                const prevDate = data.date;
                if (prevDate && Object.keys(data.records).length > 0) {
                    data.archive[prevDate] = data.records;

                    try {
                        if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
                        const backupJsonPath = path.join(EXPORT_DIR, `rekap_harian_${prevDate}.json`);
                        if (!fs.existsSync(backupJsonPath)) {
                            fs.writeFileSync(backupJsonPath, JSON.stringify({ date: prevDate, records: data.records }, null, 2), 'utf8');
                            console.log(`[REKAP PERSISTENCE] Berhasil mencadangkan rekapan ${prevDate} ke ${backupJsonPath}`);
                        }
                    } catch (e) {
                        console.error(`[REKAP PERSISTENCE] Gagal backup arsip harian ${prevDate}:`, e);
                    }
                }

                // Inisialisasi untuk hari baru (pulihkan jika hari ini sudah pernah ada data)
                data.date = today;
                if (data.archive[today] && Object.keys(data.records).length === 0) {
                    data.records = data.archive[today];
                } else if (prevDate !== today) {
                    data.records = {};
                }

                saveRekapData(data);
                return data;
            }
        }
    } catch (err) {
        console.error('Gagal membaca rekap_harian.json:', err);
    }
    const newData = {
        date: today,
        records: {},
        archive: {}
    };
    saveRekapData(newData);
    return newData;
}

// Simpan data rekap harian ke file JSON dengan proteksi arsip
function saveRekapData(data) {
    try {
        if (!data || typeof data !== 'object') return;
        data.records = data.records || {};
        data.archive = data.archive || {};
        fs.writeFileSync(REKAP_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Gagal menyimpan rekap_harian.json:', err);
    }
}

// Normalisasi unit eselon KKP (menjaga format resmi seperti "Setjen / PPID")
function normalizeEselonName(raw) {
    if (!raw) return 'Setjen / PPID';
    const s = raw.trim().toUpperCase();
    if (s.includes('PPID') || s.includes('SETJEN')) return 'Setjen / PPID';
    if (s.includes('PSDKP')) return 'PSDKP';
    if (s.includes('DJPT') || s.includes('TANGKAP')) return 'DJPT';
    if (s.includes('DJPB') || s.includes('BUDIDAYA')) return 'DJPB';
    if (s.includes('PKRL') || s.includes('RUANG LAUT')) return 'PKRL';
    if (s.includes('BPPSDM') || s.includes('PUSLAT') || s.includes('AKP') || s.includes('SDM')) return 'BPPSDM';
    if (s.includes('BPPMHKP') || s.includes('BKIPM') || s.includes('MUTU')) return 'BPPMHKP';
    if (s.includes('PDSPKP') || s.includes('DAYA SAING')) return 'PDSPKP';
    if (s.includes('ITJEN') || s.includes('INSPEKTORAT')) return 'Itjen';
    return raw;
}

// Analisis AI untuk Unit Eselon di KKP dan Kategori (Pengaduan vs Informasi)
async function analyzeChatWithAI(questionText, aiModel) {
    const fallback = determineFallbackCategory(questionText);
    if (!aiModel || !questionText) return fallback;

    try {
        const prompt = `Anda adalah analis informasi di PPID Kementerian Kelautan dan Perikanan (KKP).
Analisis pertanyaan masyarakat berikut:
"${questionText}"

Tentukan:
1. "kategori": Pilih "Informasi" (menanyakan syarat, data, lokasi, kontak, prosedur, pendaftaran, permohonan) ATAU "Pengaduan" (keluhan, laporan masalah, komplain, kritik, kendala sistem/izin, korban/musibah laut).
2. "eselon": Pilih satu unit eselon I KKP yang paling relevan:
   - "Setjen / PPID" (Sekretariat Jenderal: PPID, magang/PKL, permohonan informasi umum, surat resmi, LPSE, LPMUKP/modal)
   - "PSDKP" (Pengawasan: illegal fishing, pencurian ikan, kapal asing ilegal, patroli laut, musibah/hilang di laut)
   - "DJPT" (Perikanan Tangkap: kapal tangkap, SIPI/SIUP, nelayan tangkap, pelabuhan, alat tangkap bubu naga/jaring)
   - "DJPB" (Perikanan Budi Daya: tambak, pakan ikan, benih/bibit ikan, budidaya udang/ikan)
   - "PKRL" (Ruang Laut: izin PKKPRL, konservasi laut, pulau kecil, pesisir, biota dilindungi buaya/penyu)
   - "BPPSDM" (SDM & Diklat: pelatihan Puslat KP, AKP, BST, penyuluh Digiluh, sekolah/kampus KKP, lowongan)
   - "BPPMHKP" (Karantina & Pengendalian Mutu: uji laboratorium BUSKI, sertifikat mutu ikan)
   - "PDSPKP" (Penguatan Daya Saing: pasar ikan, promosi, ekspor/impor hasil laut, bazaar)
   - "Itjen" (Inspektorat Jenderal: pengawasan internal pegawai, gratifikasi, wbs)
3. "pertanyaanInti": Ringkas inti pertanyaan dalam maksimal 1 kalimat lugas (hilangkan kata sapaan/basa-basi).

Keluarkan HANYA JSON valid tanpa blok markdown:
{"kategori":"...","eselon":"...","pertanyaanInti":"..."}`;

        const result = await aiModel.generateContent(prompt);
        let respText = result.response.text().trim();
        respText = respText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(respText);

        return {
            kategori: parsed.kategori === 'Pengaduan' ? 'Pengaduan' : 'Informasi',
            eselon: normalizeEselonName(parsed.eselon || fallback.eselon),
            pertanyaanInti: parsed.pertanyaanInti || questionText
        };
    } catch (err) {
        return fallback;
    }
}

// Fallback pencocokan kategori & eselon berbasis kata kunci jika API Gemini bermasalah
function determineFallbackCategory(text) {
    const t = (text || '').toLowerCase();

    // Kategori
    let kategori = 'Informasi';
    const pengaduanKeywords = ['keluhan', 'kecewa', 'rugi', 'lambat', 'rusak', 'salah', 'tidak bisa', 'gagal', 'lapor', 'aduan', 'komplain', 'penipuan', 'surat palsu', 'pemalsuan', 'palsu', 'bodong', 'fiktif', 'kendala', 'hilang', 'musibah', 'tenggelam', 'tolong'];
    if (pengaduanKeywords.some(k => t.includes(k))) {
        kategori = 'Pengaduan';
    }

    // Unit Eselon I KKP
    let eselon = 'Setjen / PPID';
    if (t.includes('surat palsu') || t.includes('pemalsuan') || t.includes('palsu') || t.includes('bodong') || t.includes('fiktif') || t.includes('keaslian') || t.includes('keabsahan') || t.includes('gratifikasi') || t.includes('pungli') || t.includes('wbs')) {
        eselon = 'Itjen';
    } else if (t.includes('hilang') || t.includes('tenggelam') || t.includes('illegal') || t.includes('pencurian ikan') || t.includes('patroli') || t.includes('tangkap liar') || t.includes('psdkp') || t.includes('bom')) {
        eselon = 'PSDKP';
    } else if (t.includes('pkkprl') || t.includes('ruang laut') || t.includes('pesisir') || t.includes('buaya') || t.includes('penyu') || t.includes('konservasi') || t.includes('bcl') || t.includes('bulan cinta laut') || t.includes('garam')) {
        eselon = 'PKRL';
    } else if (t.includes('pelatihan') || t.includes('puslat') || t.includes('akp') || t.includes('bst') || t.includes('diklat') || t.includes('absen') || t.includes('penyuluh') || t.includes('digiluh') || t.includes('sdmkp') || t.includes('e-laut')) {
        eselon = 'BPPSDM';
    } else if (t.includes('kapal') || t.includes('sipi') || t.includes('siup') || t.includes('tangkap') || t.includes('pelabuhan') || t.includes('bubu') || t.includes('knmp') || t.includes('nelayan') || t.includes('sicefi') || t.includes('skkp')) {
        eselon = 'DJPT';
    } else if (t.includes('budidaya') || t.includes('tambak') || t.includes('benih') || t.includes('bibit') || t.includes('pakan') || t.includes('pantura') || t.includes('nila salin') || t.includes('bioflok')) {
        eselon = 'DJPB';
    } else if (t.includes('mutu') || t.includes('lab') || t.includes('buski') || t.includes('karantina') || t.includes('bppmhkp')) {
        eselon = 'BPPMHKP';
    } else if (t.includes('ekspor') || t.includes('impor') || t.includes('pasar') || t.includes('bazar') || t.includes('promosi') || t.includes('neraca')) {
        eselon = 'PDSPKP';
    } else if (t.includes('lpmukp') || t.includes('modal') || t.includes('pinjaman') || t.includes('lpse') || t.includes('lelang') || t.includes('ukpbj') || t.includes('magang') || t.includes('ppid') || t.includes('surat') || t.includes('pkpn') || t.includes('ekonomi biru')) {
        eselon = 'Setjen / PPID';
    }

    return {
        kategori,
        eselon,
        pertanyaanInti: text
    };
}

// Cek apakah pesan merupakan chat inti (bukan sapaan / bukan menu navigasi / bukan ucapan terima kasih pemohon)
function isSubstantialQuestion(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.trim().toLowerCase();

    // Menu navigasi tunggal & opsi tertutup
    const menuCommands = [
        '1', '2', '3', '4', '5', '6', '0', 'menu', 'kembali', 'selesai', 'akhiri', 'daftar', '/daftar',
        'ya', 'tidak', 'sudah', 'cukup', 'oke', 'ok', 'batal',
        'a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'c5', 'd1', 'd2', 'd3', 'd4', 'd5'
    ];
    if (menuCommands.includes(t)) return false;

    // Perintah admin
    if (t.startsWith('/help') || t.startsWith('/selesai') || t.startsWith('/rekap') || t.startsWith('/add') || t.startsWith('/list_tiket') || t.startsWith('/update_tiket') || t.startsWith('/ikm')) return false;

    // Sapaan pendek
    const greetings = ['halo', 'hai', 'p', 'assalamualaikum', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'info', 'help', 'tes', 'test'];
    if (greetings.includes(t)) return false;

    // Jika teks hanya berupa ucapan terima kasih / konfirmasi / basa-basi penutup pemohon
    const cleaned = t.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const commonAckWords = [
        'terima', 'kasih', 'terimakasih', 'makasih', 'tq', 'thanks', 'thank', 'you', 'suwun', 'nuhun',
        'sama', 'kembali', 'banyak', 'infonya', 'info', 'kak', 'bang', 'pak', 'bu', 'mas', 'mba', 'min', 'admin',
        'oh', 'ohh', 'ohhh', 'gitu', 'begitu', 'ya', 'yaa', 'yaaa', 'baik', 'kalau', 'kalo', 'seperti', 'itu',
        'siap', 'oke', 'ok', 'noted', 'paham', 'mengerti', 'iya', 'y', 'okey', 'mantap'
    ];
    const words = cleaned.split(' ').filter(Boolean);
    if (words.length > 0 && words.length <= 10) {
        const allAck = words.every(w => commonAckWords.includes(w));
        if (allAck) return false;
    }

    if (t.length < 3) return false;

    return true;
}

// Cek apakah pesan dari petugas hanya berupa basa-basi penutup, sapaan, atau penahanan sementara
function isCourtesyOrFillerReply(text) {
    if (!text || typeof text !== 'string') return true;
    const t = text.trim().toLowerCase();

    const courtesyPatterns = [
        /^(sama[\s-]*sama|terima\s*kasih|terimakasih|makasih|tq|thanks)(\s+(ya|kak|bang|pak|bu|mas|mba|sahabat(\s*bahari)?))*[\s.!,]*$/i,
        /^(terima\s*kasih\s*kembali|kembali\s*kasih)(\s+(ya|kak|bang|pak|bu|mas|mba))*[\s.!,]*$/i,
        /^(salam(\s+hangat|\s+hormat)?|salam\s+bahari)[\s.!,]*$/i,
        /^(selamat\s+(pagi|siang|sore|malam|beraktivitas|bertugas|istirahat))[\s.!,]*$/i,
        /^(semoga\s+(membantu|sehat|bermanfaat|sukses|lekas\s+selesai|lekas\s+ketemu))[\s.!,]*$/i,
        /^(baik|siap|oke|ok|noted|siap\s*laksanakan)(\s+(ya|kak|bang|pak|bu|mas|mba|min))*[\s.!,]*$/i,
        /^(mohon\s+ditunggu|tunggu\s+sebentar|sebentar\s+ya|ditunggu\s+ya|sedang\s+kami\s+cek)(\s+(kak|bang|pak|bu|mas|mba))*[\s.!,]*$/i,
        /^(halo|hai|p)[\s.!,]*$/i
    ];
    if (courtesyPatterns.some(pattern => pattern.test(t))) return true;

    // Bersihkan tanda baca
    const cleaned = t.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const commonClosingWords = [
        'sama', 'terima', 'kasih', 'terimakasih', 'makasih', 'kak', 'pak', 'bu', 'mas', 'mba',
        'salam', 'hormat', 'kembali', 'siap', 'baik', 'oke', 'ok', 'ya', 'semoga', 'membantu',
        'sehat', 'selalu', 'dan', 'mohon', 'ditunggu', 'tunggu', 'sebentar', 'sedang', 'kami', 'cek', 'dulu'
    ];
    const words = cleaned.split(' ').filter(Boolean);
    if (words.length > 0 && words.length <= 8) {
        const allClosing = words.every(w => commonClosingWords.includes(w));
        if (allClosing) return true;
    }
    return false;
}

// Bersihkan basa-basi pembuka dan penutup dari pesan substantif
function cleanCourtesyFluff(text) {
    if (!text || typeof text !== 'string') return text;
    let s = text.trim();
    // Hapus sapaan pembuka
    s = s.replace(/^(halo|hai|selamat\s+(pagi|siang|sore|malam)|assalamualaikum)\s*(kak|bang|pak|bu|mas|mba|sahabat\s*bahari)?[,!\s-]*/i, '');
    // Hapus penutup basa-basi di akhir pesan jika didahului informasi substantif
    s = s.replace(/[\n\r\s]*(sama[\s-]*sama|terima\s*kasih|terimakasih|salam\s+hormat|salam|semoga\s+membantu).*$/i, '');
    return s.trim() || text.trim();
}

// Sintesis jawaban inti petugas (mempertahankan jawaban substantif dan menolak penimpaan oleh basa-basi penutup)
async function synthesizeHumanAnswer({ existingAnswer, newReply, questionText, aiModel }) {
    const cleanNew = cleanWhatsAppFormatting(newReply).trim();

    // 1. Jika balasan baru HANYA berupa basa-basi penutup (misal: "Sama-sama kak, salam hormat")
    if (isCourtesyOrFillerReply(cleanNew)) {
        if (existingAnswer && existingAnswer !== 'Menunggu respon petugas...' && !isCourtesyOrFillerReply(existingAnswer)) {
            console.log(`[REKAP] Balasan petugas berupa basa-basi penutup ("${cleanNew.replace(/\n/g, ' ')}"). Jawaban inti substantif sebelumnya tetap dipertahankan.`);
            return existingAnswer;
        }
        return cleanNew;
    }

    // 2. Jika balasan baru merupakan jawaban substantif
    const coreNew = cleanCourtesyFluff(cleanNew);

    // Jika sebelumnya belum ada jawaban substantif (masih kosong, masih pending, atau berupa penahanan sementara)
    if (!existingAnswer || existingAnswer === 'Menunggu respon petugas...' || isCourtesyOrFillerReply(existingAnswer)) {
        return coreNew;
    }

    // Jika pesan baru sudah tercakup dalam jawaban sebelumnya
    if (existingAnswer.toLowerCase().includes(coreNew.toLowerCase())) {
        return existingAnswer;
    }

    // 3. Jika ada beberapa pesan substantif dari petugas (misal menjawab beberapa poin pertanyaan)
    // Gunakan AI Gemini untuk merangkum menjadi 1 jawaban inti padat (<= 40 kata) jika tersedia
    if (aiModel) {
        try {
            const prompt = `Anda adalah asisten rekapitulasi PPID Kementerian Kelautan dan Perikanan (KKP).
Tugas Anda adalah merangkum JAWABAN INTI dari pesan-pesan yang dikirim oleh Petugas Helpdesk (Manusia).

Pertanyaan Pemohon:
"${questionText || '-'}"

Jawaban Petugas Sebelumnya:
"${existingAnswer}"

Pesan Tambahan Petugas Baru:
"${coreNew}"

Instruksi:
1. Rangkum inti jawaban resmi/solusi dari petugas secara padat dan akurat.
2. JANGAN PERNAH menyertakan sapaan (Halo kak, dll) atau penutup basa-basi (Sama-sama, Salam hormat, dll).
3. Maksimal 40 kata, bahasa Indonesia yang baku, santun, dan langsung pada inti informasi.

Keluarkan HANYA teks ringkasan jawaban inti bersih tanpa tanda kutip.`;

            const res = await aiModel.generateContent(prompt);
            const synthesized = cleanWhatsAppFormatting(res.response.text().trim().replace(/^["']|["']$/g, ''));
            if (synthesized && synthesized.length > 5) {
                return synthesized;
            }
        } catch (e) {
            console.error("Gagal mensintesis jawaban dengan AI:", e);
        }
    }

    // Fallback penggabungan tanpa AI
    return `${existingAnswer}\n• ${coreNew}`;
}

// Jendela inaktivitas maksimal untuk satu sesi aktif (30 menit)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Cari record sesi aktif pemohon berdasarkan nomor HP
function findActiveUserRecord(rekapData, cleanPhone) {
    if (!rekapData || !rekapData.records || !cleanPhone) return null;
    const now = Date.now();
    const records = Object.values(rekapData.records);

    // Filter record yang sesuai nomor HP pemohon
    const userRecords = records.filter(r => {
        const rClean = (r.cleanPhone || (r.phone ? r.phone.replace(/\D/g, '') : '')).toString();
        return rClean === cleanPhone || (r.id && r.id.startsWith(cleanPhone));
    });

    if (userRecords.length === 0) return null;

    // Urutkan dari yang paling baru
    userRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const latest = userRecords[0];

    // Jika sesi ini telah ditutup secara eksplisit (misal user ketik 'ya' / 'selesai' / admin ketik '/selesai')
    if (latest.isClosed === true) {
        return null;
    }

    // Jika sesi masih Pending (menunggu respon petugas), sesi tetap aktif
    if ((latest.status || '').toLowerCase() === 'pending') {
        return latest;
    }

    // Jika sesi masih dalam batas jeda waktu inaktivitas 30 menit
    const lastTime = latest.timestamp || 0;
    if (now - lastTime < SESSION_TIMEOUT_MS) {
        return latest;
    }

    // Lewat dari 30 menit tanpa aktivitas, sesi lama otomatis ditutup
    latest.isClosed = true;
    return null;
}

// Menutup sesi percakapan pemohon secara eksplisit (sehingga chat berikutnya menjadi sesi baru)
function closeUserSession(phone) {
    if (!phone) return;
    const cleanPhone = phone.toString().replace(/\D/g, '');
    if (!cleanPhone) return;

    try {
        const rekapData = loadRekapData();
        const activeRecord = findActiveUserRecord(rekapData, cleanPhone);
        if (activeRecord) {
            activeRecord.isClosed = true;
            activeRecord.closedAt = Date.now();
            saveRekapData(rekapData);
            console.log(`[SESSION] Sesi percakapan ${cleanPhone} (${activeRecord.id}) berhasil ditutup.`);
        }
    } catch (err) {
        console.error('[SESSION] Gagal menutup sesi pemohon:', err);
    }
}

// Catat atau perbarui rekapan percakapan harian (Mendukung banyak sesi terpisah per nomor dalam 1 hari)
async function recordConversation({ phone, text, answer, source, aiModel, status = 'Done' }) {
    if (!phone) return;
    const cleanPhone = phone.toString().replace(/\D/g, '');
    if (!cleanPhone) return;
    const formattedPhone = cleanPhone.startsWith('62') ? `+${cleanPhone}` : `+62${cleanPhone.replace(/^0/, '')}`;

    const rekapData = loadRekapData();
    const finalStatus = status.toLowerCase() === 'pending' ? 'Pending' : 'Done';
    const now = Date.now();

    // 1. Jika balasan berasal dari petugas manusia (Live Chat Admin)
    if (source === 'MANUSIA') {
        let targetRecord = findActiveUserRecord(rekapData, cleanPhone);

        // Jika tidak ketemu berdasarkan cleanPhone (misal sender adalah LID atau nomor admin),
        // cari record yang sedang 'Pending' (karena admin sedang membalas pemohon yang menunggu)
        if (!targetRecord) {
            const allRecords = Object.values(rekapData.records);
            targetRecord = allRecords.find(r => (r.status || '').toLowerCase() === 'pending');
        }

        if (targetRecord) {
            const currentAnswer = targetRecord.jawaban || '';
            const finalAnswer = await synthesizeHumanAnswer({
                existingAnswer: currentAnswer,
                newReply: answer,
                questionText: targetRecord.pertanyaan,
                aiModel
            });

            targetRecord.jawaban = finalAnswer;
            targetRecord.sumberJawaban = 'MANUSIA';
            targetRecord.status = 'Done';
            targetRecord.waktu = getCurrentTimeFormattedWIB();
            targetRecord.timestamp = now;
        } else {
            // Hanya buat baris baru jika bukan nomor LID (nomor HP valid biasanya dimulai 62 atau 08)
            const isLid = cleanPhone.length > 13 && !cleanPhone.startsWith('628') && !cleanPhone.startsWith('08');
            if (!isLid) {
                const initialAnswer = cleanCourtesyFluff(cleanWhatsAppFormatting(answer));
                const allUserRecords = Object.values(rekapData.records).filter(r => {
                    const rClean = (r.cleanPhone || (r.phone ? r.phone.replace(/\D/g, '') : '')).toString();
                    return rClean === cleanPhone || (r.id && r.id.startsWith(cleanPhone));
                });
                const sessionIndex = allUserRecords.length + 1;
                const recordId = `${cleanPhone}_${sessionIndex}`;

                rekapData.records[recordId] = {
                    id: recordId,
                    sessionIndex,
                    cleanPhone,
                    phone: formattedPhone,
                    waktu: getCurrentTimeFormattedWIB(),
                    timestamp: now,
                    kanal: 'WhatsApp',
                    pertanyaan: cleanWhatsAppFormatting(text || '[Konsultasi Langsung dengan Petugas]'),
                    eselon: 'Setjen / PPID',
                    jawaban: initialAnswer,
                    sumberJawaban: 'MANUSIA',
                    status: 'Done',
                    kategori: 'Informasi',
                    isClosed: false
                };
            }
        }
        saveRekapData(rekapData);
        return;
    }

    // 2. Jika pesan pemohon diteruskan ke live chat petugas tapi belum dibalas (Pending)
    if (finalStatus === 'Pending') {
        if (!isSubstantialQuestion(text)) {
            return;
        }

        const analysis = await analyzeChatWithAI(text, aiModel);
        const newQuestion = cleanWhatsAppFormatting(analysis.pertanyaanInti || text);

        let activeRecord = findActiveUserRecord(rekapData, cleanPhone);

        if (activeRecord) {
            // Gabungkan pertanyaan jika nomor yang sama menanyakan hal baru dalam sesi aktif ini
            if (!activeRecord.pertanyaan.toLowerCase().includes(newQuestion.toLowerCase())) {
                activeRecord.pertanyaan = `${activeRecord.pertanyaan}\n• ${newQuestion}`;
            }
            activeRecord.eselon = analysis.eselon;
            activeRecord.kategori = analysis.kategori;
            activeRecord.waktu = getCurrentTimeFormattedWIB();
            activeRecord.timestamp = now;

            if (activeRecord.sumberJawaban !== 'MANUSIA') {
                activeRecord.status = 'Pending';
                activeRecord.jawaban = 'Menunggu respon petugas...';
                activeRecord.sumberJawaban = 'BELUM DIJAWAB';
            }
        } else {
            // Buat baris sesi baru terpisah
            const allUserRecords = Object.values(rekapData.records).filter(r => {
                const rClean = (r.cleanPhone || (r.phone ? r.phone.replace(/\D/g, '') : '')).toString();
                return rClean === cleanPhone || (r.id && r.id.startsWith(cleanPhone));
            });
            const sessionIndex = allUserRecords.length + 1;
            const recordId = `${cleanPhone}_${sessionIndex}`;

            rekapData.records[recordId] = {
                id: recordId,
                sessionIndex,
                cleanPhone,
                phone: formattedPhone,
                waktu: getCurrentTimeFormattedWIB(),
                timestamp: now,
                kanal: 'WhatsApp',
                pertanyaan: newQuestion,
                eselon: analysis.eselon,
                jawaban: 'Menunggu respon petugas...',
                sumberJawaban: 'BELUM DIJAWAB',
                status: 'Pending',
                kategori: analysis.kategori,
                isClosed: false
            };
        }
        saveRekapData(rekapData);
        return;
    }

    // 3. Jika dijawab oleh Bot (FAQ atau AI)
    if (isSubstantialQuestion(text)) {
        const analysis = await analyzeChatWithAI(text, aiModel);
        const newQuestion = cleanWhatsAppFormatting(analysis.pertanyaanInti || text);
        const cleanAnswer = cleanWhatsAppFormatting(answer);

        let activeRecord = findActiveUserRecord(rekapData, cleanPhone);

        if (activeRecord) {
            // Gabungkan pertanyaan jika masih dalam sesi yang sama
            if (!activeRecord.pertanyaan.toLowerCase().includes(newQuestion.toLowerCase())) {
                activeRecord.pertanyaan = `${activeRecord.pertanyaan}\n• ${newQuestion}`;
            }
            activeRecord.eselon = analysis.eselon;
            activeRecord.kategori = analysis.kategori;
            activeRecord.waktu = getCurrentTimeFormattedWIB();
            activeRecord.timestamp = now;

            if (activeRecord.sumberJawaban !== 'MANUSIA') {
                activeRecord.jawaban = cleanAnswer;
                activeRecord.sumberJawaban = 'BOT';
                activeRecord.status = 'Done';
            }
        } else {
            // Sesi baru terpisah untuk nomor ini!
            const allUserRecords = Object.values(rekapData.records).filter(r => {
                const rClean = (r.cleanPhone || (r.phone ? r.phone.replace(/\D/g, '') : '')).toString();
                return rClean === cleanPhone || (r.id && r.id.startsWith(cleanPhone));
            });
            const sessionIndex = allUserRecords.length + 1;
            const recordId = `${cleanPhone}_${sessionIndex}`;

            rekapData.records[recordId] = {
                id: recordId,
                sessionIndex,
                cleanPhone,
                phone: formattedPhone,
                waktu: getCurrentTimeFormattedWIB(),
                timestamp: now,
                kanal: 'WhatsApp',
                pertanyaan: newQuestion,
                eselon: analysis.eselon,
                jawaban: cleanAnswer,
                sumberJawaban: 'BOT',
                status: 'Done',
                kategori: analysis.kategori,
                isClosed: false
            };
        }
        saveRekapData(rekapData);
    }
}

// Generate file Excel & CSV dengan format presisi sesuai template pengguna
async function generateExcelRecap(customDateStr = null) {
    const rekapData = loadRekapData();
    const dateLabel = customDateStr || rekapData.date || getTodayDateWIB();
    const displayDate = getDisplayDateWIB();
    const currentTimeWIB = getCurrentTimeOnlyWIB();
    let recordsArray = Object.values(rekapData.records || {});

    // Jika customDateStr disediakan dan berbeda dari tanggal aktif saat ini, ambil dari arsip
    if (customDateStr && customDateStr !== rekapData.date) {
        if (rekapData.archive && rekapData.archive[customDateStr]) {
            recordsArray = Object.values(rekapData.archive[customDateStr]);
        } else {
            const archiveFile = path.join(EXPORT_DIR, `rekap_harian_${customDateStr}.json`);
            if (fs.existsSync(archiveFile)) {
                try {
                    const parsed = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));
                    recordsArray = Object.values(parsed.records || {});
                } catch (e) {}
            }
        }
    }

    // Urutkan secara kronologis berdasarkan timestamp
    recordsArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Inisialisasi ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PPID Bot Agent KKP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Rekap Layanan PPID', {
        views: [{ showGridLines: true }]
    });

    // Atur Lebar Kolom (A sampai J)
    sheet.columns = [
        { key: 'no', width: 6 },
        { key: 'waktu', width: 22 },
        { key: 'kanal', width: 15 },
        { key: 'phone', width: 18 },
        { key: 'pertanyaan', width: 38 },
        { key: 'eselon', width: 22 },
        { key: 'kategori', width: 15 },
        { key: 'jawaban', width: 45 },
        { key: 'penjawab', width: 18 },
        { key: 'status', width: 14 }
    ];

    // ==========================================
    // BARIS 1: JUDUL BANNER BESAR (A1:J1)
    // ==========================================
    sheet.mergeCells('A1:J1');
    const r1 = sheet.getCell('A1');
    r1.value = 'REKAPITULASI PERCAKAPAN WHATSAPP LAYANAN PPID KKP';
    r1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2540' } }; // Navy KKP
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 36;

    // ==========================================
    // BARIS 2: SUBTITLE METADATA (A2:J2)
    // ==========================================
    sheet.mergeCells('A2:J2');
    const r2 = sheet.getCell('A2');
    r2.value = `Tanggal Laporan: ${displayDate} | Waktu Pembuatan: ${currentTimeWIB} | Kanal: WhatsApp Resmi PPID KKP`;
    r2.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF334155' } };
    r2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 22;

    // BARIS 3: Spacer kosong
    sheet.getRow(3).height = 12;

    // ==========================================
    // BARIS 4: HEADER TABEL RESMI
    // ==========================================
    const headers = [
        'No',
        'Tanggal & Waktu',
        'Kanal Medsos',
        'Nomor Telepon',
        'Pertanyaan Pemilik Nomor',
        'Analisis Eselon I KKP',
        'Kategori',
        'Jawaban',
        'Penjawab',
        'Status'
    ];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2540' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FF94A3B8' } },
            bottom: { style: 'medium', color: { argb: 'FF0284C7' } },
            right: { style: 'thin', color: { argb: 'FF94A3B8' } }
        };
    });

    // ==========================================
    // BARIS 5+: DATA PERCAKAPAN
    // ==========================================
    let currentRow = 5;
    recordsArray.forEach((rec, idx) => {
        const isPending = (rec.status || '').toLowerCase() === 'pending';
        const isHuman = rec.sumberJawaban === 'MANUSIA';

        const penjawabText = isHuman ? 'Petugas (Manusia)' : (isPending ? '-' : 'Bot');
        const statusText = isPending ? 'Pending' : 'Done';
        const jawabanText = isPending ? 'Menunggu respon petugas...' : (rec.jawaban || '');

        const row = sheet.getRow(currentRow);
        row.values = [
            idx + 1,
            rec.waktu || '',
            rec.kanal || 'WhatsApp',
            rec.phone || '',
            rec.pertanyaan || '',
            rec.eselon || 'Setjen / PPID',
            rec.kategori || 'Informasi',
            jawabanText,
            penjawabText,
            statusText
        ];

        row.height = 38;

        const isEven = idx % 2 === 0;
        row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF0F172A' } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };

            // Zebra background
            if (!isEven) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }

            // Alignment
            if ([1, 2, 3, 4, 6, 7, 9, 10].includes(colNumber)) {
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            }

            // Styling Kolom Penjawab (Col 9)
            if (colNumber === 9) {
                if (isHuman) {
                    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0284C7' } }; // Blue
                } else if (isPending) {
                    cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF94A3B8' } }; // Gray
                }
            }

            // Styling Kolom Status (Col 10)
            if (colNumber === 10) {
                if (statusText === 'Done') {
                    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF15803D' } }; // Green
                } else {
                    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFD97706' } }; // Amber
                }
            }
        });

        currentRow++;
    });

    // Baris spacer kosong setelah tabel data
    sheet.getRow(currentRow).height = 16;
    currentRow++;

    // ==========================================
    // BAGIAN BAWAH: RINGKASAN STATISTIK HARIAN
    // ==========================================
    const totalPertanyaan = recordsArray.length;
    const totalInformasi = recordsArray.filter(r => (r.kategori || '').toLowerCase() === 'informasi').length;
    const totalPengaduan = recordsArray.filter(r => (r.kategori || '').toLowerCase() === 'pengaduan').length;
    const totalDone = recordsArray.filter(r => (r.status || '').toLowerCase() === 'done').length;
    const totalPending = recordsArray.filter(r => (r.status || '').toLowerCase() === 'pending').length;
    const totalManusia = recordsArray.filter(r => r.sumberJawaban === 'MANUSIA').length;
    const totalBot = recordsArray.filter(r => r.sumberJawaban !== 'MANUSIA' && (r.status || '').toLowerCase() === 'done').length;

    // Header Statistik (Merged Col B dan C)
    sheet.mergeCells(currentRow, 2, currentRow, 3);
    const statHeader = sheet.getCell(currentRow, 2);
    statHeader.value = 'RINGKASAN STATISTIK HARIAN';
    statHeader.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    statHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2540' } };
    statHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(currentRow).height = 24;
    currentRow++;

    const statsList = [
        { label: 'Total Pertanyaan Inti:', value: totalPertanyaan },
        { label: 'Kategori Informasi:', value: totalInformasi },
        { label: 'Kategori Pengaduan:', value: totalPengaduan },
        { label: 'Status Selesai (Done):', value: totalDone },
        { label: 'Status Pending (Belum Terjawab):', value: totalPending },
        { label: 'Dijawab Oleh Petugas (Manusia):', value: totalManusia },
        { label: 'Dijawab Oleh Bot AI / FAQ:', value: totalBot }
    ];

    statsList.forEach(st => {
        const row = sheet.getRow(currentRow);
        row.height = 20;

        const cellLabel = sheet.getCell(currentRow, 2); // Kolom B
        cellLabel.value = st.label;
        cellLabel.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
        cellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cellLabel.alignment = { vertical: 'middle', horizontal: 'left' };
        cellLabel.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        const cellVal = sheet.getCell(currentRow, 3); // Kolom C
        cellVal.value = st.value;
        cellVal.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0284C7' } };
        cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cellVal.alignment = { vertical: 'middle', horizontal: 'center' };
        cellVal.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        currentRow++;
    });

    const excelFileName = `Rekap_PPID_${dateLabel}.xlsx`;
    const excelOutputPath = path.join(EXPORT_DIR, excelFileName);
    await workbook.xlsx.writeFile(excelOutputPath);

    // Selain Excel, kita juga buatkan file CSV pendamping dengan isi yang identik
    const csvFileName = `Rekap_PPID_${dateLabel}.csv`;
    const csvOutputPath = path.join(EXPORT_DIR, csvFileName);
    let csvContent = `REKAPITULASI PERCAKAPAN WHATSAPP LAYANAN PPID KKP,,,,,,,,,\n`;
    csvContent += `Tanggal Laporan: ${displayDate} | Waktu Pembuatan: ${currentTimeWIB} | Kanal: WhatsApp Resmi PPID KKP,,,,,,,,,\n`;
    csvContent += `,,,,,,,,,\n`;
    csvContent += `No,Tanggal & Waktu,Kanal Medsos,Nomor Telepon,Pertanyaan Pemilik Nomor,Analisis Eselon I KKP,Kategori,Jawaban,Penjawab,Status\n`;

    recordsArray.forEach((r, idx) => {
        const isP = (r.status || '').toLowerCase() === 'pending';
        const isH = r.sumberJawaban === 'MANUSIA';
        const pTxt = isH ? 'Petugas (Manusia)' : (isP ? '-' : 'Bot');
        const sTxt = isP ? 'Pending' : 'Done';
        const jTxt = isP ? 'Menunggu respon petugas...' : (r.jawaban || '');

        const escapeCsv = (str) => {
            if (!str) return '""';
            const s = str.toString().replace(/"/g, '""');
            return `"${s}"`;
        };

        csvContent += `${idx + 1},${escapeCsv(r.waktu)},${escapeCsv(r.kanal || 'WhatsApp')},${escapeCsv(r.phone)},${escapeCsv(r.pertanyaan)},${escapeCsv(r.eselon || 'Setjen / PPID')},${escapeCsv(r.kategori || 'Informasi')},${escapeCsv(jTxt)},${escapeCsv(pTxt)},${escapeCsv(sTxt)}\n`;
    });

    csvContent += `,,,,,,,,,\n`;
    csvContent += `,RINGKASAN STATISTIK HARIAN,,,,,,,,\n`;
    csvContent += `,Total Pertanyaan Inti:,${totalPertanyaan},,,,,,,;\n`.replace(';','');
    csvContent += `,Kategori Informasi:,${totalInformasi},,,,,,,;\n`.replace(';','');
    csvContent += `,Kategori Pengaduan:,${totalPengaduan},,,,,,,;\n`.replace(';','');
    csvContent += `,Status Selesai (Done):,${totalDone},,,,,,,;\n`.replace(';','');
    csvContent += `,Status Pending (Belum Terjawab):,${totalPending},,,,,,,;\n`.replace(';','');
    csvContent += `,Dijawab Oleh Petugas (Manusia):,${totalManusia},,,,,,,;\n`.replace(';','');
    csvContent += `,Dijawab Oleh Bot AI / FAQ:,${totalBot},,,,,,,;\n`.replace(';','');

    try {
        fs.writeFileSync(csvOutputPath, csvContent, 'utf8');
    } catch (e) {}

    return {
        filePath: excelOutputPath,
        csvPath: csvOutputPath,
        fileName: excelFileName,
        totalRecords: totalPertanyaan,
        totalInformasi,
        totalPengaduan,
        totalDone,
        totalPending,
        totalManusia,
        totalBot,
        records: recordsArray
    };
}

// Reset data rekapan harian dengan pengarsipan aman (tidak pernah menghapus data secara permanen)
function resetDailyRecords() {
    const rekapData = loadRekapData();
    const curDate = rekapData.date || getTodayDateWIB();
    if (rekapData.records && Object.keys(rekapData.records).length > 0) {
        if (!rekapData.archive) rekapData.archive = {};
        rekapData.archive[curDate] = { ...rekapData.records };
        try {
            if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
            const backupPath = path.join(EXPORT_DIR, `rekap_harian_${curDate}.json`);
            fs.writeFileSync(backupPath, JSON.stringify({ date: curDate, records: rekapData.records }, null, 2), 'utf8');
        } catch (e) {}
    }
    rekapData.records = {};
    saveRekapData(rekapData);
    console.log(`[REKAP] Data rekapan harian untuk ${curDate} telah diarsipkan dan dibersihkan.`);
}

module.exports = {
    getTodayDateWIB,
    getDisplayDateWIB,
    getCurrentTimeOnlyWIB,
    getCurrentTimeFormattedWIB,
    cleanWhatsAppFormatting,
    loadRekapData,
    saveRekapData,
    normalizeEselonName,
    analyzeChatWithAI,
    determineFallbackCategory,
    isSubstantialQuestion,
    isCourtesyOrFillerReply,
    cleanCourtesyFluff,
    synthesizeHumanAnswer,
    findActiveUserRecord,
    closeUserSession,
    recordConversation,
    generateExcelRecap,
    resetDailyRecords
};

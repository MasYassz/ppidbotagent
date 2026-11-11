const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const TIKET_FILE = path.join(DATA_DIR, 'tiket_ppid.json');
const IKM_FILE = path.join(DATA_DIR, 'ikm_survey.json');

// Pastikan direktori data tersedia
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {}
}

// Helper mendapatkan tanggal hari ini format DD/MM/YYYY
function getDisplayDateWIB(dateObj = new Date()) {
    const options = { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' };
    const parts = new Intl.DateTimeFormat('id-ID', options).formatToParts(dateObj);
    const map = {};
    parts.forEach(p => map[p.type] = p.value);
    return `${map.day}/${map.month}/${map.year}`;
}

// Helper menghitung estimasi 10 hari kerja (UU KIP No. 14 Tahun 2008)
function calculateWorkDaysDeadline(startDate = new Date(), workDays = 10) {
    let current = new Date(startDate.getTime());
    let added = 0;
    while (added < workDays) {
        current.setDate(current.getDate() + 1);
        const day = current.getDay();
        // Skip Sabtu (6) dan Minggu (0)
        if (day !== 0 && day !== 6) {
            added++;
        }
    }
    return getDisplayDateWIB(current);
}

// Inisialisasi data sampel tiket PPID jika file belum ada
function initTiketDatabase() {
    if (!fs.existsSync(TIKET_FILE)) {
        const seedData = [
            {
                noTiket: "PPID-2026-001",
                namaPemohon: "Budi Santoso",
                nik: "3171012345670001",
                noHp: "+628111146141",
                email: "budi.santoso@example.com",
                rincianInformasi: "Data alokasi kuota penangkapan ikan terukur WPPNRI 711 tahun 2025-2026",
                tujuan: "Kajian Akademik dan Penelitian Tesis",
                eselon: "DJPT",
                status: "Dalam Proses Telaah",
                tanggalDaftar: "02/11/2026",
                estimasiSelesai: "16/11/2026",
                keterangan: "Berkas KTP dan formulir terverifikasi lengkap. Saat ini dalam proses validasi teknis oleh tim Ditjen Perikanan Tangkap.",
                dokumenUnduh: ""
            },
            {
                noTiket: "PPID-2026-002",
                namaPemohon: "Siti Rahmawati",
                nik: "3275029876540003",
                noHp: "+628123456789",
                email: "siti.rahma@example.com",
                rincianInformasi: "Jadwal dan kuota penerimaan peserta pelatihan BST Puslat KP",
                tujuan: "Pendaftaran Sertifikasi Pelaut Perikanan",
                eselon: "BPPSDM",
                status: "Selesai",
                tanggalDaftar: "25/10/2026",
                estimasiSelesai: "07/11/2026",
                keterangan: "Permohonan telah disetujui. Dokumen jadwal dan panduan resmi dapat diunduh pada tautan berikut.",
                dokumenUnduh: "https://elaut-bppsdm.kkp.go.id/akp/#contact"
            },
            {
                noTiket: "PPID-2026-003",
                namaPemohon: "Ricky Hendrawan",
                nik: "3172031207900005",
                noHp: "+628111146141",
                email: "ricky.h@example.com",
                rincianInformasi: "Data keberangkatan kapal nelayan dari Muara Angke tanggal 2 Juli 2026",
                tujuan: "Konfirmasi Keberangkatan Keluarga Nelayan",
                eselon: "Setjen / PPID",
                status: "Dalam Proses Telaah",
                tanggalDaftar: "04/11/2026",
                estimasiSelesai: "18/11/2026",
                keterangan: "Permohonan diteruskan ke Syahbandar Perikanan Pelabuhan Muara Angke untuk pencocokan data logbook keberangkatan kapal.",
                dokumenUnduh: ""
            }
        ];
        fs.writeFileSync(TIKET_FILE, JSON.stringify(seedData, null, 2), 'utf8');
        return seedData;
    }

    try {
        const raw = fs.readFileSync(TIKET_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error("Gagal membaca tiket_ppid.json:", err);
        return [];
    }
}

// Simpan data tiket ke file
function saveTiketDatabase(data) {
    try {
        fs.writeFileSync(TIKET_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error("Gagal menyimpan tiket_ppid.json:", err);
    }
}

// Inisialisasi database survei IKM
function initIKMDatabase() {
    if (!fs.existsSync(IKM_FILE)) {
        const seedData = [];
        fs.writeFileSync(IKM_FILE, JSON.stringify(seedData, null, 2), 'utf8');
        return seedData;
    }
    try {
        const raw = fs.readFileSync(IKM_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function saveIKMDatabase(data) {
    try {
        fs.writeFileSync(IKM_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {}
}

// 1. CARI STATUS TIKET BERDASARKAN NOMOR TIKET ATAU NOMOR HP
async function getTicketByNumber(input) {
    if (!input || typeof input !== 'string') return null;
    const cleanInput = input.trim().toUpperCase().replace(/[\s#]/g, '');

    // Cek apakah API eksternal resmi disetting di .env
    const apiUrl = process.env.PPID_API_URL;
    if (apiUrl) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const response = await fetch(`${apiUrl}/tracking?ticket=${encodeURIComponent(cleanInput)}`, {
                headers: { 'Authorization': `Bearer ${process.env.PPID_API_KEY || ''}` },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                const apiResult = await response.json();
                if (apiResult && apiResult.data) return apiResult.data;
            }
        } catch (apiErr) {
            console.log("ℹ️ API Portal PPID eksternal offline, beralih ke database lokal terintegrasi.");
        }
    }

    // Pencarian di database internal lokal
    const tickets = initTiketDatabase();
    return tickets.find(t => {
        const tNo = (t.noTiket || '').toUpperCase().replace(/[\s#]/g, '');
        // Cocokkan nomor tiket persis atau variasi tanpa tanda minus
        return tNo === cleanInput || tNo.replace(/-/g, '') === cleanInput.replace(/-/g, '');
    }) || null;
}

// Helper standarisasi nomor telepon untuk pencarian
function normalizePhone(p) {
    if (!p) return '';
    let digits = p.toString().replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    else if (digits.startsWith('8')) digits = '62' + digits;
    return digits;
}

// Cari tiket berdasarkan nomor HP pemohon
function getTicketsByPhone(phone) {
    if (!phone) return [];
    const target = normalizePhone(phone);
    if (!target) return [];
    const tickets = initTiketDatabase();
    return tickets.filter(t => {
        const tPhone = normalizePhone(t.noHp);
        return tPhone && (tPhone === target || tPhone.endsWith(target) || target.endsWith(tPhone));
    });
}

// 2. BUAT TIKET PERMOHONAN BARU (FORM PENDAFTARAN DIGITAL DI WA)
function createNewTicket({ namaPemohon, nik, noHp, email, rincianInformasi, tujuan, eselon }) {
    const tickets = initTiketDatabase();
    const currentYear = new Date().getFullYear();

    // Generate Nomor Tiket Otomatis: PPID-YYYY-XXX
    const thisYearTickets = tickets.filter(t => t.noTiket && t.noTiket.includes(`PPID-${currentYear}`));
    const nextSeq = thisYearTickets.length + 1;
    const seqStr = String(nextSeq).padStart(3, '0');
    const noTiket = `PPID-${currentYear}-${seqStr}`;

    const todayStr = getDisplayDateWIB();
    const deadlineStr = calculateWorkDaysDeadline(new Date(), 10);

    const formattedPhone = noHp.startsWith('+') ? noHp : (noHp.startsWith('62') ? `+${noHp}` : `+62${noHp.replace(/^0/, '')}`);

    const newTicket = {
        noTiket,
        namaPemohon: namaPemohon || "Sahabat Bahari",
        nik: nik || "-",
        noHp: formattedPhone,
        email: email || "-",
        rincianInformasi: rincianInformasi || "-",
        tujuan: tujuan || "Permohonan Informasi Publik",
        eselon: eselon || "Setjen / PPID",
        status: "Diterima / Menunggu Verifikasi",
        tanggalDaftar: todayStr,
        estimasiSelesai: deadlineStr,
        keterangan: "Permohonan digital telah berhasil didaftarkan via WhatsApp Resmi PPID KKP. Dokumen sedang dalam antrean verifikasi awal petugas.",
        dokumenUnduh: ""
    };

    tickets.unshift(newTicket);
    saveTiketDatabase(tickets);
    return newTicket;
}

// 3. UPDATE STATUS TIKET OLEH ADMIN / PETUGAS
function updateTicketStatus(noTiket, newStatus, keterangan = "", dokumenUnduh = "") {
    if (!noTiket) return null;
    const cleanInput = noTiket.trim().toUpperCase().replace(/[\s#]/g, '');
    const tickets = initTiketDatabase();

    const target = tickets.find(t => {
        const tNo = (t.noTiket || '').toUpperCase().replace(/[\s#]/g, '');
        return tNo === cleanInput || tNo.replace(/-/g, '') === cleanInput.replace(/-/g, '');
    });

    if (!target) return null;

    target.status = newStatus;
    if (keterangan) target.keterangan = keterangan;
    if (dokumenUnduh) target.dokumenUnduh = dokumenUnduh;

    saveTiketDatabase(tickets);
    return target;
}

// 4. DAFTAR SEMUA TIKET (UNTUK OPERATOR / ADMIN)
function getAllTickets(filterStatus = null) {
    const tickets = initTiketDatabase();
    if (!filterStatus) return tickets;
    return tickets.filter(t => (t.status || '').toLowerCase().includes(filterStatus.toLowerCase()));
}

// 5. SURVEI KEPUASAN MASYARAKAT (IKM)
function recordIKMSurvey({ phone, rating, saran = "", noTiket = "" }) {
    const list = initIKMDatabase();
    const score = parseInt(rating, 10);
    if (isNaN(score) || score < 1 || score > 5) return null;

    const formattedPhone = phone.startsWith('+') ? phone : (phone.startsWith('62') ? `+${phone}` : `+62${phone.replace(/^0/, '')}`);

    const newSurvey = {
        id: list.length + 1,
        phone: formattedPhone,
        rating: score,
        saran: saran || "-",
        noTiket: noTiket || "-",
        waktu: `${getDisplayDateWIB()} ${new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} WIB`
    };

    list.push(newSurvey);
    saveIKMDatabase(list);
    return newSurvey;
}

function getIKMStats() {
    const list = initIKMDatabase();
    const total = list.length;
    if (total === 0) {
        return {
            total: 0,
            avgRating: 0,
            ikmIndex: 0,
            predikat: "Belum Ada Data",
            breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        };
    }

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    list.forEach(item => {
        sum += item.rating;
        if (breakdown[item.rating] !== undefined) {
            breakdown[item.rating]++;
        }
    });

    const avgRating = (sum / total).toFixed(2);
    // Konversi nilai skala 5 ke standar PermenPAN-RB (skala 25 - 100)
    const ikmIndex = ((sum / (total * 5)) * 100).toFixed(1);

    let predikat = "Kurang";
    if (ikmIndex >= 88.31) predikat = "Sangat Baik (A)";
    else if (ikmIndex >= 76.61) predikat = "Baik (B)";
    else if (ikmIndex >= 65.00) predikat = "Kurang Baik (C)";
    else predikat = "Tidak Baik (D)";

    return {
        total,
        avgRating,
        ikmIndex,
        predikat,
        breakdown
    };
}

// 6. FORMAT CARD STATUS TIKET UNTUK WHATSAPP
function formatTicketCard(ticket) {
    if (!ticket) return "Data tiket tidak ditemukan.";

    let iconStatus = "⏳";
    if (ticket.status.toLowerCase().includes('selesai')) iconStatus = "✅";
    else if (ticket.status.toLowerCase().includes('tolak')) iconStatus = "❌";
    else if (ticket.status.toLowerCase().includes('proses') || ticket.status.toLowerCase().includes('telaah')) iconStatus = "🔄";

    let text =
        `📄 *STATUS PERMOHONAN INFORMASI PUBLIK*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 *No. Tiket:* ${ticket.noTiket}\n` +
        `👤 *Pemohon:* ${ticket.namaPemohon}\n` +
        `📅 *Tanggal Daftar:* ${ticket.tanggalDaftar}\n` +
        `⏳ *Batas Waktu (UU KIP):* ${ticket.estimasiSelesai} _(10 Hari Kerja)_\n` +
        `🏢 *Unit Eselon:* ${ticket.eselon}\n` +
        `📋 *Rincian Informasi:*\n"${ticket.rincianInformasi}"\n\n` +
        `${iconStatus} *Status Terkini:* *${ticket.status}*\n` +
        `💬 *Catatan Petugas:* ${ticket.keterangan}\n`;

    if (ticket.dokumenUnduh) {
        text += `\n📥 *Tautan Berkas/Dokumen:* ${ticket.dokumenUnduh}\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n🌐 Portal Resmi: https://ppid.kkp.go.id`;
    return text;
}

module.exports = {
    getDisplayDateWIB,
    calculateWorkDaysDeadline,
    getTicketByNumber,
    getTicketsByPhone,
    createNewTicket,
    updateTicketStatus,
    getAllTickets,
    recordIKMSurvey,
    getIKMStats,
    formatTicketCard
};

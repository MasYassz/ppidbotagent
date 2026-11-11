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
Tugas utama Anda adalah menjawab pertanyaan seputar permohonan informasi publik, dokumen, transparansi data, dan layanan KKP.

ATURAN WAJIB PANJANG PESAN:
- Jawaban Anda MAKSIMAL 40 KATA.
- Langsung berikan informasi atau kontak/tautan resmi yang dibutuhkan tanpa basa-basi berbelit, namun tetap santun dan profesional.

ATURAN SAPAAN & PENUTUP:
- Awali WAJIB dengan: "Halo #SahabatBahari,"
- Akhiri WAJIB dengan: "Salam hormat."

ATURAN FORMATTING WHATSAPP:
- Gunakan TANDA BINTANG TUNGGAL *teks* untuk cetak tebal (bold).
- DILARANG KERAS menggunakan tanda bintang ganda **teks** karena merusak kerapian tampilan di WhatsApp.

PENGALIHAN WEWENANG:
- Untuk SEGALA BENTUK perizinan (SIPI, SIUP, PKKPRL, OSS, SILAT, izin usaha, izin kapal, izin penangkapan, izin budidaya, izin berlayar, lisensi, surat izin, permit), WAJIB arahkan ke *PTSA (Pelayanan Terpadu Satu Atap)* KKP melalui WhatsApp: 0811-8430-610. JANGAN jawab pertanyaan perizinan sendiri, langsung redirect ke PTSA.
- Untuk Pengaduan Illegal Fishing atau keluhan teknis, arahkan ke Call Center KKP di 141 atau pengaduan@kkp.go.id
- Untuk info umum kelautan, arahkan ke website resmi kkp.go.id
- Jika informasi tidak memadai atau butuh verifikasi berkas, sarankan mengetik *BANTUAN* untuk diteruskan ke Petugas PPID.`
});

// Menyimpan status obrolan pengguna ('MENU', 'AI_MODE', 'CS_MODE', 'CHECK_TICKET', 'REG_NAME', 'REG_NIK', 'REG_INFO', 'REG_PURPOSE', 'AWAITING_IKM')
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
const SPAM_COOLDOWN_MS = 2000; // jeda minimal 2 detik antar chat (bisa diubah)

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
    `Terkait permohonan *perizinan*, silakan langsung menghubungi *PTSA (Pelayanan Terpadu Satu Atap)* KKP:\n\n` +
    `📱 *WhatsApp PTSA:* 0811-8430-610\n\n` +
    `Melalui kanal tersebut, Sahabat akan mendapatkan penjelasan lebih lengkap dan akurat mengenai perizinan.\n\n` +
    `Salam hormat.`;
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
                    `👥 *Total Pemohon:* ${recap.totalRecords} nomor\n\n` +
                    `*Daftar Percakapan Inti:*\n`;

                recap.records.forEach((r, idx) => {
                    const qShort = r.pertanyaan.length > 55 ? r.pertanyaan.substring(0, 52) + '...' : r.pertanyaan;
                    const jShort = r.jawaban.length > 55 ? r.jawaban.substring(0, 52) + '...' : r.jawaban;
                    summaryText += `\n*${idx + 1}. ${r.phone}* [${r.eselon}] [${r.kategori}]\n` +
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
    if (userLastMessageTime[sender] && (now - userLastMessageTime[sender] < SPAM_COOLDOWN_MS)) {
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
    if (text === '5' || text === 'selesai' || text === 'akhiri') {
        userState[sender] = null; // Reset state pengguna
        userAiChatCount[sender] = 0; // Reset hitungan interaksi
        delete regData[sender];
        delete pendingIkmTarget[sender];
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

        return;
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
        const escalationKeywords = /\b(petugas|cs|customer service|agen|admin|manusia|bantuan|komplain)\b/i;
        if (escalationKeywords.test(text)) {
            // Trigger 3: Hanya izinkan eskalasi jika sudah mencoba bertanya minimal 1 kali
            if (userAiChatCount[sender] && userAiChatCount[sender] >= 1) {
                userState[sender] = 'CS_MODE';
                await sendUserMessage(sender, "👨‍💻 *Terhubung ke Petugas PPID*\n\nMohon tunggu, pesan Anda akan langsung diteruskan ke Petugas Layanan Informasi PPID kami.\n\nSilakan ketikkan permohonan atau pertanyaan Anda secara lengkap di bawah ini:\n\n_(Ketik *0* jika Anda ingin membatalkan dan kembali ke Menu Utama)_");
                return;
            } else {
                await sendUserMessage(sender, "Halo #SahabatBahari,\n\nUntuk mempercepat pelayanan, silakan sampaikan pertanyaan atau informasi yang Anda butuhkan terlebih dahulu agar Asisten AI kami dapat membantu Anda segera.");
                return;
            }
        }

        // 🔒 Intercept perizinan → redirect ke PTSA
        if (isPerizinanQuery(text)) {
            await sendUserMessage(sender, PTSA_REDIRECT_MESSAGE + "\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: 'Diarahkan ke PTSA KKP (WA: 0811-8430-610)',
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
    else if (text === '6' || text.match(/\b(petugas|cs|customer service|agen|admin|manusia|bantuan|komplain)\b/i)) {
        // Jika memilih menu '6' langsung terhubung, atau jika kata kunci maka terhubung jika sudah pernah interaksi
        if (text === '6' || (userAiChatCount[sender] && userAiChatCount[sender] >= 1)) {
            userState[sender] = 'CS_MODE';
            await sendUserMessage(sender, "👨‍💻 *Terhubung ke Petugas PPID*\n\nMohon tunggu, pesan Anda akan langsung diteruskan ke Petugas Layanan Informasi PPID kami.\n\nSilakan ketikkan permohonan atau pertanyaan Anda secara lengkap di bawah ini:\n\n_(Ketik *0* jika Anda ingin membatalkan dan kembali ke Menu Utama)_");
        } else {
            await sendUserMessage(sender, "Halo #SahabatBahari,\n\nUntuk mempercepat penanganan, layanan Petugas kami prioritaskan bagi pemohon yang telah berkonsultasi melalui sistem terlebih dahulu.\n\nSilakan sampaikan pertanyaan atau kendala Anda di sini, atau pilih menu *3* untuk dibantu oleh Asisten AI. Jika belum terselesaikan, sistem akan langsung menghubungkan Anda ke Petugas.");
        }
    }
    // Trigger Menu Utama atau Jawab Pertanyaan Langsung
    else {
        // Daftar kata sapaan umum (kata 'bantuan' dialihkan ke trigger eskalasi di atas)
        const greetings = ['halo', 'hai', 'p', 'menu', 'assalamualaikum', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'help', 'info'];

        // Jika teks berupa sapaan ATAU sangat pendek (kurang dari 4 huruf) -> Tampilkan Menu
        if (greetings.includes(text) || text.length < 4) {
            const menuText = `Selamat datang di Layanan Bantuan WhatsApp Resmi *PPID Kementerian Kelautan dan Perikanan RI* 🇮🇩🐟\n\n` +
                `Silakan balas dengan angka layanan yang tersedia:\n\n` +
                `*1* 📋 Syarat & Formulir Permohonan (Daftar Digital)\n` +
                `*2* 🔍 Cek Status Permohonan (Pelacakan Tiket Langsung)\n` +
                `*3* 💬 Tanya Jawab PPID (Asisten Pintar)\n` +
                `*4* ⚖️ Tata Cara Pengajuan Keberatan\n` +
                `*5* ❌ Akhiri Percakapan\n` +
                `*6* 👨‍💻 Hubungi Petugas CS PPID (Live Chat)\n\n` +
                `_Balas dengan angka (contoh: 1) untuk memilih menu._`;

            try {
                const headerImage = await MessageMedia.fromUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Logo_of_the_Ministry_of_Marine_Affairs_and_Fisheries_of_the_Republic_of_Indonesia.svg/800px-Logo_of_the_Ministry_of_Marine_Affairs_and_Fisheries_of_the_Republic_of_Indonesia.svg.png');
                await sendUserMessage(sender, headerImage, { caption: menuText });
            } catch (e) {
                await sendUserMessage(sender, menuText);
            }
        }
        // Jika teks berupa pertanyaan panjang -> Cek Template Dulu, jika tidak ada baru panggil AI
        else {
            // 🔒 Intercept perizinan → redirect ke PTSA (sebelum FAQ/AI)
            if (isPerizinanQuery(text)) {
                await sendUserMessage(sender, PTSA_REDIRECT_MESSAGE + "\n\n_(Ketik *0* atau *Menu* untuk melihat opsi layanan lain)_");
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: 'Diarahkan ke PTSA KKP (WA: 0811-8430-610)',
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
                return;
            }

            // 1. Cek kecocokan dengan file database template (faq.json)
            let jawabanTemplate = null;
            try {
                // Membaca file secara langsung agar update file tidak perlu restart bot
                const faqData = JSON.parse(fs.readFileSync('./faq.json', 'utf8'));
                for (const item of faqData) {
                    // Mengecek apakah pertanyaan pengguna mengandung salah satu keyword
                    const isMatch = item.keywords.some(keyword => text.includes(keyword));
                    if (isMatch) {
                        jawabanTemplate = tracker.cleanWhatsAppFormatting(item.answer);
                        break; // Berhenti mencari jika sudah ketemu
                    }
                }
            } catch (err) {
                console.error("Gagal membaca faq.json:", err);
            }

            // Jika ada jawaban di template, balas otomatis (Tanpa Kuota AI)
            if (jawabanTemplate) {
                userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;
                let footer = "\n\n_(Ketik *0* untuk kembali ke Menu Utama)_";
                if (userAiChatCount[sender] >= 2) {
                    footer = "\n\n💡 *Belum menemukan jawaban yang dicari?*\nKetik *BANTUAN* untuk diteruskan ke Petugas PPID.\n_(Atau ketik *0* untuk kembali ke Menu Utama)_";
                }
                await sendUserMessage(sender, jawabanTemplate + footer);

                // Rekam ke tracker percakapan inti
                tracker.recordConversation({
                    phone: senderPhone,
                    text: message.body,
                    answer: jawabanTemplate,
                    source: 'BOT',
                    aiModel,
                    status: 'DONE'
                });
            }
            // 2. Jika tidak ada di template, oper pertanyaan ke Gemini AI
            else {
                userState[sender] = 'AI_MODE'; // Masukkan user ke mode AI
                userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;
                try {
                    const result = await aiModel.generateContent(message.body);
                    let replyText = tracker.cleanWhatsAppFormatting(result.response.text());
                    let footer = "\n\n_(Ketik *0* atau *Menu* untuk melihat opsi layanan lain)_";
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
            }
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
                    `👥 *Total Pemohon:* ${recap.totalRecords} nomor\n` +
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

            // Setelah jam 4 sore rekapan hari ini bisa dilupakan (di-reset untuk hari berikutnya)
            tracker.resetDailyRecords();
        } catch (err) {
            console.error('[SCHEDULE] Error generate/kirim rekap harian jam 16:00:', err);
        }
    }
}, 30000); // Evaluasi setiap 30 detik

client.initialize();

const fs = require('fs');
require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inisialisasi Gemini AI dengan "Persona" KKP
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: "Anda adalah Asisten Virtual resmi dari PPID (Pejabat Pengelola Informasi dan Dokumentasi) Kementerian Kelautan dan Perikanan (KKP) Republik Indonesia.\nTugas utama Anda adalah menjawab pertanyaan seputar permohonan informasi publik, dokumen, transparansi data, dan layanan PPID KKP.\nJika pengguna menanyakan hal yang TIDAK berhubungan dengan layanan PPID (misalnya perizinan teknis, bantuan nelayan, subsidi, atau pengaduan pelanggaran), beritahu mereka dengan sopan bahwa ini adalah layanan khusus PPID. Lalu arahkan mereka ke kontak yang sesuai:\n- Untuk Perizinan Usaha Perikanan (SIPI/SIUP), arahkan ke portal SILAT KKP: https://perizinan.kkp.go.id\n- Untuk Pengaduan Illegal Fishing atau keluhan teknis, arahkan ke Call Center KKP di 141 atau pengaduan@kkp.go.id\n- Untuk info umum kelautan, arahkan ke website resmi kkp.go.id\nJika Anda tidak memiliki informasi yang memadai, tidak yakin dengan jawabannya, atau pengguna tampak membutuhkan penanganan/verifikasi langsung dari petugas resmi, sampaikan permohonan maaf dengan sopan dan sarankan pengguna untuk mengetik *BANTUAN* agar dapat diteruskan ke Petugas PPID.\nATURAN MUTLAK: Anda WAJIB selalu menjawab dalam Bahasa Indonesia yang sopan dan formal. Jangan pernah menggunakan bahasa lain (termasuk bahasa daerah atau bahasa asing) meskipun pengguna memintanya.\nATURAN SAPAAN: Anda WAJIB selalu mengawali setiap jawaban dengan sapaan: 'Halo Sahabat Bahari,'."
});

// Menyimpan status obrolan pengguna ('MENU', 'AI_MODE', 'CS_MODE')
const userState = {};
// Menyimpan jumlah interaksi tanya-jawab (AI/FAQ) pengguna untuk eskalasi cerdas
const userAiChatCount = {};

// Variabel Anti-Spam
const userLastMessageTime = {};
const userLastWarningTime = {}; // Untuk menyimpan kapan terakhir user diberi peringatan diluar jam kerja
const userLastBreakWarningTime = {}; // Untuk menyimpan kapan terakhir user diberi peringatan jam istirahat
const SPAM_COOLDOWN_MS = 2000; // jeda minimal 2 detik antar chat (bisa diubah)
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
let lastCsUserJid = null; // Pemohon terakhir yang masuk ke CS

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
        } catch (err) {}
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
// 🌊 HELPER FORMAT BALASAN (HALO SAHABAT BAHARI)
// ==========================================
function formatReply(text) {
    if (!text || typeof text !== 'string') return text;
    const trimmed = text.trim();
    // Cek jika sudah diawali variasi "Halo Sahabat Bahari", "#SahabatBahari", dsb
    const regex = /^(\*|_)*(halo\s+)?#?sahabat\s*bahari(\*|_)*[!,:-]?\s*/i;
    if (regex.test(trimmed)) {
        return trimmed.replace(regex, 'Halo Sahabat Bahari,\n\n');
    }
    return `Halo Sahabat Bahari,\n\n${trimmed}`;
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

            const helpText = `👨‍💻 *PANDUAN OPERATOR PPID KKP*\n\n` +
                `1. *Membalas Pemohon:*\n` +
                `   • *Swipe / Balas Kutipan (Quote Reply)* pesan laporan pemohon.\n` +
                `   • Atau langsung ketik balasan di sini (otomatis diteruskan ke pemohon aktif terakhir).\n\n` +
                `2. *Mengakhiri Sesi Pemohon:*\n` +
                `   • Ketik */selesai* untuk menutup sesi dengan pemohon aktif.\n\n` +
                `3. *Status Sesi Saat Ini:*\n` +
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
            if (targetJid) {
                const targetPhone = targetJid.split('@')[0].split(':')[0];
                await sendUserMessage(targetJid, "👨‍💻 *Sesi Live Chat Selesai*\n\nPetugas telah mengakhiri sesi konsultasi ini. Terima kasih telah menghubungi layanan resmi PPID Kementerian Kelautan dan Perikanan. 🌊\n\nKetik *Menu* jika Anda membutuhkan layanan informasi lainnya.");
                userState[targetJid] = 'MENU';
                userAiChatCount[targetJid] = 0;

                delete activeAdminTarget[senderDetails.phone];
                delete activeAdminTarget[senderDetails.lid];
                delete activeAdminTarget[sender];
                delete activeAdminTarget['LAST_ACTIVE'];
                if (lastCsUserJid === targetJid) lastCsUserJid = null;

                await client.sendMessage(sender, `✅ *Sesi Berhasil Diakhiri*\n\nSesi live chat dengan pemohon (+${targetPhone}) telah ditutup.`);
            } else {
                await client.sendMessage(sender, "⚠️ Tidak ada sesi pemohon aktif yang sedang terhubung.");
            }
            return;
        }

        // 3. Deteksi Balas Kutipan (Quote Reply / Swipe to Reply)
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

        // 4. Jika tidak mengutip pesan, gunakan target pemohon aktif terakhir
        if (!targetUserJid) {
            targetUserJid = activeAdminTarget[senderDetails.phone] ||
                            activeAdminTarget[senderDetails.lid] ||
                            activeAdminTarget[sender] ||
                            activeAdminTarget['LAST_ACTIVE'] ||
                            lastCsUserJid;
            if (targetUserJid) {
                targetPhoneDisplay = targetUserJid.split('@')[0].split(':')[0];
            }
        }

        // 5. Jika target pemohon ditemukan, teruskan balasan petugas
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

                if (senderDetails.phone) activeAdminTarget[senderDetails.phone] = targetUserJid;
                if (senderDetails.lid) activeAdminTarget[senderDetails.lid] = targetUserJid;
                activeAdminTarget[sender] = targetUserJid;
                activeAdminTarget['LAST_ACTIVE'] = targetUserJid;

                const replySummary = message.body ? `"${message.body}"` : "[Media/Lampiran]";
                await client.sendMessage(sender, `✅ *Terkirim ke Pemohon (+${targetPhoneDisplay}):*\n\n${replySummary}\n\n_(Ketik */selesai* jika konsultasi sudah selesai)_`);
            } catch (err) {
                console.error("Gagal mengirim balasan ke pemohon:", err);
                await client.sendMessage(sender, `❌ Gagal mengirim balasan ke pemohon (+${targetPhoneDisplay}). Silakan coba lagi.`);
            }
            return;
        }

        // 6. Jika tidak ada pemohon yang sedang aktif
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
            await sendUserMessage(sender, "☕ *Layanan Sedang Istirahat*\n\nMaaf, saat ini layanan PPID KKP sedang dalam jam istirahat (11.40 - 13.00 WIB).\n\nPesan Anda telah kami terima dan akan segera kami proses kembali setelah jam istirahat selesai (pukul 13.00 WIB).\nHarap ditunggu ya! 🙏");
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
        await sendUserMessage(sender, "Terima kasih telah menggunakan layanan WhatsApp Resmi *PPID Kementerian Kelautan dan Perikanan RI*. \n\nMari bersama-sama menjaga kelestarian laut kita! 🌊🇮🇩\n\nSemoga sehat selalu dan selamat beraktivitas kembali. 🙏");
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
                await sendUserMessage(sender, "Halo Sahabat Bahari,\n\nUntuk mempercepat pelayanan, silakan sampaikan pertanyaan atau informasi yang Anda butuhkan terlebih dahulu agar Asisten AI kami dapat membantu Anda segera.");
                return;
            }
        }

        try {
            // Tambahkan hitungan pertanyaan AI
            userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;

            const result = await aiModel.generateContent(message.body);
            let replyText = result.response.text();

            // Trigger 1: Counter Fallback (Jika sudah bertanya 2 kali atau lebih, tawarkan eskalasi)
            let footer = "\n\n_(Ketik *0* untuk kembali ke Menu Utama)_";
            if (userAiChatCount[sender] >= 2) {
                footer = "\n\n💡 *Belum menemukan jawaban yang dicari?*\nKetik *BANTUAN* untuk diteruskan ke Petugas PPID.\n_(Atau ketik *0* untuk kembali ke Menu Utama)_";
            }

            await sendUserMessage(sender, replyText + footer);
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

        const pemohonPhone = senderDetails.phone || sender.split('@')[0].split(':')[0].replace(/\D/g, '');
        const directWaLink = `https://wa.me/${pemohonPhone}`;

        // Simpan pemohon ini sebagai target aktif untuk admin
        lastCsUserJid = sender;
        if (pemohonPhone) {
            phoneToOriginalJid.set(pemohonPhone, sender);
        }
        for (const admPhone of ADMIN_PHONES) {
            activeAdminTarget[admPhone] = sender;
        }
        for (const admLid of ADMIN_LIDS) {
            activeAdminTarget[admLid] = sender;
        }
        activeAdminTarget['LAST_ACTIVE'] = sender;

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

        // Beri konfirmasi ke pemohon bahwa pesan sudah diteruskan
        await sendUserMessage(sender, "✅ Pesan Anda telah diteruskan ke Petugas Layanan PPID KKP. Mohon ditunggu ya, petugas kami akan segera membalasnya. 🙏\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
        return;
    }

    // ==========================================
    // 📋 ROUTING MENU UTAMA PPID KKP
    // ==========================================
    if (text === '1') {
        await sendUserMessage(sender, "📋 *Syarat Permohonan Informasi Publik*\n\nUntuk mengajukan permohonan informasi publik ke PPID KKP, Anda harus melampirkan:\n1. Salinan Identitas Diri (KTP/Paspor)\n2. Rincian Informasi yang dibutuhkan\n3. Tujuan Penggunaan Informasi\n\nPermohonan dapat diajukan secara online melalui portal resmi PPID: https://ppid.kkp.go.id\n\nKetik *0* untuk kembali ke Menu Utama.");
    }
    else if (text === '2') {
        await sendUserMessage(sender, "🔍 *Cek Status Permohonan*\n\nAnda dapat melacak status permohonan informasi publik Anda secara mandiri dengan memasukkan Nomor Registrasi Permohonan pada portal PPID KKP.\n\nCek di sini: https://ppid.kkp.go.id\n\nKetik *0* untuk kembali ke Menu Utama.");
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
            await sendUserMessage(sender, "Halo Sahabat Bahari,\n\nUntuk mempercepat penanganan, layanan Petugas kami prioritaskan bagi pemohon yang telah berkonsultasi melalui sistem terlebih dahulu.\n\nSilakan sampaikan pertanyaan atau kendala Anda di sini, atau pilih menu *3* untuk dibantu oleh Asisten AI. Jika belum terselesaikan, sistem akan langsung menghubungkan Anda ke Petugas.");
        }
    }
    // Trigger Menu Utama atau Jawab Pertanyaan Langsung
    else {
        // Daftar kata sapaan umum (kata 'bantuan' dialihkan ke trigger eskalasi di atas)
        const greetings = ['halo', 'hai', 'p', 'menu', 'assalamualaikum', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'help', 'info'];

        // Jika teks berupa sapaan ATAU sangat pendek (kurang dari 4 huruf) -> Tampilkan Menu
        if (greetings.includes(text) || text.length < 4) {
            const menuText = `Selamat datang di Layanan Bantuan WhatsApp Resmi *PPID Kementerian Kelautan dan Perikanan RI* 🇮🇩🐟\n\nSilakan balas dengan angka layanan yang tersedia:\n\n*1* 📋 Syarat Permohonan Informasi\n*2* 🔍 Cek Status Permohonan\n*3* 💬 Tanya Jawab PPID (Asisten Pintar)\n*4* ⚖️ Tata Cara Pengajuan Keberatan\n*5* ❌ Akhiri Percakapan\n*6* 👨‍💻 Hubungi Petugas CS PPID (Live Chat)\n\n_Balas dengan angka (contoh: 1) untuk memilih menu._`;

            try {
                const headerImage = await MessageMedia.fromUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Logo_of_the_Ministry_of_Marine_Affairs_and_Fisheries_of_the_Republic_of_Indonesia.svg/800px-Logo_of_the_Ministry_of_Marine_Affairs_and_Fisheries_of_the_Republic_of_Indonesia.svg.png');
                await sendUserMessage(sender, headerImage, { caption: menuText });
            } catch (e) {
                await sendUserMessage(sender, menuText);
            }
        }
        // Jika teks berupa pertanyaan panjang -> Cek Template Dulu, jika tidak ada baru panggil AI
        else {
            // 1. Cek kecocokan dengan file database template (faq.json)
            let jawabanTemplate = null;
            try {
                // Membaca file secara langsung agar update file tidak perlu restart bot
                const faqData = JSON.parse(fs.readFileSync('./faq.json', 'utf8'));
                for (const item of faqData) {
                    // Mengecek apakah pertanyaan pengguna mengandung salah satu keyword
                    const isMatch = item.keywords.some(keyword => text.includes(keyword));
                    if (isMatch) {
                        jawabanTemplate = item.answer;
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
            }
            // 2. Jika tidak ada di template, oper pertanyaan ke Gemini AI
            else {
                userState[sender] = 'AI_MODE'; // Masukkan user ke mode AI
                userAiChatCount[sender] = (userAiChatCount[sender] || 0) + 1;
                try {
                    const result = await aiModel.generateContent(message.body);
                    let footer = "\n\n_(Ketik *0* atau *Menu* untuk melihat opsi layanan lain)_";
                    if (userAiChatCount[sender] >= 2) {
                        footer = "\n\n💡 *Belum menemukan jawaban yang dicari?*\nKetik *BANTUAN* untuk diteruskan ke Petugas PPID.\n_(Atau ketik *0* untuk kembali ke Menu Utama)_";
                    }
                    await sendUserMessage(sender, result.response.text() + footer);
                } catch (error) {
                    console.error('Error dari Gemini API:', error);
                    await sendUserMessage(sender, "Maaf, Asisten AI sedang mengalami gangguan koneksi.\n\nKetik *0* untuk kembali ke Menu Utama atau ketik *BANTUAN* untuk terhubung ke Petugas.");
                }
            }
        }
    }
});

client.initialize();

const fs = require('fs');
require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inisialisasi Gemini AI dengan "Persona" KKP
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: "Anda adalah Asisten Virtual resmi dari PPID (Pejabat Pengelola Informasi dan Dokumentasi) Kementerian Kelautan dan Perikanan (KKP) Republik Indonesia.\nTugas utama Anda adalah menjawab pertanyaan seputar permohonan informasi publik, dokumen, transparansi data, dan layanan PPID KKP.\nJika pengguna menanyakan hal yang TIDAK berhubungan dengan layanan PPID (misalnya perizinan teknis, bantuan nelayan, subsidi, atau pengaduan pelanggaran), beritahu mereka dengan sopan bahwa ini adalah layanan khusus PPID. Lalu arahkan mereka ke kontak yang sesuai:\n- Untuk Perizinan Usaha Perikanan (SIPI/SIUP), arahkan ke portal SILAT KKP: https://perizinan.kkp.go.id\n- Untuk Pengaduan Illegal Fishing atau keluhan teknis, arahkan ke Call Center KKP di 141 atau pengaduan@kkp.go.id\n- Untuk info umum kelautan, arahkan ke website resmi kkp.go.id\nATURAN MUTLAK: Anda WAJIB selalu menjawab dalam Bahasa Indonesia yang sopan dan formal. Jangan pernah menggunakan bahasa lain (termasuk bahasa daerah atau bahasa asing) meskipun pengguna memintanya.\nATURAN SAPAAN: Anda WAJIB selalu mengawali setiap jawaban dengan sapaan: 'Halo Sahabat Bahari,'."
});

// Menyimpan status obrolan pengguna ('MENU', 'AI_MODE', 'CS_MODE')
const userState = {};

// Variabel Anti-Spam
const userLastMessageTime = {};
const userLastWarningTime = {}; // Untuk menyimpan kapan terakhir user diberi peringatan diluar jam kerja
const userLastBreakWarningTime = {}; // Untuk menyimpan kapan terakhir user diberi peringatan jam istirahat
const SPAM_COOLDOWN_MS = 2000; // jeda minimal 2 detik antar chat (bisa diubah)
// Nomor Admin tujuan untuk meneruskan chat dari masyarakat
const ADMIN_NUMBER = process.env.ADMIN_WA_NUMBER || '6281111129996@c.us';

// Inisialisasi client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('Silakan scan QR Code di bawah ini dengan WhatsApp Anda:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client sudah siap dan terhubung ke WhatsApp!');
    console.log('Bot Layanan KKP Aktif dengan fitur Anti-Spam & Live Chat!');
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

    const senderNumber = sender.split('@')[0].split(':')[0].replace(/\D/g, '');
    const adminNumberClean = ADMIN_NUMBER.split('@')[0].split(':')[0].replace(/\D/g, '');

    // ==========================================
    // 👑 LOGIKA KHUSUS ADMIN (PETUGAS)
    // ==========================================
    if (senderNumber === adminNumberClean) {
        // Jika Admin me-reply (mengutip) pesan keluhan dari user, kirimkan balasan ke user tersebut
        if (message.hasQuotedMsg) {
            const quotedMsg = await message.getQuotedMessage();
            // Cari teks "Dari Nomor: +62..." di dalam pesan kutipan
            const match = quotedMsg.body.match(/Dari Nomor:\s*\+([0-9]+)/i);
            if (match) {
                const userJid = match[1] + '@c.us';
                await sendUserMessage(userJid, "👨‍💻 *Balasan Petugas:*\n\n" + message.body);
                return;
            }
        }
        // Jika pesan tidak mengutip pesan user, abaikan saja agar tidak tertimpa logika bot pemohon
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

        // Cek jika user ingin bicara dengan petugas langsung
        if (text.match(/\b(petugas|cs|customer service|agen|admin|manusia)\b/i)) {
            userState[sender] = 'CS_MODE';
            await sendUserMessage(sender, "👨‍💻 *Terhubung ke Petugas PPID*\n\nMohon tunggu, pesan Anda akan langsung diteruskan ke Petugas Layanan Informasi PPID kami.\n\nSilakan ketikkan permohonan atau pertanyaan Anda secara lengkap di bawah ini:\n\n_(Ketik *0* jika Anda ingin membatalkan dan kembali ke Menu Utama)_");
            return;
        }

        try {
            const result = await aiModel.generateContent(message.body);
            await sendUserMessage(sender, result.response.text() + "\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
        } catch (error) {
            console.error('Error dari Gemini API:', error);
            await sendUserMessage(sender, "Maaf, Asisten AI sedang mengalami gangguan koneksi.\n\nKetik *0* untuk kembali ke Menu Utama.");
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

        // Teruskan (Forward) keluhan masyarakat ke nomor WhatsApp Admin
        // sender.split('@')[0] akan mengambil nomor HP pengirim saja
        const forwardText = `🚨 *Pesan Masuk (Live Chat KKP)* 🚨\n\nDari Nomor: +${sender.split('@')[0]}\nPesan:\n"${message.body}"`;
        try {
            await client.sendMessage(ADMIN_NUMBER, forwardText);
        } catch (e) {
            console.error("Gagal mem-forward pesan. Nomor Admin belum disetting dengan benar di .env");
        }
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
    else if (text === '6' || text.match(/\b(petugas|cs|customer service|agen|admin|manusia)\b/i)) {
        userState[sender] = 'CS_MODE';
        await sendUserMessage(sender, "👨‍💻 *Terhubung ke Petugas PPID*\n\nMohon tunggu, pesan Anda akan langsung diteruskan ke Petugas Layanan Informasi PPID kami.\n\nSilakan ketikkan permohonan atau pertanyaan Anda secara lengkap di bawah ini:\n\n_(Ketik *0* jika Anda ingin membatalkan dan kembali ke Menu Utama)_");
    }
    // Trigger Menu Utama atau Jawab Pertanyaan Langsung
    else {
        // Daftar kata sapaan umum
        const greetings = ['halo', 'hai', 'p', 'menu', 'assalamualaikum', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'help', 'bantuan', 'info'];

        // Jika teks berupa sapaan ATAU sangat pendek (kurang dari 4 huruf) -> Tampilkan Menu
        if (greetings.includes(text) || text.length < 4) {
            const menuText = `Selamat datang di Layanan Bantuan WhatsApp Resmi *PPID Kementerian Kelautan dan Perikanan RI* 🇮🇩🐟\n\nSilakan balas dengan angka layanan yang tersedia:\n\n*1* 📋 Syarat Permohonan Informasi\n*2* 🔍 Cek Status Permohonan\n*3* 💬 Tanya Jawab PPID (Asisten Pintar)\n*4* ⚖️ Tata Cara Pengajuan Keberatan\n*5* ❌ Akhiri Percakapan\n*6* 👨‍💻 Hubungi Petugas CS PPID\n\n_Balas dengan angka (contoh: 1) untuk memilih menu._`;

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
                await sendUserMessage(sender, jawabanTemplate + "\n\n_(Ketik *0* untuk kembali ke Menu Utama)_");
            }
            // 2. Jika tidak ada di template, oper pertanyaan ke Gemini AI
            else {
                userState[sender] = 'AI_MODE'; // Masukkan user ke mode AI
                try {
                    const result = await aiModel.generateContent(message.body);
                    await sendUserMessage(sender, result.response.text() + "\n\n_(Ketik *0* atau *Menu* untuk melihat opsi layanan lain)_");
                } catch (error) {
                    console.error('Error dari Gemini API:', error);
                    await sendUserMessage(sender, "Maaf, Asisten AI sedang mengalami gangguan koneksi.\n\nKetik *0* untuk kembali ke Menu Utama.");
                }
            }
        }
    }
});

client.initialize();

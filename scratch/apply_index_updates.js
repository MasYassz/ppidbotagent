const fs = require('fs');

let content = fs.readFileSync('index.js', 'utf8');

// 1. PTSA_REDIRECT_MESSAGE: remove footer
const ptsaOld = `   🏢 *Layanan Tatap Muka:* Gedung Mina Bahari IV Lt. 1, Gambir, Jakarta Pusat (Senin–Kamis 08.00–15.30 WIB, Jumat 08.00–16.00 WIB)\\n\\n\` +
    \`━━━━━━━━━━━━━━━━━━━━━━━━━\\n\` +
    \`💡 *Apakah panduan perizinan ini sudah menyelesaikan kebutuhan Anda?*\\n\` +
    \`• Balas *YA* jika kendala sudah tuntas / selesai.\\n\` +
    \`• Balas *BANTUAN* jika ingin terhubung langsung ke Petugas PPID.\\n\` +
    \`• Ketik *0* untuk kembali ke Menu Utama.\\n\\n\` +
    \`Salam hormat.\`;`;

const ptsaNew = `   🏢 *Layanan Tatap Muka:* Gedung Mina Bahari IV Lt. 1, Gambir, Jakarta Pusat (Senin–Kamis 08.00–15.30 WIB, Jumat 08.00–16.00 WIB)\\n\\n\` +
    \`Salam hormat.\`;`;

if (content.includes(ptsaOld)) {
    content = content.replace(ptsaOld, ptsaNew);
    console.log('✓ Updated PTSA_REDIRECT_MESSAGE');
} else {
    console.log('✗ Failed to find ptsaOld');
}

// 2. isPengaduanAkpQuery & isPengaduanQuery
const pengaduanAkpOld = `function isPengaduanAkpQuery(text) {
    const t = (text || '').toLowerCase();
    // Jika pertanyaan tentang magang/siswa/mahasiswa, JANGAN masukkan ke pengaduan AKP (Request 2)
    if (t.includes('magang') || t.includes('kerja praktik') || (t.includes('pkl') && !t.includes('perjanjian kerja laut') && !t.includes('kapal') && !t.includes('abk') && !t.includes('akp'))) {
        return false;
    }
    const hasAkpAbk = /\\b(akp|abk|awak kapal|pelaut|pelaut perikanan)\\b/.test(t);
    const hasPengaduan = /\\b(pengaduan|aduan|lapor|laporkan|keluhan|gaji|kecelakaan|ditahan|masalah|kasus|korban)\\b/.test(t);
    const specificKeywords = [
        'pengaduan akp', 'pengaduan abk', 'lapor akp', 'lapor abk',
        'gaji abk', 'gaji akp', 'abk ditahan', 'abk disiksa', 'abk terlantar',
        'kecelakaan kapal abk', 'kecelakaan akp', 'masalah abk', 'masalah akp',
        'gangguan operasional akp', 'aduan akp', 'aduan abk'
    ];
    return specificKeywords.some(k => t.includes(k)) || (hasAkpAbk && hasPengaduan);
}`;

const pengaduanAkpNew = `function isPengaduanAkpQuery(text) {
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
    const hasAkpAbk = /\\b(akp|abk|awak kapal|pelaut|pelaut perikanan)\\b/.test(t);
    const hasPengaduan = /\\b(pengaduan|aduan|lapor|laporkan|keluhan|gaji|kecelakaan|ditahan|disiksa|terlantar|masalah|kasus|korban|hak|upah)\\b/.test(t);
    const specificKeywords = [
        'pengaduan akp', 'pengaduan abk', 'lapor akp', 'lapor abk',
        'gaji abk', 'gaji akp', 'abk ditahan', 'abk disiksa', 'abk terlantar',
        'kecelakaan kapal abk', 'kecelakaan akp', 'masalah abk', 'masalah akp',
        'gangguan operasional akp', 'aduan akp', 'aduan abk', 'pengaduan awak kapal', 'lapor awak kapal'
    ];
    return specificKeywords.some(k => t.includes(k)) || (hasAkpAbk && hasPengaduan);
}`;

if (content.includes(pengaduanAkpOld)) {
    content = content.replace(pengaduanAkpOld, pengaduanAkpNew);
    console.log('✓ Updated isPengaduanAkpQuery');
} else {
    console.log('✗ Failed to find pengaduanAkpOld');
}

// 3. isPengaduanQuery & Add isGenericReportInquiry and PILIHAN_LAPORAN_MENU_TEXT
const pengaduanQueryOld = `function isPengaduanQuery(text) {
    const t = (text || '').toLowerCase();
    // Jika pertanyaan tentang magang/siswa/mahasiswa, JANGAN masukkan ke pengaduan (Request 2)
    if (t.includes('magang') || t.includes('kerja praktik') || (t.includes('pkl') && !t.includes('perjanjian kerja laut') && !t.includes('kapal') && !t.includes('abk') && !t.includes('akp'))) {
        return false;
    }
    // Abaikan jika konteksnya adalah laporan data publik / statistik / keuangan / tahunan
    if (t.includes('laporan tahunan') || t.includes('laporan keuangan') || t.includes('laporan kinerja') || t.includes('laporan data')) {
        return false;
    }
    const keywords = [
        'pengaduan', 'lapor', 'laporkan', 'aduan', 'melaporkan', 'keluhan',
        'pungli', 'whistleblower', 'wbs', 'pelanggaran perikanan', 'lapor.go.id'
    ];
    return keywords.some(k => t.includes(k));
}`;

const pengaduanQueryNew = `function isPengaduanQuery(text) {
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
        /^(saya\\s+)?(ingin|mau|bisa|ada\\s+mau|akan|pengen)\\s+(bikin\\s+|buat\\s+|mengajukan\\s+|menyampaikan\\s+)?(laporan|lapor|pengaduan|aduan|melapor|melaporkan)(\\s+dong|\\s+min|\\s+kak|\\s+admin|\\s+pak|\\s+bu)?$/i,
        /^(lapor|laporan|pengaduan|aduan|melapor|melaporkan)(\\s+dong|\\s+min|\\s+kak|\\s+admin|\\s+pak|\\s+bu)?$/i,
        /^(bagaimana\\s+|gimana\\s+|tata\\s+)?cara\\s+(lapor|laporan|pengaduan|aduan|melapor|melaporkan)$/i,
        /^(layanan\\s+|kanal\\s+|menu\\s+)?(laporan|pengaduan)$/i
    ];

    return genericReportPatterns.some(pattern => pattern.test(t));
}

const PILIHAN_LAPORAN_MENU_TEXT =
    \`Halo #SahabatBahari,\\n\\n\` +
    \`Untuk memproses dan mengarahkan laporan/pengaduan Anda ke unit penanganan yang tepat dan cepat, silakan pilih kategori laporan berikut:\\n\\n\` +
    \`*1* 🚨 *Pengaduan Umum & Pelanggaran Perikanan (Ditjen PSDKP)*\\n\` +
    \`   Laporan penangkapan ikan ilegal (*destructive fishing*, bom ikan, alat tangkap dilarang), kapal asing/tanpa izin, pencemaran laut, serta saluran WBS/pungli.\\n\\n\` +
    \`*2* 🏝️ *Pengawasan Ruang Laut & Pemanfaatan Pulau-Pulau Kecil (Ditjen PRL)*\\n\` +
    \`   Laporan perusakan ekosistem pesisir, reklamasi tanpa izin, pelanggaran izin PKKPRL, pemanfaatan/penggunaan pulau-pulau kecil ilegal, dan biota/satwa laut dilindungi (penyu, hiu, paus).\\n\\n\` +
    \`*3* ⚓ *Pengaduan Awak Kapal Perikanan (AKP / ABK)*\\n\` +
    \`   Laporan kendala ketenagakerjaan pelaut perikanan: gaji/upah tidak dibayar, penelantaran, kecelakaan kerja saat melaut, atau pelanggaran Perjanjian Kerja Laut (PKL).\\n\\n\` +
    \`_Balas dengan angka (*1*, *2*, atau *3*) sesuai kebutuhan laporan Anda, atau ketik langsung kronologi/kejadian spesifik Anda._\\n\\n\` +
    \`_(Ketik *0* untuk kembali ke Menu Utama)_\`;`;

if (content.includes(pengaduanQueryOld)) {
    content = content.replace(pengaduanQueryOld, pengaduanQueryNew);
    console.log('✓ Updated isPengaduanQuery & Added isGenericReportInquiry + PILIHAN_LAPORAN_MENU_TEXT');
} else {
    console.log('✗ Failed to find pengaduanQueryOld');
}

// 4. ARAHAN_PENGAJUAN_SURAT_BAGIAN_MESSAGE: update location to GMB IV Lt. 1
const arahanSuratOld = `   • 🏢 *Loket Persuratan & TU:* Gedung Mina Bahari I Lantai 1, Jl. Medan Merdeka Timur No. 16, Gambir, Jakarta Pusat.\\n\\n\``;
const arahanSuratNew = `   • 🏢 *Loket Persuratan & TU:* Gedung Mina Bahari (GMB) IV Lantai 1, Jl. Medan Merdeka Timur No. 16, Gambir, Jakarta Pusat (Senin–Kamis pukul 08.00–15.30 WIB).\\n\\n\``;

if (content.includes(arahanSuratOld)) {
    content = content.replace(arahanSuratOld, arahanSuratNew);
    console.log('✓ Updated ARAHAN_PENGAJUAN_SURAT_BAGIAN_MESSAGE location');
} else {
    console.log('✗ Failed to find arahanSuratOld');
}

// 5. AKP_PENGADUAN_MESSAGE: remove footer
const akpPengaduanOld = `   🌐 *Portal Nasional SP4N-LAPOR!:* https://lapor.go.id\\n\\n\` +
    \`━━━━━━━━━━━━━━━━━━━━━━━━━\\n\` +
    \`💡 *Apakah panduan pengaduan AKP ini sudah menyelesaikan kebutuhan Anda?*\\n\` +
    \`• Balas *YA* jika informasi sudah cukup / tuntas.\\n\` +
    \`• Balas *BANTUAN* jika ingin menyampaikan laporan langsung ke Petugas PPID.\\n\` +
    \`• Ketik *0* untuk kembali ke Menu Utama.\\n\\n\` +
    \`Salam hormat.\`;`;

const akpPengaduanNew = `   🌐 *Portal Nasional SP4N-LAPOR!:* https://lapor.go.id\\n\\n\` +
    \`Salam hormat.\`;`;

if (content.includes(akpPengaduanOld)) {
    content = content.replace(akpPengaduanOld, akpPengaduanNew);
    console.log('✓ Updated AKP_PENGADUAN_MESSAGE');
} else {
    console.log('✗ Failed to find akpPengaduanOld');
}

// 6. PENGADUAN_UMUM_MESSAGE: remove footer
const pengaduanUmumOld = `   🔒 *Whistleblowing System (WBS Itjen):* https://wbs.kkp.go.id\\n\\n\` +
    \`━━━━━━━━━━━━━━━━━━━━━━━━━\\n\` +
    \`💡 *Apakah panduan pengaduan ini sudah menyelesaikan kebutuhan Anda?*\\n\` +
    \`• Balas *YA* jika informasi sudah cukup / tuntas.\\n\` +
    \`• Balas *BANTUAN* untuk menyampaikan aduan langsung ke Petugas PPID.\\n\` +
    \`• Ketik *0* untuk kembali ke Menu Utama.\\n\\n\` +
    \`Salam hormat.\`;`;

const pengaduanUmumNew = `   🔒 *Whistleblowing System (WBS Itjen):* https://wbs.kkp.go.id\\n\\n\` +
    \`Salam hormat.\`;`;

if (content.includes(pengaduanUmumOld)) {
    content = content.replace(pengaduanUmumOld, pengaduanUmumNew);
    console.log('✓ Updated PENGADUAN_UMUM_MESSAGE');
} else {
    console.log('✗ Failed to find pengaduanUmumOld');
}

// 7. formatReply: clean greeting and strip footers
const formatReplyOld = `function formatReply(text) {
    if (!text || typeof text !== 'string') return text;
    let cleaned = tracker.cleanWhatsAppFormatting(text.trim());

    // Cek jika sudah diawali variasi sapaan dengan nama "Halo #SahabatBahari Kak [Nama]," atau nama di baris kedua
    const regexWithName = /^(\\*|_)*(halo\\s+)?#?sahabat\\s*bahari(\\*|_)*[!,:-]?\\s*(kak\\s+[^\\n,]+)[!,:-]?\\s*/i;
    const matchName = cleaned.match(regexWithName);
    if (matchName) {
        cleaned = cleaned.replace(regexWithName, \`Halo #SahabatBahari \${matchName[4].trim()},\\n\\n\`);
        return cleaned;
    }

    // Cek jika sudah diawali variasi standar "Halo Sahabat Bahari", "#SahabatBahari", dsb
    const regex = /^(\\*|_)*(halo\\s+)?#?sahabat\\s*bahari(\\*|_)*[!,:-]?\\s*/i;
    if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, 'Halo #SahabatBahari,\\n\\n');
    } else {
        cleaned = \`Halo #SahabatBahari,\\n\\n\${cleaned}\`;
    }

    return cleaned;
}`;

const formatReplyNew = `function formatReply(text) {
    if (!text || typeof text !== 'string') return text;
    let cleaned = tracker.cleanWhatsAppFormatting(text.trim());

    // Bersihkan footer '💡 Apakah...' jika masih terbawa
    cleaned = cleaned.replace(/\\n*━━━━━━━━━━━━━━━━━━━━━━━━━\\n*💡\\s*\\*?Apakah[\\s\\S]*?(?:Salam hormat\\.|$)/i, '\\n\\nSalam hormat.').trim();
    cleaned = cleaned.replace(/\\n*───────────────────────────\\n*💡\\s*\\*?Has this information[\\s\\S]*?(?:Best regards\\.|$)/i, '\\n\\nBest regards.').trim();
    cleaned = cleaned.replace(/\\n+💡\\s*\\*?Apakah[\\s\\S]*?(?:Salam hormat\\.|$)/i, '\\n\\nSalam hormat.').trim();

    // Cek jika sudah diawali variasi sapaan dengan nama "Halo #SahabatBahari Kak [Nama]," (baik satu baris maupun terpisah)
    const regexWithName = /^(\\*|_)*(?:halo\\s+)?#?sahabat\\s*bahari(\\*|_)*[!,:-]?\\s*(?:\\n+)?\\s*(kak\\s+[^\\n,]+)[!,:-]?\\s*(?:\\n+)*/i;
    const matchName = cleaned.match(regexWithName);
    if (matchName) {
        cleaned = cleaned.replace(regexWithName, \`Halo #SahabatBahari \${matchName[3].trim()},\\n\\n\`);
        return cleaned;
    }

    // Cek jika sudah diawali variasi standar "Halo Sahabat Bahari", "#SahabatBahari", dsb
    const regex = /^(\\*|_)*(?:halo\\s+)?#?sahabat\\s*bahari(\\*|_)*[!,:-]?\\s*(?:\\n+)*/i;
    if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, 'Halo #SahabatBahari,\\n\\n');
    } else {
        cleaned = \`Halo #SahabatBahari,\\n\\n\${cleaned}\`;
    }

    return cleaned;
}`;

if (content.includes(formatReplyOld)) {
    content = content.replace(formatReplyOld, formatReplyNew);
    console.log('✓ Updated formatReply');
} else {
    console.log('✗ Failed to find formatReplyOld');
}

// 8. isSensitiveInfoProbingQuery: simplify response without UU 14/2008 disclaimer
const sensitiveOld = `    if (isSensitiveInfoProbingQuery(text)) {
        await connectUserToPetugas({
            sender,
            senderDetails,
            text: message.body,
            userReply:
                \`Halo #SahabatBahari,\\n\\n\` +
                \`Informasi mengenai data pribadi pejabat, kontak personal pimpinan, maupun data internal/rahasia kedinasan yang Anda tanyakan *tidak dapat diberikan secara otomatis oleh sistem bot* sesuai ketentuan UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik (Kategori Informasi yang Dikecualikan).\\n\\n\` +
                \`*Permintaan Anda langsung kami hubungkan ke Petugas PPID KKP* untuk verifikasi maksud dan dasar hukum permohonan informasi Anda.\\n\\n\` +
                \`Silakan tunggu tanggapan dari petugas kami. 🙏\\n\\n\` +
                \`_(Ketik *0* untuk kembali ke Menu Utama)_\`,
            adminAlertTitle: \`🔒🚨 *[PERINGATAN: PERMINTAAN INFORMASI SENSITIF / DATA INTERNAL]* 🚨🔒\`
        });
        return;
    }`;

const sensitiveNew = `    if (isSensitiveInfoProbingQuery(text)) {
        await connectUserToPetugas({
            sender,
            senderDetails,
            text: message.body,
            userReply:
                \`Halo #SahabatBahari,\\n\\n\` +
                \`Pesan Anda langsung kami alihkan dan hubungkan ke *Petugas Layanan PPID KKP* agar dapat dibantu lebih lanjut secara resmi. Mohon ditunggu ya, petugas kami akan segera membalas pesan Anda. 🙏\\n\\n\` +
                \`_(Ketik *0* untuk kembali ke Menu Utama)_\`,
            adminAlertTitle: \`🔒🚨 *[PERINGATAN: PERMINTAAN INFORMASI SENSITIF / DATA INTERNAL]* 🚨🔒\`
        });
        return;
    }`;

if (content.includes(sensitiveOld)) {
    content = content.replace(sensitiveOld, sensitiveNew);
    console.log('✓ Updated isSensitiveInfoProbingQuery userReply');
} else {
    console.log('✗ Failed to find sensitiveOld');
}

// 9. SELECT_KONTAK option 8 and substate handler for SELECT_LAPORAN
const kontakOld = `        else if (text === '7' || text.startsWith('7.') || text.startsWith('7 ') || /pengaduan|pungli|wbs|lapor/i.test(text)) contactKey = '7';

        if (contactKey && CONTACT_DETAILS[contactKey]) {
            await sendUserMessage(sender, CONTACT_DETAILS[contactKey] + getResolutionFooter(text));
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: \`Kontak KKP Pilihan #\${contactKey}\`,
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
                    topicContext: 'Daftar Kontak Resmi Layanan KKP',
                    isMultiChat: message.isMultiChat,
                    multiChatCount: message.multiChatCount,
                    isLongText: message.isLongText
                });
                await sendUserMessage(sender, replyText + getResolutionFooter(text));
            } catch (err) {
                await sendUserMessage(sender, "Silakan pilih angka *1* sampai *7* untuk rincian kontak yang Anda butuhkan, atau ketik *0* untuk kembali ke Menu Utama.");
            }
            return;
        }
    }`;

const kontakNew = `        else if (text === '7' || text.startsWith('7.') || text.startsWith('7 ') || /pengaduan|pungli|wbs|lapor/i.test(text)) contactKey = '7';
        else if (text === '8' || text.startsWith('8.') || text.startsWith('8 ') || /sdmao|biro sdm|kepegawaian|casn|cpns|pppk/i.test(text)) contactKey = '8';

        if (contactKey && CONTACT_DETAILS[contactKey]) {
            await sendUserMessage(sender, CONTACT_DETAILS[contactKey] + getResolutionFooter(text));
            tracker.recordConversation({
                phone: senderPhone,
                text: message.body,
                answer: \`Kontak KKP Pilihan #\${contactKey}\`,
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
                \`🌊 *LAYANAN INFORMASI PUBLIK DIGITAL PPID KKP* 🌊\\n\` +
                \`Kementerian Kelautan dan Perikanan Republik Indonesia\\n\\n\` +
                \`Halo #SahabatBahari! Selamat datang di Pusat Layanan Informasi Resmi KKP. Silakan pilih menu di bawah ini:\\n\\n\` +
                \`*1* 📋 Alur & Prosedur Permohonan Informasi Publik (PPID)\\n\` +
                \`*2* 🎯 Kebijakan Ekonomi Biru & Program Prioritas (PKPN)\\n\` +
                \`*3* 📑 Regulasi, Juknis & Informasi Publik KKP\\n\` +
                \`*4* 💼 Pendaftaran Awak Kapal Perikanan (AKP / E-LAUT)\\n\` +
                \`*5* ⚖️ Pengajuan Keberatan Informasi Publik\\n\` +
                \`*6* 📞 Saluran Pengaduan & Layanan Terpadu KKP\\n\\n\` +
                \`_Balas dengan mengetik angka (contoh: *1*) untuk memilih menu, atau ketik langsung pertanyaan/kendala spesifik Anda._\\n\\n\` +
                \`_(Ketik *BANTUAN* untuk terhubung langsung dengan Petugas PPID)_\`;
            await sendUserMessage(sender, menuText);
            return;
        }

        // Pilihan 1: Pengaduan Umum & Pelanggaran Perikanan (Ditjen PSDKP)
        if (text === '1' || text.startsWith('1.') || text.startsWith('1 ') || /\\b(psdkp|bom|cantrang|racun|pencurian ikan|wbs|pungli|destructive fishing|umum)\\b/i.test(text)) {
            userState[sender] = 'AI_MODE';
            const answerPilihan1 =
                \`Halo #SahabatBahari,\\n\\n\` +
                \`🚨 *LAYANAN PENGADUAN UMUM & PELANGGARAN PERIKANAN (DITJEN PSDKP)*\\n\\n\` +
                \`Untuk menyampaikan laporan pelanggaran tindak pidana perikanan (*destructive fishing*, bom ikan, alat tangkap dilarang, kapal ikan ilegal) maupun pengaduan masyarakat umum, silakan hubungi kanal resmi berikut:\\n\\n\` +
                \`• 📞 *Call Center Terpadu KKP:* 141\\n\` +
                \`• 📱 *Hotline Ditjen PSDKP:* +62 811-947-141\\n\` +
                \`• 📧 *Email Pengaduan KKP:* pengaduan@kkp.go.id\\n\` +
                \`• 🌐 *Portal SP4N-LAPOR!:* https://lapor.go.id\\n\` +
                \`• 🔒 *Whistleblowing System (WBS Pungli/Korupsi):* https://wbs.kkp.go.id\\n\\n\` +
                \`Mohon sertakan kronologi kejadian, perkiraan lokasi koordinat, waktu, dan foto/video dokumentasi pendukung. Seluruh identitas pelapor dijamin kerahasiaannya.\\n\\n\` +
                \`Salam hormat.\`;
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
        if (text === '2' || text.startsWith('2.') || text.startsWith('2 ') || /\\b(prl|ruang laut|pulau|pulau kecil|penyu|satwa|hiu|pkkprl|reklamasi|pesisir)\\b/i.test(text)) {
            userState[sender] = 'AI_MODE';
            const answerPilihan2 =
                \`Halo #SahabatBahari,\\n\\n\` +
                \`🏝️ *LAYANAN PENGAWASAN RUANG LAUT & PULAU-PULAU KECIL (DITJEN PRL)*\\n\\n\` +
                \`Terkait laporan pelanggaran izin ruang laut, pemanfaatan pulau-pulau kecil ilegal, reklamasi, pencemaran pesisir, maupun perlindungan satwa/biota laut dilindungi (seperti penyu dan hiu), silakan sampaikan melalui:\\n\\n\` +
                \`• 📱 *Hotline Pengendalian Ruang Laut:* +62 811-1012-0010\\n\` +
                \`• 📱 *Hotline Pelayanan Ruang Laut (PRL):* +62 877-6225-0001\\n\` +
                \`• 📞 *Call Center Terpadu KKP:* 141\\n\` +
                \`• 📧 *Email:* humas.prl@kkp.go.id\\n\\n\` +
                \`Petugas pengawasan Ditjen Pengelolaan Kelautan dan Ruang Laut (PKRL) akan menindaklanjuti data lapangan dan perizinan terkait.\\n\\n\` +
                \`Salam hormat.\`;
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
        if (text === '3' || text.startsWith('3.') || text.startsWith('3 ') || /\\b(akp|abk|awak kapal|pelaut|gaji|upah|pkl|kecelakaan)\\b/i.test(text)) {
            userState[sender] = 'AI_MODE';
            const answerPilihan3 =
                \`Halo #SahabatBahari,\\n\\n\` +
                \`⚓ *LAYANAN PERLINDUNGAN & PENGADUAN AWAK KAPAL PERIKANAN (AKP / ABK)*\\n\\n\` +
                \`Bagi awak kapal atau keluarga yang ingin mengadukan permasalahan ketenagakerjaan di kapal (seperti penahanan gaji, kecelakaan kerja, penelantaran, atau pelanggaran Perjanjian Kerja Laut), silakan hubungi:\\n\\n\` +
                \`• 📱 *Hotline Pengaduan AKP:* 0811-251-744\\n\` +
                \`• 📞 *Call Center Gangguan Operasional AKP:* +62 811-1000-3132\\n\` +
                \`• 🌐 *Portal SP4N-LAPOR!:* https://lapor.go.id\\n\\n\` +
                \`Siapkan data pendukung berupa Nama Kapal, Nama Agen/Pemilik, Salinan PKL (Perjanjian Kerja Laut), dan kronologi kejadian.\\n\\n\` +
                \`Salam hormat.\`;
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
            await sendUserMessage(sender, \`Silakan pilih angka *1* (Laporan Umum/PSDKP), *2* (Ruang Laut/Pulau), atau *3* (Awak Kapal/AKP), atau ketik langsung kendala spesifik Anda.\`);
            return;
        }
    }`;

if (content.includes(kontakOld)) {
    content = content.replace(kontakOld, kontakNew);
    console.log('✓ Updated SELECT_KONTAK & Added SELECT_LAPORAN substate');
} else {
    console.log('✗ Failed to find kontakOld');
}

// 10. PKPN_KNMP_MENU option 5: update Satgas Pembangunan KNMP contact
const knmp5Old = `        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ') || /kontak|satgas|wa|call center|nomor/i.test(text)) {
            await sendUserMessage(sender,
                \`☎️ *KONTAK RESMI SATGAS OPERASIONALISASI KNMP (Kepmen KP 20/2026)*\\n\\n\` +
                \`📱 *WhatsApp Official KNMP:* +62 822-9936-9004\\n\` +
                \`☎️ *Call Center:* 1500587\\n\` +
                \`📧 *Email:* korwil@merahputih.kop.id\\n\` +
                \`📸 *Instagram:* @knmp_indonesia\\n\\n\` +
                \`Gunakan kontak resmi di atas untuk konsultasi teknis kawasan, pendampingan kelembagaan KDMP, atau pengaduan operasional fasilitas pabrik es dan mesin pendingin.\\n\\n\` +
                \`━━━━━━━━━━━━━━━━━━━━━━━━━\\n\` +
                \`💡 *Apakah informasi kontak Satgas KNMP ini sudah tuntas?*\\n\` +
                \`• Balas *YA* jika sudah selesai.\\n\` +
                \`• Atau balas angka *1* - *4* untuk informasi KNMP lainnya.\\n\` +
                \`• Ketik *0* untuk kembali ke Menu PKPN.\\n\` +
                \`• Ketik *MENU* untuk kembali ke Menu Utama.\`
            );
            return;`;

const knmp5New = `        } else if (text === '5' || text.startsWith('5.') || text.startsWith('5 ') || /kontak|satgas|wa|call center|nomor/i.test(text)) {
            await sendUserMessage(sender,
                \`☎️ *KONTAK RESMI SATGAS OPERASIONALISASI & PEMBANGUNAN KNMP*\\n\\n\` +
                \`Halo #SahabatBahari, berikut informasi yang kita dapatkan mengenai kontak Satgas Pembangunan KNMP sesuai kebutuhan sahabat:\\n\\n\` +
                \`🔗 *Tautan Informasi Resmi Satgas KNMP:*\\n\` +
                \`https://www.instagram.com/p/DeB4FFpmnJg/?utm_source=ig_web_copy_link&gwpx=NTc4MTIwNjQ2YQ==\\n\\n\` +
                \`*Koreksi Kontak Wilayah:*\\n\` +
                \`• *Regional Kalimantan:* Fakhri (0852-8734-7969)\\n\\n\` +
                \`Salam hormat.\`
            );
            return;`;

if (content.includes(knmp5Old)) {
    content = content.replace(knmp5Old, knmp5New);
    console.log('✓ Updated PKPN_KNMP_MENU Option 5');
} else {
    console.log('✗ Failed to find knmp5Old');
}

// 11. Main query interceptors: Add isGenericReportInquiry before isPengaduanAkpQuery in both places
const mainIntercept1Old = `        // 🔒 Intercept Pengaduan AKP / ABK
        if (isPengaduanAkpQuery(text)) {`;

const mainIntercept1New = `        // 📢 Intercept Ingin Laporan Umum -> Tampilkan 3 Pilihan Laporan (Umum, PRL, AKP)
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
        if (isPengaduanAkpQuery(text)) {`;

if (content.includes(mainIntercept1Old)) {
    content = content.replace(mainIntercept1Old, mainIntercept1New);
    console.log('✓ Updated main query interceptor 1');
} else {
    console.log('✗ Failed to find mainIntercept1Old');
}

const mainIntercept2Old = `            // 🔒 1. Intercept Pengaduan AKP / ABK
            if (isPengaduanAkpQuery(text)) {`;

const mainIntercept2New = `            // 📢 0. Intercept Ingin Laporan Umum -> Tampilkan 3 Pilihan Laporan (Umum, PRL, AKP)
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
            if (isPengaduanAkpQuery(text)) {`;

if (content.includes(mainIntercept2Old)) {
    content = content.replace(mainIntercept2Old, mainIntercept2New);
    console.log('✓ Updated main query interceptor 2');
} else {
    console.log('✗ Failed to find mainIntercept2Old');
}

fs.writeFileSync('index.js', content, 'utf8');
console.log('index.js updated successfully!');

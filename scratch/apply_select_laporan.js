const fs = require('fs');

let content = fs.readFileSync('index.js', 'utf8');

const targetStr = `        else if (text === '7' || text.startsWith('7.') || text.startsWith('7 ') || /pengaduan|pungli|wbs|lapor/i.test(text)) contactKey = '7';`;

const replacementStr = `        else if (text === '7' || text.startsWith('7.') || text.startsWith('7 ') || /pengaduan|pungli|wbs|lapor/i.test(text)) contactKey = '7';
        else if (text === '8' || text.startsWith('8.') || text.startsWith('8 ') || /sdmao|biro sdm|kepegawaian|casn|cpns|pppk/i.test(text)) contactKey = '8';`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    console.log('✓ Added contactKey 8 to SELECT_KONTAK');
} else {
    console.log('✗ Failed to find contactKey 7');
}

// Update error message: 1 sampai 7 -> 1 sampai 8
const errOld = `await sendUserMessage(sender, "Silakan pilih angka *1* sampai *7* untuk rincian kontak yang Anda butuhkan, atau ketik *0* untuk kembali ke Menu Utama.");`;
const errNew = `await sendUserMessage(sender, "Silakan pilih angka *1* sampai *8* untuk rincian kontak yang Anda butuhkan, atau ketik *0* untuk kembali ke Menu Utama.");`;

if (content.includes(errOld)) {
    content = content.replace(errOld, errNew);
    console.log('✓ Updated error prompt in SELECT_KONTAK');
} else {
    console.log('✗ Failed to find errOld');
}

// Add SELECT_LAPORAN substate right after SELECT_KONTAK block
const afterBlock = `        }
    }

    // ==========================================
    // 📞 6. DETEKSI CEPAT: PERMINTAAN KONTAK / CALL CENTER RESMI KKP`;

const newBlock = `        }
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
    }

    // ==========================================
    // 📞 6. DETEKSI CEPAT: PERMINTAAN KONTAK / CALL CENTER RESMI KKP`;

if (content.includes(afterBlock)) {
    content = content.replace(afterBlock, newBlock);
    console.log('✓ Added SELECT_LAPORAN substate block');
} else {
    console.log('✗ Failed to find afterBlock');
}

fs.writeFileSync('index.js', content, 'utf8');
console.log('Done!');

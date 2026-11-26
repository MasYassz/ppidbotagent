require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getRelevantFaqContext(queryText, limit = 3) {
    if (!queryText || typeof queryText !== 'string') return '';
    try {
        const faqData = JSON.parse(fs.readFileSync('./faq.json', 'utf8'));
        const cleanQuery = queryText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        const queryTokens = cleanQuery.split(/\s+/).filter(w => w.length > 2);

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

            for (const kw of keywords) {
                const kwLower = kw.toLowerCase().trim();
                if (cleanQuery.includes(kwLower)) {
                    score += 15 + kwLower.length;
                }
            }

            for (const token of queryTokens) {
                if (stopWords.has(token)) continue;
                for (const kw of keywords) {
                    const kwTokens = kw.toLowerCase().split(/\s+/);
                    if (kwTokens.includes(token)) score += 5;
                }
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
        return '';
    }
}

async function testSynthesis(scenarioTitle, userMessages, isMultiChat, isLongText) {
    console.log(`\n========================================`);
    console.log(`SCENARIO: ${scenarioTitle}`);
    console.log(`Input Messages:`, userMessages);

    const fullText = Array.isArray(userMessages) ? userMessages.join('\n') : userMessages;
    const faqContext = getRelevantFaqContext(fullText, 3);

    let systemAdditions = `
[ATURAN KONTAK RESMI KKP]: Jika menyebutkan kontak atau saluran pelaporan, HANYA gunakan nomor resmi KKP: Call Center 141, WA Pengaduan/PSDKP 0811-9890-11, WA PTSA 0811-8430-610, WA PPID 0811-1146-141, WA Perlindungan Awak Kapal (AKP) 0811-251-744, WA Budi Daya (DJPB) 0822-6150-5727, WA Pinjaman LPMUKP 0811-9877-676. DILARANG KERAS MENGARANG nomor seperti 196, 159, atau nomor WhatsApp fiktif!
`;

    if (isMultiChat) {
        systemAdditions += `
[INSTRUKSI MULTI-CHAT (${Array.isArray(userMessages) ? userMessages.length : 2} PESAN BERURUTAN)]:
Pemohon mengirimkan beberapa pesan chat berurutan. Anda WAJIB merespons layaknya petugas layanan customer service manusia yang hangat, empatik, responsif, dan profesional (JANGAN KAKU ATAU TERLALU SEPERTI ROBOT):
1. Awali dengan merumuskan SATU kesimpulan inti kebutuhan pemohon di awal jawaban (contoh: "Halo #SahabatBahari,\n\nTerima kasih atas pesan yang Anda sampaikan. Dari rangkaian pesan yang Bapak/Ibu kirimkan, kami simpulkan bahwa Anda membutuhkan informasi mengenai [kesimpulan inti kebutuhan pemohon]...").
2. Berikan HANYA 1 RESPON TUNGGAL terpadu yang komprehensif, padat, dan menjawab menyeluruh seluruh pertanyaan/kendala pemohon dalam rangkaian chat tersebut.
3. Jangan memecah jawaban atau mengulang menu berulang kali.
`;
    }

    if (isLongText) {
        systemAdditions += `
[INSTRUKSI ANALISIS LONGTEXT]:
Pesan pemohon memuat narasi/kronologi panjang atau gabungan banyak kalimat.
1. Bedah secara mendalam dan identifikasi INTI PERMINTAAN atau PERTANYAAN UTAMA yang sebenarnya dibutuhkan pemohon.
2. JANGAN mengulang atau merangkum cerita kronologi pemohon yang panjang.
3. Langsung berikan jawaban to-the-point, terstruktur (maksimal 3-5 poin ringkas), solutif, dan ramah yang menyasar tepat pada inti persoalan pemohon.
`;
    }

    const contextualPrompt =
        `[INSTRUKSI SISTEM TAMBAHAN]:${systemAdditions}\n\n` +
        (faqContext ? `[DATABASE RESMI KKP & FAQ TERVERIFIKASI]:\n${faqContext}\n\n` : '') +
        `[PESAN PEMOHON]:\n${fullText}\n\n` +
        `Jawablah secara terstruktur, ramah, manusiawi, dan pastikan seluruh nomor kontak serta prosedur 100% akurat sesuai Database KKP di atas.`;

    const aiModel = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        systemInstruction: `Anda adalah Asisten Virtual resmi dari PPID Kementerian Kelautan dan Perikanan (KKP) RI.
Awali dengan: "Halo #SahabatBahari,"
Akhiri dengan: "Salam hormat."
Gunakan tanda bintang tunggal *teks* untuk bold (DILARANG **).
Responlah dengan ramah, empatik, dan solutif layaknya petugas layanan manusia.`
    });

    const result = await aiModel.generateContent(contextualPrompt);
    console.log(`\nAI RESPONSE:`);
    console.log(result.response.text());
}

async function run() {
    // Skenario 1: Multi-Chat (3 chat berurutan tentang budidaya & bantuan)
    await testSynthesis(
        "Multi-Chat Pengajuan Bantuan Budidaya & Juknis",
        [
            "pagi min",
            "kelompok tani kami di brebes mau coba budidaya udang vaname dan ikan nila",
            "kira-kira ada bantuan bibit atau sarana dari kkp gak ya min? syarat dan cara unduh juknisnya gimana?"
        ],
        true,
        false
    );

    // Skenario 2: Longtext Pelaporan Penangkapan Penyu Ilegal
    await testSynthesis(
        "Longtext Pelaporan Penangkapan Penyu Ilegal di Kawasan Konservasi",
        "Selamat siang admin kkp, saya warga lokal yang tinggal di sekitar pesisir pantai gili trawangan lombok. Kemarin sore sekitar jam 17.00 wita saya bersama beberapa warga melihat perahu tak dikenal sengaja menangkap penyu laut yang sedang bertelur dan membawanya kabur. Kami sempat foto perahunya dari kejauhan tapi bingung harus lapor kemana karena ini satwa dilindungi dan takut ada oknum. Mohon bantuannya kemana nomor resmi yang bisa kami hubungi segera dan apa saja yang harus kami siapkan agar pelakunya bisa ditangkap?",
        false,
        true
    );

    // Skenario 3: Multi-Chat Tanya Kontak & Rekrutmen ABK
    await testSynthesis(
        "Multi-Chat Rekrutmen ABK & Kontak Pengaduan",
        [
            "halo pak mau tanya loker untuk abk kapal penangkap ikan",
            "syaratnya apa aja ya pak dan kalau ada calo atau gaji gak dibayar harus lapor kemana?"
        ],
        true,
        false
    );
}

run();

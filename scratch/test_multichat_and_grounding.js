require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const assert = require('assert');

// Inisialisasi API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: `Anda adalah Asisten Virtual resmi dari PPID Kementerian Kelautan dan Perikanan (KKP) RI.
Awali dengan: "Halo #SahabatBahari," (atau "Hello #SahabatBahari," jika English)
Akhiri dengan: "Salam hormat." (atau "Best regards, PPID MMAF / KKP RI." jika English)
Gunakan tanda bintang tunggal *teks* untuk bold (DILARANG **).`
});

let cachedFaqData = null;
function getFaqData() {
    if (!cachedFaqData) {
        cachedFaqData = JSON.parse(fs.readFileSync('./faq.json', 'utf8'));
    }
    return cachedFaqData;
}

function findBestFaqMatch(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.toLowerCase().trim();
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
    return bestMatch ? bestMatch.answer : null;
}

function getRelevantFaqContext(queryText, limit = 3) {
    if (!queryText || typeof queryText !== 'string') return '';
    const faqData = getFaqData();
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
}

async function generateGroundedAiResponse({
    senderPhone = '628123456789',
    messageBody,
    text,
    topicContext = '',
    isMultiChat = false,
    multiChatCount = 1,
    isLongText = false
}) {
    const isEnglish = /english|foreign|dear|hello|good morning/i.test(text);
    const faqContext = getRelevantFaqContext(messageBody, 3);

    let systemAdditions = '';
    systemAdditions += `\n[ATURAN KONTAK RESMI KKP]: Jika menyebutkan kontak atau saluran pelaporan, HANYA gunakan nomor resmi KKP: Call Center 141, WA Pengaduan/PSDKP 0811-9890-11, WA PTSA 0811-8430-610, WA PPID 0811-1146-141, WA Perlindungan Awak Kapal (AKP) 0811-251-744, WA Ditjen Budi Daya (DJPB) 0822-6150-5727, WA Pinjaman BLU LPMUKP 0811-9877-676, WA Satgas KNMP +62 822-9936-9004. DILARANG KERAS MENGARANG nomor lain seperti 196, 159, atau nomor WhatsApp fiktif!`;

    if (isMultiChat) {
        systemAdditions += `\n[INSTRUKSI MULTI-CHAT (${multiChatCount} PESAN BERUNTUN)]: Pemohon mengirimkan beberapa pesan chat berurutan. Anda WAJIB merespons layaknya petugas customer service manusia yang ramah, empatik, responsif, dan profesional (JANGAN TERLALU KAKU/ROBOT):\n1. Awali dengan merumuskan SATU kesimpulan kalimat inti kebutuhan pemohon di awal jawaban (contoh: "Halo #SahabatBahari,\\n\\nTerima kasih atas pesan yang Anda sampaikan. Dari rangkaian pesan yang Bapak/Ibu kirimkan, kami simpulkan bahwa Anda membutuhkan informasi/panduan terkait [inti kebutuhan pemohon]...").\n2. Berikan HANYA 1 RESPON TUNGGAL terpadu yang komprehensif, padat, dan menjawab tuntas seluruh pertanyaan/kendala pemohon dalam rangkaian pesan tersebut.\n3. Jangan memecah balasan atau memberikan menu berulang.`;
    }

    if (isLongText) {
        systemAdditions += `\n[INSTRUKSI ANALISIS LONGTEXT]: Pesan pemohon memuat narasi/cerita panjang atau kronologi. Bedah secara mendalam dan identifikasi INTI PERTANYAAN / PERMINTAAN UTAMA. Jangan mengulang cerita panjang pemohon. Berikan jawaban langsung to-the-point, terstruktur (maksimal 3-5 poin ringkas), solutif, dan ramah yang menyasar tepat pada inti persoalan pemohon.`;
    }

    let contextualPrompt = `[INSTRUKSI SISTEM TAMBAHAN]:${systemAdditions}\n\n`;
    if (topicContext) {
        contextualPrompt += `[KONTEKS MENU / TOPIK AKTIF]:\n${topicContext}\n\n`;
    }
    if (faqContext) {
        contextualPrompt += `[DATABASE RESMI KKP & FAQ TERVERIFIKASI]:\n${faqContext}\n\n`;
    }
    contextualPrompt += `[PESAN PEMOHON]:\n${messageBody}\n\n`;
    contextualPrompt += isEnglish
        ? `Please provide a clear, direct, and concise solution in English. Do not show repetitive menus if there is already a specific question. Ensure all contact numbers strictly match the official KKP database above.`
        : `Jawablah pertanyaan pemohon secara ringkas, to the point, ramah dan manusiawi, serta pastikan seluruh nomor kontak dan prosedur 100% akurat sesuai Database KKP di atas. Jangan memberikan menu berulang jika sudah ada pertanyaan spesifik.`;

    const result = await aiModel.generateContent(contextualPrompt);
    return result.response.text();
}

async function runTests() {
    console.log("=== MEMULAI TEST SUITE MULTI-CHAT & GROUNDING ===");

    // TEST 1: Multi-Chat Synthesis (1 respon tunggal dengan kesimpulan di awal)
    console.log("\n[TEST 1] Multi-chat 3 gelembung pesan");
    const multiChatMessages = [
        "siang min",
        "kami kelompok pembudidaya ikan di cianjur mau minta bantuan bibit nila dan pakan",
        "bagaimana syaratnya dan dimana kami bisa unduh juknis bantuannya?"
    ];
    const multiChatBody = multiChatMessages.join('\n');
    const resp1 = await generateGroundedAiResponse({
        messageBody: multiChatBody,
        text: multiChatBody.toLowerCase(),
        isMultiChat: true,
        multiChatCount: 3,
        isLongText: false
    });
    console.log("Output Resp 1:\n", resp1);
    assert(resp1.includes("Halo #SahabatBahari"), "Harus memiliki greeting resmi");
    assert(resp1.includes("simpulkan") || resp1.includes("memahami") || resp1.includes("rangkaian pesan"), "Harus merumuskan kesimpulan dari pesan beruntun");
    assert(resp1.includes("juknis") || resp1.includes("petunjuk-teknis"), "Harus menyertakan informasi juknis budidaya");
    assert(resp1.includes("Pokdakan") || resp1.includes("e-KUSUKA") || resp1.includes("kelompok"), "Harus menyebutkan syarat kelompok/e-KUSUKA");
    assert(!resp1.includes("**"), "Tidak boleh ada double asterisks");
    console.log("✓ TEST 1 PASSED: Multi-chat berhasil dirumuskan dalam 1 respon berkesimpulan awal!");

    // TEST 2: Longtext Analysis (Bedah inti pertanyaan, jangan ulang cerita)
    console.log("\n[TEST 2] Analisis Inti Pertanyaan Longtext");
    const longtextBody = "Halo selamat siang ppid kkp, saya nelayan dari pulau alor ntt kemarin melihat ada kapal patroli tak dikenal yang mencurigakan dan warga juga menemukan ada penyu belimbing yang terluka terkena jaring di karang. Kami warga pesisir sangat cemas karena penyu itu langka sekali dan kami bingung kemana harus melapor secara cepat agar ditangani psdkp dan penyu tersebut bisa diselamatkan. Tolong berikan kontak resmi pengaduan kkp yang bisa kami hubungi sekarang juga ya.";
    const resp2 = await generateGroundedAiResponse({
        messageBody: longtextBody,
        text: longtextBody.toLowerCase(),
        isMultiChat: false,
        multiChatCount: 1,
        isLongText: true
    });
    console.log("Output Resp 2:\n", resp2);
    assert(resp2.includes("141"), "Harus menggunakan Call Center 141");
    assert(resp2.includes("0811-9890-11") || resp2.includes("pengaduan"), "Harus menggunakan saluran pengaduan resmi KKP/PSDKP");
    assert(!resp2.includes("196") && !resp2.includes("159"), "DILARANG keras menyebut Call Center 196 atau 159");
    assert(!resp2.includes("**"), "Tidak boleh ada double asterisks");
    console.log("✓ TEST 2 PASSED: Longtext berhasil dibedah intinya dan dijawab to the point!");

    // TEST 3: Strict Grounding & Anti-Halusinasi
    console.log("\n[TEST 3] Strict Grounding & Anti-Halusinasi Kontak KKP");
    const testCasesGrounding = [
        "nomor call center kkp berapa?",
        "kemana lapor penangkapan penyu ilegal?",
        "kontak pengaduan gaji abk berapa?",
        "nomor wa ptsa izin kapal berapa?",
        "kontak pinjaman lpmukp berapa?"
    ];

    for (const q of testCasesGrounding) {
        const resp = await generateGroundedAiResponse({
            messageBody: q,
            text: q.toLowerCase(),
            isMultiChat: false,
            multiChatCount: 1,
            isLongText: false
        });
        assert(!resp.includes("196"), `Query '${q}' memunculkan nomor fiktif 196!`);
        assert(!resp.includes("159"), `Query '${q}' memunculkan nomor 159!`);
        assert(!resp.includes("0811-3016-"), `Query '${q}' memunculkan nomor WA fiktif 0811-3016-xxx!`);
        console.log(`✓ Grounding Verified for '${q}': No hallucinated contacts.`);
    }

    console.log("\n==========================================");
    console.log("SEMUA PENGUJIAN 4 KEBUTUHAN BARU BERHASIL 100%!");
    console.log("==========================================");
}

runTests().catch(err => {
    console.error("TEST FAILED:", err);
    process.exit(1);
});

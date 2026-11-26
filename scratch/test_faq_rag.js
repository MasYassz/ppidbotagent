const fs = require('fs');

function getRelevantFaqContext(queryText, limit = 3) {
    if (!queryText || typeof queryText !== 'string') return '';
    try {
        const faqData = JSON.parse(fs.readFileSync('./faq.json', 'utf8'));
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
                    score += 15 + kwLower.length; // Bobot besar untuk frasa keyword yang cocok
                }
            }

            // 2. Cek token overlap dengan keywords
            for (const token of queryTokens) {
                if (stopWords.has(token)) continue;

                for (const kw of keywords) {
                    const kwTokens = kw.toLowerCase().split(/\s+/);
                    if (kwTokens.includes(token)) {
                        score += 5;
                    }
                }

                // 3. Cek kemunculan di teks jawaban
                if (answer.includes(token)) {
                    score += 1;
                }
            }

            if (score > 0) {
                scoredItems.push({ item, score });
            }
        }

        // Urutkan berdasarkan skor tertinggi
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

// Test cases
console.log("=== TEST 1: Penyu Ilegal ===");
console.log(getRelevantFaqContext("bagaimana langkah pelaporan penangkapan penyu ilegal di pantai gili?", 2));

console.log("\n=== TEST 2: Multi Chat (Bantuan Budidaya & Juknis) ===");
console.log(getRelevantFaqContext("saya mau tanya soal budidaya ikan nila dan apakah ada bantuan bibit serta juknisnya?", 2));

console.log("\n=== TEST 3: Kontak & Pengaduan ABK ===");
console.log(getRelevantFaqContext("gaji abk tidak dibayar oleh agen kapal, kemana harus lapor?", 2));

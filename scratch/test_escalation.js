function isEscalationQuery(text) {
    const t = (text || '').toLowerCase().trim();

    // 1. Menu angka 6
    if (t === '6') return true;

    // 2. Proteksi Bantuan Pemerintah: Jika mengandung topik bantuan sarana/bantuan program KKP, BUKAN eskalasi!
    const bantuanPemerintahKeywords = [
        'bantuan alat', 'alat tangkap', 'bantuan kapal', 'bantuan perahu',
        'bantuan mesin', 'bantuan benih', 'bantuan bibit', 'bantuan pakan',
        'bantuan kolam', 'bantuan tambak', 'bantuan budidaya', 'bantuan budi daya',
        'bantuan bioflok', 'bantuan jaring', 'bantuan rumpon', 'bantuan modal',
        'bantuan dana', 'bantuan uang', 'bantuan hibah', 'bantuan pupuk',
        'bantuan pemerintah', 'bantuan pokdakan', 'bantuan kelompok',
        'bantuan nelayan', 'juknis bantuan', 'proposal bantuan', 'syarat bantuan',
        'info bantuan', 'daftar bantuan', 'cara dapat bantuan', 'ada bantuan',
        'dapat bantuan', 'bantuan kkp', 'bantuan dari kkp', 'program bantuan'
    ];
    if (bantuanPemerintahKeywords.some(k => t.includes(k))) {
        return false;
    }

    // 3. Perintah tunggal atau kata kunci pasti untuk minta bantuan manusia / CS
    const exactCommands = [
        'bantuan', 'help', 'cs', 'petugas', 'admin', 'operator', 'manusia',
        'live chat', 'livechat', 'hubungi petugas', 'hubungi admin',
        'hubungi cs', 'bicara dengan petugas', 'bicara dengan manusia',
        'chat petugas', 'chat admin', 'chat cs', 'minta bantuan',
        'butuh bantuan', 'sambungkan ke petugas', 'terhubung ke petugas',
        'petugas ppid', 'operator ppid'
    ];
    if (exactCommands.includes(t)) return true;

    // 4. Pola frasa eksplisit ingin terhubung ke petugas / CS manusia
    const escalationPatterns = [
        /\b(hubungi|bicara|sambung(kan)?|terhubung|kontak|pindah(kan)?)\s+(dengan\s+|ke\s+)?(petugas|cs|customer service|admin|operator|manusia)\b/i,
        /\b(mau|ingin|bisa)\s+(bicara|ngobrol|chat|konsultasi)\s+(sama\s+|dengan\s+)?(petugas|cs|admin|manusia|orang)\b/i,
        /\b(minta|butuh|tolong)\s+(bantuan\s+)?(petugas|cs|admin|manusia)\b/i,
        /\b(petugas|cs|admin)\s+(asli|manusia|helpdesk|pelayanan)\b/i,
        /\b(live\s*chat|livechat)\b/i
    ];

    if (escalationPatterns.some(pattern => pattern.test(t))) {
        return true;
    }

    // 5. Kalimat sangat pendek (<= 3 kata) yang spesifik mengandung kata kunci eskalasi
    const words = t.split(/\s+/);
    if (words.length <= 3) {
        if (words.includes('petugas') || words.includes('cs') || words.includes('admin') || words.includes('operator')) {
            return true;
        }
        if (words.includes('bantuan') && (words.includes('butuh') || words.includes('minta') || words.includes('tolong') || words.includes('dong') || words.includes('min') || words.includes('kak'))) {
            return true;
        }
    }

    return false;
}

const testCases = [
    { text: "Saya mau tanya untuk bantuan alat tangkap juga gimana ya pak", expected: false },
    { text: "Bantuan alat tangkap apakah ada dari kkp", expected: false },
    { text: "BANTUAN", expected: true },
    { text: "bantuan", expected: true },
    { text: "minta bantuan petugas", expected: true },
    { text: "mau bicara dengan cs", expected: true },
    { text: "6", expected: true },
    { text: "Gaji suami saya sebagai ABK kapal belum dibayarkan oleh agen", expected: false },
    { text: "Apakah ada bantuan kapal untuk nelayan?", expected: false },
    { text: "Syarat proposal bantuan benih ikan nila", expected: false },
    { text: "bantuan min", expected: true },
    { text: "tolong bantuan kak", expected: true }
];

console.log("=== TEST IS ESCALATION QUERY ===");
let allPassed = true;
testCases.forEach((tc, idx) => {
    const res = isEscalationQuery(tc.text);
    const pass = res === tc.expected;
    if (!pass) allPassed = false;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] "${tc.text}" => Got: ${res}, Expected: ${tc.expected}`);
});

console.log("All passed?", allPassed);


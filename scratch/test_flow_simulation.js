const fs = require('fs');

// Load index.js logic
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

function isPengaduanAkpQuery(text) {
    const t = (text || '').toLowerCase();
    const hasAkpAbk = /\b(akp|abk|awak kapal|pelaut|pelaut perikanan)\b/.test(t);
    const hasPengaduan = /\b(pengaduan|aduan|lapor|laporkan|keluhan|gaji|kecelakaan|ditahan|masalah|kasus|korban)\b/.test(t);
    const specificKeywords = [
        'pengaduan akp', 'pengaduan abk', 'lapor akp', 'lapor abk',
        'gaji abk', 'gaji akp', 'abk ditahan', 'abk disiksa', 'abk terlantar',
        'kecelakaan kapal abk', 'kecelakaan akp', 'masalah abk', 'masalah akp',
        'gangguan operasional akp', 'aduan akp', 'aduan abk'
    ];
    return specificKeywords.some(k => t.includes(k)) || (hasAkpAbk && hasPengaduan);
}

function isPengaduanQuery(text) {
    const t = (text || '').toLowerCase();
    const keywords = [
        'pengaduan', 'lapor', 'laporkan', 'aduan', 'melaporkan', 'keluhan',
        'pungli', 'whistleblower', 'wbs', 'pelanggaran perikanan', 'lapor.go.id'
    ];
    return keywords.some(k => t.includes(k));
}

function isEscalationQuery(text) {
    const t = (text || '').toLowerCase().trim();

    if (t === '6') return true;

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

    const exactCommands = [
        'bantuan', 'help', 'cs', 'petugas', 'admin', 'operator', 'manusia',
        'live chat', 'livechat', 'hubungi petugas', 'hubungi admin',
        'hubungi cs', 'bicara dengan petugas', 'bicara dengan manusia',
        'chat petugas', 'chat admin', 'chat cs', 'minta bantuan',
        'butuh bantuan', 'sambungkan ke petugas', 'terhubung ke petugas',
        'petugas ppid', 'operator ppid'
    ];
    if (exactCommands.includes(t)) return true;

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

const faq = JSON.parse(fs.readFileSync('c:/Users/ILYAS/Downloads/whatsapp-agent/faq.json', 'utf8'));

function simulateIncomingMessage(text, currentChatCount = 1) {
    const t = text.toLowerCase().trim();

    // Check escalation first
    if (isEscalationQuery(t)) {
        if (t === '6' || t === 'bantuan' || currentChatCount >= 1) {
            return { action: 'CONNECT_CS', reply: '👨‍💻 Terhubung ke Petugas PPID' };
        } else {
            return { action: 'SUGGEST_AI', reply: 'Layanan petugas diprioritaskan...' };
        }
    }

    // Check perizinan
    if (isPerizinanQuery(t)) {
        return { action: 'PERIZINAN_PTSA', reply: 'Terkait permohonan perizinan...' };
    }

    // Check AKP
    if (isPengaduanAkpQuery(t)) {
        return { action: 'PENGADUAN_AKP', reply: 'Pengaduan AKP...' };
    }

    // Check Pengaduan Umum
    if (isPengaduanQuery(t)) {
        return { action: 'PENGADUAN_UMUM', reply: 'Layanan Pengaduan KKP...' };
    }

    // Check FAQ
    const matchedFaq = faq.find(item => item.keywords.some(k => t.includes(k)));
    if (matchedFaq) {
        return { action: 'FAQ_MATCH', keyword: matchedFaq.keywords[0], reply: matchedFaq.answer.slice(0, 80) + '...' };
    }

    // Fallback to Gemini AI
    return { action: 'CALL_AI', reply: 'Dijawab oleh Gemini AI Flash' };
}

console.log("=== SIMULASI SKENARIO USER ===");

const chat1 = "Saya mau tanya untuk bantuan alat tangkap juga gimana ya pak";
console.log(`[User] "${chat1}"`);
const res1 = simulateIncomingMessage(chat1, 1);
console.log(`[Bot Action] -> ${res1.action}`);
console.log(`[Bot Reply] -> ${res1.reply}`);

console.log("\n-----------------------------------\n");

const chat2 = "Bantuan alat tangkap apakah ada dari kkp";
console.log(`[User] "${chat2}"`);
const res2 = simulateIncomingMessage(chat2, 2);
console.log(`[Bot Action] -> ${res2.action}`);
console.log(`[Bot Reply] -> ${res2.reply}`);

console.log("\n-----------------------------------\n");

const chat3 = "BANTUAN";
console.log(`[User] "${chat3}"`);
const res3 = simulateIncomingMessage(chat3, 3);
console.log(`[Bot Action] -> ${res3.action}`);
console.log(`[Bot Reply] -> ${res3.reply}`);


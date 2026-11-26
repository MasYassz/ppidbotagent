const assert = require('assert');
const fs = require('fs');
const tracker = require('../chatTracker');

async function main() {
    console.log('=== TEST DETAIL & MENDALAM STANDAR PKPN UNTUK SELURUH PERMOHONAN ===\n');

    // 1. Ekstrak pesan statis dan konstanta dari index.js
    const indexCode = fs.readFileSync('./index.js', 'utf8');

    function extractConst(name) {
        const regex = new RegExp(`const\\s+${name}\\s*=\\s*([\\s\\S]*?);\\n\\n(const|function|let|//)`);
        const match = indexCode.match(regex);
        if (!match) throw new Error(`Constant ${name} not found`);
        return eval(match[1]);
    }

    const CLOSED_RESOLUTION_FOOTER = extractConst('CLOSED_RESOLUTION_FOOTER');
    const PTSA_REDIRECT_MESSAGE = extractConst('PTSA_REDIRECT_MESSAGE');
    const AKP_PENGADUAN_MESSAGE = extractConst('AKP_PENGADUAN_MESSAGE');
    const PENGADUAN_UMUM_MESSAGE = extractConst('PENGADUAN_UMUM_MESSAGE');

    // 2. Verifikasi Standar Detail & Mendalam (PKPN Style) pada Panduan Inti
    console.log('--- 1. Uji Konten Detail & Pertanyaan Tertutup ---');

    // A. PTSA Perizinan
    assert(PTSA_REDIRECT_MESSAGE.includes('PANDUAN PERIZINAN BERUSAHA'), 'PTSA harus memiliki judul terstruktur');
    assert(PTSA_REDIRECT_MESSAGE.includes('oss.go.id') && PTSA_REDIRECT_MESSAGE.includes('perizinan.kkp.go.id'), 'PTSA harus memuat link portal resmi');
    assert(PTSA_REDIRECT_MESSAGE.includes('0811-8430-610'), 'PTSA harus memuat nomor hotline');
    assert(PTSA_REDIRECT_MESSAGE.includes('Apakah panduan perizinan ini sudah menyelesaikan kebutuhan Anda?'), 'PTSA harus memuat pertanyaan tertutup');
    assert(PTSA_REDIRECT_MESSAGE.includes('Balas *YA*') && PTSA_REDIRECT_MESSAGE.includes('Ketik *0*'), 'PTSA harus memuat opsi YA dan 0');
    assert(!PTSA_REDIRECT_MESSAGE.includes('**'), 'Dilarang double asterisk');
    console.log('[PASS] Panduan PTSA Perizinan memenuhi standar detail PKPN & pertanyaan tertutup.');

    // B. Pengaduan AKP
    assert(AKP_PENGADUAN_MESSAGE.includes('PANDUAN PERLINDUNGAN & PENGADUAN AWAK KAPAL PERIKANAN'), 'AKP harus memiliki judul');
    assert(AKP_PENGADUAN_MESSAGE.includes('0811-251-744') && AKP_PENGADUAN_MESSAGE.includes('+62 811-1000-3132'), 'AKP harus memuat kontak');
    assert(AKP_PENGADUAN_MESSAGE.includes('Apakah panduan pengaduan AKP ini sudah menyelesaikan kebutuhan Anda?'), 'AKP harus memuat pertanyaan tertutup');
    assert(!AKP_PENGADUAN_MESSAGE.includes('**'), 'Dilarang double asterisk');
    console.log('[PASS] Panduan Pengaduan AKP memenuhi standar detail PKPN & pertanyaan tertutup.');

    // C. Pengaduan Umum
    assert(PENGADUAN_UMUM_MESSAGE.includes('PANDUAN LAYANAN PENGADUAN MASYARAKAT KKP'), 'Pengaduan Umum harus memiliki judul');
    assert(PENGADUAN_UMUM_MESSAGE.includes('wbs.kkp.go.id') && PENGADUAN_UMUM_MESSAGE.includes('lapor.go.id'), 'Pengaduan umum harus memuat WBS dan SP4N-LAPOR');
    assert(PENGADUAN_UMUM_MESSAGE.includes('Apakah panduan pengaduan ini sudah menyelesaikan kebutuhan Anda?'), 'Pengaduan umum harus memuat pertanyaan tertutup');
    assert(!PENGADUAN_UMUM_MESSAGE.includes('**'), 'Dilarang double asterisk');
    console.log('[PASS] Panduan Pengaduan Umum memenuhi standar detail PKPN & pertanyaan tertutup.');

    // D. Closed Resolution Footer
    assert(CLOSED_RESOLUTION_FOOTER.includes('Apakah penjelasan di atas sudah menyelesaikan kebutuhan Anda?'), 'Footer harus tertutup');
    assert(CLOSED_RESOLUTION_FOOTER.includes('Balas *YA*') && CLOSED_RESOLUTION_FOOTER.includes('Balas *BANTUAN*') && CLOSED_RESOLUTION_FOOTER.includes('Ketik *0*'), 'Opsi footer lengkap');
    console.log('[PASS] CLOSED_RESOLUTION_FOOTER standar telah terdefinisi dengan lengkap.');

    // 3. Uji Menu 1 & Menu 4 PKPN Detail
    console.log('\n--- 2. Uji Menu 1 & Menu 4 Detail PKPN ---');
    assert(indexCode.includes('PANDUAN LENGKAP PERMOHONAN INFORMASI PUBLIK (PPID KKP)'), 'Menu 1 harus memuat judul detail');
    assert(indexCode.includes('UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik (KIP)'), 'Menu 1 harus memuat dasar hukum UU 14/2008');
    assert(indexCode.includes('10 hari kerja') && indexCode.includes('100% GRATIS (Rp 0)'), 'Menu 1 harus memuat SLA dan gratis');
    assert(indexCode.includes('Apakah panduan permohonan informasi publik ini sudah jelas?'), 'Menu 1 harus ada pertanyaan tertutup');

    assert(indexCode.includes('PANDUAN TATA CARA PENGAJUAN KEBERATAN INFORMASI PUBLIK (PPID KKP)'), 'Menu 4 harus memuat judul detail');
    assert(indexCode.includes('Atasan PPID KKP') && indexCode.includes('30 hari kerja'), 'Menu 4 harus memuat SLA 30 hari Atasan PPID');
    assert(indexCode.includes('Komisi Informasi Pusat (KIP)'), 'Menu 4 harus memuat sengketa KIP');
    assert(indexCode.includes('Apakah panduan tata cara keberatan informasi ini sudah menyelesaikan kebutuhan Anda?'), 'Menu 4 harus ada pertanyaan tertutup');
    console.log('[PASS] Menu 1 dan Menu 4 telah dirombak dengan struktur mendalam PKPN.');

    // 4. Uji Penutupan Sesi dengan Jawaban Tertutup (Global Affirmative Handler)
    console.log('\n--- 3. Uji Penutupan Sesi dengan Jawaban Tertutup ---');
    const testPhone = '628999888777';
    await tracker.recordConversation({
        phone: testPhone,
        text: 'Bagaimana syarat permohonan informasi publik?',
        answer: 'Panduan lengkap Menu 1',
        source: 'BOT',
        status: 'DONE'
    });

    // Verifikasi sesi tersimpan aktif
    let activeRec = tracker.findActiveUserRecord(tracker.loadRekapData(), testPhone);
    assert(activeRec && !activeRec.isClosed, 'Harus ada sesi aktif');

    // Tutup sesi dengan konfirmasi selesai ('ya')
    tracker.closeUserSession(testPhone);

    // Verifikasi sesi telah ditutup
    activeRec = tracker.findActiveUserRecord(tracker.loadRekapData(), testPhone);
    assert.strictEqual(activeRec, null, 'Sesi harus sudah ditutup dan tidak aktif lagi');
    console.log(`[PASS] Jawaban konfirmasi penutupan tuntas: Sesi ${testPhone} berhasil ditutup.`);

    // 5. Uji format teks WhatsApp (tidak boleh double asterisk)
    console.log('\n--- 4. Uji Filter WhatsApp Formatting ---');
    const rawAiSample = '**Halo #SahabatBahari**, berikut **tata cara** permohonan informasi.';
    const cleanedAi = tracker.cleanWhatsAppFormatting(rawAiSample);
    assert.strictEqual(cleanedAi, '*Halo #SahabatBahari*, berikut *tata cara* permohonan informasi.');
    console.log(`[PASS] Pembersihan double asterisks berhasil: "${cleanedAi}"`);

    console.log('\n=== SEMUA PENGUJIAN DETAIL & JAWABAN TERTUTUP BERHASIL 100%! ===');
}

main().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});

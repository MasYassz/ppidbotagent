const pptxgen = require('pptxgenjs');
const path = require('path');

const pptx = new pptxgen();

// DEFINISIKAN LAYOUT NATIVE WIDESCREEN 16:9 STANDAR MICROSOFT POWERPOINT (13.333 in x 7.5 in)
pptx.defineLayout({ name: 'WIDESCREEN_16_9', width: 13.333, height: 7.5 });
pptx.layout = 'WIDESCREEN_16_9';

pptx.author = 'Tim Inovasi Layanan Publik Digital PPID KKP';
pptx.company = 'Kementerian Kelautan dan Perikanan RI';
pptx.title = 'Paparan Asisten Virtual PPID KKP Berbasis Generative AI & RAG';

// Palet Warna Resmi KKP & Modern Tech
const COLORS = {
    NAVY_DARK: '0A192F',    // Deep Navy
    BLUE_KKP: '005082',     // Official KKP Blue
    CYAN_OCEAN: '00A896',   // Marine Cyan
    ACCENT_GOLD: 'D4AF37',  // Gold Accent
    BG_LIGHT: 'F8FAFC',     // Clean Off-White
    CARD_BG: 'FFFFFF',      // White
    TEXT_MAIN: '1E293B',    // Dark Slate
    TEXT_MUTED: '64748B',   // Cool Grey
    BORDER_LIGHT: 'E2E8F0', // Border Grey
    CARD_BORDER: 'CBD5E1'
};

// Helper Master Header di slide konten
function addHeader(slide, title, category = 'PAPARAN ASISTEN VIRTUAL PPID KKP') {
    // Header Category Badge
    slide.addText(category.toUpperCase(), {
        x: 0.8, y: 0.35, w: 10, h: 0.25,
        fontSize: 10, fontFace: 'Arial', bold: true, color: COLORS.CYAN_OCEAN
    });
    // Header Title
    slide.addText(title, {
        x: 0.8, y: 0.65, w: 11.7, h: 0.55,
        fontSize: 20, fontFace: 'Arial', bold: true, color: COLORS.NAVY_DARK
    });
    // Thin divider line
    slide.addShape(pptx.shapes.RECTANGLE, {
        x: 0.8, y: 1.25, w: 11.7, h: 0.02,
        fill: { color: COLORS.CYAN_OCEAN }
    });
    // Footer watermark
    slide.addText('PPID KEMENTERIAN KELAUTAN DAN PERIKANAN REPUBLIK INDONESIA', {
        x: 0.8, y: 6.9, w: 8, h: 0.3,
        fontSize: 9, fontFace: 'Arial', color: COLORS.TEXT_MUTED
    });
}

// ==========================================
// SLIDE 1: COVER SLIDE
// ==========================================
{
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.NAVY_DARK };

    // Decorative top-right accent shape
    slide.addShape(pptx.shapes.RECTANGLE, {
        x: 9.0, y: 0, w: 4.333, h: 7.5,
        fill: { color: COLORS.BLUE_KKP, transparency: 75 }
    });
    slide.addShape(pptx.shapes.RIGHT_TRIANGLE, {
        x: 8.0, y: 3.5, w: 5.333, h: 4.0,
        fill: { color: COLORS.CYAN_OCEAN, transparency: 85 },
        rotate: 180
    });

    // Sub-badge
    slide.addText('TRANSFORMASI DIGITAL PELAYANAN PUBLIK 24/7', {
        x: 1.0, y: 1.5, w: 10, h: 0.35,
        fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.CYAN_OCEAN, charSpacing: 2
    });

    // Main Title
    slide.addText('ASISTEN VIRTUAL PPID KKP\nBERBASIS GENERATIVE AI & RAG', {
        x: 1.0, y: 1.95, w: 10.5, h: 1.5,
        fontSize: 32, fontFace: 'Arial', bold: true, color: 'FFFFFF', lineSpacing: 40
    });

    // Subtitle
    slide.addText('Solusi Layanan Informasi Publik Cerdas, Akuntabel, dan Terintegrasi\nMenuju Birokrasi Modern Kementerian Kelautan dan Perikanan', {
        x: 1.0, y: 3.65, w: 10, h: 0.85,
        fontSize: 15, fontFace: 'Arial', color: 'CBD5E1', lineSpacing: 22
    });

    // Divider
    slide.addShape(pptx.shapes.RECTANGLE, {
        x: 1.0, y: 4.75, w: 3.5, h: 0.04,
        fill: { color: COLORS.CYAN_OCEAN }
    });

    // Presenter Info Card
    slide.addText('Disampaikan di hadapan:\nPimpinan Eselon I/II & Pusat Data, Statistik, dan Informasi (Pusdatin) KKP\n\nDisusun oleh Tim Inovasi Layanan Publik Digital PPID KKP | Tahun 2026', {
        x: 1.0, y: 5.05, w: 10.5, h: 1.5,
        fontSize: 12, fontFace: 'Arial', color: '94A3B8', lineSpacing: 18
    });
}

// ==========================================
// SLIDE 2: LATAR BELAKANG & TANTANGAN LAYANAN
// ==========================================
{
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addHeader(slide, 'Latar Belakang & Urgensi Transformasi Layanan');

    // 3 Cards: Tantangan Utama (3.65 in each, gap 0.38 in)
    const cards = [
        {
            title: '1. Lonjakan Volume Konsultasi',
            desc: 'Kanal WhatsApp resmi PPID KKP menerima ratusan hingga ribuan permohonan informasi publik setiap bulannya dari nelayan, petambak, pelaku usaha, mahasiswa, dan masyarakat luas di seluruh Indonesia.',
            tag: 'Tantangan Kapasitas'
        },
        {
            title: '2. Jam Operasional Petugas Terbatas',
            desc: 'Jam kerja operasional petugas manusia terbatas pada hari kerja (08.00–15.30 WIB), sedangkan kebutuhan informasi masyarakat mengenai perizinan kapal, sertifikasi awak, dan pengaduan berlangsung 24 jam.',
            tag: 'Tantangan Aksesibilitas'
        },
        {
            title: '3. Beban Pertanyaan Repetitif',
            desc: 'Sebanyak 70-80% pesan pemohon menanyakan hal berulang (syarat izin SIPI/PTSA, pendaftaran AKP via E-LAUT, penempatan magang, kontak satgas), yang menyita waktu produktif petugas penanganan manual.',
            tag: 'Tantangan Efisiensi'
        }
    ];

    cards.forEach((c, idx) => {
        const xPos = 0.8 + idx * 4.03; // 0.8, 4.83, 8.86 (ends at 12.51)
        // Background card
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: xPos, y: 1.55, w: 3.65, h: 5.0,
            fill: { color: COLORS.CARD_BG }, line: { color: COLORS.BORDER_LIGHT, width: 1 }
        });
        // Tag badge
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: xPos + 0.25, y: 1.8, w: 2.2, h: 0.32,
            fill: { color: 'E0F2FE' }, line: { color: 'BAE6FD', width: 1 }
        });
        slide.addText(c.tag, {
            x: xPos + 0.25, y: 1.8, w: 2.2, h: 0.32,
            fontSize: 9.5, fontFace: 'Arial', bold: true, color: COLORS.BLUE_KKP, align: 'center', valign: 'middle'
        });
        // Title
        slide.addText(c.title, {
            x: xPos + 0.25, y: 2.35, w: 3.15, h: 0.65,
            fontSize: 13.5, fontFace: 'Arial', bold: true, color: COLORS.NAVY_DARK
        });
        // Desc
        slide.addText(c.desc, {
            x: xPos + 0.25, y: 3.1, w: 3.15, h: 3.2,
            fontSize: 11, fontFace: 'Arial', color: COLORS.TEXT_MAIN, lineSpacing: 16
        });
    });
}

// ==========================================
// SLIDE 3: VISI STRATEGIS & NILAI TAMBAH BAGI KKP (2x2 Grid)
// ==========================================
{
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addHeader(slide, 'Nilai Strategis bagi Pimpinan Eselon I & II', 'VISI & IMPACT STRATEGIS');

    const impacts = [
        {
            num: '01',
            title: 'Respons Seketika 24/7 (SLA < 3 Detik)',
            desc: 'Masyarakat memperoleh kepastian informasi secara instan kapan pun dan di mana pun, meningkatkan indeks kepuasan pelayanan publik KKP secara signifikan.'
        },
        {
            num: '02',
            title: 'Penghematan Beban Petugas (75%+)',
            desc: 'Pertanyaan repetitif otomatis tuntas dijawab bot. Petugas manusia dialihkan khusus menangani permohonan informasi substantif, dokumen resmi, dan asistensi teknis.'
        },
        {
            num: '03',
            title: 'Kepatuhan Regulasi & Nol Halusinasi',
            desc: 'Jawaban dikunci (*grounded*) 100% pada data resmi KKP. Menegakkan amanat UU No. 14 Tahun 2008 (KIP) dan UU No. 27 Tahun 2022 (PDP).'
        },
        {
            num: '04',
            title: 'Sosialisasi Ekonomi Biru & Prioritas',
            desc: 'Edukasi masif 5 Kebijakan Ekonomi Biru dan 5 Program Kerja Prioritas Nasional (KNMP, Tambak Pantura, Budidaya Darat, Garam, Modernisasi Kapal).'
        }
    ];

    impacts.forEach((imp, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const xPos = 0.8 + col * 6.05; // Col 0: 0.8, Col 1: 6.85 (w=5.65 -> ends at 12.5)
        const yPos = 1.55 + row * 2.6; // Row 0: 1.55, Row 1: 4.15 (h=2.3 -> ends at 6.45)

        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: xPos, y: yPos, w: 5.65, h: 2.3,
            fill: { color: COLORS.CARD_BG }, line: { color: COLORS.BORDER_LIGHT, width: 1 }
        });
        // Big Number Badge
        slide.addText(imp.num, {
            x: xPos + 0.3, y: yPos + 0.25, w: 0.75, h: 0.6,
            fontSize: 22, fontFace: 'Arial', bold: true, color: COLORS.CYAN_OCEAN
        });
        // Title
        slide.addText(imp.title, {
            x: xPos + 1.15, y: yPos + 0.25, w: 4.25, h: 0.55,
            fontSize: 13.5, fontFace: 'Arial', bold: true, color: COLORS.NAVY_DARK
        });
        // Desc
        slide.addText(imp.desc, {
            x: xPos + 1.15, y: yPos + 0.85, w: 4.25, h: 1.3,
            fontSize: 11, fontFace: 'Arial', color: COLORS.TEXT_MAIN, lineSpacing: 16
        });
    });
}

// ==========================================
// SLIDE 4: ARSITEKTUR TEKNOLOGI (UNTUK PUSDATIN)
// ==========================================
{
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addHeader(slide, 'Arsitektur Sistem 3-Layer & Integrasi AI', 'ARSITEKTUR TEKNIS PUSDATIN');

    const layers = [
        {
            layer: 'LAYER 1: GUARDRAILS & INTENT',
            role: 'Deterministic Security Filter',
            tech: 'RegEx, Anti-Spam, State Engine',
            bullets: [
                'Filter ancaman, intimidasi, & komplain keras langsung ke petugas',
                'Penyaring surat dinas palsu / tender fiktif',
                'Proteksi data sensitif pejabat sesuai UU KIP',
                'Pemisahan aduan umum, ruang laut, & AKP'
            ]
        },
        {
            layer: 'LAYER 2: RAG KNOWLEDGE BASE',
            role: 'Zero-Cost Instant Retrieval',
            tech: 'Local In-Memory Index (100 FAQs)',
            bullets: [
                'Mencocokkan kata kunci ke 100 entri FAQ resmi KKP',
                'Waktu respons super cepat (0 ms)',
                '100% konsisten tanpa halusinasi',
                'Menghemat kuota & biaya komputasi AI'
            ]
        },
        {
            layer: 'LAYER 3: GENERATIVE AI (GEMINI)',
            role: 'Contextual Multi-Turn Conversation',
            tech: 'Gemini 3.5 Flash-Lite, 10-Chat Memory',
            bullets: [
                'Memahami obrolan lanjutan secara natural',
                'Mampu menganalisis pesan panjang naratif',
                'Dukungan dwibahasa (Indonesia & English)',
                'Eskalasi mulus ke petugas jika data nihil'
            ]
        }
    ];

    layers.forEach((l, idx) => {
        const xPos = 0.8 + idx * 4.03; // Col 0: 0.8, Col 1: 4.83, Col 2: 8.86 (ends at 12.51)
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: xPos, y: 1.55, w: 3.65, h: 5.0,
            fill: { color: COLORS.CARD_BG }, line: { color: idx === 1 ? COLORS.BLUE_KKP : COLORS.BORDER_LIGHT, width: idx === 1 ? 2 : 1 }
        });
        // Header Box
        slide.addShape(pptx.shapes.RECTANGLE, {
            x: xPos, y: 1.55, w: 3.65, h: 0.85,
            fill: { color: idx === 1 ? COLORS.BLUE_KKP : COLORS.NAVY_DARK }
        });
        slide.addText(l.layer, {
            x: xPos + 0.15, y: 1.6, w: 3.35, h: 0.45,
            fontSize: 9.5, fontFace: 'Arial', bold: true, color: 'FFFFFF', align: 'center'
        });
        slide.addText(l.role, {
            x: xPos + 0.15, y: 2.05, w: 3.35, h: 0.3,
            fontSize: 8.5, fontFace: 'Arial', color: COLORS.CYAN_OCEAN, align: 'center'
        });

        // Tech specs
        slide.addText('Komponen Teknologi:', {
            x: xPos + 0.25, y: 2.55, w: 3.15, h: 0.25,
            fontSize: 9.5, fontFace: 'Arial', bold: true, color: COLORS.TEXT_MUTED
        });
        slide.addText(l.tech, {
            x: xPos + 0.25, y: 2.8, w: 3.15, h: 0.5,
            fontSize: 10.5, fontFace: 'Arial', bold: true, color: COLORS.NAVY_DARK
        });

        // Bullets
        slide.addText('Fungsi Utama:', {
            x: xPos + 0.25, y: 3.45, w: 3.15, h: 0.25,
            fontSize: 9.5, fontFace: 'Arial', bold: true, color: COLORS.TEXT_MUTED
        });
        const bulletText = l.bullets.map(b => `• ${b}`).join('\n\n');
        slide.addText(bulletText, {
            x: xPos + 0.25, y: 3.75, w: 3.15, h: 2.65,
            fontSize: 9.5, fontFace: 'Arial', color: COLORS.TEXT_MAIN, lineSpacing: 14
        });
    });
}

// ==========================================
// SLIDE 5: FITUR-FITUR UNGGULAN APLIKASI (4 Rows)
// ==========================================
{
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addHeader(slide, 'Fitur Unggulan Asisten Virtual PPID KKP', 'KEMAMPUAN SISTEM');

    const features = [
        {
            title: '1. Personalisasi & Memori Obrolan 10 Percakapan',
            desc: 'Bot otomatis menyapa nama pemohon secara personal ("Halo #SahabatBahari Kak [Nama]") dan mengingat konteks hingga 10 obrolan terakhir. Pemohon dapat bertanya lanjutan seperti "syaratnya apa?", "pengumumannya dimana?" secara runtut tanpa harus mengulang konteks.'
        },
        {
            title: '2. Dukungan Penuh Bahasa Inggris (Bilingual)',
            desc: 'Mampu mendeteksi dan merespons pertanyaan bahasa Inggris dari peneliti internasional, investor maritim, atau delegasi asing secara fasih, akurat, dan sesuai ketentuan UU Keterbukaan Informasi Publik.'
        },
        {
            title: '3. Pemilahan Jalur Laporan & Pengaduan Presisi',
            desc: 'Jika pemohon ingin melapor secara umum, bot menyajikan 3 pilihan kategori (PSDKP/WBS, Pengawasan Ruang Laut & Pulau Kecil, atau Awak Kapal AKP). Namun jika sudah spesifik (penangkapan penyu / izin pulau), bot langsung mengidentifikasi dan memberi solusi tuntas.'
        },
        {
            title: '4. Deteksi Surat Palsu & Penipuan Tender/Bimtek',
            desc: 'Secara cerdas mengidentifikasi indikasi surat edaran palsu, pesanan barang fiktif, atau bimtek bodong berbayar yang mengatasnamakan Menteri/Sekjen KKP, serta mengedukasi ciri TTE resmi BSrE.'
        }
    ];

    features.forEach((f, idx) => {
        const yPos = 1.55 + idx * 1.25; // 1.55, 2.80, 4.05, 5.30 (h=1.15 -> ends at 6.45)
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: 0.8, y: yPos, w: 11.7, h: 1.15,
            fill: { color: COLORS.CARD_BG }, line: { color: COLORS.BORDER_LIGHT, width: 1 }
        });
        slide.addShape(pptx.shapes.RECTANGLE, {
            x: 0.8, y: yPos, w: 0.12, h: 1.15,
            fill: { color: idx % 2 === 0 ? COLORS.BLUE_KKP : COLORS.CYAN_OCEAN }
        });
        slide.addText(f.title, {
            x: 1.15, y: yPos + 0.12, w: 11.1, h: 0.35,
            fontSize: 13, fontFace: 'Arial', bold: true, color: COLORS.NAVY_DARK
        });
        slide.addText(f.desc, {
            x: 1.15, y: yPos + 0.48, w: 11.1, h: 0.6,
            fontSize: 10.5, fontFace: 'Arial', color: COLORS.TEXT_MAIN, lineSpacing: 15
        });
    });
}

// ==========================================
// SLIDE 6: KEAMANAN INFORMASI & PRIVASI DATA (2x2 Grid)
// ==========================================
{
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addHeader(slide, 'Kepatuhan Keamanan Informasi & Privasi Data', 'ASPEK KEAMANAN & REGULASI');

    const secItems = [
        {
            title: 'Penerapan UU No. 27/2022 (PDP)',
            desc: 'Sistem tidak pernah membocorkan nomor telepon, NIK, alamat rumah, atau data internal pejabat kepada publik. Pertanyaan probing mengenai kontak pribadi pimpinan otomatis ditolak dan dialihkan ke petugas resmi.'
        },
        {
            title: 'Kepatuhan UU No. 14/2008 (KIP)',
            desc: 'Data yang menyangkut rahasia negara, penegakan hukum perikanan yang sedang berjalan, dan persaingan usaha tidak diungkapkan secara otomatis oleh bot (Kategori Informasi yang Dikecualikan).'
        },
        {
            title: 'Isolasi Kredensial & Enkripsi Server',
            desc: 'API Key Gemini dan token sesi WhatsApp tidak pernah di-hardcode ke repositori publik. Seluruh kredensial tersimpan dalam variabel lingkungan (.env) terisolasi di server lokal KKP.'
        },
        {
            title: 'Audit Trail Percakapan & Whistleblower',
            desc: 'Seluruh riwayat chat terarsip rapi dalam basis data lokal untuk akuntabilitas. Identitas pelapor pungli/destructive fishing dilindungi kerahasiaannya dan hanya diteruskan ke kanal penegak hukum resmi KKP.'
        }
    ];

    secItems.forEach((s, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const xPos = 0.8 + col * 6.05; // 0.8, 6.85 (w=5.65 -> ends at 12.5)
        const yPos = 1.55 + row * 2.6; // 1.55, 4.15 (h=2.3 -> ends at 6.45)

        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: xPos, y: yPos, w: 5.65, h: 2.3,
            fill: { color: COLORS.CARD_BG }, line: { color: COLORS.BORDER_LIGHT, width: 1 }
        });
        slide.addShape(pptx.shapes.OVAL, {
            x: xPos + 0.3, y: yPos + 0.25, w: 0.45, h: 0.45,
            fill: { color: 'DCFCE7' }, line: { color: '86EFAC', width: 1 }
        });
        slide.addText('✓', {
            x: xPos + 0.3, y: yPos + 0.25, w: 0.45, h: 0.45,
            fontSize: 15, fontFace: 'Arial', bold: true, color: '166534', align: 'center', valign: 'middle'
        });
        slide.addText(s.title, {
            x: xPos + 0.95, y: yPos + 0.22, w: 4.45, h: 0.55,
            fontSize: 13, fontFace: 'Arial', bold: true, color: COLORS.NAVY_DARK
        });
        slide.addText(s.desc, {
            x: xPos + 0.95, y: yPos + 0.8, w: 4.45, h: 1.35,
            fontSize: 10.5, fontFace: 'Arial', color: COLORS.TEXT_MAIN, lineSpacing: 15
        });
    });
}

// ==========================================
// SLIDE 7: MONITORING, REKAPITULASI & SURVEI IKM (3 Columns)
// ==========================================
{
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addHeader(slide, 'Monitoring Evaluasi, Rekap Harian & Survei IKM', 'PENGUKURAN KINERJA LAYANAN');

    const stats = [
        {
            title: '1. Rekapitulasi Otomatis Harian (Pukul 16:00 WIB)',
            desc: 'Sistem secara otomatis mengekspor seluruh statistik percakapan, topik pertanyaan masyarakat, rasio penyelesaian bot vs petugas, ke dalam file Microsoft Excel harian yang siap dilaporkan ke pimpinan.'
        },
        {
            title: '2. Survei Indeks Kepuasan Masyarakat (IKM)',
            desc: 'Di akhir setiap sesi, pemohon diberikan opsi penilaian kepuasan layanan publik secara interaktif (Sangat Puas, Puas, Cukup, Tidak Puas) sebagai tolok ukur standar pelayanan KemenPAN-RB.'
        },
        {
            title: '3. Dashboard & Log Akuntabilitas Terpusat',
            desc: 'Setiap interaksi tersimpan secara transparan dengan status penyelesaian (DONE / PENDING Petugas / REKAP), memudahkan supervisi kualitas jawaban oleh admin layanan informasi KKP.'
        }
    ];

    stats.forEach((st, idx) => {
        const xPos = 0.8 + idx * 4.03; // Col 0: 0.8, Col 1: 4.83, Col 2: 8.86 (ends at 12.51)
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: xPos, y: 1.55, w: 3.65, h: 5.0,
            fill: { color: COLORS.CARD_BG }, line: { color: COLORS.BORDER_LIGHT, width: 1 }
        });
        slide.addShape(pptx.shapes.RECTANGLE, {
            x: xPos + 0.25, y: 1.8, w: 3.15, h: 0.05,
            fill: { color: COLORS.CYAN_OCEAN }
        });
        slide.addText(st.title, {
            x: xPos + 0.25, y: 2.05, w: 3.15, h: 0.8,
            fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.NAVY_DARK
        });
        slide.addText(st.desc, {
            x: xPos + 0.25, y: 2.95, w: 3.15, h: 3.3,
            fontSize: 11, fontFace: 'Arial', color: COLORS.TEXT_MAIN, lineSpacing: 17
        });
    });
}

// ==========================================
// SLIDE 8: ROADMAP PENGEMBANGAN & INTEGRASI PUSDATIN (3 Columns)
// ==========================================
{
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addHeader(slide, 'Rencana Pengembangan & Skalabilitas (Roadmap)', 'ROADMAP INFRASTRUKTUR');

    const phases = [
        {
            phase: 'FASE 1: OPERASIONAL SAAT INI',
            status: 'Sudah Selesai (Ready)',
            items: [
                'Engine hybrid AI (Gemini 3.5 Flash-Lite + 100 FAQ KKP)',
                '10-Turn Context Memory & Dynamic Topic Routing',
                'Pencegahan hoaks, surat palsu, dan spam',
                'Export Excel harian & IKM Survey'
            ]
        },
        {
            phase: 'FASE 2: MIGRASI WHATSAPP ENTERPRISE',
            status: 'Kolaborasi Pusdatin KKP',
            items: [
                'Transisi ke Official WhatsApp Business Cloud API (Meta BSP)',
                'Verifikasi Centang Hijau Resmi (Verified Green Tick KKP)',
                'Dukungan multi-agent dashboard untuk puluhan petugas PPID',
                'SLA Uptime 99.9% tanpa risiko blokir sesi web'
            ]
        },
        {
            phase: 'FASE 3: INTEGRASI SISTEM & API KKP',
            status: 'Integrasi Satu Data',
            items: [
                'Koneksi API Satu Data KKP untuk statistik produksi real-time',
                'Integrasi Portal SILAT & SICEFI untuk cek status izin kapal',
                'Integrasi SP4N-LAPOR! & WBS Itjen otomatis',
                'Deployment on-premise container (Docker) di Data Center KKP'
            ]
        }
    ];

    phases.forEach((p, idx) => {
        const xPos = 0.8 + idx * 4.03; // Col 0: 0.8, Col 1: 4.83, Col 2: 8.86 (ends at 12.51)
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: xPos, y: 1.55, w: 3.65, h: 5.0,
            fill: { color: COLORS.CARD_BG }, line: { color: COLORS.BORDER_LIGHT, width: 1 }
        });
        // Header Box
        slide.addShape(pptx.shapes.RECTANGLE, {
            x: xPos, y: 1.55, w: 3.65, h: 0.8,
            fill: { color: idx === 0 ? COLORS.CYAN_OCEAN : (idx === 1 ? COLORS.BLUE_KKP : COLORS.NAVY_DARK) }
        });
        slide.addText(p.phase, {
            x: xPos + 0.15, y: 1.6, w: 3.35, h: 0.4,
            fontSize: 9.5, fontFace: 'Arial', bold: true, color: 'FFFFFF', align: 'center'
        });
        slide.addText(p.status, {
            x: xPos + 0.15, y: 2.0, w: 3.35, h: 0.3,
            fontSize: 8.5, fontFace: 'Arial', color: 'F1F5F9', align: 'center'
        });

        const listText = p.items.map(it => `✓ ${it}`).join('\n\n');
        slide.addText(listText, {
            x: xPos + 0.25, y: 2.55, w: 3.15, h: 3.8,
            fontSize: 10.5, fontFace: 'Arial', color: COLORS.TEXT_MAIN, lineSpacing: 15
        });
    });
}

// ==========================================
// SLIDE 9: KESIMPULAN & REKOMENDASI KEBIJAKAN (3 Rows)
// ==========================================
{
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addHeader(slide, 'Kesimpulan & Rekomendasi Tindak Lanjut', 'KESIMPULAN EKSEKUTIF');

    const conclusions = [
        {
            title: 'Solutif dan Siap Operasional',
            desc: 'Asisten Virtual PPID KKP telah teruji stabil, akurat, dan mampu menyelesaikan mayoritas permohonan informasi publik 24/7 tanpa risiko halusinasi data.'
        },
        {
            title: 'Meningkatkan Citra Birokrasi KKP',
            desc: 'Memberikan pengalaman pelayanan yang cepat, ramah, dan modern kepada nelayan dan masyarakat, selaras dengan semangat Reformasi Birokrasi KemenPAN-RB.'
        },
        {
            title: 'Dukungan Resmi Pusdatin untuk WhatsApp Enterprise',
            desc: 'Direkomendasikan percepatan adopsi WhatsApp Business API resmi Meta bekerja sama dengan Pusdatin KKP untuk mendapatkan Centang Hijau dan skalabilitas enterprise.'
        }
    ];

    conclusions.forEach((c, idx) => {
        const yPos = 1.6 + idx * 1.6; // 1.6, 3.2, 4.8 (h=1.45 -> ends at 6.25)
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: 0.8, y: yPos, w: 11.7, h: 1.45,
            fill: { color: COLORS.CARD_BG }, line: { color: COLORS.BORDER_LIGHT, width: 1 }
        });
        slide.addShape(pptx.shapes.OVAL, {
            x: 1.1, y: yPos + 0.3, w: 0.85, h: 0.85,
            fill: { color: COLORS.BLUE_KKP }
        });
        slide.addText(`${idx + 1}`, {
            x: 1.1, y: yPos + 0.3, w: 0.85, h: 0.85,
            fontSize: 18, fontFace: 'Arial', bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
        });
        slide.addText(c.title, {
            x: 2.15, y: yPos + 0.25, w: 10.1, h: 0.4,
            fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.NAVY_DARK
        });
        slide.addText(c.desc, {
            x: 2.15, y: yPos + 0.7, w: 10.1, h: 0.65,
            fontSize: 11, fontFace: 'Arial', color: COLORS.TEXT_MAIN, lineSpacing: 16
        });
    });
}

// ==========================================
// SLIDE 10: PENUTUP & SESI DISKUSI (Q&A)
// ==========================================
{
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.NAVY_DARK };

    slide.addShape(pptx.shapes.RIGHT_TRIANGLE, {
        x: 0, y: 0, w: 4.0, h: 3.5,
        fill: { color: COLORS.BLUE_KKP, transparency: 80 }
    });

    slide.addText('TERIMA KASIH', {
        x: 1.0, y: 1.9, w: 11.333, h: 0.8,
        fontSize: 36, fontFace: 'Arial', bold: true, color: 'FFFFFF', align: 'center'
    });
    slide.addText('Sesi Paparan & Diskusi Tanya Jawab (Q&A)\nAsisten Virtual PPID Kementerian Kelautan dan Perikanan', {
        x: 1.0, y: 2.8, w: 11.333, h: 0.85,
        fontSize: 17, fontFace: 'Arial', color: COLORS.CYAN_OCEAN, align: 'center', lineSpacing: 24
    });

    slide.addShape(pptx.shapes.RECTANGLE, {
        x: 4.666, y: 3.95, w: 4.0, h: 0.04,
        fill: { color: COLORS.CYAN_OCEAN }
    });

    slide.addText('Kementerian Kelautan dan Perikanan Republik Indonesia\nGedung Mina Bahari I-IV, Jl. Medan Merdeka Timur No. 16, Jakarta Pusat 10110\nWebsite: https://kkp.go.id | Portal PPID: https://ppid.kkp.go.id', {
        x: 1.0, y: 4.35, w: 11.333, h: 1.5,
        fontSize: 12, fontFace: 'Arial', color: '94A3B8', align: 'center', lineSpacing: 20
    });
}

const outputPath = path.resolve(__dirname, '../Paparan_Asisten_Virtual_PPID_KKP_Fixed.pptx');
pptx.writeFile({ fileName: outputPath })
    .then(() => {
        console.log('✓ Successfully generated presentation at: ' + outputPath);
    })
    .catch(err => {
        console.error('Error generating presentation:', err);
    });

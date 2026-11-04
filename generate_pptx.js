const pptxgen = require('pptxgenjs');
const path = require('path');

async function createPresentation() {
    const pres = new pptxgen();
    pres.layout = 'LAYOUT_16x9';
    pres.author = 'PPID KKP & Inovasi Digital';
    pres.company = 'Kementerian Kelautan dan Perikanan RI';
    pres.title = 'Paparan PPID Bot Agent WhatsApp KKP';
    pres.subject = 'Layanan Informasi Publik Berbasis AI WhatsApp';

    // Palet Warna KKP
    const C_DARK_BG = '0A2540';      // Navy Dalam KKP
    const C_SLATE_BG = 'F8FAFC';     // Latar Belakang Slide Terang
    const C_PRIMARY = '0284C7';      // Ocean Blue KKP
    const C_ACCENT = '06B6D4';       // Bahari Cyan
    const C_TEXT_MAIN = '0F172A';    // Teks Gelap
    const C_TEXT_MUTED = '475569';   // Teks Abu-abu
    const C_WHITE = 'FFFFFF';
    const C_CARD_BORDER = 'E2E8F0';
    const C_GOLD = 'F59E0B';         // Aksen Emas/Oranye
    const C_GREEN = '10B981';        // Aksen Sukses/Hijau

    // Helper: Header Slide Terang
    function addHeader(slide, category, title, subtitle) {
        // Top accent line
        slide.addShape(pres.shapes.RECTANGLE, {
            x: 0, y: 0, w: 10, h: 0.08,
            fill: { color: C_PRIMARY }
        });

        // Category Tag / Badge
        slide.addText(category.toUpperCase(), {
            x: 0.8, y: 0.35, w: 8.4, h: 0.25,
            fontSize: 9, bold: true, color: C_PRIMARY, fontFace: 'Segoe UI'
        });

        // Title
        slide.addText(title, {
            x: 0.8, y: 0.58, w: 8.4, h: 0.45,
            fontSize: 20, bold: true, color: C_TEXT_MAIN, fontFace: 'Segoe UI'
        });

        // Subtitle
        if (subtitle) {
            slide.addText(subtitle, {
                x: 0.8, y: 1.05, w: 8.4, h: 0.3,
                fontSize: 11, color: C_TEXT_MUTED, fontFace: 'Segoe UI'
            });
        }
    }

    // Helper: Footer Slide Terang
    function addFooter(slide, pageNum, totalPages = 12) {
        slide.addShape(pres.shapes.LINE, {
            x: 0.8, y: 5.15, w: 8.4, h: 0,
            line: { color: C_CARD_BORDER, width: 0.8 }
        });

        slide.addText("PPID Kementerian Kelautan dan Perikanan RI  |  PPID Bot Agent WhatsApp", {
            x: 0.8, y: 5.2, w: 6.0, h: 0.3,
            fontSize: 9, color: '94A3B8', fontFace: 'Segoe UI'
        });

        slide.addText(`${pageNum} / ${totalPages}`, {
            x: 7.2, y: 5.2, w: 2.0, h: 0.3,
            fontSize: 9, color: '94A3B8', fontFace: 'Segoe UI', align: 'right'
        });
    }

    // ==========================================
    // SLIDE 1: COVER (DARK MARITIME THEME)
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_DARK_BG };

        // Decorative background elements
        slide.addShape(pres.shapes.RECTANGLE, {
            x: 0, y: 0, w: 0.25, h: 5.625,
            fill: { color: C_ACCENT }
        });
        slide.addShape(pres.shapes.RECTANGLE, {
            x: 0.25, y: 0, w: 0.08, h: 5.625,
            fill: { color: C_PRIMARY }
        });

        // Subtle gradient card
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 0.8, y: 0.8, w: 8.4, h: 4.0,
            rectRadius: 0.15,
            fill: { color: '132F4C' },
            line: { color: '1E4976', width: 1 }
        });

        // Eyebrow Tag
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 1.2, y: 1.2, w: 3.5, h: 0.35,
            rectRadius: 0.1,
            fill: { color: '0E3A5D' },
            line: { color: C_ACCENT, width: 1 }
        });
        slide.addText("TRANSFORMASI DIGITAL LAYANAN PUBLIK", {
            x: 1.2, y: 1.2, w: 3.5, h: 0.35,
            fontSize: 9, bold: true, color: C_ACCENT, align: 'center', fontFace: 'Segoe UI'
        });

        // Main Title
        slide.addText("PPID BOT AGENT", {
            x: 1.2, y: 1.65, w: 7.6, h: 0.85,
            fontSize: 34, bold: true, color: C_WHITE, fontFace: 'Segoe UI'
        });

        // Subtitle
        slide.addText("Asisten Virtual & Layanan Informasi Publik Terpadu Berbasis AI WhatsApp\nKementerian Kelautan dan Perikanan Republik Indonesia", {
            x: 1.2, y: 2.5, w: 7.6, h: 0.7,
            fontSize: 14, color: 'BAE6FD', fontFace: 'Segoe UI', lineSpacingMultiple: 1.2
        });

        // Divider
        slide.addShape(pres.shapes.LINE, {
            x: 1.2, y: 3.35, w: 7.6, h: 0,
            line: { color: '1E4976', width: 1 }
        });

        // Metadata Pills
        const pills = [
            { text: "🤖 Google Gemini AI", x: 1.2 },
            { text: "💬 WhatsApp Automation", x: 3.1 },
            { text: "👨‍💻 Human-in-the-Loop", x: 5.3 },
            { text: "⚖️ UU KIP 14/2008", x: 7.3 }
        ];
        pills.forEach(p => {
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: p.x, y: 3.55, w: 1.85, h: 0.35,
                rectRadius: 0.08,
                fill: { color: '0A192F' },
                line: { color: '38BDF8', width: 0.8 }
            });
            slide.addText(p.text, {
                x: p.x, y: 3.55, w: 1.85, h: 0.35,
                fontSize: 8.5, color: C_WHITE, align: 'center', fontFace: 'Segoe UI'
            });
        });

        // Footer note
        slide.addText("Paparan Proyek Inovasi Digital PPID KKP  •  Mina Bahari I, Jakarta Pusat  •  2026", {
            x: 1.2, y: 4.25, w: 7.6, h: 0.3,
            fontSize: 9.5, color: '94A3B8', fontFace: 'Segoe UI'
        });
    }

    // ==========================================
    // SLIDE 2: LATAR BELAKANG & TANTANGAN
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_SLATE_BG };
        addHeader(slide, "Latar Belakang & Urgensi", "Tantangan Layanan Informasi Publik di Era Keterbukaan", "Menjawab tingginya volume pemohon informasi dengan kecepatan dan keandalan.");

        const problems = [
            {
                num: "01",
                title: "Lonjakan Volume Pemohon",
                desc: "Nelayan, pelaku usaha perikanan, mahasiswa, peneliti, dan masyarakat umum memerlukan akses data dan perizinan kelautan setiap saat.",
                accent: C_PRIMARY
            },
            {
                num: "02",
                title: "Mandat UU KIP No. 14/2008",
                desc: "Kewajiban negara menyediakan layanan informasi publik yang cepat, tepat waktu, biaya ringan/gratis, dan transparan tanpa birokrasi berbelit.",
                accent: C_ACCENT
            },
            {
                num: "03",
                title: "Keterbatasan Helpdesk Konvensional",
                desc: "Waktu kerja terbatas (Senin-Jumat) dan waktu petugas tersita menjawab puluhan pertanyaan rutin berulang (syarat magang, jam buka, lokasi kantor).",
                accent: C_GOLD
            }
        ];

        problems.forEach((p, i) => {
            const xPos = 0.8 + i * 2.9;
            // Card container
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos, y: 1.6, w: 2.7, h: 3.3,
                rectRadius: 0.12,
                fill: { color: C_WHITE },
                line: { color: C_CARD_BORDER, width: 1 }
            });

            // Accent bar top
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos + 0.3, y: 1.9, w: 0.8, h: 0.45,
                rectRadius: 0.08,
                fill: { color: p.accent }
            });
            slide.addText(p.num, {
                x: xPos + 0.3, y: 1.9, w: 0.8, h: 0.45,
                fontSize: 14, bold: true, color: C_WHITE, align: 'center', fontFace: 'Segoe UI'
            });

            // Card title
            slide.addText(p.title, {
                x: xPos + 0.3, y: 2.55, w: 2.1, h: 0.65,
                fontSize: 13, bold: true, color: C_TEXT_MAIN, fontFace: 'Segoe UI'
            });

            // Card desc
            slide.addText(p.desc, {
                x: xPos + 0.3, y: 3.25, w: 2.1, h: 1.4,
                fontSize: 10, color: C_TEXT_MUTED, fontFace: 'Segoe UI', lineSpacingMultiple: 1.2
            });
        });

        addFooter(slide, 2);
    }

    // ==========================================
    // SLIDE 3: SOLUSI INOVASI
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_SLATE_BG };
        addHeader(slide, "Solusi & Nilai Utama", "PPID Bot Agent: Solusi Layanan Informasi Terpadu", "Menghadirkan layanan PPID KKP langsung di genggaman masyarakat melalui WhatsApp.");

        const pillars = [
            {
                title: "Aksesibilitas Tanpa Batas",
                desc: "Beroperasi di WhatsApp, aplikasi perpesanan nomor satu di Indonesia. Pemohon tidak perlu mengunduh aplikasi tambahan atau login rumit.",
                tag: "Kemudahan Akses"
            },
            {
                title: "Hybrid Response Engine",
                desc: "Menggabungkan kecepatan respon database FAQ lokal dengan kecerdasan Generative AI Google Gemini untuk pertanyaan yang mendalam.",
                tag: "Teknologi Cerdas"
            },
            {
                title: "Eskalasi Mulus ke Petugas (Live Chat)",
                desc: "Sistem cerdas mendeteksi kendala kompleks dan meneruskan pesan langsung ke WhatsApp petugas resmi helpdesk PPID KKP.",
                tag: "Human-in-the-Loop"
            },
            {
                title: "Standar Layanan Resmi Bahari",
                desc: "Setiap komunikasi membawa persona ramah KKP dengan sapaan khas 'Halo Sahabat Bahari' serta jaminan layanan bebas biaya (Gratis).",
                tag: "Identitas KKP"
            }
        ];

        pillars.forEach((item, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const xPos = 0.8 + col * 4.3;
            const yPos = 1.6 + row * 1.7;

            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos, y: yPos, w: 4.1, h: 1.5,
                rectRadius: 0.1,
                fill: { color: C_WHITE },
                line: { color: C_CARD_BORDER, width: 1 }
            });

            // Tag badge
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos + 0.25, y: yPos + 0.2, w: 1.7, h: 0.25,
                rectRadius: 0.06,
                fill: { color: 'E0F2FE' }
            });
            slide.addText(item.tag, {
                x: xPos + 0.25, y: yPos + 0.2, w: 1.7, h: 0.25,
                fontSize: 8, bold: true, color: C_PRIMARY, align: 'center', fontFace: 'Segoe UI'
            });

            // Title
            slide.addText(item.title, {
                x: xPos + 0.25, y: yPos + 0.52, w: 3.6, h: 0.32,
                fontSize: 12, bold: true, color: C_TEXT_MAIN, fontFace: 'Segoe UI'
            });

            // Description
            slide.addText(item.desc, {
                x: xPos + 0.25, y: yPos + 0.85, w: 3.6, h: 0.55,
                fontSize: 9.5, color: C_TEXT_MUTED, fontFace: 'Segoe UI', lineSpacingMultiple: 1.15
            });
        });

        addFooter(slide, 3);
    }

    // ==========================================
    // SLIDE 4: ARSITEKTUR SISTEM 3 LAPIS
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_SLATE_BG };
        addHeader(slide, "Arsitektur Teknologi", "Arsitektur Respon Cerdas 3 Lapis (3-Tier Engine)", "Efisiensi biaya API dan kecepatan respon maksimal dengan routing bertingkat.");

        const tiers = [
            {
                layer: "LAPIS 1",
                name: "Interactive Menu Guide",
                sub: "Navigasi Menu Terstruktur",
                desc: "Mengarahkan pemohon dengan menu angka 1-6 (Syarat, Cek Status, Tanya AI, Keberatan, Selesai, Live Chat). Memastikan kebutuhan terarah seketika.",
                badge: "Respon 0.1 Detik",
                badgeColor: C_PRIMARY
            },
            {
                layer: "LAPIS 2",
                name: "Instant FAQ Matching",
                sub: "Knowledge Base Lokal (faq.json)",
                desc: "Pencocokan kata kunci otomatis untuk info umum KKP (Lokasi kantor, jam buka, KNMP, LPMUKP, LPSE, Diklat, Magang/PKL). Bebas biaya kuota API.",
                badge: "Tanpa Kuota Token",
                badgeColor: C_GREEN
            },
            {
                layer: "LAPIS 3",
                name: "Generative AI Engine",
                sub: "Google Gemini 3.5 Flash Lite",
                desc: "Menangani pertanyaan kontekstual dan pertanyaan terbuka. Dilengkapi guardrails ketat untuk tetap berada di koridor wewenang PPID KKP.",
                badge: "AI Kontekstual",
                badgeColor: C_GOLD
            }
        ];

        tiers.forEach((t, i) => {
            const xPos = 0.8 + i * 2.9;
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos, y: 1.55, w: 2.7, h: 2.65,
                rectRadius: 0.1,
                fill: { color: C_WHITE },
                line: { color: C_CARD_BORDER, width: 1 }
            });

            // Layer label
            slide.addText(t.layer, {
                x: xPos + 0.25, y: 1.75, w: 2.2, h: 0.22,
                fontSize: 8.5, bold: true, color: C_PRIMARY, fontFace: 'Segoe UI'
            });

            // Name
            slide.addText(t.name, {
                x: xPos + 0.25, y: 2.0, w: 2.2, h: 0.35,
                fontSize: 12, bold: true, color: C_TEXT_MAIN, fontFace: 'Segoe UI'
            });

            // Subtitle
            slide.addText(t.sub, {
                x: xPos + 0.25, y: 2.35, w: 2.2, h: 0.25,
                fontSize: 8.5, italic: true, color: '64748B', fontFace: 'Segoe UI'
            });

            // Description
            slide.addText(t.desc, {
                x: xPos + 0.25, y: 2.65, w: 2.2, h: 1.0,
                fontSize: 9, color: C_TEXT_MUTED, fontFace: 'Segoe UI', lineSpacingMultiple: 1.15
            });

            // Badge
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos + 0.25, y: 3.75, w: 2.2, h: 0.3,
                rectRadius: 0.06,
                fill: { color: 'F1F5F9' }
            });
            slide.addText(t.badge, {
                x: xPos + 0.25, y: 3.75, w: 2.2, h: 0.3,
                fontSize: 8, bold: true, color: t.badgeColor, align: 'center', fontFace: 'Segoe UI'
            });
        });

        // Bottom escalation bar
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 0.8, y: 4.35, w: 8.4, h: 0.65,
            rectRadius: 0.08,
            fill: { color: 'EFF6FF' },
            line: { color: 'BFDBFE', width: 1 }
        });
        slide.addText("🛡️ JARING PENGAMAN: JIKA PERTANYAAN MEMBUTUHKAN PENANGANAN RESMI / PEMOHON MENGETIK 'BANTUAN'", {
            x: 1.1, y: 4.43, w: 7.8, h: 0.25,
            fontSize: 8.5, bold: true, color: C_PRIMARY, fontFace: 'Segoe UI'
        });
        slide.addText("Sistem secara otomatis mengalihkan sesi ke Operator Helpdesk (CS_MODE) dan menghubungkan ke petugas WhatsApp asli.", {
            x: 1.1, y: 4.68, w: 7.8, h: 0.25,
            fontSize: 8.5, color: C_TEXT_MUTED, fontFace: 'Segoe UI'
        });

        addFooter(slide, 4);
    }

    // ==========================================
    // SLIDE 5: FITUR LAYANAN MANDIRI
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_SLATE_BG };
        addHeader(slide, "Fitur Aplikasi", "Fitur Layanan Mandiri Pemohon (Self-Service)", "Memfasilitasi kebutuhan mendasar pemohon informasi publik secara mandiri 24/7.");

        const features = [
            {
                num: "Menu 1",
                title: "Syarat Permohonan Informasi",
                points: [
                    "Penjelasan berkas wajib: Salinan KTP/Paspor, rincian data, tujuan permohonan.",
                    "Penyediaan link resmi portal ppid.kkp.go.id.",
                    "Format dokumen pengajuan online."
                ]
            },
            {
                num: "Menu 2",
                title: "Cek Status Permohonan",
                points: [
                    "Panduan pelacakan registrasi tiket permohonan.",
                    "Mengarahkan pemohon memantau progress secara transparan.",
                    "Menghubungkan dengan sistem database pusat KKP."
                ]
            },
            {
                num: "Menu 4",
                title: "Tata Cara Pengajuan Keberatan",
                points: [
                    "Edukasi hak pemohon berdasarkan UU KIP 14/2008.",
                    "Mekanisme jika tidak ditanggapi dalam 10 hari kerja.",
                    "Akses formulir resmi keberatan kepada Atasan PPID."
                ]
            },
            {
                num: "FAQ DB",
                title: "Direktori Layanan KKP Lengkap",
                points: [
                    "Program Prioritas: Kampung Nelayan Merah Putih (KNMP).",
                    "Permodalan & Koperasi: LPMUKP, Koperasi KDMP.",
                    "Akademik & Karir: Info PKL/Magang, Puslat KP, SDMKP."
                ]
            }
        ];

        features.forEach((f, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const xPos = 0.8 + col * 4.3;
            const yPos = 1.6 + row * 1.7;

            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos, y: yPos, w: 4.1, h: 1.5,
                rectRadius: 0.1,
                fill: { color: C_WHITE },
                line: { color: C_CARD_BORDER, width: 1 }
            });

            // Badge
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos + 0.25, y: yPos + 0.18, w: 1.1, h: 0.25,
                rectRadius: 0.06,
                fill: { color: C_PRIMARY }
            });
            slide.addText(f.num, {
                x: xPos + 0.25, y: yPos + 0.18, w: 1.1, h: 0.25,
                fontSize: 8, bold: true, color: C_WHITE, align: 'center', fontFace: 'Segoe UI'
            });

            // Title
            slide.addText(f.title, {
                x: xPos + 1.45, y: yPos + 0.18, w: 2.4, h: 0.25,
                fontSize: 11, bold: true, color: C_TEXT_MAIN, fontFace: 'Segoe UI'
            });

            // Points
            const bulletText = f.points.map(p => `• ${p}`).join('\n');
            slide.addText(bulletText, {
                x: xPos + 0.25, y: yPos + 0.52, w: 3.6, h: 0.88,
                fontSize: 8.5, color: C_TEXT_MUTED, fontFace: 'Segoe UI', lineSpacingMultiple: 1.15
            });
        });

        addFooter(slide, 5);
    }

    // ==========================================
    // SLIDE 6: FITUR AI & PERSONA BAHARI
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_SLATE_BG };
        addHeader(slide, "Fitur Aplikasi", "Generative AI & Standar Persona 'Sahabat Bahari'", "Membangun interaksi yang cerdas, sopan, dan berkarakter maritim resmi KKP.");

        // Left Container: AI Persona & Prompt Engineering
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 0.8, y: 1.6, w: 4.1, h: 3.3,
            rectRadius: 0.12,
            fill: { color: C_WHITE },
            line: { color: C_CARD_BORDER, width: 1 }
        });

        slide.addText("🤖 Google Gemini 3.5 Flash Lite", {
            x: 1.1, y: 1.85, w: 3.5, h: 0.3,
            fontSize: 13, bold: true, color: C_PRIMARY, fontFace: 'Segoe UI'
        });

        const leftPoints = [
            "Pemilihan Model Terkini: Menggunakan Gemini 3.5 Flash Lite untuk latensi sangat cepat dan efisiensi biaya operasional.",
            "Standar Sapaan Identitas: Setiap jawaban bot WAJIB diawali: 'Halo Sahabat Bahari,' menciptakan keakraban beretika.",
            "Bahasa Indonesia Formal: Menjaga marwah kementerian dengan komunikasi yang sopan, presisi, dan tidak bias.",
            "Kontekstual Maritim: Mampu menjelaskan istilah teknis kelautan dan tata cara permohonan informasi publik dengan jelas."
        ];

        slide.addText(leftPoints.map(p => `✓  ${p}`).join('\n\n'), {
            x: 1.1, y: 2.25, w: 3.5, h: 2.45,
            fontSize: 9, color: C_TEXT_MUTED, fontFace: 'Segoe UI', lineSpacingMultiple: 1.15
        });

        // Right Container: Guardrails & Redirect Logic
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 5.1, y: 1.6, w: 4.1, h: 3.3,
            rectRadius: 0.12,
            fill: { color: C_WHITE },
            line: { color: C_CARD_BORDER, width: 1 }
        });

        slide.addText("🛡️ Guardrail & Pengalihan Wewenang", {
            x: 5.4, y: 1.85, w: 3.5, h: 0.3,
            fontSize: 13, bold: true, color: C_GOLD, fontFace: 'Segoe UI'
        });

        const rightPoints = [
            "Batasan Lingkup PPID: Bot tidak melayani konsultasi di luar wewenang PPID (misal: pengaduan kapal asing atau teknis mesin).",
            "Pengalihan SIPI/SIUP: Diarahkan secara santun ke portal resmi perizinan SILAT KKP (perizinan.kkp.go.id).",
            "Pengalihan Aduan Ilegal: Diarahkan ke Call Center KKP 141 atau email pengaduan@kkp.go.id.",
            "Anti-Hallucination Safe Mode: Jika AI tidak yakin dengan jawaban, otomatis menyarankan pemohon mengetik BANTUAN untuk terhubung ke petugas."
        ];

        slide.addText(rightPoints.map(p => `✓  ${p}`).join('\n\n'), {
            x: 5.4, y: 2.25, w: 3.5, h: 2.45,
            fontSize: 9, color: C_TEXT_MUTED, fontFace: 'Segoe UI', lineSpacingMultiple: 1.15
        });

        addFooter(slide, 6);
    }

    // ==========================================
    // SLIDE 7: LIVE CHAT OPERATOR (HUMAN-IN-THE-LOOP)
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_SLATE_BG };
        addHeader(slide, "Fitur Aplikasi", "Kolaborasi Human-in-the-Loop & Live Chat Petugas", "Menghubungkan pemohon secara langsung dengan petugas resmi PPID KKP.");

        const steps = [
            {
                step: "Tahap 1: Deteksi Kebutuhan",
                title: "Eskalasi Otomatis / Manual",
                desc: "Pemohon mengetik 'BANTUAN', memilih Menu 6, atau setelah 2 kali pertanyaan belum terselesaikan di mode AI. Sistem langsung mengaktifkan status CS_MODE."
            },
            {
                step: "Tahap 2: Notifikasi Multi-Admin",
                title: "Broadcast ke Tim Petugas",
                desc: "Pesan diteruskan ke nomor-nomor admin resmi secara simultan, lengkap dengan link direct chat wa.me dan identitas nomor pemohon."
            },
            {
                step: "Tahap 3: Quote-Reply Dua Arah",
                title: "Balas Cepat via Kutipan Pesan",
                desc: "Petugas cukup melakukan 'Swipe / Balas Kutipan' pesan pemohon di WhatsApp pribadinya. Bot otomatis meneruskan balasan beserta lampiran media (foto/PDF)."
            },
            {
                step: "Tahap 4: Manajemen Sesi",
                title: "Kontrol Panduan & Penutupan",
                desc: "Petugas dapat mengetik /help untuk mengecek status dan nomor pemohon aktif, serta mengetik /selesai untuk menutup sesi secara resmi."
            }
        ];

        steps.forEach((s, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const xPos = 0.8 + col * 4.3;
            const yPos = 1.6 + row * 1.7;

            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos, y: yPos, w: 4.1, h: 1.5,
                rectRadius: 0.1,
                fill: { color: C_WHITE },
                line: { color: C_CARD_BORDER, width: 1 }
            });

            slide.addText(s.step.toUpperCase(), {
                x: xPos + 0.25, y: yPos + 0.15, w: 3.6, h: 0.22,
                fontSize: 8, bold: true, color: C_PRIMARY, fontFace: 'Segoe UI'
            });

            slide.addText(s.title, {
                x: xPos + 0.25, y: yPos + 0.4, w: 3.6, h: 0.3,
                fontSize: 11, bold: true, color: C_TEXT_MAIN, fontFace: 'Segoe UI'
            });

            slide.addText(s.desc, {
                x: xPos + 0.25, y: yPos + 0.72, w: 3.6, h: 0.68,
                fontSize: 8.5, color: C_TEXT_MUTED, fontFace: 'Segoe UI', lineSpacingMultiple: 1.15
            });
        });

        addFooter(slide, 7);
    }

    // ==========================================
    // SLIDE 8: KEAMANAN & OPERASIONAL
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_SLATE_BG };
        addHeader(slide, "Keamanan & Tata Kelola", "Keamanan Sistem & Disiplin Kebijakan Jam Kerja", "Memastikan ketersediaan layanan yang stabil, aman dari spam, dan patuh regulasi.");

        const gov = [
            {
                title: "Anti-Spam & Rate Limiter",
                sub: "Cooldown 2 Detik",
                desc: "Sistem membatasi jeda pengiriman pesan minimal 2 detik per pengguna. Mencegah server overload, serangan DoS, atau spam otomatis.",
                iconColor: C_PRIMARY
            },
            {
                title: "Jam Operasional Otomatis",
                sub: "Senin - Jumat (08.00 - 15.30 WIB)",
                desc: "Di luar jam kerja resmi, bot merespons dengan santun bahwa kantor sedang offline dan pesan akan diproses di hari kerja berikutnya (throttle 1x per jam).",
                iconColor: C_GOLD
            },
            {
                title: "Penanganan Jam Istirahat",
                sub: "Jeda Siang (11.40 - 13.00 WIB)",
                desc: "Memberikan pesan otomatis bahwa petugas sedang beristirahat dan layanan kembali aktif pukul 13.00 WIB. Dilengkapi anti-spam balasan (1x per 30 menit).",
                iconColor: C_GREEN
            }
        ];

        gov.forEach((g, i) => {
            const xPos = 0.8 + i * 2.9;
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos, y: 1.6, w: 2.7, h: 2.5,
                rectRadius: 0.12,
                fill: { color: C_WHITE },
                line: { color: C_CARD_BORDER, width: 1 }
            });

            slide.addShape(pres.shapes.OVAL, {
                x: xPos + 0.25, y: 1.85, w: 0.45, h: 0.45,
                fill: { color: g.iconColor }
            });

            slide.addText(g.title, {
                x: xPos + 0.8, y: 1.82, w: 1.7, h: 0.5,
                fontSize: 11, bold: true, color: C_TEXT_MAIN, fontFace: 'Segoe UI'
            });

            slide.addText(g.sub, {
                x: xPos + 0.25, y: 2.45, w: 2.2, h: 0.3,
                fontSize: 8.5, bold: true, color: g.iconColor, fontFace: 'Segoe UI'
            });

            slide.addText(g.desc, {
                x: xPos + 0.25, y: 2.8, w: 2.2, h: 1.15,
                fontSize: 8.8, color: C_TEXT_MUTED, fontFace: 'Segoe UI', lineSpacingMultiple: 1.15
            });
        });

        // Bottom privacy bar
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 0.8, y: 4.3, w: 8.4, h: 0.7,
            rectRadius: 0.08,
            fill: { color: 'F1F5F9' },
            line: { color: C_CARD_BORDER, width: 1 }
        });
        slide.addText("🔒 KEAMANAN KREDENSIAL & DATA PENGGUNA", {
            x: 1.1, y: 4.38, w: 7.8, h: 0.25,
            fontSize: 8.5, bold: true, color: C_TEXT_MAIN, fontFace: 'Segoe UI'
        });
        slide.addText("Enkripsi sesi WhatsApp via LocalAuth, API Key Gemini tersimpan aman di environment variabel (.env), dan nomor WhatsApp admin terisolasi dari publik.", {
            x: 1.1, y: 4.65, w: 7.8, h: 0.28,
            fontSize: 8.5, color: C_TEXT_MUTED, fontFace: 'Segoe UI'
        });

        addFooter(slide, 8);
    }

    // ==========================================
    // SLIDE 9: ALUR PERJALANAN PENGGUNA (USER JOURNEY)
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_SLATE_BG };
        addHeader(slide, "Alur Pengguna", "User Journey: Dari Pertanyaan Masuk Hingga Solusi", "Pemrosesan terstruktur yang menjamin setiap pesan pemohon terjawab tuntas.");

        const stages = [
            { step: "1", title: "Pesan Masuk", desc: "Pemohon mengirim chat via WhatsApp (Halo, Menu, atau Pertanyaan langsung)." },
            { step: "2", title: "Validasi Waktu", desc: "Pengecekan anti-spam & jam operasional/istirahat (WIB)." },
            { step: "3", title: "Klasifikasi", desc: "Menu angka (1-6) / Pencocokan FAQ lokal / Analisis Gemini AI." },
            { step: "4", title: "Jawaban Solutif", desc: "Format sapaan resmi Sahabat Bahari + informasi lengkap." },
            { step: "5", title: "Eskalasi / Selesai", desc: "Live chat petugas jika butuh verifikasi, atau ketik 5 untuk selesai." }
        ];

        stages.forEach((st, i) => {
            const xPos = 0.8 + i * 1.72;
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos, y: 1.7, w: 1.55, h: 2.8,
                rectRadius: 0.1,
                fill: { color: C_WHITE },
                line: { color: C_CARD_BORDER, width: 1 }
            });

            // Circle step number
            slide.addShape(pres.shapes.OVAL, {
                x: xPos + 0.52, y: 1.95, w: 0.5, h: 0.5,
                fill: { color: C_PRIMARY }
            });
            slide.addText(st.step, {
                x: xPos + 0.52, y: 1.95, w: 0.5, h: 0.5,
                fontSize: 12, bold: true, color: C_WHITE, align: 'center', fontFace: 'Segoe UI'
            });

            // Title
            slide.addText(st.title, {
                x: xPos + 0.1, y: 2.6, w: 1.35, h: 0.45,
                fontSize: 10, bold: true, color: C_TEXT_MAIN, align: 'center', fontFace: 'Segoe UI'
            });

            // Desc
            slide.addText(st.desc, {
                x: xPos + 0.1, y: 3.1, w: 1.35, h: 1.25,
                fontSize: 8, color: C_TEXT_MUTED, align: 'center', fontFace: 'Segoe UI', lineSpacingMultiple: 1.15
            });

            // Arrow (except last)
            if (i < 4) {
                slide.addText("➔", {
                    x: xPos + 1.48, y: 2.9, w: 0.3, h: 0.3,
                    fontSize: 14, color: C_PRIMARY, fontFace: 'Segoe UI'
                });
            }
        });

        // Bottom note
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 0.8, y: 4.65, w: 8.4, h: 0.4,
            rectRadius: 0.06,
            fill: { color: 'E0F2FE' }
        });
        slide.addText("💡 Tingkat keberhasilan penanganan mandiri oleh bot mencapai 70-80% tanpa perlu campur tangan petugas.", {
            x: 0.8, y: 4.65, w: 8.4, h: 0.4,
            fontSize: 9, bold: true, color: C_PRIMARY, align: 'center', fontFace: 'Segoe UI'
        });

        addFooter(slide, 9);
    }

    // ==========================================
    // SLIDE 10: MANFAAT & DAMPAK NYATA
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_SLATE_BG };
        addHeader(slide, "Manfaat & Dampak", "Dampak Strategis bagi Masyarakat & Lembaga", "Transformasi nyata dalam kualitas layanan keterbukaan informasi publik KKP.");

        const metrics = [
            {
                stat: "< 2 Detik",
                title: "Kecepatan Respon Layanan",
                desc: "Masyarakat memperoleh jawaban atas pertanyaan umum dalam hitungan detik tanpa harus mengantre atau menunggu balasan email berhari-hari.",
                color: C_PRIMARY
            },
            {
                stat: "80%",
                title: "Reduksi Beban Helpdesk",
                desc: "Pertanyaan repetitif ditangani penuh oleh sistem. Petugas PPID dapat fokus menangani permohonan informasi substantif dan pengujian konsekuensi.",
                color: C_GREEN
            },
            {
                stat: "100%",
                title: "Transparansi & Akuntabilitas",
                desc: "Memenuhi seluruh indikator kepatuhan Komisi Informasi Pusat (KIP) dengan penyediaan syarat, biaya (gratis), dan hak keberatan yang jelas.",
                color: C_GOLD
            },
            {
                stat: "24/7",
                title: "Kesiapan Kanal Informasi",
                desc: "Akses informasi tetap tersedia kapan pun. Pemohon di luar jam kerja tetap dipandu dan dicatat untuk ditindaklanjuti secara terjadwal.",
                color: C_ACCENT
            }
        ];

        metrics.forEach((m, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const xPos = 0.8 + col * 4.3;
            const yPos = 1.6 + row * 1.7;

            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos, y: yPos, w: 4.1, h: 1.5,
                rectRadius: 0.1,
                fill: { color: C_WHITE },
                line: { color: C_CARD_BORDER, width: 1 }
            });

            // Big Stat
            slide.addText(m.stat, {
                x: xPos + 0.25, y: yPos + 0.15, w: 1.5, h: 0.5,
                fontSize: 22, bold: true, color: m.color, fontFace: 'Segoe UI'
            });

            // Title
            slide.addText(m.title, {
                x: xPos + 1.8, y: yPos + 0.2, w: 2.1, h: 0.45,
                fontSize: 11, bold: true, color: C_TEXT_MAIN, fontFace: 'Segoe UI'
            });

            // Desc
            slide.addText(m.desc, {
                x: xPos + 0.25, y: yPos + 0.72, w: 3.65, h: 0.68,
                fontSize: 8.8, color: C_TEXT_MUTED, fontFace: 'Segoe UI', lineSpacingMultiple: 1.15
            });
        });

        addFooter(slide, 10);
    }

    // ==========================================
    // SLIDE 11: ROADMAP PENGEMBANGAN
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_SLATE_BG };
        addHeader(slide, "Rencana Pengembangan", "Roadmap Inovasi Menuju Layanan PPID Unggulan", "Langkah strategis berkelanjutan untuk memodernisasi layanan informasi KKP.");

        const phases = [
            {
                phase: "TAHAP 1 (AKTIF)",
                title: "Pondasi Bot & AI Agent",
                items: [
                    "Engine WhatsApp Web Multi-device",
                    "Knowledge Base FAQ lokal (faq.json)",
                    "Integrasi Google Gemini Flash Lite",
                    "Sistem Live Chat multi-operator"
                ],
                active: true
            },
            {
                phase: "TAHAP 2 (SEGERA)",
                title: "Integrasi API Portal PPID",
                items: [
                    "Pelacakan status tiket langsung di WA",
                    "Pemberitahuan otomatis status berkas",
                    "Sinkronisasi berkas permohonan digital",
                    "Survey kepuasan (IKM) otomatis via WA"
                ],
                active: false
            },
            {
                phase: "TAHAP 3 (MENENGAH)",
                title: "Official WhatsApp Cloud API",
                items: [
                    "Verifikasi Centang Hijau Resmi KKP",
                    "Kapasitas pesan tanpa batas (High Volume)",
                    "Dashboard analytics percakapan web",
                    "Multi-agent routing berdasarkan direktorat"
                ],
                active: false
            },
            {
                phase: "TAHAP 4 (LANJUTAN)",
                title: "AI OCR & Auto-Verification",
                items: [
                    "Ekstraksi data KTP pemohon otomatis via AI",
                    "Validasi kelengkapan berkas permohonan",
                    "Penyusunan draft jawaban berbasis arsip",
                    "Integrasi Satu Data Kelautan KKP"
                ],
                active: false
            }
        ];

        phases.forEach((ph, i) => {
            const xPos = 0.8 + i * 2.15;
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos, y: 1.6, w: 2.0, h: 3.3,
                rectRadius: 0.1,
                fill: { color: ph.active ? 'F0FDF4' : C_WHITE },
                line: { color: ph.active ? C_GREEN : C_CARD_BORDER, width: ph.active ? 1.5 : 1 }
            });

            // Phase tag
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: xPos + 0.15, y: 1.8, w: 1.7, h: 0.28,
                rectRadius: 0.05,
                fill: { color: ph.active ? C_GREEN : 'E2E8F0' }
            });
            slide.addText(ph.phase, {
                x: xPos + 0.15, y: 1.8, w: 1.7, h: 0.28,
                fontSize: 7.5, bold: true, color: ph.active ? C_WHITE : C_TEXT_MUTED, align: 'center', fontFace: 'Segoe UI'
            });

            // Title
            slide.addText(ph.title, {
                x: xPos + 0.15, y: 2.2, w: 1.7, h: 0.45,
                fontSize: 10, bold: true, color: C_TEXT_MAIN, align: 'center', fontFace: 'Segoe UI'
            });

            // Items
            const itemsText = ph.items.map(it => `• ${it}`).join('\n');
            slide.addText(itemsText, {
                x: xPos + 0.15, y: 2.75, w: 1.7, h: 2.0,
                fontSize: 8, color: C_TEXT_MUTED, fontFace: 'Segoe UI', lineSpacingMultiple: 1.2
            });
        });

        addFooter(slide, 11);
    }

    // ==========================================
    // SLIDE 12: PENUTUP & TANYA JAWAB (DARK THEME)
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_DARK_BG };

        // Decorative background elements
        slide.addShape(pres.shapes.RECTANGLE, {
            x: 0, y: 0, w: 0.25, h: 5.625,
            fill: { color: C_PRIMARY }
        });
        slide.addShape(pres.shapes.RECTANGLE, {
            x: 0.25, y: 0, w: 0.08, h: 5.625,
            fill: { color: C_ACCENT }
        });

        // Center card
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 1.0, y: 0.8, w: 8.0, h: 4.0,
            rectRadius: 0.15,
            fill: { color: '132F4C' },
            line: { color: '1E4976', width: 1 }
        });

        slide.addText("TERIMA KASIH", {
            x: 1.2, y: 1.2, w: 7.6, h: 0.6,
            fontSize: 32, bold: true, color: C_WHITE, align: 'center', fontFace: 'Segoe UI'
        });

        slide.addText("Keterbukaan Informasi Publik Menuju Kejayaan Bahari Indonesia", {
            x: 1.2, y: 1.85, w: 7.6, h: 0.35,
            fontSize: 13, bold: true, color: '38BDF8', align: 'center', fontFace: 'Segoe UI'
        });

        slide.addText("“Mari bersama-sama menjaga kelestarian laut dan transparansi informasi kita!” 🌊🇮🇩", {
            x: 1.2, y: 2.3, w: 7.6, h: 0.4,
            fontSize: 11, italic: true, color: 'BAE6FD', align: 'center', fontFace: 'Segoe UI'
        });

        // Divider
        slide.addShape(pres.shapes.LINE, {
            x: 1.8, y: 2.85, w: 6.4, h: 0,
            line: { color: '1E4976', width: 1 }
        });

        // Contact info boxes
        const contacts = [
            { label: "🌐 Portal Resmi", val: "ppid.kkp.go.id", x: 1.5 },
            { label: "🏢 Kantor Layanan", val: "Gedung Mina Bahari I Lt. 1", x: 3.8 },
            { label: "📧 Email Resmi", val: "ppidkkp@kkp.go.id", x: 6.4 }
        ];

        contacts.forEach(c => {
            slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: c.x, y: 3.1, w: 2.1, h: 0.75,
                rectRadius: 0.08,
                fill: { color: '0A192F' },
                line: { color: '1E4976', width: 0.8 }
            });
            slide.addText(c.label, {
                x: c.x, y: 3.18, w: 2.1, h: 0.25,
                fontSize: 8.5, bold: true, color: C_PRIMARY, align: 'center', fontFace: 'Segoe UI'
            });
            slide.addText(c.val, {
                x: c.x, y: 3.45, w: 2.1, h: 0.3,
                fontSize: 8.5, color: C_WHITE, align: 'center', fontFace: 'Segoe UI'
            });
        });

        slide.addText("SESI TANYA JAWAB (Q&A)", {
            x: 1.2, y: 4.1, w: 7.6, h: 0.35,
            fontSize: 12, bold: true, color: C_GOLD, align: 'center', fontFace: 'Segoe UI'
        });
    }

    const outputPath = path.join(__dirname, 'Presentasi_PPID_Bot_WhatsApp_KKP.pptx');
    await pres.writeFile({ fileName: outputPath });
    console.log(`✅ File presentasi berhasil dibuat di: ${outputPath}`);
}

createPresentation().catch(err => {
    console.error("❌ Terjadi error saat membuat presentasi:", err);
    process.exit(1);
});

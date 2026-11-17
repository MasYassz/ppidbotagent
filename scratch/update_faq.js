const fs = require('fs');
const path = require('path');

const updatedFaqList = [
  // ============================================================
  // 1. INFORMASI DASAR PPID & KANTOR PUSAT KKP
  // ============================================================
  {
    keywords: ["lokasi", "alamat", "kantor ppid", "dimana ppid", "gedung ppid", "alamat kkp"],
    answer: "🏢 *Informasi Lokasi Layanan PPID KKP*\n\nKantor layanan PPID Kementerian Kelautan dan Perikanan (KKP) berlokasi di:\n*Gedung Mina Bahari IV, Lantai 1*\nJl. Medan Merdeka Timur No. 16, Gambir, Jakarta Pusat, 10110."
  },
  {
    keywords: ["jam kerja", "jam operasional", "buka jam berapa", "kapan tutup", "jadwal buka", "jam istirahat"],
    answer: "🕰️ *Jam Operasional PPID KKP*\n\nLayanan informasi publik kami beroperasi pada:\n• *Senin - Kamis:* 08.00 - 15.00 WIB\n• *Jumat:* 08.00 - 15.30 WIB\n• *Jam Istirahat:* 11.40 - 13.00 WIB\n• *Sabtu, Minggu & Libur Nasional:* Tutup"
  },
  {
    keywords: ["biaya ppid", "bayar ppid", "apakah gratis", "tarif informasi", "harga data"],
    answer: "💰 *Biaya Layanan Informasi PPID*\n\nSeluruh layanan permohonan informasi publik di PPID KKP *TIDAK DIPUNGUT BIAYA (GRATIS)*. Hati-hati terhadap segala bentuk penipuan yang mengatasnamakan PPID KKP."
  },
  {
    keywords: ["akun resmi", "medsos resmi", "media sosial kkp", "instagram kkp", "twitter kkp", "youtube kkp"],
    answer: "Halo #SahabatBahari,\n\nAkun media sosial resmi Kementerian Kelautan dan Perikanan (KKP) hanya:\n• YouTube: @KKP_RI\n• Instagram: @kkpgoid\n• TikTok: @kkp.go.id\n• X / Twitter: @kkpgoid\n• Facebook: Kementerian Kelautan dan Perikanan RI\n• Website: https://kkp.go.id\n\nAkun di luar daftar ini bukan kanal resmi KKP. Salam hormat."
  },

  // ============================================================
  // 2. PENGADUAN & KELUHAN (AKP/ABK & UMUM & SURAT PALSU)
  // ============================================================
  {
    keywords: [
      "pengaduan akp", "pengaduan abk", "lapor akp", "lapor abk",
      "gaji abk", "gaji akp", "abk ditahan", "kecelakaan abk",
      "awak kapal perikanan", "gangguan operasional akp", "masalah abk", "masalah akp"
    ],
    answer: "Halo #SahabatBahari,\n\nTerkait laporan atau pengaduan mengenai *Awak Kapal Perikanan (AKP / ABK)* (gaji, kecelakaan, atau kendala di kapal), silakan dapat langsung disampaikan melalui:\n\n📱 *Pengaduan AKP:* 0811251744 atau ke https://lapor.go.id\n📞 *Call Center Gangguan Operasional (Pengaduan AKP):* +62 811-1000-3132\n\nSalam hormat."
  },
  {
    keywords: [
      "pengaduan", "lapor", "laporkan", "aduan", "keluhan", "melaporkan",
      "lapor.go.id", "birohkln", "whistleblower", "wbs kkp"
    ],
    answer: "Halo #SahabatBahari,\n\nBaik Sahabat, saat ini kami sudah mendata mengenai laporannya. Boleh juga Sahabat bantu untuk melaporkannya melalui informasi ini ya:\n\n📧 *Email:* pengaduan@kkp.go.id\n📱 *WhatsApp:* 0811989011\n🌐 *Website:* https://lapor.go.id\n\nAgar cepat ditindaklanjuti, mohon lampirkan kronologi rinci, lokasi, dan bukti pendukung (foto/dokumen). Salam hormat."
  },
  {
    keywords: [
      "surat palsu", "surat bodong", "undangan palsu", "pesanan barang palsu", "surat pengadaan palsu",
      "pemalsuan surat", "pemalsuan dokumen", "dokumen palsu", "surat tugas palsu", "surat sekjen palsu",
      "tanda tangan sekjen", "tanda tangan menteri", "pemalsuan tanda tangan", "cek keaslian surat",
      "verifikasi keaslian surat", "keaslian surat", "surat kkp palsu", "surat edaran palsu",
      "sipi palsu", "siup palsu", "izin palsu", "sertifikat palsu", "penipuan kkp", "hoaks kkp", "penipuan"
    ],
    answer: "Halo #SahabatBahari,\n\n🚨 *Waspada Penipuan Surat & Dokumen Palsu KKP!*\nKKP mengimbau masyarakat untuk waspada terhadap modus surat dinas fiktif (surat pesanan pengadaan barang palsu, undangan seminar/bimtek berbayar palsu, atau perizinan bodong tanpa QR valid).\n\nCiri utama surat palsu:\n• Menggunakan nomor WhatsApp pribadi dan meminta transfer uang/DP ke rekening individu.\n• Format kop/tanda tangan tiruan tanpa TTE resmi bersertifikasi BSrE.\n\nUntuk verifikasi keabsahan dokumen, Anda *dapat langsung mengirimkan foto/file surat di chat ini* untuk diperiksa oleh Petugas PPID KKP, atau konfirmasi ke WA Resmi KKP: 0811-1146-141. Salam hormat."
  },
  {
    keywords: [
      "bom ikan", "alat tangkap terlarang", "destructive fishing", "penyelundupan benih", "limbah laut", "psdkp"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk laporan pelanggaran perikanan (destructive fishing, bom ikan, alat tangkap terlarang, atau pencemaran laut), silakan hubungi:\n• *Ditjen PSDKP:* +62 811-947-141\n• *Hotline Pengendalian Ruang Laut:* +62 811-1012-0010\n• *Kanal Pengaduan:* https://lapor.go.id atau pengaduan@kkp.go.id\n\nMohon sertakan koordinat lokasi, waktu, dan foto/video kejadian. Salam hormat."
  },

  // ============================================================
  // 3. PROGRAM KERJA PRIORITAS NASIONAL (PKPN) KKP
  // ============================================================
  {
    keywords: [
      "pkpn", "program kerja prioritas nasional", "apa itu pkpn", "program prioritas kkp",
      "berapa program pkpn", "isi pkpn", "pkpn terdiri dari", "daftar program pkpn",
      "program pkpn", "fokus pkpn"
    ],
    answer: "Halo #SahabatBahari,\n\n*Program Kerja Prioritas Nasional (PKPN)* KKP adalah program strategis percepatan swasembada pangan, kedaulatan protein hewani, dan pertumbuhan ekonomi pesisir.\n\nPKPN KKP terdiri dari *5 Program Prioritas Utama*:\n1. *Kampung Nelayan Merah Putih (KNMP):* Pembangunan hingga 5.000 titik sentra ekonomi terpadu pesisir.\n2. *Revitalisasi Tambak Budidaya Pantura Jawa:* Pemulihan puluhan ribu hektare tambak udang & nila salin dengan normalisasi irigasi & IPAL.\n3. *Budidaya Ikan Darat Tematik:* Puluhan ribu titik budidaya air tawar (lele, nila, patin, gurame) untuk gizi protein nasional.\n4. *Swasembada Garam Nasional:* Pembangunan kawasan sentra industri garam rakyat terpadu (seperti di Rote Ndao).\n5. *Modernisasi Armada Kapal & Perlindungan Nelayan:* Transformasi kapal baja/fiber standar laik laut, alat tangkap modern, asuransi, dan sertifikasi tanah nelayan.\n\nSalam hormat."
  },
  {
    keywords: [
      "tambak pantura", "revitalisasi tambak", "pantura jawa", "tambak udang pantura",
      "tambak nila salin", "saluran tambak pantura", "revitalisasi pantura"
    ],
    answer: "Halo #SahabatBahari,\n\n*Revitalisasi Tambak Pantura Jawa* (bagian PKPN KKP) memulihkan kawasan tambak pesisir utara Jawa (Bekasi hingga Jawa Timur) menjadi sentra budidaya udang vaname dan nila salin bernilai tinggi.\n\nFokus kegiatan:\n• Normalisasi saluran irigasi primer & sekunder\n• Penyediaan tandon air bersih dan Instalasi Pengolahan Air Limbah (IPAL)\n• Pendampingan teknologi ramah lingkungan oleh DJPB KKP.\n\nKonsultasi: Ditjen Perikanan Budi Daya (WA: +62 822-6150-5727). Salam hormat."
  },
  {
    keywords: [
      "budidaya ikan darat", "ikan darat tematik", "budidaya darat", "kolam ikan darat",
      "budidaya air tawar kkp", "bantuan benih ikan darat", "program makan bergizi kkp"
    ],
    answer: "Halo #SahabatBahari,\n\n*Budidaya Ikan Darat Tematik* adalah pilar PKPN KKP untuk memperkuat ketahanan pangan dan penyediaan protein hewani di kabupaten/kota (lele, nila, patin, gurame, mas).\n\nPengajuan bantuan sarana (benih unggul, bioflok, pakan mandiri) diajukan melalui proposal kelompok pembudidaya (Pokdakan ber-e-KUSUKA) ke Dinas Perikanan Kabupaten/Kota setempat untuk diteruskan ke DJPB KKP. Salam hormat."
  },
  {
    keywords: [
      "swasembada garam", "tambak garam", "garam nasional", "sentra garam",
      "industri garam kkp", "garam rakyat", "garam rote ndao"
    ],
    answer: "Halo #SahabatBahari,\n\nProgram *Swasembada Garam Nasional* KKP difokuskan pada intensifikasi dan integrasi lahan tambak garam rakyat (termasuk modeling tambak garam terintegrasi di Rote Ndao NTT, Jateng, Jatim, dan Sulsel) guna memenuhi kebutuhan garam konsumsi dan industri domestik.\n\nPembinaan teknologi geomembran dan sentra garam dikoordinasikan oleh Ditjen Pengelolaan Kelautan dan Ruang Laut (PKRL). Salam hormat."
  },

  // ============================================================
  // 4. KEBIJAKAN EKONOMI BIRU (BLUE ECONOMY) KKP
  // ============================================================
  {
    keywords: [
      "ekonomi biru", "blue economy", "kebijakan ekonomi biru", "5 pilar ekonomi biru",
      "pilar ekonomi biru", "prinsip ekonomi biru", "program ekonomi biru", "arah ekonomi biru"
    ],
    answer: "Halo #SahabatBahari,\n\nKKP berkomitmen mewujudkan kelestarian laut melalui *5 Pilar Kebijakan Ekonomi Biru*:\n1. *Perluasan Kawasan Konservasi Laut:* Target 30% pada tahun 2045 untuk perlindungan keanekaragaman hayati & penyerap karbon biru (*blue carbon*).\n2. *Penangkapan Ikan Terukur (PIT):* Penangkapan berbasis kuota di 11 WPPNRI.\n3. *Pengembangan Budi Daya Ramah Lingkungan:* Komoditas unggulan (udang, lobster, kepiting, rumput laut, nila salin) di laut, pesisir, dan darat.\n4. *Pengawasan Pesisir & Pulau-Pulau Kecil:* Pengendalian ruang laut via izin PKKPRL guna menjaga ekosistem pesisir.\n5. *Pembersihan Sampah Plastik Laut:* Gerakan partisipasi nelayan melalui *Bulan Cinta Laut (BCL)*.\n\nSalam hormat."
  },
  {
    keywords: [
      "kawasan konservasi laut", "konservasi perairan", "target 30 persen kkp",
      "taman nasional perairan", "suaka perikanan", "zona inti konservasi", "blue carbon"
    ],
    answer: "Halo #SahabatBahari,\n\n*Pilar 1 Ekonomi Biru:* KKP menargetkan perluasan kawasan konservasi perairan laut hingga 30% (32,5 juta hektare) pada tahun 2045 untuk menjaga plasma nutfah, tempat pemijahan ikan, dan ekosistem karbon biru (mangrove & padang lamun).\n\nPemanfaatan diatur berbasis zonasi (Zona Inti, Zona Pemanfaatan, Zona Perikanan Berkelanjutan). Konsultasi: Ditjen PKRL (humas.kkp@kkp.go.id). Salam hormat."
  },
  {
    keywords: [
      "penangkapan ikan terukur", "pit kkp", "kuota penangkapan", "zona penangkapan ikan",
      "kuota nelayan", "aturan pit", "wppnri kuota"
    ],
    answer: "Halo #SahabatBahari,\n\n*Pilar 2 Ekonomi Biru:* Kebijakan *Penangkapan Ikan Terukur (PIT)* mengatur kuota tangkap di 11 WPPNRI untuk mencegah overfishing:\n• Dibagi atas Kuota Industri, Kuota Nelayan Lokal/Tradisional, dan Kuota Non-Komersial.\n• Nelayan kecil/tradisional mendapatkan prioritas kuota dan dibebaskan dari pungutan PNBP pascaproduksi.\n• Kapal wajib memasang transmiter VMS aktif dan mendarat di pelabuhan pangkalan resmi.\n\nSalam hormat."
  },
  {
    keywords: [
      "bulan cinta laut", "bcl", "sampah laut", "sampah plastik laut",
      "gerakan bcl", "nelayan ambil sampah", "bersih pantai kkp"
    ],
    answer: "Halo #SahabatBahari,\n\n*Pilar 5 Ekonomi Biru:* *Gerakan Bulan Cinta Laut (BCL)* melibatkan nelayan untuk mengambil sampah plastik di laut saat melaut:\n• Sampah yang dibawa ke darat ditimbang di pelabuhan dan diberikan insentif/kompensasi ekonomi.\n• Sampah dikelola melalui bank sampah pesisir untuk didaur ulang.\n\nInformasi keikutsertaan dikoordinasikan oleh Kantor Pelabuhan Perikanan pangkalan atau Ditjen PKRL KKP. Salam hormat."
  },

  // ============================================================
  // 5. MODERNISASI KAPAL PERIKANAN & PENYELESAIAN MASALAHNYA
  // ============================================================
  {
    keywords: [
      "modernisasi kapal", "kapal modern", "transformasi kapal", "standar kapal modern",
      "kapal baja perikanan", "kapal fiber kkp", "program modernisasi kapal"
    ],
    answer: "Halo #SahabatBahari,\n\nProgram *Modernisasi Kapal Perikanan* KKP mentransformasi kapal tradisional kayu menjadi kapal baja/fiber modern yang memenuhi 3 pilar: *Laik Laut, Laik Tangkap, dan Laik Simpan*.\n\nStandar kapal modern:\n• Palka berinsulasi higienis / freezer pendingin ikan\n• Mesin penggerak terstandar hemat bahan bakar\n• Peralatan navigasi & keselamatan terintegrasi\n• Sertifikat Kelaikan Kapal Perikanan (SKKP) via aplikasi SICEFI.\n\nKonsultasi: *WA PTSA KKP* di 0811-8430-610. Salam hormat."
  },
  {
    keywords: [
      "kendala sicefi", "sicefi kapal", "selisih ukuran kapal", "discrepancy size",
      "beda loa", "beda gt", "cek fisik sicefi", "ukuran kapal tidak cocok", "panjang kapal beda"
    ],
    answer: "Halo #SahabatBahari,\n\nJika terdapat *ketidaksesuaian ukuran fisik (LoA / Gross Tonnage GT)* saat cek fisik di *SICEFI*:\n1. Ajukan permohonan cek fisik / ukur ulang ke Kantor Pelabuhan Perikanan pangkalan atau UPT Ditjen Perikanan Tangkap.\n2. Marine Inspector KKP akan memeriksa fisik kapal dan melakukan rekonsiliasi data ukur.\n3. Hasil verifikasi akan diunggah ke aplikasi SICEFI (https://kapal.kkp.go.id/sicefi/) untuk penerbitan SKKP.\n\nBantuan kendala sistem: WA PTSA di 0811-8430-610. Salam hormat."
  },
  {
    keywords: [
      "skkp", "sicefi", "kelaikan kapal", "sertifikat kelaikan kapal", "skkp belum terbit", "terkendala skkp"
    ],
    answer: "Halo #SahabatBahari,\n\nPengajuan *Sertifikat Kelaikan Kapal Perikanan (SKKP)* diajukan daring melalui aplikasi *SICEFI*: https://kapal.kkp.go.id/sicefi/.\n\nSyarat penerbitan:\n• Cek fisik konstruksi lambung, mesin, dan palka pendingin\n• Kelengkapan alat penangkapan ikan & alat bantu keselamatan\n\nJika berkas belum diverifikasi petugas pelabuhan pangkalan, silakan koordinasi via *WA PTSA KKP:* 0811-8430-610. Salam hormat."
  },
  {
    keywords: [
      "migrasi izin kapal", "izin kapal daerah ke pusat", "kapal 30 gt",
      "izin tangkap di atas 12 mil", "alih izin kapal", "migrasi sipi"
    ],
    answer: "Halo #SahabatBahari,\n\nKapal berizin daerah yang beroperasi di wilayah di atas 12 mil laut atau berukuran di atas 30 GT *wajib bermigrasi ke izin pusat KKP*:\n1. Ajukan mutasi/penghapusan dari daftar kapal dinas provinsi.\n2. Lakukan pemeriksaan kelaikan kapal via *SICEFI* untuk penerbitan SKKP pusat.\n3. Terbitkan NIB dan izin usaha (SIUP/SIPI) melalui portal terintegrasi OSS dan SILAT (https://perizinan.kkp.go.id).\n\nAsistensi: WA PTSA 0811-8430-610. Salam hormat."
  },
  {
    keywords: [
      "sertifikat awak kapal modern", "bst-f kapal modern", "e-laut kapal",
      "pelatihan abk modern", "syarat nakhoda modern"
    ],
    answer: "Halo #SahabatBahari,\n\nAwak Kapal Perikanan (AKP) pada kapal modern wajib memiliki sertifikat kompetensi keselamatan:\n• *BST-F (Basic Safety Training Fisheries)* aktif\n• Sertifikat Keterampilan Khusus (SKK) Navigasi & Refrigerasi Kapal\n\nPendaftaran pelatihan dan sertifikasi mandiri diakses daring melalui *E-LAUT*: https://elaut-bppsdm.kkp.go.id/akp/ (Contact Person: 0819-9247-4154). Salam hormat."
  },
  {
    keywords: [
      "tender kapal", "proyek kapal nelayan", "pengadaan kapal modern", "lpse kapal kkp"
    ],
    answer: "Halo #SahabatBahari,\n\nPengadaan dan tender resmi kapal perikanan modern KKP diumumkan secara terbuka dan transparan melalui portal LPSE:\n🌐 https://spse.inaproc.id/kkp\n\nBagi galangan kapal terdaftar, pastikan kelengkapan sertifikasi izin usaha galangan dan persyaratan teknis kelaikan laut. Salam hormat."
  },

  // ============================================================
  // 6. WILAYAH & PROGRAM KAMPUNG NELAYAN MERAH PUTIH (KNMP)
  // ============================================================
  {
    keywords: [
      "wilayah knmp", "lokasi knmp", "sebaran knmp", "daftar lokasi knmp",
      "titik knmp", "kepmen kp 55", "kepmen kp 20", "kepmen 55/2025"
    ],
    answer: "Halo #SahabatBahari,\n\nPenetapan lokasi *Kampung Nelayan Merah Putih (KNMP)* diatur dalam *Kepmen KP No. 55 Tahun 2025* (mencakup 65 lokasi prioritas Tahap I di seluruh Indonesia) dan Satuan Tugas dipandu *Kepmen KP No. 20 Tahun 2026*.\n\nSebaran 65 titik tahap pertama mencakup pesisir Aceh, Sumut, Sumbar, Riau, Lampung, Jabar, Jateng, Jatim, Bali, NTB, NTT, Sulsel, Sultra, Maluku, hingga Papua Selatan.\n\nPeta sebaran digital spasial interaktif dapat diakses di situs resmi https://kkp.go.id atau dokumen JDIH KKP di https://jdih.kkp.go.id. Salam hormat."
  },
  {
    keywords: [
      "jadwal knmp", "tahapan knmp", "kapan knmp dibangun", "timeline knmp",
      "pelaksanaan knmp", "progres knmp", "tahapan pelaksanaan knmp"
    ],
    answer: "Halo #SahabatBahari,\n\n*Jadwal & Tahapan Pelaksanaan KNMP KKP:*\n1. *Tahap I (2025/2026):* Pembangunan fisik 65 lokasi pesisir percontohan selesai konstruksi 100% pada April/Mei 2026.\n2. *Operasionalisasi & SDM (2026):* Pembekalan pengurus Koperasi Desa Merah Putih (KDMP) dan seleksi pengelola fasilitas sentra nelayan.\n3. *Survei Spasial Nasional:* Pemetaan calon lokasi baru oleh 3.500 surveyor perguruan tinggi & politeknik KKP berlangsung hingga Desember 2026 guna persiapan pembangunan gelombang berikutnya menuju target 5.000 titik hingga 2029.\n\nSalam hormat."
  },
  {
    keywords: [
      "usul knmp", "usulan lokasi knmp", "pengusulan knmp", "syarat knmp",
      "bagaimana jadi knmp", "desa nelayan merah putih", "usulan knmp"
    ],
    answer: "Halo #SahabatBahari,\n\nSyarat dan tata cara pengusulan lokasi *Kampung Nelayan Merah Putih (KNMP)*:\n1. Diajukan resmi oleh Pemerintah Daerah / Dinas Perikanan Kabupaten/Kota kepada Dirjen Perikanan Tangkap (DJPT) KKP.\n2. Lahan lokasi harus siap, berstatus clean & clear (bebas sengketa) untuk pembangunan sarana terpadu.\n3. Mayoritas warga berprofesi nelayan aktif dan telah terdaftar pada kartu *e-KUSUKA*.\n4. Kesiapan pembentukan/penguatan Koperasi Desa Merah Putih (KDMP).\n\nSalam hormat."
  },
  {
    keywords: [
      "fasilitas knmp", "sarana knmp", "pabrik es knmp", "cold storage knmp",
      "bengkel knmp", "bantuan knmp"
    ],
    answer: "Halo #SahabatBahari,\n\nKawasan KNMP dibangun terintegrasi dengan sarana:\n• Dermaga higienis & tambatan perahu nelayan\n• Mini cold storage & pabrik es skala nelayan\n• Bengkel mesin perahu & solar cell penerangan mandiri\n• Fasilitas sanitasi air bersih pesisir & balai pertemuan nelayan\n• Gerai logistik sembako & solar nelayan melalui KDMP.\n\nSalam hormat."
  },
  {
    keywords: [
      "knmp", "kampung nelayan merah putih", "kontak knmp", "manajer knmp",
      "satgas knmp", "rekrutmen knmp", "aduan knmp"
    ],
    answer: "Halo #SahabatBahari,\n\nKontak Resmi Pengelolaan & Satgas Operasionalisasi *KNMP DJPT KKP*:\n📱 *WA Official KNMP:* +62 822-9936-9004\n☎️ *Call Center:* 1500587\n📧 *Email:* korwil@merahputih.kop.id\n📸 *Instagram:* @knmp_indonesia\n\nUntuk pengaduan operasional sarana KNMP atau kemitraan, silakan hubungi kontak resmi di atas. Salam hormat."
  },
  {
    keywords: [
      "kdmp", "koperasi desa merah putih", "pendaftaran kopdes", "koperasi nelayan merah putih"
    ],
    answer: "Halo #SahabatBahari,\n\n*Koperasi Desa Merah Putih (KDMP)* adalah badan usaha penggerak ekonomi di kawasan KNMP untuk pengelolaan pabrik es, kios bahan bakar, logistik, dan pemasaran hasil tangkapan nelayan.\n\nInformasi dan pendaftaran resmi: https://kopdesa.com/pendaftaran-kopdes/ atau melalui koordinasi Dinas Koperasi/Perikanan setempat. Salam hormat."
  },

  // ============================================================
  // 7. PERIZINAN & LAYANAN TERPADU SATU ATAP (PTSA)
  // ============================================================
  {
    keywords: [
      "ptsa", "wa center ptsa", "konsultasi perizinan", "kontak ptsa", "lokasi ptsa"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk konsultasi perizinan sektor kelautan dan perikanan, silakan hubungi *PTSA (Pelayanan Terpadu Satu Atap)* KKP:\n\n📱 *WA Center:* 0811-8430-610\n📧 *Email:* ptsp@kkp.go.id\n☎️ *Telepon:* 021-3519070 ext. 2826\n🏢 *Tatap Muka:* Gedung Mina Bahari IV Lt. 1, Gambir, Jakarta Pusat (Senin–Kamis 08.00–15.30 WIB)\n🌐 *Webchat:* https://perizinan.kkp.go.id\n\nSalam hormat."
  },
  {
    keywords: [
      "sipi belum terbit", "siup belum terbit", "verifikasi siup", "verifikasi sipi", "ditolak oss"
    ],
    answer: "Halo #SahabatBahari,\n\nPenerbitan SIPI/SIUP dilakukan terintegrasi melalui OSS. Untuk tindak lanjut sisi KKP, hubungi:\n• *Webchat Perizinan:* https://perizinan.kkp.go.id\n• *Email:* perizinan@kkp.go.id\n• *WA PTSA:* 0811-8430-610\n\nJika kendala pada sistem OSS:\n• *WA/Telepon OSS:* +6281511828000\n• *Email:* kontak@oss.go.id\n\nSalam hormat."
  },
  {
    keywords: [
      "pkkprl", "izin pkkprl", "izin ruang laut", "pemanfaatan ruang laut", "pulau kecil", "izin pulau"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk perizinan Persetujuan Kesesuaian Kegiatan Pemanfaatan Ruang Laut (PKKPRL) termasuk pulau-pulau kecil, silakan hubungi:\n\n📱 *Hotline Perizinan Ruang Laut:* +62 877-6225-0001\n\nUntuk konsultasi regulasi/surat resmi, dapat diajukan ke Ditjen Pengelolaan Kelautan melalui email humas.kkp@kkp.go.id. Salam hormat."
  },
  {
    keywords: [
      "login silat", "login skp", "cetak siup", "kendala akun silat", "nib tidak ditemukan"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk kendala akun dan sistem perizinan:\n• Kendala login SILAT/SKP & cetak SIUP: hubungi *WA PTSA KKP* di 0811-8430-610 atau https://perizinan.kkp.go.id\n• Notifikasi 'NIB Tidak Ditemukan' di portaldata: hubungi *Helpdesk Portal Data* di 08118722009\n\nSertakan nama usaha dan tangkapan layar kendala. Salam hormat."
  },
  {
    keywords: [
      "kusuka", "e-kusuka", "kartu kusuka", "daftar kusuka", "perpanjang kusuka"
    ],
    answer: "Halo #SahabatBahari,\n\n*Kartu e-KUSUKA* adalah identitas tunggal bagi pelaku usaha kelautan dan perikanan (nelayan, pembudidaya, pengolah, pemasar) untuk akses bantuan, asuransi, dan perizinan.\n\nUntuk pendaftaran, perpanjangan, atau kendala pendaftaran online, silakan konsultasi ke:\n📱 *WA Center PTSA:* 0811-8430-610\n📱 *Helpdesk Portal Data:* 0811-8722-009\n\nSalam hormat."
  },
  {
    keywords: [
      "ikan dilindungi", "sipji", "psai", "saji", "izin hiu", "izin arwana", "izin karang", "izin bbl"
    ],
    answer: "Halo #SahabatBahari,\n\nPerizinan pemanfaatan jenis ikan dilindungi/terbatas (SIPJI, SAJI, PSAI) dilayani oleh tim perizinan KKP. Silakan konsultasi ke:\n\n📱 *WA PTSA KKP:* 0811-8430-610\n🏢 *Tatap Muka:* Gedung Mina Bahari IV Lt. 1, Gambir, Jakarta Pusat\n\nMohon sebutkan nama komoditas ikan, tujuan (usaha/hobi/ekspor), dan lokasinya. Salam hormat."
  },
  {
    keywords: [
      "obat ikan", "pakan ikan", "pelengkap pakan", "waktu henti obat", "withdrawal time"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk perizinan obat ikan dan pelengkap pakan, silakan hubungi:\n📱 *Pelayanan Berusaha WA Center YanBlik DJPB:* +62 822-6150-5727\n\nSesuai Permen KP No. 19/2024 Pasal 17 ayat 3: obat keras yang diperbolehkan wajib mencantumkan waktu henti (withdrawal time) pada kemasan. Salam hormat."
  },
  {
    keywords: [
      "ekspor ikan", "syarat ekspor", "health certificate", "hc ikan", "shti", "coa", "skp ekspor"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk pengurusan sertifikat ekspor perikanan (SKP, HACCP, SHTI, COA, dan Health Certificate/HC), silakan konsultasi ke *PTSA KKP*:\n\n📱 *WA Center:* 0811-8430-610\n📧 *Email:* ptsp@kkp.go.id\n☎️ *Telepon:* 021-3519070 ext. 2826\n\nSalam hormat."
  },
  {
    keywords: [
      "biaya smkhp", "tarif smkhp", "sertifikat mutu dan keamanan hasil perikanan", "pnbp perikanan"
    ],
    answer: "Halo #SahabatBahari,\n\nPenerbitan Sertifikat Mutu dan Keamanan Hasil Perikanan (SMKHP) dikenakan PNBP sesuai PP No. 85/2021 dan Permen KP No. 17/2024.\n\nUntuk rincian tarif sesuai komoditas dan jenis usaha, silakan konsultasi ke:\n📱 *WA PTSA KKP:* 0811-8430-610\n\nSalam hormat."
  },
  {
    keywords: [
      "impor ikan", "syarat impor", "daftar importir", "daftar eksportir", "hs code ikan"
    ],
    answer: "Halo #SahabatBahari,\n\nPersyaratan impor produk perikanan merupakan ranah perizinan KKP. Silakan hubungi:\n📱 *WA Center PTSA:* 0811-8430-610\n\nUntuk mengecek daftar eksportir/importir terdaftar, kunjungi:\n🔗 https://kkp.go.id/bppmhkp/data-eksportir-dan-importir-terdaftar-gZ6D/detail.html\n\nSalam hormat."
  },
  {
    keywords: [
      "lab uji", "laboratorium", "buski", "uji sampel", "bppmhkp"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk layanan pengujian laboratorium hasil kelautan dan perikanan, silakan hubungi:\n*Balai Uji Standar Pengendalian dan Pengawasan Mutu (BUSKI)* Jakarta:\n☎️ *Telepon:* (021) 8448506\n📧 *Email:* buskipm@gmail.com\n\nSalam hormat."
  },
  {
    keywords: [
      "karantina", "kirim ikan antar daerah", "deposit ikan", "bkhit"
    ],
    answer: "Halo #SahabatBahari,\n\nKetentuan pemeriksaan pengiriman ikan antar daerah atau ke luar negeri berada di bawah wewenang *Badan Karantina Indonesia*. Silakan menghubungi kantor balai karantina terdekat di wilayah Anda. Salam hormat."
  },
  {
    keywords: [
      "ppkp", "e-bkp", "vms", "pasang vms", "transmiter vms"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk pendaftaran PPKP, e-BKP, serta aturan dan kepatuhan pemasangan transmiter VMS kapal perikanan, silakan hubungi:\n📱 *WA Center PTSA:* 0811-8430-610 (Gedung Mina Bahari IV Lt. 1, Gambir, Jakarta Pusat).\n\nSalam hormat."
  },
  {
    keywords: [
      "bbm nelayan", "xstar", "rekomendasi bbm", "minyak nelayan", "solar nelayan"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk aplikasi *XSTAR* (rekomendasi BBM nelayan), silakan hubungi:\n📱 *Helpdesk Portal Data:* 0811-8722-009 / Helpdesk BPH Migas: +62 812-3000-0136.\n\nTerkait kuota dan penyaluran fisik BBM, dikoordinasikan dengan Pertamina dan SPBUN setempat. Salam hormat."
  },
  {
    keywords: [
      "bpjs nelayan", "bpjs ketenagakerjaan nelayan", "asuransi nelayan"
    ],
    answer: "Halo #SahabatBahari,\n\nKebijakan dan syarat kepesertaan BPJS Ketenagakerjaan bagi nelayan, termasuk batasan usia, merupakan kewenangan penuh pihak *BPJS Ketenagakerjaan*.\n\nSilakan berkonsultasi via webchat resmi: https://www.bpjsketenagakerjaan.go.id/. Salam hormat."
  },

  // ============================================================
  // 8. BANTUAN PEMERINTAH & PEMBIAYAAN USAHA
  // ============================================================
  {
    keywords: [
      "bantuan alat tangkap", "bantuan alat", "alat tangkap", "bantuan kapal", "bantuan perahu",
      "bantuan mesin", "bantuan bibit", "bantuan benih", "bantuan pakan", "bantuan kolam",
      "bantuan budidaya", "bantuan budi daya", "bantuan nelayan", "bantuan pemerintah",
      "program bantuan", "juknis bantuan", "daftar bantuan kkp", "daftar bantuan",
      "syarat bantuan", "info bantuan", "cara dapat bantuan", "ada bantuan", "apakah ada bantuan"
    ],
    answer: "Halo #SahabatBahari,\n\nInformasi dan syarat Bantuan Pemerintah KKP tercantum dalam Petunjuk Teknis (Juknis):\n• Juknis Perikanan Budi Daya: https://ppid.kkp.go.id/upp/direktorat-jenderal-perikanan-budi-daya/regulasi/petunjuk-teknis/\n• Juknis Perikanan Tangkap: https://ppid.kkp.go.id/upp/direktorat-jenderal-perikanan-tangkap/regulasi/petunjuk-teknis/\n\nPengajuan dilakukan via proposal kelompok (seperti Pokdakan/KUB ber-e-KUSUKA) yang ditujukan ke Ditjen terkait. Salam hormat."
  },
  {
    keywords: [
      "lpmukp", "pinjaman modal", "modal usaha", "hibah uang", "kredit perikanan"
    ],
    answer: "Halo #SahabatBahari,\n\nKKP tidak menyediakan bantuan hibah uang tunai cuma-cuma. Bantuan modal usaha tersedia dalam bentuk pinjaman dana bergulir bunga rendah (3% per tahun) melalui *LPMUKP*:\n\n📱 *WhatsApp:* 0856-2009-163\n☎️ *Call Center:* 1550 480 / 021-3502337 ext. 1723\n📧 *Email:* humas.lpmukp@kkp.go.id\n🏢 Gedung Mina Bahari II Lt. 17, Jakarta Pusat.\n\nSalam hormat."
  },
  {
    keywords: [
      "bioflok", "mini ras", "kolam tematik", "status bantuan budidaya"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk usulan atau pengecekan status bantuan budi daya tematik (bioflok/RAS), silakan koordinasikan dengan Dinas Kelautan dan Perikanan Kabupaten/Kota setempat yang mengusulkan kelompok penerima ke KKP pusat. Salam hormat."
  },
  {
    keywords: [
      "kirim proposal", "proposal bantuan", "alamat kirim proposal"
    ],
    answer: "Halo #SahabatBahari,\n\nSetelah proposal kelompok disusun sesuai petunjuk teknis (ditujukan ke Direktur Jenderal terkait, misalnya DJPB atau DJPT), dokumen dapat dikirim melalui email humas.kkp@kkp.go.id atau via pos ke Gedung Mina Bahari IV, Jakarta Pusat. Cantumkan kontak yang aktif. Salam hormat."
  },
  {
    keywords: [
      "pupuk subsidi", "pupuk perikanan", "bantuan pupuk"
    ],
    answer: "Halo #SahabatBahari,\n\nProgram pupuk bersubsidi bukan merupakan kewenangan Kementerian Kelautan dan Perikanan (KKP). Silakan menghubungi dinas pertanian/instansi terkait di wilayah Anda. Salam hormat."
  },

  // ============================================================
  // 9. KEPEGAWAIAN, LOWONGAN, & MAGANG
  // ============================================================
  {
    keywords: [
      "lowongan kerja", "loker kkp", "info kerja kkp", "rekrutmen kkp", "karir kkp"
    ],
    answer: "Halo #SahabatBahari,\n\nSaat ini belum tersedia lowongan kerja umum di lingkungan KKP. Rekrutmen pegawai dilakukan melalui seleksi ASN (CPNS/PPPK) resmi.\n\nPantau pengumuman berkala di:\n🌐 https://kkp.go.id atau https://sdmao.kkp.go.id/\n📱 Instagram: @rosdmaokkp\n\nSalam hormat."
  },
  {
    keywords: [
      "cpns", "pppk", "honorer kkp", "mutasi pegawai kkp", "ropeg"
    ],
    answer: "Halo #SahabatBahari,\n\nInformasi seleksi CPNS/PPPK resmi diumumkan melalui https://sdmao.kkp.go.id/ dan Instagram @rosdmaokkp.\n\nUntuk konsultasi mutasi atau kepegawaian internal, hubungi Biro SDM Aparatur dan Organisasi di 021-3519070 ext. 2524 / email ropeg@kkp.go.id. Salam hormat."
  },
  {
    keywords: [
      "daftar akp", "rekrutmen akp", "elaut akp", "syarat akp", "kontak akp", "call center akp"
    ],
    answer: "Halo #SahabatBahari,\n\nPendaftaran dan informasi Awak Kapal Perikanan (AKP) dapat diakses melalui portal resmi:\n🔗 https://elaut-bppsdm.kkp.go.id/akp/\n\nSyarat wajib meliputi sertifikat keselamatan BST-F Tingkat II aktif. Untuk kendala teknis pendaftaran, hubungi:\n📱 *Contact Person AKP:* 0819-9247-4154\n\nSalam hormat."
  },
  {
    keywords: [
      "bst-f", "sertifikat bst", "bst suspend", "perpanjang bst", "pusat ss", "sdmkp"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk kendala perpanjangan sertifikat BST-F yang tersuspend atau verifikasi keasliannya, silakan koordinasi dengan:\n*Pusat Standardisasi dan Sertifikasi SDM KP (Pusat SS SDMKP)*:\n🏢 Jl. Petamburan VI, Tanah Abang, Jakarta Pusat\n📱 Instagram: @bppsdm_pusatsskp\n\nSalam hormat."
  },
  {
    keywords: [
      "magang", "pkl", "kerja praktik", "lowongan magang", "daftar magang", "kuota magang"
    ],
    answer: "Halo #SahabatBahari,\n\nMohon maaf, kuota peserta magang/PKL di kantor pusat KKP saat ini *penuh hingga Desember 2026* dan akan dibuka kembali untuk periode 2027.\n\nPengajuan resmi dilakukan via PPID KKP:\n🔗 https://ppid.kkp.go.id/layanan-informasi/pemohonan-informasi/\n📧 Email: ppidkkp@kkp.go.id\n\n*(Catatan: uang saku tidak tersedia).* Salam hormat."
  },
  {
    keywords: [
      "syarat magang", "dokumen magang", "uang saku magang", "format magang"
    ],
    answer: "Halo #SahabatBahari,\n\nDokumen persyaratan permohonan magang/PKL di KKP:\n1. Surat pengantar resmi dari kampus/sekolah\n2. CV (Curriculum Vitae) & transkrip nilai terbaru\n3. Salinan KTP / kartu identitas\n\n*Catatan:* Tidak tersedia uang saku bagi mahasiswa magang aktif. Salam hormat."
  },
  {
    keywords: [
      "status magang", "cek magang", "hasil wawancara magang"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk pengecekan berkas magang, mohon sebutkan unit/direktorat yang dituju dan kanal pendaftaran sebelumnya. Surat yang masuk diproses sesuai disposisi pimpinan unit terkait dan konfirmasi dikirimkan via email/telepon. Salam hormat."
  },

  // ============================================================
  // 10. PELATIHAN & BALAI DIKLAT KKP
  // ============================================================
  {
    keywords: [
      "pelatihan kkp", "puslat", "puslatkp", "diklat kkp", "jadwal pelatihan perikanan", "sertifikasi kompetensi"
    ],
    answer: "Halo #SahabatBahari,\n\nInformasi pelatihan dan sertifikasi kompetensi kelautan dan perikanan dapat dipantau melalui:\n📱 *Call Center Pelatihan KP:* 0811-8808-8767\n📧 *Email:* layanan.puslatkp@kkp.go.id\n🌐 Portal Balai Pelatihan (BPPP): https://kkp.go.id/unit-kerja/bppsdmkp/upt/\n\nSalam hormat."
  },
  {
    keywords: [
      "bppa", "bppp", "balai pelatihan", "sukamandi", "bppp medan", "bppp banyuwangi", "bppp ambon", "bppp tegal"
    ],
    answer: "Halo #SahabatBahari,\n\nKontak Balai Pelatihan Kelautan dan Perikanan (BPPP/BPPA):\n• BPPA Sukamandi: 0822-6666-4060\n• BPPP Medan: 0895-0816-6527 / +62 812-7043-8620\n• BPPP Tegal: 0852-2965-4056\n• BPPP Banyuwangi: 0812-3399-8721\n• BPPP Bitung: 0811-666-949\n• BPPP Ambon: 0821-3399-9788\n\nSalam hormat."
  },
  {
    keywords: [
      "e-milea", "emilea", "e-sertifikat", "sertifikat pelatihan sukamandi"
    ],
    answer: "Halo #SahabatBahari,\n\nAplikasi e-Milea diperuntukkan bagi pegawai aktif KKP. Untuk kendala sertifikat atau e-sertifikat pelatihan aparatur, hubungi *BPPA Sukamandi* di (0260) 520996 / WA 0822-6666-4060 atau email bdakp.sukamandi@kkp.go.id. Salam hormat."
  },

  // ============================================================
  // 11. LAYANAN DATA & PORTAL PPID KKP
  // ============================================================
  {
    keywords: [
      "permohonan informasi", "minta data", "cara mohon data", "data statistik", "skripsi", "penelitian"
    ],
    answer: "Halo #SahabatBahari,\n\nPermohonan data publik dan izin penelitian diajukan melalui portal PPID KKP:\n1. Buka https://ppid.kkp.go.id lalu pilih Permohonan Informasi (atau ketik *DAFTAR* di WhatsApp ini)\n2. Lampirkan: Surat Pengantar Kampus/Instansi, Rincian Data, dan KTP\n3. Kirim via web atau email ke ppidkkp@kkp.go.id\n\nSalam hormat."
  },
  {
    keywords: [
      "status permohonan ppid", "cek permohonan", "status tiket ppid", "progres data"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk memeriksa status permohonan data PPID yang sudah diajukan, silakan ketik nomor tiket Anda (atau pilih menu *2* di WhatsApp ini), atau hubungi layanan PPID di:\n📱 *Hotline PPID:* +62 811-1112-9996\n\nSalam hormat."
  },
  {
    keywords: [
      "portal data", "portaldata", "helpdesk portal data", "data kkp"
    ],
    answer: "Halo #SahabatBahari,\n\nUntuk integrasi satu data dan kendala portal data KKP, silakan hubungi:\n📱 *Helpdesk Portal Data KKP:* 0811-8722-009\n\nSalam hormat."
  },
  {
    keywords: [
      "surat resmi", "kirim surat", "undangan acara", "audiensi", "proposal kerjasama", "sponsorship"
    ],
    answer: "Halo #SahabatBahari,\n\nSurat resmi, undangan audiensi, narasumber, atau sponsorship dapat dikirimkan dalam format PDF ke:\n📧 *Email:* humas.kkp@kkp.go.id\n🏢 Atau hardcopy ke Bagian Persuratan Gedung Mina Bahari IV KKP, Jakarta Pusat.\n\nSalam hormat."
  },
  {
    keywords: [
      "lpse", "lelang kkp", "pengadaan kkp", "tender kkp", "ukpbj", "vendor kkp"
    ],
    answer: "Halo #SahabatBahari,\n\nInformasi pengadaan barang/jasa dan lelang KKP terpusat di LPSE:\n🌐 https://spse.inaproc.id/kkp\n📱 *WA LPSE:* 0812-1001-5773 / 0812-858-538\n☎️ *Telp:* 0812-6000-5773\n📧 *Email:* ukpbj@kkp.go.id\n\nSalam hormat."
  },

  // ============================================================
  // 12. LAYANAN UMUM, PERIKANAN LAINNYA & DILUAR KEWENANGAN
  // ============================================================
  {
    keywords: [
      "wisma gracillaria", "sewa wisma", "tarif wisma kkp", "mess kkp"
    ],
    answer: "Halo #SahabatBahari,\n\nWisma Gracillaria dapat disewa untuk umum. Tarif berkisar Rp270.000 (Reguler) dan Rp447.000 (VIP). Ketersediaan kamar dan reservasi dikoordinasikan langsung dengan pengelola Wisma Gracillaria KKP. Salam hormat."
  },
  {
    keywords: [
      "cangkang kepiting", "crab shell", "permen kp 25", "permen kp 33"
    ],
    answer: "Halo #SahabatBahari,\n\nTerkait *cangkang kepiting (crab shell)* berdasarkan Permen KP No. 25/2024 & 33/2024:\n1. Cangkang kepiting merupakan by-product non-konsumsi.\n2. Wajib menggunakan SKP (dimulai dari SKP terlebih dahulu) dan SMKHP.\n3. Tidak diwajibkan HACCP (kecuali pangan konsumsi).\n4. Cek HS Code pada lampiran regulasi. Salam hormat."
  },
  {
    keywords: [
      "neraca", "neraca komoditas", "call center neraca"
    ],
    answer: "Halo #SahabatBahari,\n\nTerkait *Neraca Komoditas Perikanan*, silakan hubungi Call Center di nomor 0822-4000-0167 pada hari Senin-Jumat pukul 08.00-16.00 WIB. Salam hormat."
  },
  {
    keywords: [
      "bazar kkp", "bazaar", "joko martoyo", "dwp kkp"
    ],
    answer: "Halo #SahabatBahari,\n\nKontak Informasi Bazar KKP:\n• Joko Martoyo (Pwk KKP/Pensiunan): +62 858-8300-8765\n• DWP KKP: +62 812-8950-275 / +62 813-1022-0010\n\nSalam hormat."
  },
  {
    keywords: [
      "absen penyuluh", "digiluh", "kendala digiluh", "login digiluh"
    ],
    answer: "Halo #SahabatBahari,\n\nTerkait kendala absensi penyuluh pada aplikasi Digiluh, silakan laporkan melalui form bantuan resmi:\n🔗 https://forms.gle/ZwSW3o7TWA7TBwZUA\n\nSalam hormat."
  },
  {
    keywords: [
      "penata kelola", "jabatan penata", "jabatan fungsional kkp"
    ],
    answer: "Halo #SahabatBahari,\n\nInformasi terkait Jabatan Penata Kelola Kelautan dan Perikanan dapat diakses pada dokumentasi resmi kepegawaian KKP di portal https://sdmao.kkp.go.id. Salam hormat."
  },
  {
    keywords: [
      "buaya", "pekanbaru", "loka pekanbaru", "lkkpn pekanbaru"
    ],
    answer: "Halo #SahabatBahari,\n\nKontak Loka Pengelolaan Sumberdaya Pesisir & Laut (LKKPN) Pekanbaru:\n🏢 Jl. Budi Luhur, Mentangor, Kulim, Pekanbaru - Riau\n☎️ Telp: 0811666642\n📧 Email: lkkpn.pekanbaru@kkp.go.id\n\nSalam hormat."
  },
  {
    keywords: [
      "nomor pribadi pegawai", "background check pegawai", "kontak pribadi pegawai"
    ],
    answer: "Halo #SahabatBahari,\n\nMohon maaf, data kontak pribadi dan background check pegawai KKP merupakan informasi yang dilindungi dan tidak dapat kami bagikan. Jika ada keperluan kedinasan, silakan sampaikan surat resmi ke humas.kkp@kkp.go.id. Salam hormat."
  },
  {
    keywords: [
      "di luar kewenangan", "bukan kkp", "sertifikat tanah laut", "pajak kkp", "vaksin"
    ],
    answer: "Halo #SahabatBahari,\n\nSaat ini Sahabat terhubung dengan PPID KKP. Hal tersebut di luar kewenangan KKP:\n• Kepemilikan tanah/lahan: hubungi Kantor Pertanahan (BPN)\n• Pajak/NPWP: hubungi KPP atau DJP Online\n• Vaksin/Kesehatan: hubungi kanal Kementerian Kesehatan\n\nSalam hormat."
  }
];

// Tulis ke faq.json
const targetPath = path.resolve(__dirname, '../faq.json');
fs.writeFileSync(targetPath, JSON.stringify(updatedFaqList, null, 2), 'utf8');
console.log(`✅ Berhasil menulis ${updatedFaqList.length} entri FAQ ke ${targetPath}`);


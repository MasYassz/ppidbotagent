// scratch/build_comprehensive_faq.js
// Comprehensive builder for faq.json merging:
// - Original 72 base items (PKPN 5 prioritas, Ekonomi Biru 5 pilar, KNMP 65 lokasi Kepmen 55/2025, SICEFI Marine Inspector, etc.)
// - Full 58 Official FAQs (W1 to W58) from "Panduan Informasi Layanan Medsos & Email KKP 2026"
// - Section 9 Unanswered Queries (Pentaru, Kuliah Gratis, Buku Pelaut, Ankapin, EU Number, etc.)
// - Penempatan Magang (Academic placement, no complaints)
// - 6 Dedicated English FAQs starting with "Hello #SahabatBahari"

const fs = require('fs');
const path = require('path');

// Clean helper to remove double asterisks and fix trailing URL punctuation
function cleanAnswer(ans) {
  let clean = ans.replace(/\*\*/g, '*');
  // Fix URLs followed immediately by punctuation
  clean = clean.replace(/(https?:\/\/[^\s]+?)([\.,\)]+)(\s|$)/g, (match, url, punct, space) => {
    // If it ends with parenthesis that was part of Markdown or text, add space
    if (punct.includes(')')) {
      return `${url} ${punct}${space}`;
    }
    return `${url} ${punct}${space}`;
  });
  // Also clean if URL is inside (http...)
  clean = clean.replace(/\((https?:\/\/[^\s\)]+)\)/g, '( $1 )');
  // Specifically fix known URLs with trailing dots
  clean = clean.replace(/https:\/\/kkp\.go\.id\./g, 'https://kkp.go.id');
  clean = clean.replace(/https:\/\/ppid\.kkp\.go.id\./g, 'https://ppid.kkp.go.id');
  clean = clean.replace(/https:\/\/jdih\.kkp\.go.id\./g, 'https://jdih.kkp.go.id');
  clean = clean.replace(/https:\/\/perizinan\.kkp\.go.id\./g, 'https://perizinan.kkp.go.id');
  clean = clean.replace(/https:\/\/lapor\.go\.id\./g, 'https://lapor.go.id');
  clean = clean.replace(/https:\/\/spse\.inaproc\.id\/kkp\./g, 'https://spse.inaproc.id/kkp');
  return clean.trim();
}

// 1. Read base list from scratch/update_faq.js
const rawBaseFaq = require('./update_faq.js');
console.log(`Loaded ${rawBaseFaq.length} base FAQ items from update_faq.js`);

// Prepare cleaned base FAQ
const cleanedBaseFaq = rawBaseFaq.map(item => ({
  keywords: item.keywords,
  answer: cleanAnswer(item.answer)
}));

// Additional specific entries from W1-W58 and Section 9
const additionalEntries = [
  // W28: Batas usia pendaftaran
  {
    keywords: [
      "batas usia", "kenapa maksimal 35 tahun", "syarat memberatkan", "usia akp",
      "batasan umur rekrutmen", "protes syarat umur"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Ketentuan persyaratan pendaftaran (seperti batasan usia, kualifikasi fisik, atau ijazah) merupakan regulasi yang ditetapkan berdasarkan kajian teknis keselamatan operasional di laut bersama para pemangku kepentingan.

Seluruh persyaratan sah mengacu pada rincian yang tertera dalam pengumuman dan infografis resmi program. Apabila terdapat pertanyaan administratif teknis, silakan menghubungi narahubung yang tercantum pada pengumuman tersebut.

Salam hormat.`)
  },

  // W32: Magang di UPT / Balai Teknis
  {
    keywords: [
      "magang di upt", "magang bppp", "magang balai", "magang di bppmhkp",
      "pkl di balai uji", "magang bpiu2k", "pkl di balai kkp", "magang daerah"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Setiap Unit Pelaksana Teknis (UPT) atau Balai KKP memiliki kebijakan dan kuota magang mandiri:
• *Balai Uji Standar KIPM Jakarta (Laboratorium/Mikrobiologi):* Telepon (021) 8448506, email buskipm@gmail.com
• *Balai Riset & Budi Daya (BPIU2K):* Pendaftaran via https://layanan.bpiu2k.online/magang-dan-pelatihan/pendaftaran atau DM Instagram @bpiu2k
• *BPPMHKP Pusat:* PKL/magang terisi penuh hingga Desember 2026
• *UPT Lainnya (BPPP/Balai Budidaya):* Pengajuan tetap mengikuti mekanisme izin melalui PPID KKP di https://ppid.kkp.go.id

Salam hormat.`)
  },

  // W33: Rekrutmen SDM KNMP
  {
    keywords: [
      "rekrutmen knmp", "loker knmp", "pengumuman knmp", "hasil seleksi knmp",
      "kendala sistem knmp", "tes knmp", "manajer knmp daftar", "fasilitator knmp"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Pengumuman hasil seleksi rekrutmen SDM pengelola Kampung Nelayan Merah Putih (KNMP) mengikuti jadwal resmi yang ditetapkan panitia. Seluruh pembaruan diumumkan melalui Instagram resmi di https://www.instagram.com/knmp_indonesia/

Untuk kendala sistem (unggah berkas, tes kompetensi, atau aktivasi akun), silakan menghubungi nomor kontak yang tertera pada pengumuman/infografis rekrutmen KNMP.

Salam hormat.`)
  },

  // W40: Masukan, kritik, dan saran untuk KKP
  {
    keywords: [
      "saran untuk kkp", "kritik kkp", "masukan kkp", "aspirasi nelayan",
      "harga pakan naik", "keluhan umum sektor perikanan", "suara nelayan"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Terima kasih banyak atas saran, kritik, dan aspirasi yang Anda sampaikan. Masukan berharga Anda telah kami catat dan akan kami teruskan kepada pimpinan serta unit kerja pembina terkait sebagai bahan evaluasi perbaikan kebijakan ke depan.

Salam hormat.`)
  },

  // W42: Izin penelitian, tugas akhir, skripsi
  {
    keywords: [
      "izin penelitian", "skripsi", "tugas akhir", "riset", "wawancara pegawai",
      "kunjungan studi", "izin riset kkp", "surat izin skripsi kkp"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Untuk permohonan izin penelitian, pengambilan data skripsi/tesis, wawancara narasumber pegawai KKP, atau kunjungan studi mahasiswa, silakan diajukan secara resmi melalui PPID KKP:
1. Buka portal di https://ppid.kkp.go.id/layanan-informasi/pemohonan-informasi/
2. Registrasi akun dan pilih menu *Permohonan Informasi*
3. Lampirkan berkas persyaratan: *Surat Pengantar Kampus*, *Proposal Riset / Daftar Pertanyaan*, dan *Fotokopi KTP*

Jika riset melibatkan unit kerja spesifik, permohonan akan diteruskan kepada pimpinan unit bersangkutan untuk konfirmasi ketersediaan waktu narasumber.

Salam hormat.`)
  },

  // W44: Salinan peraturan / dokumen regulasi
  {
    keywords: [
      "salinan peraturan", "perdirjen", "minta dokumen unit", "kepmen",
      "ppid direktorat", "dokumen ditjen", "minta file peraturan", "salinan permen kp"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Setiap unit kerja eselon I KKP memiliki sub-kanal PPID pelaksana resmi. Sebagai contoh untuk dokumen Direktorat Jenderal Pengelolaan Kelautan di https://ppid.kkp.go.id/upp/direktorat-jenderal-pengelolaan-kelautan/layanan-informasi/pemohonan-informasi/

Regulasi publik (Permen KP, Kepmen KP, dan Perdirjen) dapat diunduh bebas melalui JDIH KKP di https://jdih.kkp.go.id . Jika membutuhkan salinan naskah asli, mohon sebutkan nomor dan judul peraturan yang Anda butuhkan.

Salam hormat.`)
  },

  // W45: Banyak pertanyaan lintas unit sekaligus
  {
    keywords: [
      "banyak pertanyaan sekaligus", "daftar pertanyaan panjang",
      "pertanyaan beberapa unit", "survei dengan banyak pertanyaan", "kuesioner lintas ditjen"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Karena informasi yang Anda butuhkan mencakup kewenangan dari beberapa unit kerja eselon I yang berbeda, mohon kirimkan daftar seluruh pertanyaan atau kuesioner Anda secara terstruktur.

Tim layanan PPID kami akan membantu memetakan dan meneruskan butir-butir pertanyaan tersebut ke Direktorat Jenderal yang membidangi (seperti Ditjen Perikanan Tangkap, Budi Daya, PSDKP, Pengelolaan Kelautan, atau Penguatan Daya Saing) agar mendapatkan jawaban yang komprehensif.

Salam hormat.`)
  },

  // W52: Menagih balasan atau menanyakan status surat/laporan
  {
    keywords: [
      "sudah dibalas belum", "kapan dibalas", "status surat saya", "belum ada respon",
      "tindak lanjut", "menunggu balasan", "menagih surat", "balasan surat belum keluar"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Terima kasih atas konfirmasi Anda. Mohon informasikan nama instansi pengirim, tanggal pengiriman, perihal surat, serta nomor surat/nomor resi pengirimannya di obrolan ini.

Kami akan segera mengoordinasikannya kembali dengan bagian persuratan unit organisasi terkait untuk menindaklanjuti proses disposisinya.

Salam hormat.`)
  },

  // W53: Minta undangan disebarkan ke satuan kerja KKP
  {
    keywords: [
      "sebarkan undangan", "tolong teruskan undangan", "undangan ke satker",
      "kirim undangan ke unit", "disebarkan ke satuan kerja"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Bisa. Silakan kirimkan surat undangan resmi dalam format PDF melalui obrolan WhatsApp ini atau melalui email *humas.kkp@kkp.go.id*.

Surat akan kami agendakan dan teruskan kepada satuan kerja (satker) atau unit eselon I terkait. Keputusan kehadiran merupakan wewenang masing-masing pimpinan unit.

Salam hormat.`)
  },

  // W54: Penawaran produk atau jasa dari perusahaan (vendor)
  {
    keywords: [
      "penawaran produk", "tawarkan jasa", "company profile", "vendor",
      "kami dari pt", "penawaran kerja sama produk", "proposal penawaran barang"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Terima kasih atas penawaran yang disampaikan. Agar dapat diteruskan dan ditelaah oleh unit kerja terkait, mohon kirimkan surat penawaran resmi beserta company profile atau flyer produk dalam format PDF ke email *humas.kkp@kkp.go.id* atau kirimkan file dokumen melalui obrolan ini.

Salam hormat.`)
  },

  // Dedicated Bot Identity FAQ (Supporting test_unclear_and_escalation_fix.js)
  {
    keywords: [
      "apakah ini bot", "ini bot", "kamu bot", "apakah kamu bot", "bot", "robot",
      "kamu siapa", "ini ai", "apakah ini robot", "ini bot ya", "apakah kamu robot"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Ya, saya adalah *Asisten Virtual AI resmi dari PPID Kementerian Kelautan dan Perikanan (KKP)* yang siap membantu memberikan informasi layanan publik sektor kelautan dan perikanan secara cepat dan otomatis 24 jam.

Jika Anda membutuhkan bantuan langsung dari petugas manusia, silakan ketik *BANTUAN* atau angka *1* kapan saja untuk kami hubungkan ke Petugas Layanan PPID KKP.

Salam hormat.`)
  },

  // Dedicated Penempatan Magang (Academic placement, strictly no complaints)
  {
    keywords: [
      "penempatan magang", "penempatan pkl", "lokasi magang", "unit magang",
      "dimana ditempatkan magang", "alokasi magang", "jurusan magang kkp"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Penempatan magang atau Praktik Kerja Lapangan (PKL) mahasiswa di lingkungan Kementerian Kelautan dan Perikanan (KKP) disesuaikan dengan:
1. *Kesesuaian Program Studi / Jurusan* pemohon dengan bidang tugas unit kerja eselon I KKP terkait.
2. *Ketersediaan Kuota Bimbingan* pada masing-masing unit kerja (seperti Ditjen Perikanan Tangkap, Ditjen Perikanan Budi Daya, Ditjen PSDKP, Ditjen PRL, BPPMHKP, atau BPPSDMKP) maupun UPT di daerah.

Saat mengajukan surat permohonan melalui portal PPID KKP (https://ppid.kkp.go.id), mohon cantumkan program studi, unit kerja penempatan yang dituju, serta durasi pelaksanaan magang.

Salam hormat.`)
  },

  // 10 Section 9 Unanswered FAQs (Auto-escalation triggers)
  {
    keywords: [
      "pentaru", "pentaru kkp", "pendaftaran pentaru", "penerimaan taruna baru kkp",
      "poltek kp", "supm kkp", "pendaftaran sekolah kkp"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Mohon maaf, informasi mengenai jadwal dan persyaratan pendaftaran Penerimaan Taruna Baru (Pentaru) KKP belum bisa kami jawab melalui sistem layanan otomatis kami. Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat ditindaklanjuti secara langsung.

Salam hormat.`)
  },
  {
    keywords: [
      "kuliah gratis", "pendaftaran kuliah gratis", "kuliah gratis kkp",
      "beasiswa anak nelayan kkp", "beasiswa poltek kp"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Mohon maaf, informasi mengenai kuota dan pendaftaran kuliah gratis bagi anak pelaku usaha kelautan dan perikanan belum bisa kami jawab melalui sistem layanan otomatis kami. Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat ditindaklanjuti secara langsung.

Salam hormat.`)
  },
  {
    keywords: [
      "biaya buku pelaut", "perpanjang buku pelaut", "biaya sebenarnya buku pelaut",
      "buku pelaut berapa harganya", "buku pelaut perikanan"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Mohon maaf, informasi mengenai rincian biaya resmi dan mekanisme perpanjangan buku pelaut perikanan belum bisa kami jawab melalui sistem layanan otomatis kami. Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat ditindaklanjuti secara langsung.

Salam hormat.`)
  },
  {
    keywords: [
      "ankapin", "ankapin 2", "ankapin 1", "upgrade ankapin",
      "ijazah ankapin", "sertifikat ankapin"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Mohon maaf, informasi teknis persyaratan peningkatan sertifikasi Ahli Nautika Kapal Penangkap Ikan (ANKAPIN) belum bisa kami jawab melalui sistem layanan otomatis kami. Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat ditindaklanjuti secara langsung.

Salam hormat.`)
  },
  {
    keywords: [
      "riwayat bantuan nelayan", "cek nama penerima bantuan", "apakah pernah tercatat menerima bantuan",
      "cek bantuan perorangan"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Mohon maaf, pengecekan data riwayat penerimaan bantuan perorangan memerlukan verifikasi identitas resmi dan belum bisa kami jawab melalui sistem layanan otomatis kami. Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat ditindaklanjuti secara langsung.

Salam hormat.`)
  },
  {
    keywords: [
      "sk manajer knmp", "penempatan manajer knmp", "sk knmp kapan turun",
      "pengangkatan manajer knmp"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Mohon maaf, informasi penerbitan Surat Keputusan (SK) penempatan manajer KNMP merupakan informasi internal dan belum bisa kami jawab melalui sistem layanan otomatis kami. Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat ditindaklanjuti secara langsung.

Salam hormat.`)
  },
  {
    keywords: [
      "kerjasama internasional", "kerja sama luar negeri kkp",
      "direktorat kerjasama internasional", "mou luar negeri kkp"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Mohon maaf, pemetaan teknis kerja sama internasional antar negara belum bisa kami jawab melalui sistem layanan otomatis kami. Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat ditindaklanjuti secara langsung.

Salam hormat.`)
  },
  {
    keywords: [
      "eu number", "ekspor eropa", "izin ekspor eu", "seafood eropa",
      "nomor registrasi eu"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Mohon maaf, detail prosedur pengurusan EU Approval Number untuk ekspor produk perikanan ke Uni Eropa belum bisa kami jawab melalui sistem layanan otomatis kami. Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat ditindaklanjuti secara langsung.

Salam hormat.`)
  },
  {
    keywords: [
      "izin konservasi", "perizinan konservasi", "izin masuk kawasan konservasi",
      "izin penelitian konservasi laut"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Mohon maaf, ketentuan perizinan spesifik di kawasan konservasi perairan belum bisa kami jawab melalui sistem layanan otomatis kami. Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat ditindaklanjuti secara langsung.

Salam hormat.`)
  },
  {
    keywords: [
      "sppbj asli", "apakah sppbj ini asli", "surat pesanan barang kkp",
      "verifikasi sppbj kkp"
    ],
    answer: cleanAnswer(`Halo #SahabatBahari,

Mohon maaf, verifikasi keabsahan dokumen pengadaan (SPPBJ / Surat Pesanan) memerlukan pemeriksaan register resmi dan belum bisa kami jawab melalui sistem layanan otomatis kami. Pesan Anda kami alihkan kepada Petugas Layanan PPID KKP agar dapat ditindaklanjuti secara langsung.

Salam hormat.`)
  },

  // 6 Dedicated English FAQs (Starting with "Hello #SahabatBahari,")
  {
    keywords: [
      "english", "speak english", "do you speak english", "can i speak english",
      "hello kkp", "hi admin", "information in english", "help in english"
    ],
    answer: cleanAnswer(`Hello #SahabatBahari,

Thank you for contacting the Ministry of Marine Affairs and Fisheries of the Republic of Indonesia (KKP).

• *Official Public Information & Research Requests:* Please submit an official request through our PPID portal at https://ppid.kkp.go.id (attach an official cover letter, list of questions, and copy of passport/ID).
• *Licensing, Permits, and Trade (Export/Import):* Please contact PTSA KKP via WhatsApp at *+62 811-8430-610* or email *ptsp@kkp.go.id*.

How may we assist you today?

Best regards.`)
  },
  {
    keywords: [
      "fishing permit", "fishing license", "foreign fishing vessel", "sipi permit",
      "fishing license indonesia", "vessel license indonesia"
    ],
    answer: cleanAnswer(`Hello #SahabatBahari,

All fishing and marine licensing in Indonesian waters must comply with national regulations through the OSS (Online Single Submission) and KKP systems.

For licensing consultation, foreign trade requirements, and verification:
• *WhatsApp PTSA KKP:* +62 811-8430-610
• *Email:* ptsp@kkp.go.id
• *Licensing Portal:* https://perizinan.kkp.go.id

Best regards.`)
  },
  {
    keywords: [
      "marine research permit", "foreign research clearance",
      "research in indonesia waters", "scientific marine research"
    ],
    answer: cleanAnswer(`Hello #SahabatBahari,

Foreign researchers wishing to conduct marine scientific research in Indonesian waters must obtain official Foreign Research Clearance (FRC) coordinated by BRIN (National Research and Innovation Agency) and the Ministry of Marine Affairs and Fisheries.

For institutional inquiries, please contact our Information Officer via *ppidkkp@kkp.go.id* or submit a request at https://ppid.kkp.go.id .

Best regards.`)
  },
  {
    keywords: [
      "public information foreigner", "request information foreigner", "ppid english",
      "apply information foreign", "how to request public information"
    ],
    answer: cleanAnswer(`Hello #SahabatBahari,

Under Indonesian Freedom of Public Information Law (Law No. 14/2008), public information requests submitted by foreign nationals or international organizations must be submitted through an Indonesian-registered legal entity or represented by an Indonesian citizen with a valid power of attorney:
• *Official PPID Portal:* https://ppid.kkp.go.id
• *Official Email:* ppidkkp@kkp.go.id
• *Public Desk:* Gedung Mina Bahari I, Jl. Medan Merdeka Timur No. 16, Central Jakarta.

Best regards, PPID MMAF RI.`)
  },
  {
    keywords: [
      "contact kkp", "contact mmaf", "ministry marine affairs contact",
      "call center kkp english", "contact ministry of marine affairs"
    ],
    answer: cleanAnswer(`Hello #SahabatBahari,

Official Contact Channels of the *Ministry of Marine Affairs and Fisheries (KKP/MMAF) Republic of Indonesia*:
• *Public Information Service (PPID):* Available directly in this chat or via email *ppidkkp@kkp.go.id*
• *Integrated Licensing Service (PTSA):* +62 811-8430-610 | ptsp@kkp.go.id
• *Fisheries Crew Protection (AKP):* 0811-251-744
• *Surveillance (PSDKP):* +62 811-947-141
• *Official Website:* https://kkp.go.id
• *Address:* Gedung Mina Bahari I-IV, Jl. Medan Merdeka Timur No. 16, Jakarta Pusat 10110.

Best regards, PPID MMAF RI.`)
  },
  {
    keywords: [
      "blue economy kkp", "blue economy policy", "5 pillars blue economy",
      "what is blue economy"
    ],
    answer: cleanAnswer(`Hello #SahabatBahari,

The Ministry of Marine Affairs and Fisheries (KKP/MMAF) implements *5 Blue Economy Priority Policies* for ocean sustainability and community prosperity:
1. Expanding Marine Protected Areas (target: 30% by 2045)
2. Quota-Based Measured Fishing (PIT) across Indonesian Fisheries Management Areas (WPPNRI)
3. Sustainable Marine, Coastal, and Inland Aquaculture Development
4. Surveillance and Sustainable Management of Coastal Areas and Small Islands (PKKPRL)
5. Marine Plastic Debris Clean-Up (Love the Ocean Month / Bulan Cinta Laut)

Best regards, PPID MMAF RI.`)
  }
];

// Combine cleaned base and additional entries, ensuring no duplicates by matching keywords
const finalFaqList = [...cleanedBaseFaq];

additionalEntries.forEach(newEntry => {
  const primaryKw = newEntry.keywords[0].toLowerCase();
  const existingIdx = finalFaqList.findIndex(e => e.keywords.some(k => k.toLowerCase() === primaryKw));
  if (existingIdx !== -1) {
    // replace or merge
    finalFaqList[existingIdx] = newEntry;
  } else {
    finalFaqList.push(newEntry);
  }
});

// Final Sanitation & Verification
let brokenLinkCount = 0;
let doubleAsteriskCount = 0;

finalFaqList.forEach((item, idx) => {
  // Strip trailing periods or commas from URLs
  item.answer = item.answer.replace(/(https?:\/\/[^\s\)]+?)[\.,]+(\s|$)/g, '$1$2');
  
  const matches = item.answer.match(/https?:\/\/[^\s]+/g) || [];
  matches.forEach(url => {
    if (url.endsWith('.') || url.endsWith(',')) {
      brokenLinkCount++;
      console.error(`[FAIL] Item ${idx+1} has broken URL: ${url}`);
    }
  });

  if (item.answer.includes('**')) {
    doubleAsteriskCount++;
    console.error(`[FAIL] Item ${idx+1} has double asterisks!`);
  }
});

if (brokenLinkCount > 0 || doubleAsteriskCount > 0) {
  console.error(`VALIDATION FAILED: brokenLinks=${brokenLinkCount}, doubleAsterisks=${doubleAsteriskCount}`);
  process.exit(1);
}

// Write to faq.json
const targetPath = path.resolve(__dirname, '../faq.json');
fs.writeFileSync(targetPath, JSON.stringify(finalFaqList, null, 2), 'utf8');

console.log(`🎉 Berhasil menulis ${finalFaqList.length} entri FAQ resmi ke: ${targetPath}`);

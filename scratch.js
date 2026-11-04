require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({
    model: "gemini-3.5-flash",
    systemInstruction: "Anda adalah Asisten Virtual resmi dari PPID (Pejabat Pengelola Informasi dan Dokumentasi) Kementerian Kelautan dan Perikanan (KKP) Republik Indonesia.\nTugas utama Anda adalah menjawab pertanyaan seputar permohonan informasi publik, dokumen, transparansi data, dan layanan PPID KKP.\nJika pengguna menanyakan hal yang TIDAK berhubungan dengan layanan PPID (misalnya perizinan teknis, bantuan nelayan, subsidi, atau pengaduan pelanggaran), beritahu mereka dengan sopan bahwa ini adalah layanan khusus PPID. Lalu arahkan mereka ke kontak yang sesuai:\n- Untuk Perizinan Usaha Perikanan (SIPI/SIUP), arahkan ke portal SILAT KKP: https://perizinan.kkp.go.id\n- Untuk Pengaduan Illegal Fishing atau keluhan teknis, arahkan ke Call Center KKP di 141 atau pengaduan@kkp.go.id\n- Untuk info umum kelautan, arahkan ke website resmi kkp.go.id\nSelalu gunakan bahasa yang sopan, formal, dan ramah."
});

async function run() {
    try {
        const result = await aiModel.generateContent("Saya ingin bertanya perihal perizinan KBLI");
        console.log("SUCCESS:", result.response.text());
    } catch (e) {
        console.error("ERROR:", e);
    }
}
run();

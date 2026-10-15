# PPID Bot Agent

WhatsApp bot berbasis Node.js dengan integrasi Google Gemini.

## Persyaratan

- Node.js versi LTS
- Git
- Google Gemini API Key
- Akun WhatsApp untuk menghubungkan bot

## Instalasi

### 1. Clone repository

```bash
git clone https://github.com/MasYassz/ppidbotagent.git
cd ppidbotagent
```

### 2. Instal dependensi

```bash
npm install
```

### 3. Konfigurasi environment

Salin file `.env.example` menjadi `.env`, lalu isi konfigurasi yang diperlukan:

```dotenv
GEMINI_API_KEY=isi_api_key_gemini
ADMIN_WA_NUMBER=isi_nomor_admin@c.us
```

Gunakan API key Gemini dan nomor admin milik sendiri.

**Jangan unggah file `.env` ke GitHub.**

### 4. Jalankan bot

```bash
node index.js
```

Ikuti instruksi pada terminal untuk menghubungkan WhatsApp jika QR Code ditampilkan.

## Menjalankan Kembali

Masuk ke direktori proyek, kemudian jalankan:

```bash
node index.js
```

## Catatan Keamanan

- Jangan membagikan API key Gemini.
- Jangan mengunggah file `.env`.
- Jangan membagikan folder `.wwebjs_auth/` karena berisi data sesi WhatsApp.
- Jaga keamanan akun WhatsApp yang digunakan oleh bot.

## Teknologi

- Node.js
- whatsapp-web.js
- Google Gemini API

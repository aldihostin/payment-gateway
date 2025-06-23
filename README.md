# 🏦 Orkut Payment Gateway

Proyek ini merupakan **sistem gateway pembayaran sederhana** menggunakan QRIS Orkut yang bisa dipindai menggunakan pemindai QR (seperti Google Scanner). Proyek ini memungkinkan integrasi sederhana untuk menerima pembayaran melalui QR dan menampilkan detail kontak WhatsApp.

---

## 📁 Struktur Proyek

- `.env` – Berisi konfigurasi utama sistem (API Key, ID transaksi, ID QRIS).
- `index.html` – Tampilan frontend sederhana untuk pengguna (dapat diatur kontak WhatsApp dan lainnya).
- `server.js` / `main.js` (opsional) – Logika backend (jika kamu menggunakannya).

---

## ⚙️ Pengaturan (Configuration)

Buat file `.env` di root direktori, lalu isi seperti ini:

```env
ORD_ID=OKxxx         # ID order Orkut kamu
ORD_APIKEY=xxx       # API key dari Orkut
CODEQR=xxx           # ID QRIS Orkut kamu
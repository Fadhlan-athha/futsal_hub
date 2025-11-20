Panduan Kontribusi Proyek Testgenz-Clone
[WAJIB BACA SEBELUM BERKONTRIBUSI!]
Welcome 👋, Dokumen ini adalah "buku panduan" kita bersama. Tujuannya adalah agar alur kerja kita rapi, terstruktur, dan semua orang bisa berkontribusi dengan nyaman.

Prinsip Utama: "Jangan mulai coding sebelum ada Isu (tugas) yang jelas."

0. Setup Awal (Hanya Dilakukan Sekali)
Ikuti langkah-langkah ini untuk menyiapkan proyek di komputermu untuk pertama kalinya.

Prasyarat:
Pastikan kamu sudah menginstal:

Git: Download Git
Node.js: Download Node.js (versi LTS direkomendasikan)
VS Code (atau text editor pilihanmu)
Langkah-langkah Setup:
Terima Undangan Kolaborator: Buka email atau notifikasi GitHub-mu dan terima undangan untuk bergabung ke repositori ini.

Clone Repositori: Buka terminal, masuk ke folder tempat kamu biasa menyimpan proyek (misal: Documents/Projects), lalu jalankan perintah ini:

git clone [https://github.com/Fyrnn-69/testgenz-clone.git](https://github.com/Fyrnn-69/testgenz-clone.git)
Masuk ke Folder Proyek:

cd testgenz-clone
Install Dependencies: Perintah ini akan mengunduh semua library yang dibutuhkan oleh proyek.

npm install
Buat File Environment: Proyek ini butuh file .env.local untuk menyimpan kunci API dan data rahasia lainnya. Salin file contoh yang sudah ada.

Di dalam folder proyek, cari file bernama .env.example.
Buat duplikat dari file tersebut dan ganti namanya menjadi .env.local.
(Nanti, jika ada kunci API yang perlu diisi, lead tim akan memberikannya untuk diisi di file ini).
Jalankan Proyek: Untuk memastikan semua berjalan lancar, coba jalankan server development.

npm run dev
Buka browser dan akses http://localhost:3000. Jika halaman Next.js muncul, berarti setup kamu berhasil!

Kamu sekarang siap untuk mulai berkontribusi!

1. Alur Kerja Harian (Wajib Diikuti)
Ini adalah siklus kerja untuk setiap tugas yang kamu kerjakan.

A. Sebelum Mulai Coding
Ambil Isu: Pilih atau terima tugas dari tab "Issues" di GitHub. Pastikan kamu sudah di-assign.
Update Kode Lokal: Selalu mulai dengan versi kode terbaru.
git checkout develop
git pull origin develop
Buat Branch Baru: Buat "ruang kerja" baru yang spesifik untuk tugasmu.
git checkout -b <nama-branch-kamu>
(Lihat aturan penamaan branch di bawah)
B. Saat Coding
Kerjakan Tugasmu: Tulis kode, buat file, dll.
Commit Secara Berkala: Simpan pekerjaanmu dalam potongan-potongan kecil yang logis.
git add .
git commit -m "<jenis>: pesan commit yang jelas"
(Lihat aturan pesan commit di bawah)
C. Setelah Selesai Coding
Push ke GitHub: Kirim branch-mu ke server.
git push origin <nama-branch-kamu>
Buat Pull Request (PR): Buka GitHub, dan buat Pull Request dari branch-mu ke branch develop.
Tunggu Review: Jangan merge PR-mu sendiri. Tunggu maintainer (lead tim) untuk mereview dan memberikan persetujuan.
D. Proses Merge & Clean Up (Langkah Terakhir)
Tugas Maintainer: Setelah PR disetujui, maintainer (lead tim) akan menekan tombol "Merge". Setelah itu, maintainer wajib menekan tombol "Delete branch" yang muncul untuk membersihkan repositori di server.

Tugas Kontributor: Setelah PR-mu di-merge, pekerjaanmu selesai! Adalah praktik yang baik untuk membersihkan branch di komputermu. Jalankan perintah ini:

# Pindah kembali ke branch develop
git checkout develop

# Update develop lokalmu dengan versi terbaru dari server
git pull origin develop

# Hapus branch lokal yang sudah tidak terpakai
git branch -d <nama-branch-kamu-sebelumnya>
2. "Kamus" Tim (Aturan Penamaan)
Menggunakan nama dan format yang konsisten sangat membantu kita semua untuk memahami progres proyek dengan cepat.

A. Penamaan Branch
Gunakan format: jenis/kategori-deskripsi-singkat

Jenis:
feature: Untuk fitur baru.
bugfix: Untuk memperbaiki bug.
chore: Untuk tugas non-fitur (e.g., setup, update library).
Kategori:
fe: Frontend (UI, komponen React).
be: Backend (API, logika server).
db: Database (skema, migrasi).
auth: Terkait autentikasi.
docs: Terkait dokumentasi.
Contoh Nama Branch:

feature/fe-halaman-login
bugfix/be-validasi-form-register
chore/setup-prisma-orm
feature/db-tabel-hasil-tes
B. Pesan Commit
Gunakan format: <jenis>: deskripsi singkat diawali huruf kecil

Jenis:
feat: Menambah fitur baru.
fix: Memperbaiki bug.
style: Perubahan terkait styling (CSS).
refactor: Mengubah kode tanpa mengubah fungsionalitas.
docs: Menambah atau mengubah dokumentasi.
chore: Tugas-tugas kecil lainnya.
Contoh Pesan Commit:

feat: menambahkan tombol login via Google
fix: memperbaiki tombol submit yang tidak aktif
style: menyesuaikan padding pada navbar
C. Judul Pull Request (PR) & Label Isu
Ini adalah kategori standar yang akan kita gunakan untuk judul PR dan label pada Isu. Gunakan format: [KATEGORI] Deskripsi Tugas yang Dikerjakan

Daftar Kategori Utama:

[FE] - Frontend

Untuk: Semua yang terkait dengan antarmuka pengguna (UI). Membuat halaman, komponen React, logika di sisi klien.
Contoh: [FE] Membuat Halaman Dashboard Hasil Tes
[BE] - Backend

Untuk: Semua yang terkait dengan logika di server. Membuat API endpoint, validasi data, logika bisnis.
Contoh: [BE] Menambahkan API Endpoint untuk Registrasi User
[DB] - Database

Untuk: Perubahan spesifik pada struktur database. Membuat atau mengubah skema Prisma, migrasi data.
Contoh: [DB] Membuat Skema untuk Tabel User dan Test
[AI] - Artificial Intelligence

Untuk: Semua yang terkait integrasi dengan LLM. Prompt engineering, memanggil API Gemini/OpenAI, mengolah hasil dari AI.
Contoh: [AI] Membuat Fungsi untuk Menganalisis Jawaban Tes via Gemini
[AUTH] - Autentikasi

Untuk: Tugas yang spesifik menangani login, registrasi, sesi pengguna, dan proteksi rute.
Contoh: [AUTH] Implementasi Login dengan Google via NextAuth
[STYLE] - Styling

Untuk: Perubahan yang fokus pada perbaikan visual dan CSS. Merapikan layout, memperbaiki responsivitas, update tema.
Contoh: [STYLE] Memperbaiki Tampilan Navbar di Perangkat Mobile
[SETUP] - Setup & Konfigurasi

Untuk: Tugas awal atau konfigurasi proyek. Menginstal library baru, setup koneksi database, konfigurasi deployment.
Contoh: [SETUP] Konfigurasi Prisma ORM untuk Proyek
[DOCS] - Dokumentasi

Untuk: Menambah atau memperbarui dokumentasi proyek, seperti file README.md atau CONTRIBUTING.md ini.
Contoh: [DOCS] Memperbarui Panduan Setup Awal
Di deskripsi PR, jangan lupa tautkan Isu yang relevan dengan menulis: Closes #nomor_isu (misal: Closes #12).

3. Aturan Main Tambahan
Satu PR, Satu Tugas: Usahakan setiap Pull Request fokus menyelesaikan satu Isu saja.
Review Itu Wajib: Semua kode harus direview dan disetujui oleh minimal 1 maintainer sebelum bisa di-merge.
Jaga Kebersihan Branch develop: Jangan pernah push langsung ke develop atau main. Selalu lewat PR.
Gunakan .env.local: JANGAN PERNAH memasukkan data sensitif (API Key, password DB) langsung ke dalam kode.

# Teach SKL

Teach SKL adalah aplikasi belajar untuk mengelola materi, quiz, tugas, absensi, raport, dokumentasi, dan admin panel dalam satu tempat. Project ini awalnya masih banyak memakai PHP klasik, lalu mulai dipindahkan ke frontend Next.js supaya tampilan dan alurnya lebih enak dipakai.

Stack utama:

- Frontend: Next.js, React, Tailwind CSS
- Backend: PHP native
- Database: MySQL
- Local server: XAMPP

---

## Fitur Utama

### Akun dan Role

Ada 4 role utama:

- **Murid**: membaca materi, mengerjakan quiz, melihat poin, absensi, raport, dan dokumentasi.
- **Pengajar**: upload materi, membuat quiz/ujian, mengelola tugas, absensi, raport, dan dokumentasi.
- **Tamu**: melihat dokumentasi dan memberi ulasan.
- **Admin**: mengelola user, token pengajar, konten, laporan, dan aktivitas sistem.

Pengajar saat daftar memakai token dari admin. Frontend juga menyimpan snapshot session agar halaman tidak terasa kosong saat refresh.

### E-Book / Materi

Pengajar bisa upload materi dengan detail tambahan:

- deskripsi,
- tujuan pembelajaran,
- tingkat materi,
- estimasi waktu belajar,
- tags,
- file materi.

Di sisi murid, daftar e-book tidak langsung menampilkan tombol download saja. Murid masuk dulu ke halaman detail reader, melihat konteks materinya, lalu bisa membaca preview atau download file.

Preview yang sudah didukung:

- PDF,
- DOCX,
- gambar.

Format lain tetap bisa diunduh walau belum bisa dipreview langsung di browser.

### Quiz dan Ujian

Pengajar bisa membuat quiz atau ujian dari halaman bank quiz. Metadata quiz saat ini masih disimpan di kolom `pelajaran` dengan format prefix khusus. Ini dipilih supaya tabel lama tetap bisa dipakai tanpa migrasi besar.

Yang bisa diatur:

- tipe quiz atau ujian,
- timer,
- deadline,
- jumlah percobaan,
- acak soal,
- tampilkan atau sembunyikan review hasil.

Untuk tipe **ujian**, jumlah percobaan selalu dipaksa 1 kali. Ujian juga punya proteksi tab. Kalau murid meninggalkan halaman ujian, sistem menampilkan modal peringatan dan ujian dihentikan.

### Poin

- Murid melihat halaman **Poin Saya**.
- Pengajar melihat ranking **Point Murid**.

### Modul Lain

- Bank tugas
- Absensi murid
- Absensi pengajar
- Raport
- Dokumentasi foto/video
- Ulasan tamu
- Admin panel

---

## Alur Singkat Aplikasi

```mermaid
flowchart TD
  A[User membuka aplikasi] --> B{Sudah login?}
  B -->|Belum| C[Login / Register]
  B -->|Sudah| D{Role user}
  C --> D

  D -->|Murid| E[Dashboard Murid]
  D -->|Pengajar| F[Dashboard Pengajar]
  D -->|Tamu| G[Halaman Tamu]
  D -->|Admin| H[Admin Panel]

  E --> E1[Baca E-Book]
  E --> E2[Kerjakan Quiz / Ujian]
  E --> E3[Lihat Poin Saya]
  E --> E4[Absensi dan Raport]

  F --> F1[Kelola Materi]
  F --> F2[Kelola Quiz / Ujian]
  F --> F3[Kelola Tugas dan Raport]
  F --> F4[Absensi dan Dokumentasi]

  H --> H1[Kelola User]
  H --> H2[Token Pengajar]
  H --> H3[Konten dan Laporan]
```

## Alur E-Book

```mermaid
flowchart TD
  A[Pengajar upload materi] --> B[Isi detail materi]
  B --> C[Simpan file ke uploads/ebook]
  C --> D[Simpan data ke tabel ebook]
  D --> E[Murid buka daftar E-Book]
  E --> F[Baca Materi]
  F --> G[Halaman detail reader]
  G --> H{Format file}
  H -->|PDF| I[Preview PDF]
  H -->|DOCX| J[Render DOCX jadi HTML]
  H -->|Gambar| K[Preview gambar]
  H -->|Lainnya| L[Download file]
```

## Alur Quiz / Ujian

```mermaid
flowchart TD
  A[Pengajar membuat quiz] --> B[Atur metadata]
  B --> C[Tambah soal]
  C --> D[Murid melihat quiz]
  D --> E{Quiz atau Ujian?}
  E -->|Quiz| F[Murid mulai quiz]
  E -->|Ujian| G[Murid mulai ujian berproteksi]
  G --> H{Keluar tab?}
  H -->|Ya| I[Modal peringatan dan ujian selesai]
  H -->|Tidak| J[Kerjakan soal]
  F --> J
  J --> K[Simpan jawaban]
  K --> L[Skor / review jika diizinkan]
```

---

## Struktur Folder

```text
frontend/              Frontend Next.js yang dipakai sekarang
backend/               Endpoint PHP untuk data, action, upload, delete
config/                Koneksi database, CSRF, validation, logging
sql/                   Schema database
legacy/php-frontend/   UI PHP lama, disimpan sebagai fallback/arsip
```

Catatan lokal: folder kerja utama ada di repo ini. Folder XAMPP dipakai sebagai target deploy lokal. Beberapa perubahan perlu disalin ke XAMPP kalau menjalankan dari Apache lokal.

---

## ERD Database

```mermaid
erDiagram
  USERS {
    int id PK
    varchar nama
    varchar username
    varchar password
    enum kategori
    varchar foto
    timestamp created_at
  }

  PENGAJAR {
    int user_id PK, FK
    varchar universitas
    varchar bidang
    varchar telepon
    text alamat
  }

  MURID {
    int user_id PK, FK
    enum tingkat
    int umur
    text alamat
  }

  EBOOK {
    int id PK
    varchar pelajaran
    varchar judul_materi
    text deskripsi
    text tujuan_pembelajaran
    varchar tingkat
    int estimasi_menit
    varchar tags
    varchar file_path
    int uploaded_by FK
    timestamp tanggal_upload
  }

  QUIZ {
    int id PK
    varchar pelajaran
    text soal
    enum tipe
    varchar opsi_a
    varchar opsi_b
    varchar opsi_c
    varchar opsi_d
    varchar jawaban_benar
  }

  NILAI_QUIZ {
    int id PK
    int murid_id FK
    int quiz_id FK
    int nilai
    timestamp tanggal
  }

  BANK_TUGAS {
    int id PK
    varchar pelajaran
    varchar judul_tugas
    text deskripsi
    varchar file_path
    date deadline
  }

  ABSENSI_MURID {
    int id PK
    int murid_id FK
    date tanggal
    enum status
  }

  ABSENSI_PENGAJAR {
    int id PK
    int pengajar_id FK
    date tanggal
    enum status
    text keterangan
  }

  RAPORT_BULANAN {
    int id PK
    int murid_id FK
    int tahun
    int bulan
    int nilai_akhir
    int nilai_quiz
  }

  DOKUMENTASI {
    int id PK
    varchar judul
    enum tipe
    varchar file_path
    int tahun
    timestamp tanggal_upload
  }

  ULASAN {
    int id PK
    varchar nama
    int rating
    text komentar
    timestamp tanggal
  }

  TEACHER_TOKENS {
    int id PK
    varchar token
    varchar label
    tinyint aktif
    timestamp created_at
  }

  USERS ||--o| PENGAJAR : detail
  USERS ||--o| MURID : detail
  USERS ||--o{ EBOOK : upload
  USERS ||--o{ NILAI_QUIZ : nilai
  QUIZ ||--o{ NILAI_QUIZ : punya
  USERS ||--o{ ABSENSI_MURID : absensi
  USERS ||--o{ ABSENSI_PENGAJAR : absensi
  USERS ||--o{ RAPORT_BULANAN : raport
```

---

## Route yang Sering Dipakai

Beberapa endpoint masih memakai clean route, beberapa sengaja dipanggil langsung ke file PHP agar stabil di XAMPP.

Contoh route data:

- `backend/data/ebooks`
- `backend/data/quizzes`
- `backend/data/ranking`
- `backend/data/raport`
- `backend/data/dokumentasi`

Contoh direct endpoint yang dipakai frontend modern:

- `backend/uploads/upload_ebook.php`
- `backend/actions/update_ebook.php`
- `backend/deletes/hapus_ebook.php`
- `backend/actions/tambah_quiz.php`
- `backend/actions/update_quiz.php`
- `backend/actions/rename_quiz_subject.php`
- `backend/actions/jawab_quiz.php`
- `backend/deletes/hapus_quiz.php`

---

## Menjalankan Project

### 1. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Buka:

```text
http://localhost:3000
```

### 2. Backend

Jalankan Apache dan MySQL dari XAMPP. Untuk setup lokal saat ini, deploy XAMPP biasa diarahkan ke:

```text
C:\xampp\htdocs\moodle\public\tech-skl-deploy
```

### 3. Database

Import schema:

```text
sql/tech_skl.sql
```

Konfigurasi database ada di:

```text
config/database.php
```

Default lokal:

- database: `tech_skl`
- user: `root`
- password: kosong

---

## Catatan Pengembangan

Beberapa hal yang masih perlu dirapikan nanti:

- source of truth perlu dibuat lebih tegas antara repo dan folder XAMPP,
- file legacy masih ada dan beberapa masih masuk lint XAMPP,
- metadata quiz advanced masih menumpang di string `pelajaran`,
- sebaiknya nanti metadata quiz dipindah ke kolom database sendiri,
- perlu script deploy/sync otomatis ke XAMPP agar tidak copy manual.

---

## File Penting

- `frontend/src/app/page.tsx`
- `frontend/src/components/pages/EbookPage.tsx`
- `frontend/src/components/pages/QuizPage.tsx`
- `frontend/src/components/pages/QuizEditorTeacher.tsx`
- `frontend/src/components/pages/PointMuridPage.tsx`
- `frontend/src/components/ui/AppDialog.tsx`
- `frontend/src/components/ui/FileReader.tsx`
- `backend/index.php`
- `backend/uploads/upload_ebook.php`
- `backend/actions/update_ebook.php`
- `backend/actions/tambah_quiz.php`
- `backend/actions/update_quiz.php`
- `backend/data/get_ranking.php`
- `sql/tech_skl.sql`

---

## Status Singkat

Untuk kebutuhan demo lokal, fitur utama sudah bisa dipakai. Bagian yang paling penting sekarang adalah menjaga sinkronisasi antara repo utama dan folder XAMPP, karena environment lokal project ini masih menggunakan keduanya.

# Backend PHP Routes

Backend sekarang memakai **front controller** `backend/index.php`, jadi root backend tidak lagi penuh endpoint acak.

## Struktur Bersih

```text
backend/
├── .htaccess       # rewrite clean routes ke index.php
├── index.php       # route map pusat
├── auth/           # auth + JSON bridge untuk Next.js
├── data/           # endpoint baca data / JSON
├── actions/        # mutasi data non-upload
├── uploads/        # upload file
├── deletes/        # hapus data
└── legacy/         # wrapper lama, hanya arsip kompatibilitas
```

## Route Baru yang Dipakai

### Auth

| Route bersih | Implementasi |
|---|---|
| `backend/auth/api?action=me` | `auth/api_auth.php` |
| `backend/auth/api?action=csrf` | `auth/api_auth.php` |
| `backend/auth/api?action=login` | `auth/api_auth.php` |
| `backend/auth/api?action=register` | `auth/api_auth.php` |
| `backend/auth/login` | `auth/login.php` |
| `backend/auth/register` | `auth/register.php` |
| `backend/auth/logout` | `auth/logout.php` |

### Token Pendaftaran Pengajar

Role `pengajar` wajib memasukkan token dari admin saat daftar lewat frontend Next.js.

Default token lokal:

```text
PENGAJAR-TEACH-SKL-2026
```

Untuk mengganti token tanpa edit kode, set environment variable PHP/Apache:

```text
TEACHER_REGISTRATION_TOKEN=token-rahasia-admin
```

Role `murid` dan `tamu` tidak membutuhkan token ini.

### Data JSON

| Route bersih | Implementasi |
|---|---|
| `backend/data/stats` | `data/get_stats.php` |
| `backend/data/ebooks` | `data/get_ebooks.php` |
| `backend/data/tugas` | `data/get_tugas.php` |
| `backend/data/quizzes` | `data/get_quizzes.php` |
| `backend/data/murids` | `data/get_murids.php` |
| `backend/data/ranking` | `data/get_ranking.php` |
| `backend/data/raport` | `data/get_raport.php` |
| `backend/data/dokumentasi` | `data/get_dokumentasi.php` |
| `backend/data/ulasan` | `data/get_ulasan.php` |

### Actions

| Route bersih | Implementasi |
|---|---|
| `backend/actions/tambah-absensi` | `actions/tambah_absensi.php` |
| `backend/actions/tambah-absensi-murid` | `actions/tambah_absensi_murid.php` |
| `backend/actions/tambah-absensi-pengajar` | `actions/tambah_absensi_pengajar.php` |
| `backend/actions/tambah-quiz` | `actions/tambah_quiz.php` |
| `backend/actions/tambah-ulasan` | `actions/tambah_ulasan.php` |
| `backend/actions/jawab-quiz` | `actions/jawab_quiz.php` |
| `backend/actions/input-raport` | `actions/input_nilai_raport.php` |
| `backend/actions/reset-absensi` | `actions/reset_absensi.php` |

### Uploads

| Route bersih | Implementasi |
|---|---|
| `backend/uploads/ebook` | `uploads/upload_ebook.php` |
| `backend/uploads/tugas` | `uploads/upload_tugas.php` |
| `backend/uploads/foto` | `uploads/upload_foto.php` |
| `backend/uploads/dokumentasi` | `uploads/upload_dokumentasi.php` |

### Deletes

| Route bersih | Implementasi |
|---|---|
| `backend/deletes/ebook` | `deletes/hapus_ebook.php` |
| `backend/deletes/tugas` | `deletes/hapus_tugas.php` |
| `backend/deletes/quiz` | `deletes/hapus_quiz.php` |
| `backend/deletes/murid` | `deletes/hapus_murid.php` |
| `backend/deletes/dokumentasi` | `deletes/hapus_dokumentasi.php` |

## Legacy Compatibility

Route lama seperti:

```text
backend/get_stats.php
backend/login.php
backend/upload_ebook.php
```

tetap didukung oleh router. File wrapper lamanya dipindahkan ke `backend/legacy/` agar root backend bersih, tetapi kalau ada request ke URL lama, `.htaccess` akan meneruskannya ke `backend/index.php`, lalu route map akan memilih implementasi yang benar.

## Syarat Apache

Pastikan XAMPP Apache mengizinkan `.htaccess`:

```apache
AllowOverride All
LoadModule rewrite_module modules/mod_rewrite.so
```

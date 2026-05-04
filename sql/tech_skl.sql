CREATE DATABASE IF NOT EXISTS tech_skl;
USE tech_skl;

-- Tabel users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    kategori ENUM('pengajar', 'murid', 'tamu', 'admin') NOT NULL,
    foto VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel pengajar (extra fields)
CREATE TABLE pengajar (
    user_id INT PRIMARY KEY,
    universitas VARCHAR(100),
    bidang VARCHAR(100),
    telepon VARCHAR(20),
    alamat TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel murid (extra fields)
CREATE TABLE murid (
    user_id INT PRIMARY KEY,
    tingkat ENUM('TK','SD','SMP','SMA') NOT NULL,
    umur INT,
    alamat TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel ebook (materi)
CREATE TABLE ebook (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pelajaran VARCHAR(50) NOT NULL,
    judul_materi VARCHAR(200) NOT NULL,
    deskripsi TEXT,
    tujuan_pembelajaran TEXT,
    tingkat VARCHAR(80) DEFAULT 'Umum',
    estimasi_menit INT DEFAULT 0,
    tags VARCHAR(200),
    file_path VARCHAR(255),
    uploaded_by INT,
    tanggal_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Tabel absensi murid
CREATE TABLE absensi_murid (
    id INT AUTO_INCREMENT PRIMARY KEY,
    murid_id INT,
    tanggal DATE,
    status ENUM('hadir','izin','sakit','alpha'),
    FOREIGN KEY (murid_id) REFERENCES users(id)
);

-- Tabel absensi pengajar
CREATE TABLE absensi_pengajar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pengajar_id INT,
    tanggal DATE,
    status ENUM('hadir','izin','sakit','alpha'),
    FOREIGN KEY (pengajar_id) REFERENCES users(id)
);

-- Tabel bank tugas
CREATE TABLE bank_tugas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pelajaran VARCHAR(50),
    judul_tugas VARCHAR(200),
    deskripsi TEXT,
    file_path VARCHAR(255),
    deadline DATE
);

-- Tabel quiz
CREATE TABLE quiz (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pelajaran VARCHAR(255),
    soal TEXT,
    tipe ENUM('benar_salah','pilihan_ganda'),
    opsi_a VARCHAR(255),
    opsi_b VARCHAR(255),
    opsi_c VARCHAR(255),
    opsi_d VARCHAR(255),
    jawaban_benar VARCHAR(10)
);

-- Tabel nilai quiz
CREATE TABLE nilai_quiz (
    id INT AUTO_INCREMENT PRIMARY KEY,
    murid_id INT,
    quiz_id INT,
    nilai INT,
    tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (murid_id) REFERENCES users(id),
    FOREIGN KEY (quiz_id) REFERENCES quiz(id)
);

-- Tabel raport (nilai bulanan)
CREATE TABLE raport (
    id INT AUTO_INCREMENT PRIMARY KEY,
    murid_id INT,
    tahun INT,
    bulan INT,
    minggu_ke INT,
    nilai INT,
    FOREIGN KEY (murid_id) REFERENCES users(id)
);

-- Tabel dokumentasi
CREATE TABLE dokumentasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(200),
    tipe ENUM('foto','video'),
    file_path VARCHAR(255),
    tahun INT,
    tanggal_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk ulasan tamu
CREATE TABLE IF NOT EXISTS ulasan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    komentar TEXT,
    tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk raport bulanan
CREATE TABLE IF NOT EXISTS raport_bulanan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    murid_id INT,
    tahun INT,
    bulan INT,
    nilai_akhir INT,
    nilai_quiz INT,
    UNIQUE KEY unique_record (murid_id, tahun, bulan),
    FOREIGN KEY (murid_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel token pendaftaran pengajar (dikelola oleh admin)
CREATE TABLE teacher_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    label VARCHAR(100) DEFAULT '',
    aktif TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tambah kolom keterangan di absensi_pengajar jika belum ada
ALTER TABLE absensi_pengajar ADD COLUMN IF NOT EXISTS keterangan TEXT;

-- Untuk database yang sudah ada: jalankan ALTER ini jika kolom admin belum ada
-- ALTER TABLE users MODIFY COLUMN kategori ENUM('pengajar','murid','tamu','admin') NOT NULL;

-- Buat akun admin pertama via endpoint:
-- POST /php/backend/auth/api?action=setup-admin
--   setup_secret=SETUP-TEACH-SKL-2026  (atau env ADMIN_SETUP_SECRET)
--   nama=Administrator  username=admin  password=<pilih_sendiri>

-- Insert data contoh
INSERT INTO users (nama, username, password, kategori) VALUES
('Budi Guru', 'guru', '$2y$10$sONfLEesjUxxXD8eXb3gW.qyi3uKA8KPBlbBi56FWNFLSfJC6afse', 'pengajar'),
('Ani Siswa', 'siswa', '$2y$10$rfy9CylDJWft3IZupdAQwuzCjJpXdD/DUocUOUVX8FBBuirpKO30W', 'murid'),
('Tamu', 'tamu', '$2y$10$rQPyB17X55p5Fa33chkXOeQa2I/ugnDd6AJq0/673W4r25DZ9Z2RC', 'tamu');

INSERT INTO pengajar (user_id, universitas, bidang) VALUES (1, 'UGM', 'Matematika');
INSERT INTO murid (user_id, tingkat, umur, alamat) VALUES (2, 'SMA', 16, 'Jl. Mawar No.1');

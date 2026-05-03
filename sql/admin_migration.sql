USE tech_skl;

ALTER TABLE users MODIFY COLUMN kategori ENUM('pengajar','murid','tamu','admin') NOT NULL;

CREATE TABLE IF NOT EXISTS teacher_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    label VARCHAR(100) DEFAULT '',
    aktif TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

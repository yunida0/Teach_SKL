export type Category = "pengajar" | "murid" | "tamu" | "admin";

export type PageKey =
  | "dashboard"
  | "profil"
  | "ebook"
  | "banktugas"
  | "quiz"
  | "pointmurid"
  | "daftarmurid"
  | "raport"
  | "absensimurid"
  | "absensipengajar"
  | "dokumentasi"
  | "ulasan"
  | "donasi"
  | "adminpanel";

export type AdminSection = "overview" | "create" | "tokens" | "users" | "content" | "absensi" | "laporan" | "donasi" | "activity";

export type TeacherToken = {
  id: number | string;
  token: string;
  label?: string;
  aktif?: number | string;
  created_at?: string;
};

export type AdminUser = {
  id: number | string;
  nama?: string;
  username?: string;
  kategori?: Category;
  foto?: string;
  created_at?: string;
  universitas?: string;
  bidang?: string;
  telepon?: string;
  alamat?: string;
  tingkat?: string;
  umur?: number | string;
};

export type AdminActivity = {
  type?: string;
  title?: string;
  meta?: string;
  time?: string;
};

export type User = {
  id: number | string;
  nama: string;
  username: string;
  kategori: Category;
  foto?: string;
  created_at?: string;
};

export type Detail = {
  universitas?: string;
  bidang?: string;
  telepon?: string;
  tingkat?: string;
  umur?: number | string;
  alamat?: string;
};

export type AuthResponse = {
  success: boolean;
  error?: string;
  message?: string;
  user?: User | null;
  detail?: Detail | null;
  kategori?: Category | null;
  csrfToken?: string;
};

export type Stats = {
  ebook: number | string;
  tugas: number | string;
  murid: number | string;
  quiz: number | string;
};

export type Ebook = {
  id: number | string;
  pelajaran?: string;
  judul_materi?: string;
  deskripsi?: string;
  tujuan_pembelajaran?: string;
  tingkat?: string;
  estimasi_menit?: number | string;
  tags?: string;
  file_path?: string;
  tanggal_upload?: string;
};

export type Tugas = {
  id: number | string;
  pelajaran?: string;
  judul_tugas?: string;
  deskripsi?: string;
  deadline?: string;
  file_path?: string;
  tingkat?: string;
};

export type PengumpulanTugas = {
  id: number | string;
  tugas_id: number | string;
  murid_id: number | string;
  file_path?: string;
  catatan?: string;
  nilai?: number | string | null;
  feedback?: string | null;
  tanggal_upload?: string;
  tanggal_nilai?: string | null;
  judul_tugas?: string;
  pelajaran?: string;
  deadline?: string;
  nama_murid?: string;
  username?: string;
};

export type Quiz = {
  id: number | string;
  pelajaran?: string;
  soal?: string;
  tipe?: string;
  opsi_a?: string;
  opsi_b?: string;
  opsi_c?: string;
  opsi_d?: string;
  jawaban_benar?: string;
  tingkat?: string;
  poin?: number | string;
  sudah_dikerjakan?: number | string;
  nilai?: number | string;
};

export type Ranking = {
  nama?: string;
  total_nilai?: number | string;
  jumlah_quiz?: number | string;
  rata_rata?: number | string;
};

export type MuridListItem = {
  id: number | string;
  nama?: string;
  tingkat?: string;
};

export type AbsensiRecord = {
  tanggal?: string;
  status?: string;
  nama_murid?: string;
  nama_pengajar?: string;
  keterangan?: string;
};

export type AbsensiSaya = {
  riwayat?: AbsensiRecord[];
  stats?: {
    hadir?: number | string;
    izin?: number | string;
    sakit?: number | string;
    alpha?: number | string;
    persentase?: number | string;
  };
};

export type RaportItem = {
  nama?: string;
  murid_id?: number | string;
  tahun?: number | string;
  bulan?: number | string;
  nilai_akhir?: number | string;
  nilai_quiz?: number | string;
};

export type Ulasan = {
  id: number | string;
  nama: string;
  rating: number | string;
  komentar?: string;
};

export type DokumentasiItem = {
  id: number | string;
  judul?: string;
  tipe?: "foto" | "video" | string;
  file_path?: string;
  tahun?: number | string;
  tanggal_upload?: string;
};

export type AdminContent = {
  ebook: Array<{ id: number; judul_materi: string; pelajaran: string; tanggal_upload: string }>;
  quiz: Array<{ id: number; pelajaran: string; tipe: string; soal: string }>;
  tugas: Array<{ id: number; judul_tugas: string; pelajaran: string; deadline: string }>;
  dokumentasi: Array<{ id: number; judul: string; tipe: string; tanggal_upload: string }>;
  counts: { ebook: number; quiz: number; tugas: number; dokumentasi: number };
};

export type AdminAbsensi = {
  murid: Record<string, number>;
  pengajar: Record<string, number>;
  recent: Array<{ nama: string; tipe: string; status: string; tanggal: string }>;
};

export type AdminLaporan = {
  top_scores: Array<{ nama: string; username: string; rata_nilai: number | string; total_quiz: number | string }>;
  raport: Array<{ nama: string; tahun: number | string; bulan: number | string; nilai_akhir: number | string; nilai_quiz: number | string }>;
  ulasan: Record<number, number>;
  avg_rating: number | null;
  total_ulasan: number;
};

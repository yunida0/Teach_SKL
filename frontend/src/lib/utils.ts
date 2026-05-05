import type { AdminSection, Category, PageKey } from "@/types";

export const subjects = ["Bahasa Indonesia", "Bahasa Inggris", "Bahasa Jawa", "Matematika", "IPA", "PKWU", "Literasi Awal", "Seni Budaya", "Pendidikan Agama", "PJOK", "Lainnya"];

export const subjectsByLevel: Record<string, string[]> = {
  TK: ["Literasi Awal", "Numerasi Awal", "Motorik", "Seni & Kreativitas", "Budi Pekerti"],
  SD: ["Bahasa Indonesia", "Bahasa Inggris", "Bahasa Jawa", "Matematika", "IPA", "PKWU"],
  SMP: ["Bahasa Indonesia", "Bahasa Inggris", "Bahasa Jawa", "Matematika", "IPA", "IPS", "PKWU", "Seni Budaya", "PJOK"],
};

export const pageLabels: Record<PageKey, string> = {
  dashboard: "Dashboard",
  profil: "Profil",
  ebook: "E-Book",
  banktugas: "Bank Tugas",
  quiz: "Quiz",
  pointmurid: "Poin Saya",
  daftarmurid: "Daftar Murid",
  raport: "Raport",
  absensimurid: "Absensi Murid",
  absensipengajar: "Absensi Pengajar",
  dokumentasi: "Dokumentasi",
  ulasan: "Beri Ulasan",
  donasi: "Donasi",
  adminpanel: "Admin Panel",
};

export const adminNav: Array<[AdminSection, string]> = [
  ["overview", "Overview"],
  ["create", "Buat Akun"],
  ["tokens", "Token Pengajar"],
  ["users", "Pengguna"],
  ["content", "Konten"],
  ["absensi", "Absensi"],
  ["laporan", "Laporan"],
  ["activity", "Aktivitas"],
];

export function pageLabelFor(page: PageKey, category?: Category): string {
  if (page === "pointmurid") return category === "murid" ? "Poin Saya" : "Point Murid";
  if (page === "absensimurid") return category === "murid" ? "Absensi Saya" : "Absensi Murid";
  return pageLabels[page];
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export function studyRemaining(createdAt?: string) {
  if (!createdAt) return { years: 3, months: 0, days: 0 };
  const start = new Date(createdAt).getTime();
  const end = start + 3 * 365 * 24 * 60 * 60 * 1000;
  const diffDays = Math.max(0, Math.floor((end - Date.now()) / 86_400_000));
  return {
    years: Math.floor(diffDays / 365),
    months: Math.floor((diffDays % 365) / 30),
    days: (diffDays % 365) % 30,
  };
}

export function navFor(category: Category): PageKey[] {
  if (category === "admin") return ["adminpanel"];
  if (category === "tamu") return ["dokumentasi", "donasi", "ulasan"];
  const base: PageKey[] = ["dashboard", "ebook"];
  base.push("banktugas", "quiz", "pointmurid");
  if (category === "pengajar") {
    base.push("daftarmurid", "absensimurid", "absensipengajar", "raport", "dokumentasi");
  }
  if (category === "murid") base.push("absensimurid", "raport", "dokumentasi");
  return base;
}

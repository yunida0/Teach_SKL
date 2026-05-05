"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Category, Ebook } from "@/types";
import { PHP_BASE, readJson, uploadWithProgress } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppDialog } from "@/components/ui/AppDialog";
import { MateriReader } from "@/components/ui/MateriReader";

function MapelInput({ name, subjects: list, defaultValue = "" }: { name: string; subjects: string[]; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const filtered = list.filter((s) => s.toLowerCase().includes(value.toLowerCase()));

  return (
    <div className="relative">
      <input
        className="field"
        name={name}
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Ketik atau pilih mapel"
        required
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-sky-100 bg-white shadow-xl">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800"
              onMouseDown={(e) => { e.preventDefault(); setValue(s); setOpen(false); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
    </div>
  );
}

function formatEstimasi(value?: number | string) {
  const minutes = Number(value ?? 0);
  if (!minutes) return "Fleksibel";
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}j ${rest}m` : `${hours} jam`;
}

function parseTags(tags?: string) {
  return (tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
}

const levelPages = ["TK", "SD", "SMP"] as const;
type EbookLevel = typeof levelPages[number];

function parseLevel(value?: string | null): EbookLevel | null {
  const level = (value ?? "").trim().toUpperCase();
  if (level === "TK" || level === "SD" || level === "SMP") return level;
  return null;
}

function levelOf(item: Ebook): EbookLevel | null {
  return parseLevel(item.tingkat);
}

const subjectsByLevel: Record<EbookLevel, string[]> = {
  TK: ["Literasi Awal", "Numerasi Awal", "Motorik", "Seni & Kreativitas", "Budi Pekerti"],
  SD: ["Bahasa Indonesia", "Bahasa Inggris", "Bahasa Jawa", "Matematika", "IPA", "PKWU"],
  SMP: ["Bahasa Indonesia", "Bahasa Inggris", "Bahasa Jawa", "Matematika", "IPA", "PKWU"],
};

export function EbookPage({
  category,
  csrfToken,
  isPengajar,
  setMessage,
  studentLevel,
}: {
  category: Category;
  csrfToken: string;
  isPengajar: boolean;
  setMessage: (message: string) => void;
  studentLevel?: string | null;
}) {
  const [items, setItems] = useState<Ebook[]>([]);
  const [editing, setEditing] = useState<Ebook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ebook | null>(null);
  const [selected, setSelected] = useState<Ebook | null>(null);
  const [activeLevel, setActiveLevel] = useState<EbookLevel | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const muridLevel = category === "murid" ? parseLevel(studentLevel) : null;
  const currentLevel = category === "murid" ? muridLevel : activeLevel;
  const currentSubjects = currentLevel ? subjectsByLevel[currentLevel] : subjectsByLevel.SD;

  function load() {
    readJson<Ebook[]>(`${PHP_BASE}/backend/data/ebooks`)
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(() => {
    load();
  }, []);

  if (selected) {
    const tags = parseTags(selected.tags);
    const fileUrl = selected.file_path ? `${PHP_BASE}/${selected.file_path}` : "";
    return (
      <section className="grid gap-5">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <button className="mb-4 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-200" onClick={() => setSelected(null)} type="button">← Kembali ke {currentLevel ? `E-Book ${currentLevel}` : "E-Book"}</button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-sky-600">{selected.pelajaran ?? "Materi"}</p>
              <h2 className="m-0 mt-2 text-3xl font-black tracking-tight text-slate-950">{selected.judul_materi ?? "Tanpa judul"}</h2>
              {selected.deskripsi && <p className="mt-3 mb-0 text-sm font-semibold leading-relaxed text-slate-600">{selected.deskripsi}</p>}
            </div>
            {fileUrl && <a className="btn-primary inline-flex shrink-0 justify-center px-5 py-3 text-sm" download href={fileUrl}>Download Materi</a>}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Level</p><p className="m-0 mt-1 text-sm font-black text-slate-800">{selected.tingkat || "Umum"}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Estimasi</p><p className="m-0 mt-1 text-sm font-black text-slate-800">{formatEstimasi(selected.estimasi_menit)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Upload</p><p className="m-0 mt-1 text-sm font-black text-slate-800">{selected.tanggal_upload ? new Date(selected.tanggal_upload).toLocaleDateString("id-ID") : "-"}</p></div>
          </div>
          {selected.tujuan_pembelajaran && <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm font-bold leading-relaxed text-sky-800"><span className="font-black">Tujuan pembelajaran: </span>{selected.tujuan_pembelajaran}</div>}
          {tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">#{tag}</span>)}</div>}
        </div>
        {selected.file_path ? <MateriReader filePath={selected.file_path} title={selected.judul_materi ?? "Materi"} /> : <EmptyState text="File materi tidak tersedia." />}
      </section>
    );
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("csrf_token", csrfToken);
    data.set("tingkat", currentLevel ?? "SD");
    setUploadProgress(1);
    let payload: { success?: boolean; error?: string; message?: string } | null = null;
    try {
      payload = await uploadWithProgress(`${PHP_BASE}/backend/uploads/upload_ebook.php`, data, setUploadProgress);
    } catch (error) {
      payload = error as { success?: boolean; error?: string; message?: string };
    }
    if (!payload?.success) {
      setMessage(payload?.error ?? "Upload gagal. Periksa format, ukuran file, dan sesi login.");
      setUploadProgress(0);
      return;
    }
    form.reset();
    setMessage(payload.message ?? "Materi berhasil diupload.");
    window.setTimeout(() => setUploadProgress(0), 900);
    load();
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    data.set("csrf_token", csrfToken);
    data.set("id", String(editing.id));
    const response = await fetch(`${PHP_BASE}/backend/actions/update_ebook.php`, {
      method: "POST",
      body: data,
      credentials: "include",
      headers: { Accept: "application/json", "X-Requested-With": "fetch" },
    });
    const payload = await response.json().catch(() => null) as { success?: boolean; error?: string; message?: string } | null;
    if (!response.ok || !payload?.success) {
      setMessage(payload?.error ?? "Gagal menyimpan perubahan materi.");
      return;
    }
    setEditing(null);
    setMessage(payload.message ?? "Materi berhasil diperbarui.");
    load();
  }

  async function remove(item: Ebook) {
    const data = new FormData();
    data.set("csrf_token", csrfToken);
    data.set("id", String(item.id));
    const response = await fetch(`${PHP_BASE}/backend/deletes/hapus_ebook.php`, {
      method: "POST",
      body: data,
      credentials: "include",
      headers: { Accept: "application/json", "X-Requested-With": "fetch" },
    });
    const payload = await response.json().catch(() => null) as { success?: boolean; error?: string; message?: string } | null;
    if (!response.ok || !payload?.success) {
      setMessage(payload?.error ?? "Gagal menghapus materi.");
      return;
    }
    setMessage(payload.message ?? "Materi dihapus.");
    setDeleteTarget(null);
    load();
  }

  const grouped = levelPages.map((level) => ({
    level,
    items: items.filter((item) => levelOf(item) === level),
  }));
  const visibleItems = currentLevel ? items.filter((item) => levelOf(item) === currentLevel) : [];

  if (category === "murid" && !muridLevel) {
    return <EmptyState text="Tingkat akun belum diatur. Lengkapi profil dulu agar materi e-book bisa ditampilkan." />;
  }

  if (!currentLevel) {
    return (
      <section className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {grouped.map((group) => (
            <button
              className="rounded-[1.5rem] border border-sky-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
              key={group.level}
              onClick={() => setActiveLevel(group.level)}
              type="button"
            >
              <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{isPengajar ? "Kelola" : "Buka"}</span>
              <h3 className="mt-4 text-3xl font-black text-slate-950">{group.level}</h3>
              <p className="mt-1 text-sm font-bold text-slate-500">{group.items.length} materi tersedia</p>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      {category !== "murid" && <button className="w-fit text-sm font-black text-sky-700 hover:underline" onClick={() => setActiveLevel(null)} type="button">← Semua tingkat</button>}
      <div className={`grid items-start gap-6 ${isPengajar ? "xl:grid-cols-[0.8fr_1.2fr]" : ""}`}>
      {isPengajar && (
        <form className="glass-card grid gap-3 rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6" onSubmit={upload}>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Upload Materi</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Isi detail materi sebelum upload file.</p>
          </div>
          <MapelInput name="pelajaran" subjects={currentSubjects} />
          <input className="field" maxLength={200} name="judul_materi" placeholder="Judul materi" required />
          <textarea className="field min-h-28 resize-y" maxLength={1200} name="deskripsi" placeholder="Deskripsi singkat materi, ringkasan isi, atau instruksi belajar" />
          <textarea className="field min-h-24 resize-y" maxLength={800} name="tujuan_pembelajaran" placeholder="Tujuan pembelajaran, contoh: Setelah membaca, murid mampu memahami..." />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="field" name="tingkat" defaultValue={currentLevel}>
              {levelPages.map((level) => <option key={level}>{level}</option>)}
            </select>
            <input className="field" min="0" name="estimasi_menit" placeholder="Estimasi menit" type="number" />
          </div>
          <input className="field" maxLength={200} name="tags" placeholder="Tag: rangkuman, latihan, teori" />
          <input className="field" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" name="file" required type="file" />
          {uploadProgress > 0 && (
            <div className="rounded-2xl bg-sky-50 p-3">
              <div className="flex items-center justify-between text-xs font-black text-sky-700"><span>Upload materi</span><span>{uploadProgress}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${uploadProgress}%` }} /></div>
            </div>
          )}
          <button className="btn-primary px-6 py-3" type="submit">
            Upload Materi
          </button>
        </form>
      )}
      <div className={`grid content-start gap-4 sm:grid-cols-2 ${isPengajar ? "" : "lg:grid-cols-3"}`}>
        {visibleItems.map((item) => {
          const tags = parseTags(item.tags);
          return (
            <article key={item.id} className="group relative overflow-hidden rounded-[1.5rem] border border-white/75 bg-white/80 p-5 shadow-sm shadow-sky-950/5 ring-1 ring-sky-100/70 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-950/10">
              <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl transition group-hover:bg-slate-200/80" />
              <div className="relative grid gap-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-950 text-sm font-black text-white shadow-sm">
                    {(item.pelajaran ?? "M").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[0.68rem] font-black uppercase tracking-[0.18em] text-sky-600">{item.pelajaran ?? "Materi"}</p>
                    <h3 className="mt-1 mb-0 line-clamp-2 text-xl font-black leading-snug text-slate-950">{item.judul_materi ?? "Tanpa judul"}</h3>
                  </div>
                </div>

                {item.deskripsi && <p className="m-0 line-clamp-3 text-sm font-semibold leading-relaxed text-slate-600">{item.deskripsi}</p>}

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-sky-50/80 p-3 ring-1 ring-sky-100">
                    <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-sky-500">Level</p>
                    <p className="m-0 mt-1 text-sm font-black text-sky-950">{item.tingkat || "Umum"}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/80 p-3 ring-1 ring-emerald-100">
                    <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-500">Estimasi</p>
                    <p className="m-0 mt-1 text-sm font-black text-emerald-950">{formatEstimasi(item.estimasi_menit)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100">
                    <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Upload</p>
                    <p className="m-0 mt-1 text-sm font-black text-slate-800">{item.tanggal_upload ? new Date(item.tanggal_upload).toLocaleDateString("id-ID") : "-"}</p>
                  </div>
                </div>
              </div>
              {item.tujuan_pembelajaran && (
                <div className="relative mt-4 rounded-2xl bg-white/70 p-3 text-sm font-bold leading-relaxed text-sky-800 ring-1 ring-sky-100">
                  <span className="font-black">Tujuan: </span>{item.tujuan_pembelajaran}
                </div>
              )}
              {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">#{tag}</span>)}</div>}
              {isPengajar && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button className="rounded-full bg-sky-50 px-4 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-100" onClick={() => setEditing(item)} type="button">Edit Detail</button>
                  <button className="rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100" onClick={() => setDeleteTarget(item)} type="button">Hapus</button>
                </div>
              )}
              <div className="relative mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <button className="btn-primary justify-center px-4 py-2.5 text-sm" onClick={() => setSelected(item)} type="button">Baca Materi</button>
                {item.file_path && <a className="rounded-full bg-slate-100 px-4 py-2.5 text-center text-sm font-black text-slate-700 transition hover:bg-slate-200" download href={`${PHP_BASE}/${item.file_path}`}>Download</a>}
              </div>
            </article>
          );
        })}
        {visibleItems.length === 0 && <EmptyState text={`Belum ada e-book untuk ${currentLevel}.`} />}
      </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form onSubmit={update} className="glass-card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] p-6 shadow-2xl">
            <h3 className="m-0 text-xl font-black text-slate-950">Edit Detail Materi</h3>
            <p className="mt-1 mb-5 text-sm font-semibold text-slate-500">File tidak berubah, hanya informasi materi yang diperbarui.</p>
            <div className="grid gap-3">
              <select className="field" name="pelajaran" defaultValue={currentSubjects.includes(editing.pelajaran ?? "") ? editing.pelajaran : currentSubjects[0]} required>{currentSubjects.map((subject) => <option key={subject}>{subject}</option>)}</select>
              <input className="field" maxLength={200} name="judul_materi" defaultValue={editing.judul_materi ?? ""} placeholder="Judul materi" required />
              <textarea className="field min-h-28 resize-y" maxLength={1200} name="deskripsi" defaultValue={editing.deskripsi ?? ""} placeholder="Deskripsi materi" />
              <textarea className="field min-h-24 resize-y" maxLength={800} name="tujuan_pembelajaran" defaultValue={editing.tujuan_pembelajaran ?? ""} placeholder="Tujuan pembelajaran" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="field" name="tingkat" defaultValue={levelOf(editing) ?? currentLevel ?? "SD"}>
                  {levelPages.map((level) => <option key={level}>{level}</option>)}
                </select>
                <input className="field" min="0" name="estimasi_menit" defaultValue={editing.estimasi_menit ?? 0} placeholder="Estimasi menit" type="number" />
              </div>
              <input className="field" maxLength={200} name="tags" defaultValue={editing.tags ?? ""} placeholder="Tag: rangkuman, latihan, teori" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-full px-4 py-2.5 text-sm font-black text-slate-500 transition hover:bg-slate-100">Batal</button>
              <button type="submit" className="btn-primary px-5 py-2.5 text-sm">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      )}

      <AppDialog
        open={Boolean(deleteTarget)}
        title="Hapus materi?"
        description={`Materi "${deleteTarget?.judul_materi ?? "ini"}" akan dihapus beserta file-nya.`}
        tone="danger"
        cancelLabel="Batal"
        confirmLabel="Hapus"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove(deleteTarget)}
      />
    </section>
  );
}

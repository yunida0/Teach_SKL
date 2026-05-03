"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Ebook } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";
import { subjects } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppDialog } from "@/components/ui/AppDialog";
import { MateriReader } from "@/components/ui/MateriReader";

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

export function EbookPage({
  csrfToken,
  isPengajar,
  setMessage,
}: {
  csrfToken: string;
  isPengajar: boolean;
  setMessage: (message: string) => void;
}) {
  const [items, setItems] = useState<Ebook[]>([]);
  const [editing, setEditing] = useState<Ebook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ebook | null>(null);
  const [selected, setSelected] = useState<Ebook | null>(null);

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
          <button className="mb-4 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-200" onClick={() => setSelected(null)} type="button">← Kembali ke E-Book</button>
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
    const response = await fetch(`${PHP_BASE}/backend/uploads/upload_ebook.php`, {
      method: "POST",
      body: data,
      credentials: "include",
      headers: { Accept: "application/json", "X-Requested-With": "fetch" },
    });
    const payload = await response.json().catch(() => null) as { success?: boolean; error?: string; message?: string } | null;
    if (!response.ok || !payload?.success) {
      setMessage(payload?.error ?? "Upload gagal. Periksa format dan ukuran file.");
      return;
    }
    form.reset();
    setMessage(payload.message ?? "Materi berhasil diupload.");
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

  return (
    <section className="grid items-start gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      {isPengajar && (
        <form className="glass-card grid gap-3 rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6" onSubmit={upload}>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Upload Materi</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Isi detail materi sebelum upload file.</p>
          </div>
          <select className="field" name="pelajaran" required>
            {subjects.map((subject) => (
              <option key={subject}>{subject}</option>
            ))}
          </select>
          <input className="field" maxLength={200} name="judul_materi" placeholder="Judul materi" required />
          <textarea className="field min-h-28 resize-y" maxLength={1200} name="deskripsi" placeholder="Deskripsi singkat materi, ringkasan isi, atau instruksi belajar" />
          <textarea className="field min-h-24 resize-y" maxLength={800} name="tujuan_pembelajaran" placeholder="Tujuan pembelajaran, contoh: Setelah membaca, murid mampu memahami..." />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="field" name="tingkat" defaultValue="Umum">
              <option>Umum</option>
              <option>Pemula</option>
              <option>Menengah</option>
              <option>Lanjutan</option>
              <option>Persiapan Ujian</option>
            </select>
            <input className="field" min="0" name="estimasi_menit" placeholder="Estimasi menit" type="number" />
          </div>
          <input className="field" maxLength={200} name="tags" placeholder="Tag: rangkuman, latihan, teori" />
          <input className="field" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" name="file" required type="file" />
          <button className="btn-primary px-6 py-3" type="submit">
            Upload Materi
          </button>
        </form>
      )}
      <div className="grid content-start gap-3">
        {items.map((item) => {
          const tags = parseTags(item.tags);
          return (
            <article key={item.id} className="glass-card rounded-[1.5rem] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-sky-600">{item.pelajaran ?? "Materi"}</p>
                  <h3 className="mt-2 mb-0 text-xl font-black text-slate-950">{item.judul_materi ?? "Tanpa judul"}</h3>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-right ring-1 ring-slate-100">
                  <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Estimasi</p>
                  <p className="m-0 text-sm font-black text-slate-800">{formatEstimasi(item.estimasi_menit)}</p>
                </div>
              </div>
              {item.deskripsi && <p className="mt-3 mb-0 text-sm font-semibold leading-relaxed text-slate-600">{item.deskripsi}</p>}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-slate-100">
                  <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Level</p>
                  <p className="m-0 mt-1 text-sm font-black text-slate-800">{item.tingkat || "Umum"}</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-slate-100">
                  <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Upload</p>
                  <p className="m-0 mt-1 text-sm font-black text-slate-800">{item.tanggal_upload ? new Date(item.tanggal_upload).toLocaleDateString("id-ID") : "-"}</p>
                </div>
              </div>
              {item.tujuan_pembelajaran && (
                <div className="mt-3 rounded-2xl bg-sky-50 p-3 text-sm font-bold leading-relaxed text-sky-800">
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
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-primary px-4 py-2.5 text-sm" onClick={() => setSelected(item)} type="button">Baca Materi</button>
                {item.file_path && <a className="rounded-full bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200" download href={`${PHP_BASE}/${item.file_path}`}>Download</a>}
              </div>
            </article>
          );
        })}
        {items.length === 0 && <EmptyState text="Belum ada e-book." />}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form onSubmit={update} className="glass-card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] p-6 shadow-2xl">
            <h3 className="m-0 text-xl font-black text-slate-950">Edit Detail Materi</h3>
            <p className="mt-1 mb-5 text-sm font-semibold text-slate-500">File tidak berubah, hanya informasi materi yang diperbarui.</p>
            <div className="grid gap-3">
              <select className="field" name="pelajaran" defaultValue={editing.pelajaran ?? subjects[0]} required>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select>
              <input className="field" maxLength={200} name="judul_materi" defaultValue={editing.judul_materi ?? ""} placeholder="Judul materi" required />
              <textarea className="field min-h-28 resize-y" maxLength={1200} name="deskripsi" defaultValue={editing.deskripsi ?? ""} placeholder="Deskripsi materi" />
              <textarea className="field min-h-24 resize-y" maxLength={800} name="tujuan_pembelajaran" defaultValue={editing.tujuan_pembelajaran ?? ""} placeholder="Tujuan pembelajaran" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="field" name="tingkat" defaultValue={editing.tingkat || "Umum"}>
                  <option>Umum</option><option>Pemula</option><option>Menengah</option><option>Lanjutan</option><option>Persiapan Ujian</option>
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

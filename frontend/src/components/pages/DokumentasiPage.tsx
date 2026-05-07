"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Category, DokumentasiItem } from "@/types";
import { PHP_BASE, readJson, uploadWithProgress } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppDialog } from "@/components/ui/AppDialog";
import { CustomSelect } from "@/components/ui/CustomSelect";

type DrivePhoto = { id: string; title: string };

const defaultDrivePhotos: DrivePhoto[] = [
  { id: "1OIxeDLxPxzDaS5ViLAAinXx9Ls52Uj4_", title: "Kegiatan Belajar 01" },
  { id: "1hy9SMoNNB2_i0oRxfE881hhNWr9_GnsR", title: "Kegiatan Belajar 02" },
  { id: "1m1ooJxwa5Xsfvfqy1muVL1zGHalI4JGt", title: "Kegiatan Belajar 03" },
  { id: "17KAmZuH1lpYzvkHLGN4M3RMC6WXbL_Ia", title: "Kegiatan Belajar 04" },
  { id: "1B0wpYCcf6iFT-W9yl4Yx4EafvIYLR-2x", title: "Senam Pagi" },
  { id: "1Rl85UWjF4KugCK3HNbU63y_HCN1L-jWk", title: "Belajar Bersama" },
  { id: "1RxPhMQnmUqVjmO3i5_v3aYSftdk02oDd", title: "Kegiatan Belajar 05" },
  { id: "1xIbSJhlF_xVXNJoKMwkYtkzcWfMPcfFQ", title: "Kegiatan Belajar 06" },
  { id: "1hlhgs9Fab0I1IwMGh4TZrE9zBxOZRBRu", title: "Kegiatan Belajar 07" },
  { id: "1L0wjOQm5Ml-v0CTlkyTYX8Y47ntBmsSS", title: "Kegiatan Belajar 08" },
  { id: "1TNznzy5yP1AsbYRb2MAjF664xwoaLehX", title: "Kegiatan Belajar 09" },
  { id: "13oYrZNiwkDIdYbt6jdDE1QqdQXfg3Va-", title: "Kegiatan Belajar 10" },
  { id: "1R9TNkrjd34HMhogvHVCzF_uGdSj83jRo", title: "Kegiatan Belajar 11" },
  { id: "11aD2rs9z5DmkLt6_I3o3Ms91c6Xn-J56", title: "Kegiatan Belajar 12" },
  { id: "1uZAYtQYhpLr0CEso72AEkZ5HDDRxqk4B", title: "Kegiatan Belajar 13" },
  { id: "1HfSYmW82gSVSE6RKUM0KFbFySMpQAxH1", title: "Kegiatan Belajar 14" },
  { id: "11vPprOVFvGjk5wLY1cvTosUmADuC1rCn", title: "Kegiatan Belajar 15" },
  { id: "1ZG1sjHpvqyZwncJwgnwEGpicT00DHM5K", title: "Kegiatan Belajar 16" },
  { id: "1W-AGdPIObUyekF9moNVypYYxR5I8FdWq", title: "Kegiatan Belajar 17" },
  { id: "1itDfTeJ968rrtLIklBEo5O8-kVBiPRIp", title: "Kegiatan Belajar 18" },
  { id: "1o2ufUISQ-r8zJOcB2eXSl_zuLC52L37i", title: "Ruang Belajar" },
  { id: "1eFi63qP8jnwYCb-L5zWBj8OwmaPs-kOI", title: "Kegiatan Belajar 19" },
  { id: "1YlQ-wrdwlPYHpWuml79UyRXzMqggQQqZ", title: "Kegiatan Belajar 20" },
  { id: "12sSabuhOzmV1b8JvcVa8VmoCImbUl9rY", title: "Kegiatan Belajar 21" },
  { id: "1AWma_7Aa7ufsF9__xH8XCzMAV3qureJ0", title: "Kegiatan Belajar 22" },
  { id: "1idjFJfjgunrfNgeWAQn4UEowJ-7WuMVb", title: "Kegiatan Belajar 23" },
  { id: "1G2P-C0CGkTRU-ium6Pyi4cDm_urI0OEz", title: "Kegiatan Belajar 24" },
];

function driveThumb(id: string, size = 1200) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
}

function GuestDocumentationCanvas({ photos }: { photos: DrivePhoto[] }) {
  const drivePhotos = photos.length > 0 ? photos : defaultDrivePhotos;
  const [activePhoto, setActivePhoto] = useState<DrivePhoto | null>(null);
  const heroPhoto = drivePhotos[4] ?? drivePhotos[0];
  const restPhotos = drivePhotos.filter((photo) => photo.id !== heroPhoto.id);

  return (
    <>
      <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-[#f8fbf7] p-4 shadow-sm md:p-6 xl:p-8">
        <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-amber-100 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="grid content-between gap-5 rounded-[1.7rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-7">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Dokumentasi Kegiatan</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">
                Cerita kecil dari ruang belajar Kolong Langit.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-2xl font-black text-emerald-800">{drivePhotos.length}</p>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">Foto</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-2xl font-black text-sky-800">2026</p>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Arsip</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-2xl font-black text-amber-800">SKL</p>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">Galeri</p>
              </div>
            </div>
          </div>

          <button
            className="group relative min-h-[24rem] overflow-hidden rounded-[1.9rem] border border-white bg-slate-900 text-left shadow-[0_28px_90px_rgba(15,23,42,0.18)]"
            onClick={() => setActivePhoto(heroPhoto)}
            type="button"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={heroPhoto.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" src={driveThumb(heroPhoto.id, 1400)} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white md:p-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-100">Sorotan</p>
              <h3 className="mt-2 text-3xl font-black">{heroPhoto.title}</h3>
              <p className="mt-2 text-sm font-bold text-white/80">Klik untuk membuka foto di canvas.</p>
            </div>
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {restPhotos.map((photo, index) => (
          <button
            className={`group relative overflow-hidden rounded-[1.6rem] border border-white bg-white text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${index % 7 === 0 ? "sm:row-span-2" : ""}`}
            key={photo.id}
            onClick={() => setActivePhoto(photo)}
            type="button"
          >
            <div className={`${index % 7 === 0 ? "h-[28rem]" : "h-64"} overflow-hidden bg-slate-100`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={photo.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" src={driveThumb(photo.id)} />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-4 pt-14 text-white opacity-95">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-sky-100">Foto {String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-1 text-lg font-black">{photo.title}</h3>
            </div>
          </button>
        ))}
      </section>

      {activePhoto && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-md" onClick={() => setActivePhoto(null)} role="presentation">
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white p-2 shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={activePhoto.title}>
            <button
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-slate-900 shadow-sm transition hover:bg-white"
              onClick={() => setActivePhoto(null)}
              type="button"
            >
              Tutup
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={activePhoto.title} className="max-h-[82vh] w-full rounded-[1.6rem] object-contain bg-slate-100" src={driveThumb(activePhoto.id, 1800)} />
          </div>
        </div>
      )}
    </>
  );
}

function EmbedDocumentationManager({ csrfToken, photos, onSaved }: { csrfToken: string; photos: DrivePhoto[]; onSaved: (photos: DrivePhoto[]) => void }) {
  const [rows, setRows] = useState<DrivePhoto[]>(photos.length ? photos : defaultDrivePhotos);
  const [msg, setMsg] = useState("");

  function update(index: number, key: keyof DrivePhoto, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  async function save() {
    setMsg("");
    const fd = new FormData();
    fd.set("csrf_token", csrfToken);
    fd.set("photos", JSON.stringify(rows));
    try {
      const res = await fetch(`${PHP_BASE}/backend/actions/save-dokumentasi-embed`, { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (json.success) { setMsg("Galeri embed berhasil disimpan."); onSaved(json.photos ?? rows); }
      else setMsg(json.error ?? "Gagal menyimpan galeri embed.");
    } catch {
      setMsg("Gagal menghubungi server.");
    }
  }

  return (
    <div className="glass-card grid gap-3 rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6">
      <div className="border-b border-sky-100 pb-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Embed Google Drive</p>
        <h2 className="title-font text-2xl font-black text-slate-950">Kelola Galeri Publik</h2>
        <p className="mt-1 text-sm font-bold text-slate-500">Galeri ini tampil untuk tamu dan murid.</p>
      </div>
      <div className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
        {rows.map((row, index) => (
          <div key={`${row.id}-${index}`} className="grid gap-2 rounded-2xl border border-sky-50 bg-white/70 p-3 md:grid-cols-[1fr_1.4fr_auto]">
            <input className="field" placeholder="Google Drive file ID" value={row.id} onChange={(e) => update(index, "id", e.target.value)} />
            <input className="field" placeholder="Judul" value={row.title} onChange={(e) => update(index, "title", e.target.value)} />
            <button className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))} type="button">Hapus</button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600" onClick={() => setRows((prev) => [...prev, { id: "", title: "Dokumentasi Baru" }])} type="button">+ Tambah Foto Embed</button>
        <button className="btn-primary px-4 py-2 text-xs" onClick={save} type="button">Simpan Galeri Embed</button>
      </div>
      {msg && <p className={`text-sm font-black ${msg.includes("berhasil") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>}
    </div>
  );
}

function UploadDokumentasiForm({ csrfToken, onUploaded }: { csrfToken: string; onUploaded: () => void }) {
  const [tipe, setTipe]       = useState("foto");
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const data = new FormData(e.currentTarget);
      data.set("csrf_token", csrfToken);
      setProgress(1);
      let json: { success?: boolean; error?: string } | null = null;
      try {
        json = await uploadWithProgress(`${PHP_BASE}/backend/uploads/dokumentasi`, data, setProgress);
      } catch (error) {
        json = error as { success?: boolean; error?: string };
      }
      if (json?.success) {
        setMsg("Dokumentasi berhasil diupload.");
        (e.target as HTMLFormElement).reset();
        setTipe("foto");
        window.setTimeout(() => setProgress(0), 900);
        onUploaded();
      } else {
        setMsg(json?.error ?? "Upload gagal.");
        setProgress(0);
      }
    } finally {
      setLoading(false);
    }
  }

  const thisYear = new Date().getFullYear();

  return (
    <form className="glass-card grid gap-3 rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6" onSubmit={submit}>
      <div className="border-b border-sky-100 pb-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Upload</p>
        <h2 className="title-font text-2xl font-black text-slate-950">Tambah Dokumentasi</h2>
      </div>
      <input className="field" maxLength={200} name="judul" placeholder="Judul dokumentasi" required />
      <CustomSelect name="tipe" value={tipe} onChange={setTipe} options={[{ value: "foto", label: "Foto" }, { value: "video", label: "Video" }]} placeholder="Tipe" />
      <input className="field" defaultValue={thisYear} max={thisYear + 5} min={2000} name="tahun" required type="number" />
      <input
        accept={tipe === "foto" ? ".jpg,.jpeg,.png,.webp" : ".mp4,.webm,.mov"}
        className="field"
        name="file"
        required
        type="file"
      />
      {msg && (
        <p className={`text-sm font-black ${msg.includes("berhasil") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>
      )}
      {progress > 0 && (
        <div className="rounded-2xl bg-sky-50 p-3">
          <div className="flex items-center justify-between text-xs font-black text-sky-700"><span>Upload dokumentasi</span><span>{progress}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      <button className="btn-primary px-6 py-3 disabled:opacity-50" disabled={loading} type="submit">
        {loading ? "Mengupload..." : "Upload"}
      </button>
    </form>
  );
}

export function DokumentasiPage({ category, csrfToken }: { category: Category; csrfToken: string }) {
  const [items, setItems]               = useState<DokumentasiItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DokumentasiItem | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [embedPhotos, setEmbedPhotos]   = useState<DrivePhoto[]>([]);

  function load() {
    readJson<DokumentasiItem[]>(`${PHP_BASE}/backend/data/dokumentasi`).then(setItems).catch(() => setItems([]));
  }
  useEffect(() => {
    load();
    readJson<DrivePhoto[]>(`${PHP_BASE}/backend/data/dokumentasi-embed`).then(setEmbedPhotos).catch(() => setEmbedPhotos([]));
  }, []);

  const isPengajar = category === "pengajar";

  if (category === "tamu" || category === "murid") {
    return <GuestDocumentationCanvas photos={embedPhotos} />;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const fd = new FormData();
      fd.set("csrf_token", csrfToken);
      fd.set("id", String(deleteTarget.id));
      const res  = await fetch(`${PHP_BASE}/backend/deletes/dokumentasi`, { method: "POST", body: fd, credentials: "include" });
      const json = await res.json().catch(() => ({ success: false }));
      if (json.success) load();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <section className="grid items-start gap-6">
        {isPengajar && <EmbedDocumentationManager key={embedPhotos.map((photo) => photo.id).join("|")} csrfToken={csrfToken} photos={embedPhotos} onSaved={setEmbedPhotos} />}
        {isPengajar && <GuestDocumentationCanvas photos={embedPhotos} />}
        {isPengajar && <UploadDokumentasiForm csrfToken={csrfToken} onUploaded={load} />}

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="title-font text-xl font-black text-slate-800">
              {isPengajar ? "Galeri Dokumentasi" : "Dokumentasi"}
            </h2>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{items.length} item</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article className="group relative glass-card overflow-hidden rounded-[1.5rem]" key={item.id}>
                {item.tipe === "video" ? (
                  <video className="h-52 w-full bg-slate-100 object-cover" controls src={`${PHP_BASE}/${item.file_path}`} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={item.judul ?? "Dokumentasi"} className="h-52 w-full bg-slate-100 object-cover" src={`${PHP_BASE}/${item.file_path}`} />
                )}
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">{item.tipe ?? "media"} &bull; {item.tahun ?? "-"}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">{item.judul ?? "Dokumentasi"}</h3>
                </div>
                {isPengajar && (
                  <button
                    className="absolute right-3 top-3 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-rose-700 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => setDeleteTarget(item)}
                    type="button"
                  >
                    Hapus
                  </button>
                )}
              </article>
            ))}
          </div>

          {items.length === 0 && <EmptyState text="Belum ada dokumentasi." />}
        </div>
      </section>

      <AppDialog
        cancelLabel="Batal"
        confirmLabel={deleting ? "Menghapus..." : "Hapus"}
        description={`"${deleteTarget?.judul ?? "Dokumentasi ini"}" akan dihapus permanen.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        open={Boolean(deleteTarget)}
        title="Hapus dokumentasi?"
        tone="danger"
      />
    </>
  );
}

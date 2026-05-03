"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Category, DokumentasiItem } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppDialog } from "@/components/ui/AppDialog";

function UploadDokumentasiForm({ csrfToken, onUploaded }: { csrfToken: string; onUploaded: () => void }) {
  const [tipe, setTipe]       = useState("foto");
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const data = new FormData(e.currentTarget);
      data.set("csrf_token", csrfToken);
      const res  = await fetch(`${PHP_BASE}/backend/uploads/dokumentasi`, { method: "POST", body: data, credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setMsg("Dokumentasi berhasil diupload.");
        (e.target as HTMLFormElement).reset();
        setTipe("foto");
        onUploaded();
      } else {
        setMsg(json.error ?? "Upload gagal.");
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
      <select className="field" name="tipe" onChange={(e) => setTipe(e.target.value)} value={tipe}>
        <option value="foto">Foto</option>
        <option value="video">Video</option>
      </select>
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

  function load() {
    readJson<DokumentasiItem[]>(`${PHP_BASE}/backend/data/dokumentasi`).then(setItems).catch(() => setItems([]));
  }
  useEffect(() => { load(); }, []);

  const isPengajar = category === "pengajar";

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
                    className="absolute right-3 top-3 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white opacity-0 shadow-sm transition hover:bg-rose-700 group-hover:opacity-100"
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

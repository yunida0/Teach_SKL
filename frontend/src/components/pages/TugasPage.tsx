"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Category, Tugas } from "@/types";
import { PHP_BASE, readJson, uploadWithProgress } from "@/lib/api";
import { subjects } from "@/lib/utils";
import { ListCard } from "@/components/ui/ListCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppDialog } from "@/components/ui/AppDialog";

function TambahTugasForm({ csrfToken, onAdded }: { csrfToken: string; onAdded: () => void }) {
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
        json = await uploadWithProgress(`${PHP_BASE}/backend/uploads/tugas`, data, setProgress);
      } catch (error) {
        json = error as { success?: boolean; error?: string };
      }
      if (json?.success) {
        setMsg("Tugas berhasil ditambahkan.");
        (e.target as HTMLFormElement).reset();
        window.setTimeout(() => setProgress(0), 900);
        onAdded();
      } else {
        setMsg(json?.error ?? "Gagal menyimpan tugas.");
        setProgress(0);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="glass-card grid gap-3 rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6" onSubmit={submit}>
      <div className="border-b border-sky-100 pb-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Form Tugas</p>
        <h2 className="title-font text-2xl font-black text-slate-950">Tambah Tugas</h2>
      </div>
      <select className="field" name="pelajaran" required>
        {subjects.map((s) => <option key={s}>{s}</option>)}
      </select>
      <input className="field" maxLength={200} name="judul_tugas" placeholder="Judul tugas" required />
      <textarea className="field min-h-[80px] resize-y" name="deskripsi" placeholder="Deskripsi tugas..." required />
      <div>
        <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Deadline</label>
        <input className="field" name="deadline" required type="date" />
      </div>
      <input accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.jpg,.png" className="field" name="file" type="file" />
      {msg && (
        <p className={`text-sm font-black ${msg.includes("berhasil") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>
      )}
      {progress > 0 && (
        <div className="rounded-2xl bg-sky-50 p-3">
          <div className="flex items-center justify-between text-xs font-black text-sky-700"><span>Upload file</span><span>{progress}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      <button className="btn-primary px-6 py-3 disabled:opacity-50" disabled={loading} type="submit">
        {loading ? "Menyimpan..." : "Simpan Tugas"}
      </button>
    </form>
  );
}

export function TugasPage({ category, csrfToken }: { category: Category; csrfToken: string }) {
  const [items, setItems]         = useState<Tugas[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Tugas | null>(null);
  const [deleting, setDeleting]   = useState(false);

  function load() {
    readJson<Tugas[]>(`${PHP_BASE}/backend/data/tugas`).then(setItems).catch(() => setItems([]));
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
      const res  = await fetch(`${PHP_BASE}/backend/deletes/tugas`, { method: "POST", body: fd, credentials: "include" });
      const json = await res.json().catch(() => ({ success: false }));
      if (json.success) load();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <section className={`grid items-start gap-6 ${isPengajar ? "xl:grid-cols-[0.9fr_1.1fr]" : ""}`}>
        {isPengajar && <TambahTugasForm csrfToken={csrfToken} onAdded={load} />}
        <div className="grid content-start gap-3">
          {isPengajar && (
            <div className="flex items-center justify-between">
              <h2 className="title-font text-xl font-black text-slate-800">Daftar Tugas</h2>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{items.length} tugas</span>
            </div>
          )}
          {items.map((item) => (
            <div className="group relative" key={item.id}>
              <ListCard
                href={item.file_path}
                meta={`${item.pelajaran ?? "-"} • Deadline ${item.deadline ?? "-"}`}
                text={item.deskripsi}
                title={item.judul_tugas ?? "Tanpa judul"}
              />
              {isPengajar && (
                <button
                  className="absolute right-3 top-3 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-600 opacity-0 transition hover:bg-rose-100 group-hover:opacity-100"
                  onClick={() => setDeleteTarget(item)}
                  type="button"
                >
                  Hapus
                </button>
              )}
            </div>
          ))}
          {items.length === 0 && <EmptyState text="Belum ada tugas." />}
        </div>
      </section>

      <AppDialog
        cancelLabel="Batal"
        confirmLabel={deleting ? "Menghapus..." : "Hapus"}
        description={`Tugas "${deleteTarget?.judul_tugas ?? ""}" akan dihapus permanen.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        open={Boolean(deleteTarget)}
        title="Hapus tugas?"
        tone="danger"
      />
    </>
  );
}

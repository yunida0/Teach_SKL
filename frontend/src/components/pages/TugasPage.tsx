"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Category, PengumpulanTugas, Tugas } from "@/types";
import { PHP_BASE, readJson, uploadWithProgress } from "@/lib/api";
import { subjects, subjectsByLevel } from "@/lib/utils";
import { ListCard } from "@/components/ui/ListCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppDialog } from "@/components/ui/AppDialog";
import { CustomSelect } from "@/components/ui/CustomSelect";

function MapelInput({ name, defaultValue = "", subjectList }: { name: string; defaultValue?: string; subjectList?: string[] }) {
  const list = subjectList ?? subjects;
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

function TugasForm({ csrfToken, tugas, onSaved, onCancel }: { csrfToken: string; tugas?: Tugas | null; onSaved: () => void; onCancel: () => void }) {
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tingkat, setTingkat] = useState(tugas?.tingkat && ["TK", "SD", "SMP"].includes(tugas.tingkat) ? tugas.tingkat : "SD");
  const mapelList = subjectsByLevel[tingkat] ?? subjects;
  const isEdit = Boolean(tugas);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const data = new FormData(e.currentTarget);
      data.set("csrf_token", csrfToken);
      if (tugas) data.set("id", String(tugas.id));
      setProgress(1);
      let json: { success?: boolean; error?: string } | null = null;
      try {
        json = await uploadWithProgress(`${PHP_BASE}/backend/${isEdit ? "actions/update-tugas" : "uploads/tugas"}`, data, setProgress);
      } catch (error) {
        json = error as { success?: boolean; error?: string };
      }
      if (json?.success) {
        setMsg(isEdit ? "Tugas berhasil diperbarui." : "Tugas berhasil ditambahkan.");
        (e.target as HTMLFormElement).reset();
        window.setTimeout(() => setProgress(0), 900);
        onSaved();
        window.setTimeout(onCancel, 500);
      } else {
        setMsg(json?.error ?? "Gagal menyimpan tugas.");
        setProgress(0);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div className="border-b border-sky-100 pb-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Form Tugas</p>
        <h2 className="title-font text-2xl font-black text-slate-950">{isEdit ? "Edit Tugas" : "Tambah Tugas"}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CustomSelect name="tingkat" value={tingkat} onChange={setTingkat} options={["TK","SD","SMP"].map(t => ({ value: t, label: t }))} placeholder="Tingkat" />
        <MapelInput name="pelajaran" key={`${tingkat}-${tugas?.id ?? "new"}`} defaultValue={tugas?.pelajaran ?? ""} subjectList={mapelList} />
      </div>
      <input className="field" defaultValue={tugas?.judul_tugas ?? ""} maxLength={200} name="judul_tugas" placeholder="Judul tugas" required />
      <textarea className="field min-h-[80px] resize-y" defaultValue={tugas?.deskripsi ?? ""} name="deskripsi" placeholder="Deskripsi tugas..." required />
      <div>
        <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Deadline</label>
        <input className="field" defaultValue={String(tugas?.deadline ?? "").slice(0, 10)} name="deadline" required type="date" />
      </div>
      <input accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.jpg,.png" className="field" name="file" type="file" />
      {isEdit && <p className="text-xs font-bold text-slate-400">Kosongkan file jika tidak ingin mengganti lampiran tugas.</p>}
      {msg && (
        <p className={`text-sm font-black ${msg.includes("berhasil") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>
      )}
      {progress > 0 && (
        <div className="rounded-2xl bg-sky-50 p-3">
          <div className="flex items-center justify-between text-xs font-black text-sky-700"><span>Upload file</span><span>{progress}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <button className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-600" onClick={onCancel} type="button">Batal</button>
        <button className="btn-primary px-6 py-3 disabled:opacity-50" disabled={loading} type="submit">
          {loading ? "Menyimpan..." : isEdit ? "Perbarui Tugas" : "Simpan Tugas"}
        </button>
      </div>
    </form>
  );
}

function KumpulkanTugasForm({ csrfToken, tugas, onSubmitted }: { csrfToken: string; tugas: Tugas; onSubmitted: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState(0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const data = new FormData(e.currentTarget);
    data.set("csrf_token", csrfToken);
    data.set("tugas_id", String(tugas.id));
    setProgress(1);
    try {
      let json: { success?: boolean; error?: string } | null = null;
      try {
        json = await uploadWithProgress(`${PHP_BASE}/backend/uploads/pengumpulan-tugas`, data, setProgress);
      } catch (error) {
        json = error as { success?: boolean; error?: string };
      }
      if (json?.success) {
        setMsg("Jawaban berhasil dikumpulkan.");
        (e.currentTarget as HTMLFormElement).reset();
        window.setTimeout(() => setProgress(0), 900);
        onSubmitted();
      } else {
        setMsg(json?.error ?? "Gagal mengumpulkan jawaban.");
        setProgress(0);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
      <button className="text-sm font-black text-sky-700" onClick={() => setOpen((v) => !v)} type="button">
        {open ? "Tutup Form" : "Kumpulkan Jawaban"}
      </button>
      {open && (
        <form className="mt-3 grid gap-2" onSubmit={submit}>
          <textarea className="field min-h-[70px] resize-y" name="catatan" placeholder="Catatan untuk pengajar (opsional)" />
          <input accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,.webp" className="field" name="file" required type="file" />
          {progress > 0 && (
            <div className="rounded-2xl bg-white p-3">
              <div className="flex items-center justify-between text-xs font-black text-sky-700"><span>Upload jawaban</span><span>{progress}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-50"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} /></div>
            </div>
          )}
          {msg && <p className={`text-sm font-black ${msg.includes("berhasil") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>}
          <button className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50" disabled={loading} type="submit">
            {loading ? "Mengirim..." : "Kirim Jawaban"}
          </button>
        </form>
      )}
    </div>
  );
}

function NilaiPengumpulanForm({ csrfToken, item, onSaved }: { csrfToken: string; item: PengumpulanTugas; onSaved: () => void }) {
  const [nilai, setNilai] = useState(String(item.nilai ?? ""));
  const [feedback, setFeedback] = useState(item.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const data = new FormData();
    data.set("csrf_token", csrfToken);
    data.set("id", String(item.id));
    data.set("nilai", nilai);
    data.set("feedback", feedback);
    try {
      const res = await fetch(`${PHP_BASE}/backend/actions/nilai-pengumpulan-tugas`, { method: "POST", body: data, credentials: "include" });
      const json = await res.json().catch(() => ({ success: false }));
      if (json.success) {
        setMsg("Nilai tersimpan.");
        onSaved();
      } else {
        setMsg(json.error ?? "Gagal menyimpan nilai.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-3 grid gap-2 rounded-2xl bg-slate-50 p-3" onSubmit={submit}>
      <div className="grid gap-2 sm:grid-cols-[100px_1fr_auto]">
        <input className="field" max="100" min="0" onChange={(e) => setNilai(e.target.value)} placeholder="0-100" required type="number" value={nilai} />
        <input className="field" onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback" value={feedback} />
        <button className="btn-primary px-4 py-2 text-sm disabled:opacity-50" disabled={saving} type="submit">{saving ? "..." : "Simpan"}</button>
      </div>
      {msg && <p className={`text-xs font-black ${msg.includes("tersimpan") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>}
    </form>
  );
}

export function TugasPage({ category, csrfToken }: { category: Category; csrfToken: string }) {
  const [items, setItems]         = useState<Tugas[]>([]);
  const [submissions, setSubmissions] = useState<PengumpulanTugas[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Tugas | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tugas | null>(null);
  const [submissionTarget, setSubmissionTarget] = useState<Tugas | null>(null);
  const [deleting, setDeleting]   = useState(false);

  function load() {
    readJson<Tugas[]>(`${PHP_BASE}/backend/data/tugas?ts=${Date.now()}`).then(setItems).catch(() => setItems([]));
    readJson<PengumpulanTugas[]>(`${PHP_BASE}/backend/data/pengumpulan-tugas?ts=${Date.now()}`).then(setSubmissions).catch(() => setSubmissions([]));
  }
  useEffect(() => { load(); }, []);

  const isPengajar = category === "pengajar";
  const isMurid = category === "murid";

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
      <section className="grid items-start gap-6">
        <div className="grid content-start gap-3">
          {isPengajar && (
            <div className="flex items-center justify-between">
              <h2 className="title-font text-xl font-black text-slate-800">Daftar Tugas</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{items.length} tugas</span>
                <button className="btn-primary px-4 py-2 text-xs" onClick={() => { setEditTarget(null); setFormOpen(true); }} type="button">+ Tambah Tugas</button>
              </div>
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
                <div className="absolute right-3 top-3 flex gap-2 sm:opacity-0 sm:group-hover:opacity-100">
                  <button className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm transition hover:bg-emerald-50" onClick={() => setSubmissionTarget(item)} type="button">Pengerjaan</button>
                  <button className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-sky-700 shadow-sm transition hover:bg-sky-50" onClick={() => { setEditTarget(item); setFormOpen(true); }} type="button">Edit</button>
                  <button className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-600 transition hover:bg-rose-100" onClick={() => setDeleteTarget(item)} type="button">Hapus</button>
                </div>
              )}
              {isMurid && <KumpulkanTugasForm csrfToken={csrfToken} tugas={item} onSubmitted={load} />}
            </div>
          ))}
          {items.length === 0 && <EmptyState text="Belum ada tugas." />}
        </div>
      </section>

      {isMurid && submissions.length > 0 && (
        <section className="mt-6 grid gap-3 rounded-[1.5rem] border border-sky-100 bg-white p-4 shadow-sm md:p-6">
          <h2 className="title-font text-xl font-black text-slate-800">Riwayat Pengumpulan</h2>
          {submissions.map((item) => (
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4" key={item.id}>
              <p className="text-sm font-black text-slate-900">{item.judul_tugas}</p>
              <p className="text-xs font-bold text-slate-500">Dikumpulkan: {item.tanggal_upload ?? "-"}</p>
              {item.file_path && <a className="mt-2 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-black text-sky-700" href={`${PHP_BASE}/${item.file_path}`} rel="noreferrer" target="_blank">Lihat File</a>}
              {item.nilai !== null && item.nilai !== undefined ? <p className="mt-2 text-sm font-black text-emerald-700">Nilai: {item.nilai}</p> : <p className="mt-2 text-sm font-black text-amber-600">Belum dinilai</p>}
              {item.feedback && <p className="mt-1 text-sm font-semibold text-slate-600">Feedback: {item.feedback}</p>}
            </article>
          ))}
        </section>
      )}

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
      {isPengajar && formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={editTarget ? "Edit tugas" : "Tambah tugas"}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <TugasForm csrfToken={csrfToken} tugas={editTarget} onSaved={load} onCancel={() => { setFormOpen(false); setEditTarget(null); }} />
          </div>
        </div>
      )}
      {isPengajar && submissionTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Pengumpulan jawaban">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Pengerjaan Tugas</p>
                <h2 className="title-font text-2xl font-black text-slate-950">{submissionTarget.judul_tugas ?? "Tugas"}</h2>
                <p className="text-sm font-bold text-slate-500">{submissionTarget.pelajaran ?? "-"} · Deadline {submissionTarget.deadline ?? "-"}</p>
              </div>
              <button className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600" onClick={() => setSubmissionTarget(null)} type="button">Tutup</button>
            </div>
            <div className="grid gap-3">
              {submissions.filter((item) => String(item.tugas_id) === String(submissionTarget.id)).map((item) => (
                <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" key={item.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">{item.nama_murid} @{item.username}</p>
                      <p className="text-xs font-bold text-slate-500">Dikumpulkan: {item.tanggal_upload ?? "-"}</p>
                      {item.catatan && <p className="mt-2 text-sm font-semibold text-slate-600">{item.catatan}</p>}
                      {item.nilai !== null && item.nilai !== undefined && <p className="mt-2 text-sm font-black text-emerald-700">Nilai: {item.nilai}</p>}
                    </div>
                    {item.file_path && <a className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 hover:bg-sky-100" href={`${PHP_BASE}/${item.file_path}`} rel="noreferrer" target="_blank">Lihat Jawaban</a>}
                  </div>
                  <NilaiPengumpulanForm csrfToken={csrfToken} item={item} onSaved={load} />
                </article>
              ))}
              {submissions.filter((item) => String(item.tugas_id) === String(submissionTarget.id)).length === 0 && <EmptyState text="Belum ada pengumpulan jawaban untuk tugas ini." />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

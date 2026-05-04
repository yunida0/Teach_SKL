"use client";

import { FormEvent, useState } from "react";
import type { Quiz } from "@/types";
import { PHP_BASE } from "@/lib/api";
import { AppDialog } from "@/components/ui/AppDialog";

type QuizMode = "quiz" | "ujian";
type QuizMeta = {
  type: QuizMode;
  duration: number;
  deadline: string;
  attempts: number;
  shuffle: boolean;
  showResult: boolean;
  cleanTitle: string;
};

const defaultMeta: Omit<QuizMeta, "cleanTitle"> = {
  type: "quiz",
  duration: 0,
  deadline: "",
  attempts: 1,
  shuffle: false,
  showResult: true,
};

const MAX_SUBJECT_LENGTH = 255;

function encodeMetaValue(value: string) {
  return value.replace(/[|\]\\]/g, " ").trim();
}

export function parseSubject(raw: string): QuizMeta {
  const advanced = raw.match(/^\[(UJIAN|QUIZ)(?:\|([^\]]*))?\]\s*(.*)$/i);
  if (advanced) {
    const params = new URLSearchParams((advanced[2] ?? "").replace(/\|/g, "&"));
    return {
      type: advanced[1].toLowerCase() as QuizMode,
      duration: Number(params.get("dur") ?? 0) || 0,
      deadline: params.get("due") ?? "",
      attempts: advanced[1].toLowerCase() === "ujian" ? 1 : Math.max(1, Number(params.get("try") ?? 1) || 1),
      shuffle: params.get("shuffle") === "1",
      showResult: params.get("result") !== "0",
      cleanTitle: advanced[3],
    };
  }

  const match = raw.match(/^\[(UJIAN|QUIZ)(?::(\d+))?\]\s*(.*)$/i);
  if (match) {
    return {
      ...defaultMeta,
      type: match[1].toLowerCase() as QuizMode,
      duration: match[2] ? parseInt(match[2], 10) : 0,
      attempts: match[1].toLowerCase() === "ujian" ? 1 : defaultMeta.attempts,
      cleanTitle: match[3],
    };
  }
  return { ...defaultMeta, cleanTitle: raw };
}

export function formatSubject(meta: Omit<QuizMeta, "cleanTitle">, title: string) {
  // Metadata quiz masih ditaruh di kolom pelajaran agar tabel lama tetap aman
  // dipakai saat demo tanpa migrasi besar.
  const attempts = meta.type === "ujian" ? 1 : Math.max(1, Number(meta.attempts) || 1);
  const params = [
    `dur=${Math.max(0, Number(meta.duration) || 0)}`,
    meta.deadline ? `due=${encodeMetaValue(meta.deadline)}` : "",
    `try=${attempts}`,
    `shuffle=${meta.shuffle ? "1" : "0"}`,
    `result=${meta.showResult ? "1" : "0"}`,
  ].filter(Boolean).join("|");
  const prefix = `[${meta.type.toUpperCase()}|${params}] `;
  const titleLimit = Math.max(1, MAX_SUBJECT_LENGTH - prefix.length);
  return `${prefix}${title.trim().slice(0, titleLimit)}`;
}

function formatDeadline(deadline: string) {
  if (!deadline) return "Tanpa deadline";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return deadline.replace("T", " ");
  return date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────
// Home: Tabel quiz (dinamis)
// ─────────────────────────────────────────────────────────────────────────
export function QuizHomeTable({
  allItems,
  onOpen,
  onRefresh,
  csrfToken,
}: {
  allItems: Quiz[];
  onOpen: (subject: string) => void;
  onRefresh: () => Promise<Quiz[]>;
  csrfToken: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState<{ oldSubject: string; newTitle: string } & Omit<QuizMeta, "cleanTitle"> | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<QuizMode>("quiz");
  const [newDuration, setNewDuration] = useState(0);
  const [newDeadline, setNewDeadline] = useState("");
  const [newAttempts, setNewAttempts] = useState(1);
  const [newShuffle, setNewShuffle] = useState(false);
  const [newShowResult, setNewShowResult] = useState(true);
  const [notice, setNotice] = useState<{ title: string; description: string } | null>(null);

  const subjectStats = allItems.reduce<Record<string, { count: number; choices: number; trueFalse: number }>>((acc, q) => {
    if (!q.pelajaran) return acc;
    const current = acc[q.pelajaran] ?? { count: 0, choices: 0, trueFalse: 0 };
    current.count += 1;
    if (q.tipe === "benar_salah") current.trueFalse += 1;
    else current.choices += 1;
    acc[q.pelajaran] = current;
    return acc;
  }, {});
  const uniqueSubjects = Object.keys(subjectStats);
  const effectiveNewAttempts = newType === "ujian" ? 1 : newAttempts;
  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const fullTitle = formatSubject({ type: newType, duration: newDuration, deadline: newDeadline, attempts: effectiveNewAttempts, shuffle: newShuffle, showResult: newShowResult }, newTitle);
    onOpen(fullTitle);
    setShowModal(false);
    setNewTitle("");
    setNewType("quiz");
    setNewDuration(0);
    setNewDeadline("");
    setNewAttempts(1);
    setNewShuffle(false);
    setNewShowResult(true);
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!editModal || !editModal.newTitle.trim()) return;
    
    const fullNewTitle = formatSubject(editModal, editModal.newTitle);
    if (fullNewTitle === editModal.oldSubject) {
      setEditModal(null);
      return;
    }

    const fd = new FormData();
    fd.set("csrf_token", csrfToken);
    fd.set("old_pelajaran", editModal.oldSubject);
    fd.set("new_pelajaran", fullNewTitle);

    try {
      const res = await fetch(`${PHP_BASE}/backend/actions/rename_quiz_subject.php`, { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (json.success) {
        await onRefresh();
      } else {
        setNotice({ title: "Gagal mengubah quiz", description: json.error || "Gagal mengubah data quiz." });
      }
    } catch {
      setNotice({ title: "Server tidak terhubung", description: "Gagal menghubungi server. Coba lagi beberapa saat." });
    } finally {
      setEditModal(null);
    }
  }

  return (
    <div className="pb-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="m-0 text-2xl font-black tracking-tight text-slate-950">Bank Quiz & Ujian</h2>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary px-5 py-2.5 text-sm">
          + Tambah Quiz
        </button>
      </div>

      {uniqueSubjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center">
          <h3 className="m-0 text-xl font-black text-slate-950">Belum ada quiz</h3>
          <p className="mx-auto mt-2 mb-5 max-w-md text-sm font-semibold leading-relaxed text-slate-500">Tambah quiz untuk mulai membuat soal.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary px-5 py-3 text-sm">Tambah Quiz Pertama</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {uniqueSubjects.map((subject) => {
            const stats = subjectStats[subject];
            const { type, duration, deadline, attempts, shuffle, showResult, cleanTitle } = parseSubject(subject);
            const isUjian = type === "ujian";

            return (
              <article key={subject} className="group rounded-[1.5rem] border border-slate-200/80 bg-white/88 p-4 shadow-sm shadow-slate-900/5 transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-900/7">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <button type="button" onClick={() => onOpen(subject)} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black ${isUjian ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-700"}`}>{isUjian ? "U" : "Q"}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="m-0 truncate text-lg font-black tracking-tight text-slate-950">{cleanTitle}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${isUjian ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100" : "bg-sky-50 text-sky-700 ring-1 ring-sky-100"}`}>{isUjian ? "Ujian" : "Quiz"}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                          <span>{duration > 0 ? `${duration} menit` : "Tanpa timer"}</span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span>Deadline: {formatDeadline(deadline)}</span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span>{attempts}x percobaan</span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span>{stats.choices} PG · {stats.trueFalse} Benar/Salah</span>
                          {shuffle && <><span className="h-1 w-1 rounded-full bg-slate-300" /><span>Acak soal</span></>}
                          {!showResult && <><span className="h-1 w-1 rounded-full bg-slate-300" /><span>Hasil disembunyikan</span></>}
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <div className="rounded-2xl bg-slate-50 px-4 py-2 text-center ring-1 ring-slate-100">
                      <p className="m-0 text-xl font-black text-slate-950">{stats.count}</p>
                      <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Soal</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                  <button onClick={() => setEditModal({ oldSubject: subject, newTitle: cleanTitle, type, duration, deadline, attempts, shuffle, showResult })} type="button"
                    className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700" title="Edit Judul">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </button>
                  <button onClick={() => onOpen(subject)} type="button"
                    className="btn-primary px-4 py-2.5 text-xs inline-flex items-center gap-2" title="Kelola Soal">
                    <span>Kelola</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="glass-card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] p-6 shadow-2xl">
            <h3 className="m-0 mb-1 text-xl font-black text-slate-900">Tambah Quiz Baru</h3>
            <p className="m-0 mb-5 text-sm font-semibold text-slate-500">Lengkapi pengaturan quiz, deadline, dan aturan pengerjaan.</p>
            
            <div className="mb-4">
              <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Nama Quiz</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} required autoFocus placeholder="Contoh: Matematika Dasar / UTS Sejarah" className="field" />
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Durasi (Menit)</label>
                <input type="number" min="0" value={newDuration} onChange={e => setNewDuration(parseInt(e.target.value) || 0)} placeholder="0" className="field" />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Deadline</label>
                <input type="datetime-local" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} className="field" />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Percobaan</label>
                <input type="number" min="1" max="10" value={effectiveNewAttempts} disabled={newType === "ujian"} onChange={e => setNewAttempts(parseInt(e.target.value) || 1)} className="field disabled:bg-slate-100 disabled:text-slate-400" />
                {newType === "ujian" && <p className="mt-1 text-[10px] font-bold text-rose-500">Ujian selalu 1x percobaan.</p>}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Jenis / Tipe</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewType("quiz")} className={`flex-1 py-2.5 px-3 rounded-xl border-2 font-black text-xs transition-all ${newType === "quiz" ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                  Quiz Latihan
                </button>
                <button type="button" onClick={() => { setNewType("ujian"); setNewAttempts(1); }} className={`flex-1 py-2.5 px-3 rounded-xl border-2 font-black text-xs transition-all ${newType === "ujian" ? 'border-rose-600 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                  Ujian (Berproteksi)
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 font-bold leading-relaxed">
                {newType === "ujian" ? "Siswa tidak dapat berpindah/menutup tab selama ujian berlangsung." : "Siswa bebas mengerjakan tanpa batasan."}
              </p>
            </div>

            <div className="mb-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setNewShuffle(v => !v)} className={`rounded-2xl border p-3 text-left text-xs font-black transition ${newShuffle ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-500"}`}>
                Acak urutan soal
                <span className="mt-1 block text-[11px] font-semibold">{newShuffle ? "Aktif" : "Nonaktif"}</span>
              </button>
              <button type="button" onClick={() => setNewShowResult(v => !v)} className={`rounded-2xl border p-3 text-left text-xs font-black transition ${newShowResult ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
                Tampilkan hasil ke murid
                <span className="mt-1 block text-[11px] font-semibold">{newShowResult ? "Ya" : "Disembunyikan"}</span>
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl font-black text-slate-500 hover:bg-slate-100 text-sm">Batal</button>
              <button type="submit" className="btn-primary px-5 py-2.5 text-sm">Buat Quiz →</button>
            </div>
          </form>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleRename} className="glass-card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] p-6 shadow-2xl">
            <h3 className="m-0 mb-1 text-xl font-black text-slate-900">Edit Quiz</h3>
            <p className="m-0 mb-5 text-sm font-semibold text-slate-500">Ubah nama, deadline, timer, dan aturan pengerjaan.</p>
            
            <div className="mb-4">
              <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Nama Quiz</label>
              <input value={editModal.newTitle} onChange={e => setEditModal({ ...editModal, newTitle: e.target.value })} required autoFocus placeholder="Contoh: Matematika Dasar" className="field" />
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Durasi (Menit)</label>
                <input type="number" min="0" value={editModal.duration} onChange={e => setEditModal({ ...editModal, duration: parseInt(e.target.value) || 0 })} placeholder="0" className="field" />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Deadline</label>
                <input type="datetime-local" value={editModal.deadline} onChange={e => setEditModal({ ...editModal, deadline: e.target.value })} className="field" />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Percobaan</label>
                <input type="number" min="1" max="10" value={editModal.type === "ujian" ? 1 : editModal.attempts} disabled={editModal.type === "ujian"} onChange={e => setEditModal({ ...editModal, attempts: parseInt(e.target.value) || 1 })} className="field disabled:bg-slate-100 disabled:text-slate-400" />
                {editModal.type === "ujian" && <p className="mt-1 text-[10px] font-bold text-rose-500">Ujian selalu 1x percobaan.</p>}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Jenis / Tipe</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditModal({ ...editModal, type: "quiz" })} className={`flex-1 py-2.5 px-3 rounded-xl border-2 font-black text-xs transition-all ${editModal.type === "quiz" ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                  Quiz Latihan
                </button>
                <button type="button" onClick={() => setEditModal({ ...editModal, type: "ujian", attempts: 1 })} className={`flex-1 py-2.5 px-3 rounded-xl border-2 font-black text-xs transition-all ${editModal.type === "ujian" ? 'border-rose-600 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                  Ujian (Berproteksi)
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setEditModal({ ...editModal, shuffle: !editModal.shuffle })} className={`rounded-2xl border p-3 text-left text-xs font-black transition ${editModal.shuffle ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-500"}`}>
                Acak urutan soal
                <span className="mt-1 block text-[11px] font-semibold">{editModal.shuffle ? "Aktif" : "Nonaktif"}</span>
              </button>
              <button type="button" onClick={() => setEditModal({ ...editModal, showResult: !editModal.showResult })} className={`rounded-2xl border p-3 text-left text-xs font-black transition ${editModal.showResult ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
                Tampilkan hasil ke murid
                <span className="mt-1 block text-[11px] font-semibold">{editModal.showResult ? "Ya" : "Disembunyikan"}</span>
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2.5 rounded-xl font-black text-slate-500 hover:bg-slate-100 text-sm">Batal</button>
              <button type="submit" className="btn-primary px-5 py-2.5 text-sm">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      )}
      <AppDialog
        open={Boolean(notice)}
        title={notice?.title ?? "Terjadi kendala"}
        description={notice?.description}
        tone="warning"
        confirmLabel="Mengerti"
        onConfirm={() => setNotice(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Editor: Split layout — Daftar Soal (kiri) | Tambah/Edit Soal (kanan)
// ─────────────────────────────────────────────────────────────────────────
function QuizForm({
  quiz,
  subject,
  csrfToken,
  isNew,
  onSaved,
}: {
  quiz?: Quiz;
  subject: string;
  csrfToken: string;
  isNew: boolean;
  onSaved: () => void;
}) {
  const [soal, setSoal]         = useState(quiz?.soal ?? "");
  const [tipe, setTipe]         = useState(quiz?.tipe ?? "pilihan_ganda");
  const [poin, setPoin]         = useState("10");
  const [opsiA, setOpsiA]       = useState(quiz?.opsi_a ?? "");
  const [opsiB, setOpsiB]       = useState(quiz?.opsi_b ?? "");
  const [opsiC, setOpsiC]       = useState(quiz?.opsi_c ?? "");
  const [opsiD, setOpsiD]       = useState(quiz?.opsi_d ?? "");
  const [jawaban, setJawaban]   = useState(quiz?.jawaban_benar ?? "A");
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState<{text:string;ok:boolean}|null>(null);

  const keys = tipe === "pilihan_ganda" ? ["A","B","C","D"] : ["A","B"];
  const opsiMap: Record<string,string> = { A: opsiA, B: opsiB, C: opsiC, D: opsiD };
  const setMap: Record<string,(v:string)=>void> = { A: setOpsiA, B: setOpsiB, C: setOpsiC, D: setOpsiD };
  const opsiOptions = keys.map(k => ({ k, label: `Opsi ${k}` }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const fd = new FormData();
    fd.set("csrf_token", csrfToken);
    fd.set("pelajaran", subject);
    fd.set("soal", soal);
    fd.set("tipe", tipe);
    fd.set("opsi_a", opsiA); fd.set("opsi_b", opsiB);
    fd.set("opsi_c", tipe === "pilihan_ganda" ? opsiC : "");
    fd.set("opsi_d", tipe === "pilihan_ganda" ? opsiD : "");
    fd.set("jawaban_benar", jawaban);
    if (!isNew) fd.set("id", String(quiz!.id));
    const url = isNew ? `${PHP_BASE}/backend/actions/tambah_quiz.php` : `${PHP_BASE}/backend/actions/update_quiz.php`;
    try {
      const res = await fetch(url, { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setMsg({ text: isNew ? "Soal berhasil ditambahkan!" : "Soal berhasil diperbarui!", ok: true });
        if (isNew) { setSoal(""); setOpsiA(""); setOpsiB(""); setOpsiC(""); setOpsiD(""); setJawaban("A"); }
        onSaved();
      } else { setMsg({ text: json.error ?? "Gagal menyimpan.", ok: false }); }
    } catch { setMsg({ text: "Gagal menyimpan.", ok: false }); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Form Soal</p>
          <h3 className="m-0 mt-1 text-xl font-black tracking-tight text-slate-950">
            {isNew ? "Tambah Soal Baru" : "Edit Soal"}
          </h3>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">10 poin</span>
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Pertanyaan <span className="text-rose-500">*</span></label>
        <textarea value={soal} onChange={e => setSoal(e.target.value)} required
          placeholder="Tulis pertanyaan di sini..."
          className="field min-h-[110px] resize-y leading-relaxed" />
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Tipe</label>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-100">
          {[{ v: "pilihan_ganda", l: "Pilihan Ganda" }, { v: "benar_salah", l: "Benar / Salah" }].map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => { setTipe(v); if (v === "benar_salah" && !["A","B"].includes(jawaban)) setJawaban("A"); }}
              className={`rounded-xl border px-3 py-2.5 text-xs font-black transition-all ${tipe === v ? 'border-sky-200 bg-white text-sky-700 shadow-sm' : 'border-transparent bg-transparent text-slate-500 hover:text-slate-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Poin</label>
        <input type="number" value={poin} onChange={e => setPoin(e.target.value)} min="1" className="field w-24" />
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Opsi Jawaban</label>
        <div className="flex flex-col gap-2.5">
          {opsiOptions.map(({ k, label }) => (
            <div key={k} className="flex items-center gap-2">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-black ${jawaban === k ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-slate-50 text-slate-500 ring-1 ring-slate-100"}`}>{k}</span>
              <input value={opsiMap[k]} onChange={e => setMap[k](e.target.value)}
                placeholder={label} required={k === "A" || k === "B"}
                className="field" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1.5">Jawaban Benar</label>
        <select value={jawaban} onChange={e => setJawaban(e.target.value)} className="field cursor-pointer font-bold text-sky-900">
          {keys.map(k => (
            <option key={k} value={k}>Opsi {k}{opsiMap[k] ? ` — ${opsiMap[k]}` : ""}</option>
          ))}
        </select>
      </div>

      {msg && (
        <div className={`py-3 px-4 rounded-xl text-sm font-black ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {msg.text}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="btn-primary w-full py-3.5 text-sm mt-2">
        {loading ? "Menyimpan..." : isNew ? "Simpan Soal" : "Perbarui Soal"}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function QuizEditor({
  subject,
  allItems,
  csrfToken,
  onBack,
  onRefresh,
}: {
  subject: string;
  allItems: Quiz[];
  csrfToken: string;
  onBack: () => void;
  onRefresh: () => Promise<Quiz[]>;
}) {
  const quizzes = allItems.filter(q => q.pelajaran === subject);
  const [activeId, setActiveId] = useState<number | string | "new">(() => quizzes[0]?.id ?? "new");
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);

  const { type, cleanTitle } = parseSubject(subject);
  const isUjian = type === "ujian";

  const activeQuiz = activeId !== "new" ? quizzes.find(q => String(q.id) === String(activeId)) : undefined;
  const resolvedActiveId = activeId !== "new" && activeQuiz ? activeId : "new";
  const isNew = resolvedActiveId === "new";

  async function refreshAfterSave() {
    const latest = await onRefresh();
    if (isNew) {
      const added = latest.find(q => q.pelajaran === subject);
      setActiveId(added?.id ?? "new");
      return;
    }
    setActiveId(activeQuiz?.id ?? activeId);
  }

  async function handleDelete(quiz: Quiz) {
    const fd = new FormData();
    fd.set("csrf_token", csrfToken); fd.set("id", String(quiz.id));
    const res = await fetch(`${PHP_BASE}/backend/deletes/hapus_quiz.php`, { method: "POST", body: fd, credentials: "include" });
    const json = await res.json().catch(() => ({ success: false }));
    if (json.success) {
      await onRefresh();
      const rem = quizzes.filter(q => String(q.id) !== String(quiz.id));
      setActiveId(rem[0]?.id ?? "new");
    }
    setDeleteTarget(null);
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col">
      {/* Top bar */}
      <div className="shrink-0 rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm shadow-slate-900/5 backdrop-blur">
        <div className="flex items-center gap-4">
        <button onClick={onBack} type="button"
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-500 shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700">
          ← Kembali
        </button>
        <div className="min-w-0">
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Editor Bank Soal</p>
          <h2 className="m-0 flex items-center gap-2 truncate text-xl font-black tracking-tight text-slate-950">
            {cleanTitle}
            {isUjian && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700 ring-1 ring-rose-100">Ujian</span>}
          </h2>
        </div>
        <span className="ml-auto rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-100">
          {quizzes.length} soal
        </span>
        </div>
      </div>

      {/* Split body */}
      <div className="grid flex-1 grid-cols-1 items-start gap-5 py-5 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.82fr)]">
        {/* Kiri: Daftar Soal */}
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="m-0 text-xs font-black uppercase tracking-[0.14em] text-slate-600">Daftar Soal</h4>
            <span className="text-xs font-black text-slate-400">{quizzes.length} soal</span>
          </div>

          {quizzes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
              <p className="m-0 text-sm font-bold text-slate-500">Belum ada soal. Tambah dari form di kanan.</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {quizzes.map((quiz, i) => {
                const active = String(quiz.id) === String(resolvedActiveId);
              return (
                <div key={quiz.id}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${active ? 'border-sky-200 bg-sky-50/80 shadow-sm ring-2 ring-sky-100' : 'border-slate-200/80 bg-white hover:border-sky-200 hover:shadow-sm'}`}
                  onClick={() => setActiveId(quiz.id)}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className={`text-[11px] font-black uppercase tracking-wider ${active ? 'text-sky-700' : 'text-slate-400'}`}>Soal {i + 1} · 10 poin</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setActiveId(quiz.id); }}
                        className={`cursor-pointer rounded-full border px-2.5 py-1 text-[10px] font-black transition-colors ${active ? 'border-sky-200 bg-white text-sky-700' : 'border-sky-100 bg-sky-50 text-sky-600 hover:bg-sky-100'}`}>
                        Edit
                      </button>
                      <button type="button"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(quiz); }}
                      className="cursor-pointer rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-600 transition-colors hover:bg-rose-100">
                      Hapus
                    </button>
                    </div>
                  </div>
                  <p className="m-0 mb-3 text-sm font-bold leading-snug text-slate-800">{quiz.soal}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {[quiz.opsi_a, quiz.opsi_b, quiz.opsi_c, quiz.opsi_d].filter(Boolean).map((opt, idx) => {
                      const k = ["A","B","C","D"][idx];
                      const correct = quiz.jawaban_benar?.toUpperCase() === k;
                      return (
                        <span key={idx} className={`rounded-xl px-2.5 py-2 text-xs ${correct ? 'bg-emerald-50 font-black text-emerald-700 ring-1 ring-emerald-100' : 'bg-slate-50 font-bold text-slate-500'}`}>
                          <span className="inline-block w-4">{k}.</span> {opt} {correct && <span className="ml-1">✓</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tombol tambah soal baru */}
          <button type="button" onClick={() => setActiveId("new")}
            className={`mt-4 w-full rounded-2xl border border-dashed p-3 text-sm font-black transition-all ${isNew ? 'border-sky-300 bg-sky-50 text-sky-700 ring-2 ring-sky-100' : 'border-slate-300 bg-white/60 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'}`}>
            + Tambah Soal Baru
          </button>
        </div>

        {/* Kanan: Form */}
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur lg:sticky lg:top-4">
          <QuizForm
            key={String(resolvedActiveId)}
            quiz={activeQuiz}
            subject={subject}
            csrfToken={csrfToken}
            isNew={isNew}
            onSaved={refreshAfterSave}
          />
        </div>
      </div>
      <AppDialog
        open={Boolean(deleteTarget)}
        title="Hapus soal?"
        description="Soal ini akan dihapus permanen dari quiz."
        tone="danger"
        cancelLabel="Batal"
        confirmLabel="Hapus"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}

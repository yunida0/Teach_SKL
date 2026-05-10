"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, Quiz } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";

import { EmptyState } from "@/components/ui/EmptyState";
import { QuizEditor, QuizHomeTable, parseSubject } from "./QuizEditorTeacher";

type QuizResult = { quizId: number | string; benar: boolean };
type WarningModal = { title: string; message: string; tone: "rose" | "amber" } | null;
type SavedEvaluation = { total: number; answered: number; correct: number; wrong: number; score: number; answers: Array<Quiz & { nilai?: number | string; jawaban_user?: string }> } | null;

// ── Student Quiz Session ──────────────────────────────────────────────────────

function StudentQuizSession({ csrfToken, items }: { csrfToken: string; items: Quiz[] }) {
  const subjectGroups = useMemo(() => {
    const groups = new Map<string, Quiz[]>();
    items.forEach((q) => {
      const key = q.pelajaran ?? "Tanpa Mapel";
      groups.set(key, [...(groups.get(key) ?? []), q]);
    });
    return Array.from(groups.entries());
  }, [items]);

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted]   = useState(false);
  const [currentIndex, setCurrentIndex]       = useState(0);
  const [selected, setSelected]               = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [results, setResults]                 = useState<Record<string, QuizResult>>({});
  const [savedAnswers, setSavedAnswers]       = useState<Record<string, string>>({});
  const [draftAnswers, setDraftAnswers]       = useState<Record<string, string>>({});
  const [finished, setFinished]               = useState(false);
  const [showReview, setShowReview]           = useState(false);
  const [warningModal, setWarningModal]       = useState<WarningModal>(null);
  const [savedEvaluation, setSavedEvaluation] = useState<SavedEvaluation>(null);

  const parsed = selectedSubject ? parseSubject(selectedSubject) : null;
  const isUjian = parsed?.type === "ujian";
  const cleanTitle = parsed?.cleanTitle ?? selectedSubject;
  const timerDuration = parsed?.duration ?? 0;
  const deadline = parsed?.deadline ?? "";
  const attempts = parsed?.attempts ?? 1;
  const kkm = parsed?.kkm ?? 75;
  const shuffle = parsed?.shuffle ?? false;
  const showResult = parsed?.showResult ?? true;
  const navigationMode = parsed?.navigation ?? false;
  const deadlineDate = deadline ? new Date(deadline) : null;
  const [now, setNow] = useState(() => Date.now());
  const deadlinePassed = Boolean(deadlineDate && !Number.isNaN(deadlineDate.getTime()) && now > deadlineDate.getTime());

  const [timeLeft, setTimeLeft]               = useState<number | null>(null);

  useEffect(() => {
    if (!deadline || sessionStarted) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [deadline, sessionStarted]);

  useEffect(() => {
    if (timeLeft === null || finished || !sessionStarted) return;
    if (timeLeft <= 0) {
      queueMicrotask(() => {
        setWarningModal({
          title: "Waktu Habis",
          message: "Waktu pengerjaan sudah selesai. Jawaban yang sudah dikonfirmasi akan disimpan.",
          tone: "amber",
        });
        setFinished(true);
      });
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => (t ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, finished, sessionStarted]);

  // Format MM:SS
  const timerDisplay = timeLeft !== null ? `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}` : null;

  function startSession() {
    if (deadlinePassed) return;
    setSessionStarted(true);
    setTimeLeft(timerDuration > 0 ? timerDuration * 60 : null);
  }

  function formatStudentDeadline(value: string) {
    if (!value) return "Tanpa deadline";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.replace("T", " ");
    return date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  // Ujian protection effect
  useEffect(() => {
    if (!sessionStarted || !isUjian || finished) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarningModal({
          title: "Peringatan Ujian",
          message: "Anda terdeteksi meninggalkan halaman ujian. Ujian dihentikan otomatis sesuai aturan proteksi.",
          tone: "rose",
        });
        setFinished(true);
      }
    };
    
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [sessionStarted, isUjian, finished]);

  function openSubject(subject: string) {
    setSelectedSubject(subject);
    setSessionStarted(false);
    setCurrentIndex(0);
    setSelected("");
    setResults({});
    setSavedAnswers({});
    setDraftAnswers({});
    setFinished(false);
    setShowReview(false);
    setWarningModal(null);
    setSubmitting(false);
    setTimeLeft(null);
    setSavedEvaluation(null);
  }

  const activeQuizzes = useMemo(
    () => subjectGroups.find(([s]) => s === selectedSubject)?.[1] ?? [],
    [selectedSubject, subjectGroups],
  );
  const playable = useMemo(
    () => activeQuizzes.filter((q) => String(q.sudah_dikerjakan ?? 0) !== "1"),
    [activeQuizzes],
  );
  const reviewQuizzes = playable.length > 0 ? playable : activeQuizzes;
  const current   = playable[currentIndex];
  const currentKey = String(current?.id ?? "");
  const currentSelected = navigationMode ? (draftAnswers[currentKey] ?? "") : selected;
  const correct   = Object.values(results).filter((r) => r.benar).length;
  const answered  = navigationMode ? Boolean(draftAnswers[currentKey]) : Boolean(results[currentKey]);
  const ansResult = results[currentKey];

  useEffect(() => {
    if (!selectedSubject || playable.length > 0 || finished) return;
    let active = true;
    const qs = new URLSearchParams({ pelajaran: selectedSubject });
    fetch(`${PHP_BASE}/backend/data/quiz-evaluation?${qs.toString()}`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => { if (active && json.success) setSavedEvaluation(json); })
      .catch(() => { if (active) setSavedEvaluation(null); })
    return () => { active = false; };
  }, [selectedSubject, playable.length, finished]);

  async function confirm() {
    if (!current || !selected || submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("csrf_token", csrfToken);
      fd.set("quiz_id", String(current.id));
      fd.set("jawaban", selected);
      const res  = await fetch(`${PHP_BASE}/backend/actions/jawab_quiz.php`, { method: "POST", body: fd, credentials: "include" });
      const json = await res.json().catch(() => ({}));
      setResults((p)     => ({ ...p, [String(current.id)]: { quizId: current.id, benar: Boolean(json.benar) } }));
      setSavedAnswers((p) => ({ ...p, [String(current.id)]: selected }));
    } finally {
      setSubmitting(false);
    }
  }

  function advance() {
    if (currentIndex + 1 >= playable.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected("");
    }
  }

  if (items.length === 0) return <EmptyState text="Belum ada quiz." />;

  // ── 1. Subject grid ───────────────────────────────────────────────────────
  if (!selectedSubject) {
    const totalQuiz = subjectGroups.length;
    const finishedQuizGroups = subjectGroups.filter(([, quizzes]) => quizzes.length > 0 && quizzes.every((q) => String(q.sudah_dikerjakan ?? 0) === "1")).length;
    const examCount = subjectGroups.filter(([subject]) => parseSubject(subject).type === "ujian").length;
    return (
      <section className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-sm">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Tersedia</p>
            <p className="m-0 mt-1 text-2xl font-black text-slate-950">{totalQuiz}</p>
            <p className="m-0 text-xs font-bold text-slate-500">quiz / ujian</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/85 p-4 shadow-sm">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Progress</p>
            <p className="m-0 mt-1 text-2xl font-black text-emerald-700">{finishedQuizGroups}/{totalQuiz}</p>
            <p className="m-0 text-xs font-bold text-slate-500">quiz / mapel selesai</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white/85 p-4 shadow-sm">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Ujian</p>
            <p className="m-0 mt-1 text-2xl font-black text-rose-700">{examCount}</p>
            <p className="m-0 text-xs font-bold text-slate-500">berproteksi</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {subjectGroups.map(([subject, quizzes]) => {
            const parsedGroup = parseSubject(subject);
            const isUjianGroup = parsedGroup.type === "ujian";
            const groupCleanTitle = parsedGroup.cleanTitle;
            const done      = quizzes.filter((q) => String(q.sudah_dikerjakan ?? 0) === "1").length;
            const remaining = quizzes.length - done;
            return (
              <button
                className="group flex flex-col gap-4 rounded-[1.5rem] border border-sky-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg"
                key={subject}
                onClick={() => openSubject(subject)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black text-white ${isUjianGroup ? 'bg-rose-600' : 'bg-sky-900'}`}>
                    {groupCleanTitle.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-slate-950 flex items-center gap-2 truncate">
                      {groupCleanTitle}
                    </h3>
                    {isUjianGroup && <span className="inline-block mt-1 bg-rose-100 text-rose-700 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-black border border-rose-200">UJIAN PROTECTED</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{quizzes.length} soal</span>
                  {parsedGroup.duration > 0 && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">⏱ {parsedGroup.duration}m</span>}
                  {parsedGroup.deadline && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Deadline {formatStudentDeadline(parsedGroup.deadline)}</span>}
                  {done > 0 && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{done} selesai</span>}
                  {remaining === 0
                    ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">✓ Tuntas</span>
                    : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{remaining} tersisa</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // ── 2. All done ───────────────────────────────────────────────────────────
  if (playable.length === 0 && !finished) {
    const pct = savedEvaluation?.score ?? 0;
    const correctSaved = savedEvaluation?.correct ?? 0;
    const totalSaved = savedEvaluation?.total ?? activeQuizzes.length;
    return (
      <section className="grid place-items-center py-10">
        <div className="w-full max-w-2xl rounded-[1.75rem] border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">✓</div>
          <h2 className="title-font mt-3 text-2xl font-black text-slate-950">{cleanTitle}</h2>
          {!savedEvaluation ? (
            <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Memuat evaluasi pengerjaan...</p>
          ) : (
            <>
              <p className="mt-2 text-sm font-bold text-slate-500">Quiz ini sudah selesai dikerjakan. Berikut evaluasimu.</p>
              <div className="mx-auto mt-5 grid h-28 w-28 place-items-center rounded-full border-4 border-emerald-200 bg-emerald-50">
                <div><p className="m-0 text-3xl font-black text-emerald-800">{pct}%</p><p className="m-0 text-xs font-black text-slate-400">skor</p></div>
              </div>
              <p className="mt-4 text-lg font-black text-slate-800">{correctSaved} dari {totalSaved} benar</p>
              <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-left">
                <p className="m-0 text-sm font-black text-sky-800">Status nilai</p>
                <p className="m-0 mt-1 text-sm font-bold leading-relaxed text-slate-600">
                  {pct >= kkm
                    ? `Nilaimu sudah mencapai KKM ${kkm}. Pertahankan pemahamanmu.`
                    : showResult
                      ? `Nilaimu masih di bawah KKM ${kkm}. Pelajari kembali bagian yang belum tepat melalui review jawaban.`
                      : `Nilaimu masih di bawah KKM ${kkm}. Segera hubungi pengajar untuk evaluasi dan arahan belajar lanjutan.`}
                </p>
              </div>
              {showResult && savedEvaluation && (
                <button className="mt-4 btn-primary px-5 py-3 text-sm" onClick={() => { setResults(Object.fromEntries(savedEvaluation.answers.map((answer) => [String(answer.id), { quizId: answer.id, benar: Number(answer.nilai ?? 0) >= 100 }]))); setSavedAnswers(Object.fromEntries(savedEvaluation.answers.map((answer) => [String(answer.id), answer.jawaban_user ?? ""]))); setSessionStarted(true); setFinished(true); setShowReview(true); }} type="button">Lihat Review Jawaban →</button>
              )}
            </>
          )}
          <button className="mt-3 rounded-full bg-slate-100 px-6 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200" onClick={() => setSelectedSubject(null)} type="button">← Kembali</button>
        </div>
      </section>
    );
  }

  async function submitAll() {
    if (submitting || playable.length === 0) return;
    setSubmitting(true);
    try {
      const nextResults: Record<string, QuizResult> = {};
      const nextAnswers: Record<string, string> = {};
      for (const quiz of playable) {
        const key = String(quiz.id);
        const answer = draftAnswers[key] || "_";
        const fd = new FormData();
        fd.set("csrf_token", csrfToken);
        fd.set("quiz_id", key);
        fd.set("jawaban", answer);
        const res = await fetch(`${PHP_BASE}/backend/actions/jawab_quiz.php`, { method: "POST", body: fd, credentials: "include" });
        const json = await res.json().catch(() => ({}));
        nextResults[key] = { quizId: quiz.id, benar: Boolean(json.benar) };
        nextAnswers[key] = answer;
      }
      setResults(nextResults);
      setSavedAnswers(nextAnswers);
      setFinished(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ── 3. Pre-quiz briefing ──────────────────────────────────────────────────
  if (!sessionStarted) {
    return (
      <section className="grid place-items-center py-4">
        <div className="w-full max-w-lg rounded-[1.75rem] border border-sky-100 bg-white p-5 shadow-sm md:p-7">
          <button className="mb-5 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-200" onClick={() => setSelectedSubject(null)} type="button">
            ← Kembali
          </button>
          <p className={`text-xs font-black uppercase tracking-[0.14em] ${isUjian ? 'text-rose-600' : 'text-sky-600'}`}>
            {isUjian ? "Persiapan Ujian" : "Quiz Latihan"}
          </p>
          <h2 className="title-font mt-1 text-4xl font-black text-slate-950">{cleanTitle}</h2>
          {deadlinePassed && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              Deadline quiz sudah lewat. Quiz tidak bisa dimulai.
            </div>
          )}
          
          {isUjian && (
            <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm">
              <p className="font-black text-rose-800 mb-1 flex items-center gap-2">⚠️ UJIAN BERPROTEKSI</p>
              <p className="text-rose-700 font-bold leading-relaxed m-0">Selama ujian, Anda DILARANG KERAS keluar/pindah tab, atau membuka aplikasi lain. Sistem akan otomatis mensubmit jawaban Anda jika terdeteksi pelanggaran. Klik kanan (Context Menu) juga telah dinonaktifkan.</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className={`rounded-2xl p-4 ${isUjian ? 'bg-rose-50' : 'bg-sky-50'}`}>
              <p className={`text-xs font-black uppercase tracking-wide ${isUjian ? 'text-rose-700' : 'text-sky-700'}`}>Jumlah Soal</p>
              <p className={`mt-1 text-3xl font-black ${isUjian ? 'text-rose-950' : 'text-sky-950'}`}>{playable.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Waktu</p>
              <p className="mt-1 text-3xl font-black text-emerald-900">{timerDuration > 0 ? `${timerDuration}m` : '∞'}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Deadline</p>
              <p className="mt-1 text-sm font-black text-slate-800">{formatStudentDeadline(deadline)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Aturan</p>
              <p className="mt-1 text-sm font-black text-slate-800">{attempts}x percobaan · {shuffle ? "Soal acak" : "Urut"}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
            <p className="mb-2 font-black text-slate-700">Cara bermain</p>
            <ul className="grid gap-1">
              {navigationMode ? <li>• Kamu boleh pindah soal, mengganti jawaban, lalu submit semua di akhir.</li> : <li>• Pilih satu jawaban per soal lalu tekan Konfirmasi.</li>}
              <li>• {navigationMode ? "Benar/salah baru dinilai setelah Submit Semua." : "Soal dikerjakan satu per satu."}</li>
              {isUjian ? <li>• Anda tidak dapat membatalkan/mengulang ujian.</li> : <li>• {showResult ? "Lihat review dan skor setelah selesai." : "Hasil disembunyikan oleh pengajar."}</li>}
            </ul>
          </div>
          <button disabled={deadlinePassed} className={`${isUjian ? 'bg-rose-600 hover:bg-rose-700 text-white font-black rounded-[1.25rem]' : 'btn-primary'} mt-5 w-full py-3.5 text-sm transition-colors disabled:opacity-50`} onClick={startSession} type="button">
            {deadlinePassed ? "Deadline Terlewat" : isUjian ? "Mulai Ujian Sekarang →" : "Mulai Quiz →"}
          </button>
        </div>
      </section>
    );
  }

  // ── 4. Review screen ──────────────────────────────────────────────────────
  if (finished && showReview) {
    return (
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-sky-100 bg-white px-5 py-4 shadow-sm">
          <button className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-200" onClick={() => setShowReview(false)} type="button">
            ← Hasil
          </button>
          <h2 className="title-font text-2xl font-black text-slate-950">Review Jawaban</h2>
          <span className="ml-auto rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{cleanTitle}</span>
        </div>
        <div className="grid gap-3">
          {reviewQuizzes.map((quiz, i) => {
            const result     = results[String(quiz.id)];
            const userAnswer = savedAnswers[String(quiz.id)];
            const opts: [string, string | undefined][] = [
              ["A", quiz.opsi_a], ["B", quiz.opsi_b], ["C", quiz.opsi_c], ["D", quiz.opsi_d],
            ];
            return (
              <article className="rounded-[1.5rem] border border-sky-100 bg-white p-4 shadow-sm" key={quiz.id}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-black text-white ${result?.benar ? "bg-emerald-600" : "bg-rose-500"}`}>
                    {result?.benar ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.7rem] font-black uppercase tracking-wide text-slate-400">Soal {i + 1}</p>
                    <p className="font-black leading-snug text-slate-950">{quiz.soal}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-1.5 border-t border-sky-50 pt-3">
                  {opts.filter(([, t]) => t).map(([lbl, txt]) => {
                    const isUser    = lbl === userAnswer;
                    const isCorrect = lbl === (quiz.jawaban_benar ?? "");
                    return (
                      <div
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm ${
                          isCorrect ? "border-emerald-300 bg-emerald-50"
                          : isUser  ? "border-rose-200 bg-rose-50"
                                    : "border-slate-100 bg-white"
                        }`}
                        key={lbl}
                      >
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-black text-white ${isCorrect ? "bg-emerald-600" : isUser ? "bg-rose-500" : "bg-slate-200"}`}>
                          {lbl}
                        </span>
                        <span className={`flex-1 font-bold ${isCorrect ? "text-emerald-900" : isUser ? "text-rose-800" : "text-slate-400"}`}>{txt}</span>
                        {isCorrect && <span className="text-[0.68rem] font-black text-emerald-700">Jawaban benar</span>}
                        {isUser && !isCorrect && <span className="text-[0.68rem] font-black text-rose-600">Jawabanmu</span>}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  // ── 5. Results screen ─────────────────────────────────────────────────────
  if (finished) {
    const total = reviewQuizzes.length;
    const pct   = total > 0 ? Math.round((correct / total) * 100) : 0;
    const tone  = pct >= 80 ? "emerald" : pct >= 60 ? "sky" : pct >= 40 ? "amber" : "rose";
    const wrongItems = reviewQuizzes.filter((quiz) => results[String(quiz.id)] && !results[String(quiz.id)]?.benar);
    const evaluationTitle = pct >= 80 ? "Bagus, pemahamanmu kuat." : pct >= 60 ? "Cukup baik, tinggal rapikan beberapa bagian." : pct >= 40 ? "Perlu latihan ulang di bagian yang salah." : "Ayo ulangi materi dasar dulu.";
    const evaluationText = pct >= 80
      ? "Pertahankan ritme belajar dan cek kembali soal yang masih keliru agar makin stabil."
      : pct >= 60
        ? "Kamu sudah menangkap sebagian besar materi. Fokuskan belajar pada soal yang belum tepat."
        : pct >= 40
          ? "Nilai belum aman. Baca ulang materi, catat pola soal yang salah, lalu coba lagi jika pengajar mereset pengerjaan."
          : "Jangan buru-buru lanjut. Pelajari ulang contoh soal dan minta arahan pengajar untuk bagian yang belum paham.";
    const ring  = { emerald: "border-emerald-300 bg-emerald-50", sky: "border-sky-300 bg-sky-50", amber: "border-amber-300 bg-amber-50", rose: "border-rose-300 bg-rose-50" }[tone];
    const score = { emerald: "text-emerald-800", sky: "text-sky-800", amber: "text-amber-800", rose: "text-rose-700" }[tone];
    return (
      <section className="grid place-items-center py-4">
        <div className="grid w-full max-w-3xl gap-4">
        <div className="rounded-[1.75rem] border border-sky-100 bg-white p-6 text-center shadow-sm md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">{cleanTitle}</p>
          <h2 className="title-font mt-1 text-3xl font-black text-slate-950">Quiz Selesai!</h2>
          <div className={`mx-auto mt-7 grid h-32 w-32 place-items-center rounded-full border-4 ${ring}`}>
            <div>
              <p className={`text-4xl font-black ${score}`}>{pct}%</p>
              <p className="mt-0.5 text-xs font-black text-slate-400">skor</p>
            </div>
          </div>
          <p className="mt-5 text-xl font-black text-slate-800">
            {correct} <span className="font-bold text-slate-400">dari</span> {total} <span className="font-bold text-slate-400">benar</span>
          </p>
          <div className={`mt-5 rounded-2xl border px-4 py-3 text-left ${ring}`}>
            <p className={`m-0 text-sm font-black ${score}`}>Evaluasi: {evaluationTitle}</p>
            <p className="m-0 mt-1 text-sm font-bold leading-relaxed text-slate-600">{evaluationText}</p>
          </div>
          {showResult && wrongItems.length > 0 && (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-left">
              <p className="m-0 text-xs font-black uppercase tracking-wide text-rose-700">Yang perlu dipelajari lagi</p>
              <ul className="mt-2 grid gap-1.5 pl-4 text-sm font-bold text-rose-800">
                {wrongItems.slice(0, 3).map((quiz) => (
                  <li key={quiz.id}>{quiz.soal}</li>
                ))}
              </ul>
              {wrongItems.length > 3 && <p className="m-0 mt-2 text-xs font-bold text-rose-700">+{wrongItems.length - 3} soal lain ada di review jawaban.</p>}
            </div>
          )}
          <div className="mx-auto mt-6 flex max-w-xs flex-col gap-2.5">
            {showResult ? (
              <button className="btn-primary py-3.5 text-sm" onClick={() => setShowReview(true)} type="button">
                Lihat Review Jawaban →
              </button>
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-500">Review jawaban disembunyikan oleh pengajar.</div>
            )}
            <button className="rounded-full bg-slate-100 py-3.5 text-sm font-black text-slate-600 transition hover:bg-slate-200" onClick={() => setSelectedSubject(null)} type="button">
              Kembali ke Mapel
            </button>
          </div>
        </div>
        </div>
      </section>
    );
  }

  // ── 6. Active quiz screen ─────────────────────────────────────────────────
  if (!current) return <EmptyState text="Soal tidak ditemukan." />;

  const progress = (currentIndex / playable.length) * 100;
  const opts: [string, string | undefined][] = [
    ["A", current.opsi_a], ["B", current.opsi_b], ["C", current.opsi_c], ["D", current.opsi_d],
  ];

  function chooseNavigableAnswer(label: string) {
    setDraftAnswers((prev) => ({ ...prev, [currentKey]: label }));
    if (currentIndex + 1 < playable.length) {
      window.setTimeout(() => setCurrentIndex((index) => index === currentIndex ? index + 1 : index), 180);
    }
  }

  return (
    <section className={`mx-auto grid w-full gap-4 ${navigationMode ? "max-w-5xl" : "max-w-2xl"}`}>
      {warningModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="quiz-warning-title">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/20">
            <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl text-xl ${warningModal.tone === "rose" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
              !
            </div>
            <h3 id="quiz-warning-title" className="m-0 text-xl font-black text-slate-950">{warningModal.title}</h3>
            <p className="mt-2 mb-5 text-sm font-semibold leading-relaxed text-slate-600">{warningModal.message}</p>
            <button
              className={`w-full rounded-full px-5 py-3 text-sm font-black text-white transition ${warningModal.tone === "rose" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-500 hover:bg-amber-600"}`}
              onClick={() => setWarningModal(null)}
              type="button"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
      {/* Progress bar header */}
      <div className="flex items-center gap-3 rounded-[1.5rem] border border-sky-100 bg-white px-4 py-3 shadow-sm">
        <button
          className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-200 active:bg-slate-300"
          onClick={() => setSelectedSubject(null)}
          type="button"
        >
          Keluar
        </button>
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-sky-800 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-sm font-black text-slate-700">
          {currentIndex + 1}<span className="font-bold text-slate-300">/{playable.length}</span>
        </span>
        {timerDisplay && (
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${isUjian ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
            {timerDisplay}
          </span>
        )}
      </div>

      <div className={`grid items-start gap-4 ${navigationMode ? "lg:grid-cols-[minmax(0,1fr)_18rem]" : ""}`}>
      {/* Question card */}
      <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-[0_20px_60px_rgba(16,42,67,0.10)] md:p-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">{cleanTitle} · Soal {currentIndex + 1}</p>
        <h3 className="title-font mt-3 text-xl font-black leading-snug text-slate-950 md:text-2xl">{current.soal}</h3>

        <div className="mt-6 grid gap-2.5">
          {opts.filter(([, txt]) => txt).map(([lbl, txt]) => {
            const isSel     = currentSelected === lbl;
            const isCorrect = !navigationMode && answered && ansResult?.benar  && lbl === currentSelected;
            const isWrong   = !navigationMode && answered && !ansResult?.benar && lbl === currentSelected;
            return (
              <button
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${
                  isCorrect ? "border-emerald-400 bg-emerald-50"
                  : isWrong ? "border-rose-400 bg-rose-50"
                  : isSel   ? "border-sky-700 bg-sky-50"
                            : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40"
                } ${!navigationMode && answered ? "cursor-default" : "cursor-pointer active:scale-[0.99]"}`}
                disabled={(!navigationMode && answered) || submitting}
                key={lbl}
                onClick={() => navigationMode ? chooseNavigableAnswer(lbl) : setSelected(lbl)}
                type="button"
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black transition ${
                  isCorrect ? "bg-emerald-600 text-white"
                  : isWrong ? "bg-rose-500 text-white"
                  : isSel   ? "bg-sky-800 text-white"
                            : "bg-slate-100 text-slate-500"
                }`}>
                  {isCorrect ? "✓" : isWrong ? "✗" : lbl}
                </span>
                <span className={`flex-1 text-sm font-black md:text-base ${
                  isCorrect ? "text-emerald-900"
                  : isWrong ? "text-rose-900"
                  : isSel   ? "text-sky-900"
                            : "text-slate-800"
                }`}>
                  {txt}
                </span>
              </button>
            );
          })}
        </div>

        {!navigationMode && answered && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${ansResult?.benar ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
            {ansResult?.benar ? "✓ Jawaban kamu benar!" : "✗ Jawaban kurang tepat."}
          </div>
        )}

        <div className="mt-5">
          {!navigationMode && !answered ? (
            <button
              className="btn-primary w-full py-3.5 text-sm disabled:opacity-40"
              disabled={!selected || submitting}
              onClick={confirm}
              type="button"
            >
              {submitting ? "Mengirim..." : "Konfirmasi Jawaban →"}
            </button>
          ) : !navigationMode ? (
            <button className="btn-primary w-full py-3.5 text-sm" onClick={advance} type="button">
              {currentIndex + 1 >= playable.length ? "Lihat Hasil →" : "Soal Berikutnya →"}
            </button>
          ) : null}
        </div>
      </article>
      {navigationMode && (
        <aside className="order-first rounded-[1.5rem] border border-sky-100 bg-white p-4 shadow-sm lg:order-none lg:sticky lg:top-4">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Pilih nomor soal</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Hijau berarti sudah terisi. Klik nomor untuk pindah soal.</p>
          <div className="mt-4 grid grid-cols-5 gap-2 lg:grid-cols-4">
            {playable.map((quiz, index) => {
              const key = String(quiz.id);
              const active = index === currentIndex;
              const filled = Boolean(draftAnswers[key]);
              return (
                <button
                  className={`rounded-xl px-3 py-2 text-sm font-black transition ${active ? "bg-sky-900 text-white shadow-sm" : filled ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-slate-50 text-slate-500 hover:bg-sky-100 hover:text-sky-800"}`}
                  disabled={submitting}
                  key={key}
                  onClick={() => setCurrentIndex(index)}
                  type="button"
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <button className="btn-primary mt-4 w-full px-4 py-3 text-sm disabled:opacity-40" disabled={submitting} onClick={submitAll} type="button">{submitting ? "Mengirim..." : "Submit Semua"}</button>
        </aside>
      )}
      </div>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function QuizPage({ category, csrfToken }: { category: Category; csrfToken: string }) {
  const [items, setItems]               = useState<Quiz[]>([]);
  const [editorSubject, setEditorSubject] = useState<string | null>(null);




  function load() {
    return readJson<Quiz[]>(`${PHP_BASE}/backend/data/get_quizzes.php?ts=${Date.now()}`)
      .then((data) => {
        setItems(data);
        return data;
      })
      .catch(() => {
        setItems([]);
        return [];
      });
  }
  useEffect(() => { load(); }, []);

  // ── Pengajar: subject editor ───────────────────────────────────────────────
  if (category === "pengajar") {
    if (editorSubject) {
      return (
        <QuizEditor
          allItems={items}
          csrfToken={csrfToken}
          onBack={() => setEditorSubject(null)}
          onRefresh={load}
          subject={editorSubject}
        />
      );
    }
    return <QuizHomeTable allItems={items} onOpen={setEditorSubject} onRefresh={load} csrfToken={csrfToken} />;
  }

  // ── Murid: quiz session ────────────────────────────────────────────────────
  return <StudentQuizSession csrfToken={csrfToken} items={items} />;
}

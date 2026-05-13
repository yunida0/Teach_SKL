"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Category, MuridListItem, RaportItem } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";
import { CustomSelect } from "@/components/ui/CustomSelect";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function scoreTone(score: number) {
  if (score >= 85) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (score >= 70) return "border-sky-200 bg-sky-50 text-sky-800";
  if (score >= 55) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function StatPill({ label, value, unit = "" }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-black text-slate-800">{value}{unit}</p>
    </div>
  );
}

function RaportCard({ item, index }: { item: RaportItem; index: number }) {
  const monthIndex = Number(item.bulan ?? 1) - 1;
  const finalScore = Number(item.nilai_akhir ?? 0);
  const quizScore = Number(item.nilai_quiz ?? 0);
  const tugasScore = Number(item.nilai_tugas ?? 0);
  const kehadiranScore = Number(item.nilai_kehadiran ?? 0);
  const bonus = Number(item.bonus_poin ?? 0);

  return (
    <article className="rounded-2xl border border-sky-100 bg-white p-3 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-900 text-sm font-black text-white">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">{monthNames[monthIndex] ?? item.bulan} {item.tahun}</p>
          <h3 className="truncate text-base font-black text-slate-950 md:text-lg">{item.nama ?? "Murid"}</h3>
        </div>
        <div className={`shrink-0 rounded-2xl border px-4 py-2 text-center ${scoreTone(finalScore)}`}>
          <p className="text-[0.65rem] font-black uppercase tracking-wide opacity-80">Nilai Akhir</p>
          <p className="text-2xl font-black leading-none">{finalScore}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-sky-50 pt-3 sm:grid-cols-4">
        <StatPill label="Quiz (40%)" value={quizScore} />
        <StatPill label="Tugas (40%)" value={tugasScore} />
        <StatPill label="Kehadiran (20%)" value={kehadiranScore} unit="%" />
        <StatPill label="Bonus / Koreksi" value={bonus > 0 ? `+${bonus}` : bonus} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">Status</p>
          <p className={`font-black ${finalScore >= 70 ? "text-emerald-700" : "text-rose-600"}`}>
            {finalScore >= 70 ? "Tuntas" : "Perlu Dampingi"}
          </p>
        </div>
        {item.catatan && (
          <div className="rounded-xl bg-amber-50 px-3 py-2">
            <p className="text-[0.68rem] font-black uppercase tracking-wide text-amber-500">Catatan</p>
            <p className="text-xs font-semibold text-amber-900 leading-snug">{item.catatan}</p>
          </div>
        )}
      </div>
    </article>
  );
}

function RaportEmptyState({ isPengajar }: { isPengajar: boolean }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-sky-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-2xl font-black text-sky-800">R</div>
      <h3 className="mt-3 text-2xl font-black text-slate-900">Belum ada raport</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
        {isPengajar
          ? "Pilih murid dan bulan di form kiri, lalu klik Generate Raport. Nilai quiz, tugas, dan kehadiran akan dihitung otomatis."
          : "Raport kamu belum digenerate oleh pengajar. Nilai akhir, quiz, tugas, dan kehadiran akan tampil di sini."}
      </p>
    </div>
  );
}

function InputRaportForm({ csrfToken, onSaved }: { csrfToken: string; onSaved: () => void }) {
  const [murids, setMurids] = useState<MuridListItem[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastBreakdown, setLastBreakdown] = useState<null | { quiz: number; tugas: number; kehadiran: number; bonus: number; nilai_akhir: number }>(null);

  useEffect(() => {
    readJson<MuridListItem[]>(`${PHP_BASE}/backend/data/murid-for-absensi`)
      .then(setMurids)
      .catch(() => setMurids([]));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setLastBreakdown(null);
    try {
      const data = new FormData(e.currentTarget);
      data.set("csrf_token", csrfToken);
      const res = await fetch(`${PHP_BASE}/backend/actions/input-raport`, {
        method: "POST",
        body: data,
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        setMsg(`Raport tersimpan. Nilai akhir: ${json.nilai_akhir}`);
        setLastBreakdown({ ...json.breakdown, nilai_akhir: json.nilai_akhir });
        onSaved();
      } else {
        setMsg(json.error ?? "Gagal menyimpan.");
      }
    } finally {
      setLoading(false);
    }
  }

  const thisYear = new Date().getFullYear();

  return (
    <form className="rounded-[1.75rem] border border-sky-100 bg-white p-4 shadow-[0_18px_50px_rgba(16,42,67,0.09)] md:p-6" onSubmit={submit}>
      <div className="mb-4 border-b border-sky-100 pb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Auto dari Quiz + Tugas + Kehadiran</p>
        <h2 className="title-font text-2xl font-black text-slate-950 md:text-3xl">Generate Raport</h2>
      </div>

      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Murid</label>
          <CustomSelect
            name="murid_id"
            required
            options={murids.map(m => ({ value: String(m.id), label: `${m.nama ?? `Murid #${m.id}`} — ${m.tingkat ?? "-"}` }))}
            placeholder="-- Pilih murid --"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Tahun</label>
            <input className="field" defaultValue={thisYear} max={thisYear + 1} min={2020} name="tahun" required type="number" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Bulan</label>
            <CustomSelect
              name="bulan"
              defaultValue={String(new Date().getMonth() + 1)}
              required
              options={monthNames.map((m, i) => ({ value: String(i + 1), label: m }))}
              placeholder="Bulan"
            />
          </div>
        </div>

        <div className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 leading-relaxed">
          Nilai dihitung otomatis: Quiz 40% + Tugas 40% + Kehadiran 20%
        </div>

        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
            Bonus / Koreksi Poin <span className="text-slate-400 normal-case font-semibold">(-30 s/d +30)</span>
          </label>
          <input className="field" defaultValue={0} max={30} min={-30} name="bonus_poin" type="number" />
          <p className="mt-1 text-xs font-semibold text-slate-400">Gunakan untuk nilai partisipasi, sikap, atau koreksi manual.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Catatan untuk Murid <span className="text-slate-400 normal-case font-semibold">(opsional)</span></label>
          <textarea
            className="field resize-none"
            name="catatan"
            placeholder="Contoh: Rajin, perlu tingkatkan kehadiran..."
            rows={2}
          />
        </div>

        {lastBreakdown && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-xs font-black text-emerald-700 mb-1">Breakdown Tersimpan</p>
            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              <div><span className="font-black text-slate-700">{lastBreakdown.quiz}</span><br/><span className="text-slate-400">Quiz</span></div>
              <div><span className="font-black text-slate-700">{lastBreakdown.tugas}</span><br/><span className="text-slate-400">Tugas</span></div>
              <div><span className="font-black text-slate-700">{lastBreakdown.kehadiran}%</span><br/><span className="text-slate-400">Hadir</span></div>
              <div><span className="font-black text-slate-700">{lastBreakdown.bonus > 0 ? `+${lastBreakdown.bonus}` : lastBreakdown.bonus}</span><br/><span className="text-slate-400">Bonus</span></div>
            </div>
            <p className="mt-1 text-center text-sm font-black text-emerald-800">Nilai Akhir: {lastBreakdown.nilai_akhir}</p>
          </div>
        )}

        {msg && !lastBreakdown && (
          <p className={`text-sm font-black ${msg.includes("tersimpan") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>
        )}

        <button className="btn-primary px-6 py-3 disabled:opacity-50" disabled={loading} type="submit">
          {loading ? "Menghitung..." : "Generate & Simpan Raport"}
        </button>
      </div>
    </form>
  );
}

export function RaportPage({ category, csrfToken }: { category: Category; csrfToken: string }) {
  const [items, setItems] = useState<RaportItem[]>([]);

  function load() {
    readJson<RaportItem[]>(`${PHP_BASE}/backend/data/raport`).then(setItems).catch(() => setItems([]));
  }

  useEffect(() => { load(); }, []);

  const isPengajar = category === "pengajar";

  return (
    <section className={`grid items-start gap-6 ${isPengajar ? "xl:grid-cols-[0.8fr_1.2fr]" : ""}`}>
      {isPengajar && <InputRaportForm csrfToken={csrfToken} onSaved={load} />}
      <div className="grid content-start gap-4">
        <div className="rounded-[1.75rem] border border-sky-100 bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">{isPengajar ? "Semua Raport" : "Raport Saya"} ({items.length})</h2>
        </div>
        <div className="grid gap-2">
          {items.map((item, i) => <RaportCard index={i} item={item} key={`${item.murid_id}-${item.tahun}-${item.bulan}-${i}`} />)}
        </div>
        {items.length === 0 && <RaportEmptyState isPengajar={isPengajar} />}
      </div>
    </section>
  );
}

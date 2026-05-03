"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Category, MuridListItem, RaportItem } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function scoreTone(score: number) {
  if (score >= 85) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (score >= 70) return "border-sky-200 bg-sky-50 text-sky-800";
  if (score >= 55) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function RaportCard({ item, index }: { item: RaportItem; index: number }) {
  const monthIndex = Number(item.bulan ?? 1) - 1;
  const finalScore = Number(item.nilai_akhir ?? 0);
  const quizScore = Number(item.nilai_quiz ?? 0);

  return (
    <article className="rounded-2xl border border-sky-100 bg-white p-3 shadow-sm transition hover:border-sky-200 hover:shadow-md" key={`${item.murid_id}-${item.tahun}-${item.bulan}-${index}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-900 text-sm font-black text-white">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">{monthNames[monthIndex] ?? item.bulan} {item.tahun}</p>
          <h3 className="truncate text-base font-black text-slate-950 md:text-lg">{item.nama ?? "Murid"}</h3>
        </div>
        <div className={`shrink-0 rounded-2xl border px-4 py-2 text-center ${scoreTone(finalScore)}`}>
          <p className="text-[0.65rem] font-black uppercase tracking-wide opacity-80">Akhir</p>
          <p className="text-2xl font-black leading-none">{finalScore}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-sky-50 pt-3 text-sm">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">Nilai Quiz</p>
          <p className="font-black text-slate-800">{quizScore}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">Status</p>
          <p className="font-black text-slate-800">{finalScore >= 70 ? "Tuntas" : "Perlu Dampingi"}</p>
        </div>
      </div>
    </article>
  );
}

function RaportEmptyState({ isPengajar }: { isPengajar: boolean }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-sky-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-2xl font-black text-sky-800">R</div>
      <h3 className="title-font mt-3 text-2xl font-black text-slate-900">Belum ada raport</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
        {isPengajar
          ? "Input nilai raport pertama lewat form di sebelah kiri. Setelah tersimpan, datanya akan muncul ringkas per murid di sini."
          : "Raport kamu belum diinput oleh pengajar. Nanti nilai akhir dan nilai quiz akan tampil di sini."}
      </p>
    </div>
  );
}

function InputRaportForm({ csrfToken, onSaved }: { csrfToken: string; onSaved: () => void }) {
  const [murids, setMurids] = useState<MuridListItem[]>([]);
  const [msg, setMsg]       = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    readJson<MuridListItem[]>(`${PHP_BASE}/backend/data/murid-for-absensi`)
      .then(setMurids)
      .catch(() => setMurids([]));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
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
        (e.target as HTMLFormElement).reset();
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
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Form Nilai</p>
        <h2 className="title-font text-2xl font-black text-slate-950 md:text-3xl">Input Raport</h2>
      </div>
      <div className="grid gap-3">
      <select className="field" name="murid_id" required>
        <option value="">-- Pilih murid --</option>
        {murids.map((m) => (
          <option key={m.id} value={m.id}>{m.nama ?? `Murid #${m.id}`} — {m.tingkat ?? "-"}</option>
        ))}
      </select>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Tahun</label>
          <input className="field" defaultValue={thisYear} max={thisYear + 1} min={2020} name="tahun" required type="number" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Bulan</label>
          <select className="field" defaultValue={new Date().getMonth() + 1} name="bulan" required>
            {monthNames.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>
      <p className="text-xs font-bold text-slate-400">Nilai mingguan (0–100 masing-masing):</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((w) => (
          <div key={w}>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Minggu {w}</label>
            <input className="field" defaultValue={0} max={100} min={0} name={`nilai_minggu${w}`} required type="number" />
          </div>
        ))}
      </div>
      {msg && (
        <p className={`text-sm font-black ${msg.includes("tersimpan") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>
      )}
      <button className="btn-primary px-6 py-3 disabled:opacity-50" disabled={loading} type="submit">
        {loading ? "Menyimpan..." : "Simpan Raport"}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="title-font text-2xl font-black text-slate-900">{isPengajar ? "Semua Raport" : "Raport Saya"} ({items.length})</h2>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          {items.map((item, i) => <RaportCard index={i} item={item} key={`${item.murid_id}-${item.tahun}-${item.bulan}-${i}`} />)}
        </div>
        {items.length === 0 && <RaportEmptyState isPengajar={isPengajar} />}
      </div>
    </section>
  );
}

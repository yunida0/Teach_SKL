"use client";

import { useEffect, useState } from "react";
import type { Stats, User } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";
import { greeting } from "@/lib/utils";

export function DashboardHome({ user }: { user: User }) {
  const [stats, setStats] = useState<Stats>({ ebook: "-", tugas: "-", murid: "-", quiz: "-" });

  useEffect(() => {
    let mounted = true;
    const loadStats = () => readJson<Stats | { error: string }>(`${PHP_BASE}/backend/data/stats?ts=${Date.now()}`)
      .then((payload) => {
        if (mounted && !("error" in payload)) setStats(payload);
      })
      .catch(() => undefined);
    loadStats();
    const onFocus = () => loadStats();
    const onVisible = () => { if (!document.hidden) loadStats(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(loadStats, 30_000);
    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  const statCards = [
    { label: "E-Book", value: stats.ebook, detail: "Materi belajar", tone: "bg-sky-500" },
    { label: "Bank Tugas", value: stats.tugas, detail: "Tugas aktif", tone: "bg-emerald-500" },
    { label: "Murid", value: stats.murid, detail: "Terdaftar", tone: "bg-amber-400" },
    { label: "Quiz", value: stats.quiz, detail: "Evaluasi", tone: "bg-cyan-600" },
  ];

  return (
    <div className="grid gap-7">
      <section className="relative overflow-hidden rounded-[1.5rem] bg-sky-900 p-5 text-white shadow-xl md:rounded-[1.7rem] md:p-9">
        <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-white/10" />
        <p className="relative pl-5 text-lg font-black before:absolute before:left-0 before:top-1/2 before:h-2.5 before:w-2.5 before:-translate-y-1/2 before:rounded-full before:bg-amber-300 md:text-2xl">
          {greeting()}
        </p>
        <h2 className="relative mt-2 text-3xl font-black uppercase tracking-tight md:mt-3 md:text-5xl">{user.nama}</h2>
        <p className="relative mt-2 text-sm font-extrabold text-sky-100 md:mt-3 md:text-base">Sekolah Kolong Langit</p>
      </section>

      <article className="rounded-[1.4rem] border border-sky-100 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900 md:text-xl">Statistik Akademik</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">Semester Aktif</span>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {statCards.map((card) => (
            <div className={`rounded-2xl ${card.tone} p-4 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:p-5`} key={card.label}>
              <strong className="block text-3xl leading-none md:text-4xl">{card.value}</strong>
              <span className="mt-2 block text-sm font-black md:text-base">{card.label}</span>
              <small className="mt-2 block text-xs font-bold opacity-90 md:mt-3">{card.detail}</small>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

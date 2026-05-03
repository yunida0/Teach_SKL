"use client";

import { useEffect, useState } from "react";
import type { Ranking } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Category } from "@/types";

export function PointMuridPage({ category }: { category: Category }) {
  const [items, setItems] = useState<Ranking[]>([]);
  const [mine, setMine] = useState<Ranking | null>(null);

  useEffect(() => {
    if (category === "murid") {
      readJson<Ranking>(`${PHP_BASE}/backend/data/ranking?scope=me`)
        .then(setMine)
        .catch(() => setMine({ total_nilai: 0, jumlah_quiz: 0, rata_rata: 0 }));
    } else {
      readJson<Ranking[]>(`${PHP_BASE}/backend/data/ranking`)
        .then(setItems)
        .catch(() => setItems([]));
    }
  }, [category]);

  if (category === "murid") {
    const total = Number(mine?.total_nilai ?? 0);
    const jumlah = Number(mine?.jumlah_quiz ?? 0);
    const rata = Number(mine?.rata_rata ?? 0);
    return (
      <section className="grid gap-4">
        <div className="glass-card rounded-[2rem] p-6">
          <h2 className="m-0 text-3xl font-black tracking-tight text-slate-950">Poin Saya</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-sky-50 p-5">
              <p className="m-0 text-xs font-black uppercase tracking-wide text-sky-700">Total Poin</p>
              <p className="m-0 mt-2 text-4xl font-black text-sky-900">{total}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-5">
              <p className="m-0 text-xs font-black uppercase tracking-wide text-emerald-700">Quiz Selesai</p>
              <p className="m-0 mt-2 text-4xl font-black text-emerald-900">{jumlah}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-5">
              <p className="m-0 text-xs font-black uppercase tracking-wide text-amber-700">Rata-rata</p>
              <p className="m-0 mt-2 text-4xl font-black text-amber-900">{rata.toFixed(1)}</p>
            </div>
          </div>
        </div>
        {jumlah === 0 && <EmptyState text="Kamu belum mengerjakan quiz." />}
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      <div className="glass-card rounded-[2rem] p-5">
        <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-sky-600">Ranking</p>
        <h2 className="m-0 mt-1 text-2xl font-black tracking-tight text-slate-950">Point Murid</h2>
      </div>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <article className="glass-card flex items-center gap-4 rounded-[1.5rem] p-5" key={`${item.nama}-${index}`}>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-lg font-black text-sky-800">
              #{index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-black text-slate-950">{item.nama ?? "Murid"}</h3>
              <p className="text-sm font-bold text-slate-500">{item.jumlah_quiz ?? 0} quiz • Rata-rata {Number(item.rata_rata ?? 0).toFixed(1)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-sky-800">{item.total_nilai ?? 0}</p>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">point</p>
            </div>
          </article>
        ))}
        {items.length === 0 && <EmptyState text="Belum ada point murid." />}
      </div>
    </section>
  );
}

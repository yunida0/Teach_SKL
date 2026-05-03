"use client";

import { useEffect, useState } from "react";
import type { MuridListItem } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";

export function DaftarMuridPage() {
  const [items, setItems] = useState<MuridListItem[]>([]);

  useEffect(() => {
    readJson<MuridListItem[]>(`${PHP_BASE}/backend/data/murid-for-absensi`)
      .then(setItems)
      .catch(() => {
        readJson<MuridListItem[]>(`${PHP_BASE}/backend/data/daftar-murid`)
          .then(setItems)
          .catch(() => setItems([]));
      });
  }, []);

  return (
    <section className="grid gap-5">
      <div className="glass-card rounded-[2rem] p-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-600">Data Murid</p>
        <h2 className="title-font mt-2 text-3xl font-black text-slate-950">Daftar Murid</h2>
        <p className="mt-2 text-slate-600">Daftar murid aktif dari backend API, ditampilkan lewat UI Next.js.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article className="glass-card rounded-[1.5rem] p-5" key={item.id}>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">ID {item.id}</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">{item.nama ?? "Murid"}</h3>
            <p className="mt-2 font-bold text-slate-500">Tingkat: {item.tingkat ?? "-"}</p>
          </article>
        ))}
      </div>
      {items.length === 0 && <EmptyState text="Belum ada data murid." />}
    </section>
  );
}

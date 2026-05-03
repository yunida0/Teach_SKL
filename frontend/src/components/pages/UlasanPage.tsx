"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Category, Ulasan } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          className={`text-2xl transition-transform hover:scale-110 ${star <= (hovered || value) ? "text-amber-400" : "text-slate-200"}`}
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          type="button"
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span className={`text-sm ${star <= value ? "text-amber-400" : "text-slate-200"}`} key={star}>★</span>
      ))}
    </div>
  );
}

function TambahUlasanForm({ csrfToken, onAdded }: { csrfToken: string; onAdded: () => void }) {
  const [nama, setNama]     = useState("");
  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [msg, setMsg]       = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rating === 0) { setMsg("Pilih rating bintang terlebih dahulu."); return; }
    setLoading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.set("csrf_token", csrfToken);
      fd.set("nama", nama.trim());
      fd.set("rating", String(rating));
      fd.set("komentar", komentar.trim());
      const res  = await fetch(`${PHP_BASE}/backend/actions/tambah-ulasan`, { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setMsg("Ulasan berhasil dikirim. Terima kasih!");
        setNama(""); setRating(0); setKomentar("");
        onAdded();
      } else {
        setMsg(json.error ?? "Gagal mengirim ulasan.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="rounded-[1.75rem] border border-sky-100 bg-white p-4 shadow-sm md:p-6" onSubmit={submit}>
      <div className="mb-4 border-b border-sky-100 pb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Bagikan Pengalaman</p>
        <h2 className="title-font text-2xl font-black text-slate-950">Tulis Ulasan</h2>
      </div>
      <div className="grid gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">Nama Kamu</label>
          <input
            className="field"
            maxLength={100}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama lengkap kamu"
            required
            value={nama}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">Rating</label>
          <div className="flex items-center gap-3">
            <StarRating onChange={setRating} value={rating} />
            {rating > 0 && (
              <span className="text-xs font-black text-amber-600">
                {["", "Mengecewakan", "Kurang baik", "Cukup baik", "Bagus", "Sangat bagus!"][rating]}
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">Komentar</label>
          <textarea
            className="field min-h-[100px] resize-y"
            maxLength={1000}
            onChange={(e) => setKomentar(e.target.value)}
            placeholder="Ceritakan pengalamanmu belajar di sini..."
            required
            value={komentar}
          />
        </div>
        {msg && (
          <p className={`text-sm font-black ${msg.includes("berhasil") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>
        )}
        <button className="btn-primary py-3 disabled:opacity-50" disabled={loading} type="submit">
          {loading ? "Mengirim..." : "Kirim Ulasan"}
        </button>
      </div>
    </form>
  );
}

function UlasanCard({ ulasan }: { ulasan: Ulasan }) {
  const rating = Number(ulasan.rating ?? 0);
  return (
    <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-900 text-sm font-black text-white">
          {ulasan.nama.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-950">{ulasan.nama}</p>
          <StarDisplay value={rating} />
        </div>
      </div>
      {ulasan.komentar && (
        <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600">{ulasan.komentar}</p>
      )}
    </article>
  );
}

export function UlasanPage({ csrfToken }: { category: Category; csrfToken: string }) {
  const [items, setItems] = useState<Ulasan[]>([]);

  function load() {
    readJson<Ulasan[]>(`${PHP_BASE}/backend/data/ulasan`).then(setItems).catch(() => setItems([]));
  }
  useEffect(() => { load(); }, []);

  const avgRating = items.length > 0
    ? (items.reduce((sum, u) => sum + Number(u.rating ?? 0), 0) / items.length).toFixed(1)
    : null;

  return (
    <section className="grid items-start gap-6 xl:grid-cols-[1fr_1.4fr]">
      <TambahUlasanForm csrfToken={csrfToken} onAdded={load} />

      <div className="grid content-start gap-4">
        <div className="rounded-[1.75rem] border border-sky-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="title-font text-2xl font-black text-slate-900">Ulasan ({items.length})</h2>
              {avgRating && (
                <p className="text-sm font-bold text-slate-500">
                  Rata-rata: <span className="font-black text-amber-500">{avgRating} ★</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {items.map((u) => <UlasanCard key={u.id} ulasan={u} />)}
        </div>

        {items.length === 0 && (
          <div className="rounded-[1.75rem] border border-dashed border-sky-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-2xl text-sky-800">★</div>
            <h3 className="title-font mt-3 text-2xl font-black text-slate-900">Belum ada ulasan</h3>
            <p className="mt-2 text-sm font-bold text-slate-500">Jadilah yang pertama memberikan ulasan!</p>
          </div>
        )}
      </div>
    </section>
  );
}

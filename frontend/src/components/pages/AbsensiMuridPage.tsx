"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { AbsensiRecord, AbsensiSaya, Category, MuridListItem } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";

const statusLabels = ["hadir", "izin", "sakit", "alpha"] as const;
type StatusLabel = typeof statusLabels[number];

const statusColor: Record<StatusLabel, string> = {
  hadir: "bg-emerald-100 text-emerald-800",
  izin:  "bg-sky-100 text-sky-800",
  sakit: "bg-amber-100 text-amber-800",
  alpha: "bg-rose-100 text-rose-800",
};

function PengajarAbsensiForm({
  csrfToken,
  onSaved,
}: {
  csrfToken: string;
  onSaved: () => void;
}) {
  const [murids, setMurids] = useState<MuridListItem[]>([]);
  const [statuses, setStatuses] = useState<Record<number, StatusLabel>>({});
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    readJson<MuridListItem[]>(`${PHP_BASE}/backend/data/murid-for-absensi`)
      .then((data) => {
        setMurids(data);
        const init: Record<number, StatusLabel> = {};
        data.forEach((m) => { init[Number(m.id)] = "hadir"; });
        setStatuses(init);
      })
      .catch(() => setMurids([]));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const data = new FormData();
      data.set("csrf_token", csrfToken);
      data.set("tanggal", tanggal);
      Object.entries(statuses).forEach(([id, st]) => data.set(`status_${id}`, st));
      const res = await fetch(`${PHP_BASE}/backend/actions/tambah-absensi-murid`, {
        method: "POST",
        body: data,
        credentials: "include",
      });
      const json = await res.json();
      setMsg(json.success ? `Absensi ${tanggal} tersimpan untuk ${json.saved ?? murids.length} murid.` : (json.error ?? "Gagal menyimpan."));
      if (json.success) onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="glass-card grid gap-4 rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6" onSubmit={submit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="title-font text-xl font-black md:text-2xl">Input Absensi Murid</h2>
        <input
          className="field w-auto min-w-0 text-sm"
          onChange={(e) => setTanggal(e.target.value)}
          type="date"
          value={tanggal}
        />
      </div>

      {murids.length === 0 ? (
        <p className="text-sm font-bold text-slate-500">Memuat daftar murid...</p>
      ) : (
        <div className="grid gap-2">
          {murids.map((m) => (
            <div className="grid gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:px-5" key={m.id}>
              <div>
                <p className="font-black text-slate-900">{m.nama ?? "Murid"}</p>
                <p className="text-xs font-bold text-slate-400">Tingkat {m.tingkat ?? "-"}</p>
              </div>
              <div className="grid grid-cols-4 gap-1 sm:flex sm:gap-2">
                {statusLabels.map((st) => (
                  <label
                    className={`cursor-pointer rounded-xl px-2 py-1.5 text-center text-xs font-black transition sm:px-3 ${
                      statuses[Number(m.id)] === st ? statusColor[st] : "bg-slate-100 text-slate-500"
                    }`}
                    key={st}
                  >
                    <input
                      checked={statuses[Number(m.id)] === st}
                      className="sr-only"
                      name={`status_${m.id}`}
                      onChange={() => setStatuses((prev) => ({ ...prev, [Number(m.id)]: st }))}
                      type="radio"
                      value={st}
                    />
                    {st}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {msg && (
        <p className={`text-sm font-black ${msg.includes("tersimpan") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>
      )}
      <button className="btn-primary px-6 py-3 disabled:opacity-50" disabled={loading || murids.length === 0} type="submit">
        {loading ? "Menyimpan..." : "Simpan Absensi"}
      </button>
    </form>
  );
}

export function AbsensiMuridPage({ category, csrfToken }: { category: Category; csrfToken: string }) {
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
  const [stats, setStats] = useState<AbsensiSaya["stats"] | null>(null);

  const loadRecords = useCallback(() => {
    if (category === "murid") {
      readJson<AbsensiSaya>(`${PHP_BASE}/backend/data/absensi-saya`)
        .then((p) => { setRecords(p.riwayat ?? []); setStats(p.stats ?? null); })
        .catch(() => { setRecords([]); setStats(null); });
    } else {
      readJson<AbsensiRecord[]>(`${PHP_BASE}/backend/data/riwayat-absensi?tipe=murid`)
        .then(setRecords)
        .catch(() => setRecords([]));
    }
  }, [category]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  return (
    <section className="grid gap-6">
      {category === "pengajar" && (
        <PengajarAbsensiForm csrfToken={csrfToken} onSaved={loadRecords} />
      )}

      {category === "murid" && stats && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:gap-3">
          {statusLabels.map((st) => (
            <div className="rounded-2xl bg-white p-4 shadow-sm md:rounded-3xl md:p-5" key={st}>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{st}</p>
              <p className="mt-1 text-2xl font-black text-sky-800 md:mt-2">{stats[st as keyof typeof stats] ?? 0}</p>
            </div>
          ))}
          <div className="rounded-2xl bg-sky-800 p-4 text-white shadow-sm md:rounded-3xl md:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-sky-100">Hadir%</p>
            <p className="mt-1 text-2xl font-black md:mt-2">{stats.persentase ?? 0}%</p>
          </div>
        </div>
      )}

      <div>
        {category === "pengajar" && (
          <h2 className="title-font mb-3 text-xl font-black text-slate-800">Riwayat Absensi Murid</h2>
        )}
        <div className="grid gap-3">
          {records.map((record, i) => (
            <article className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] p-5" key={`${record.tanggal}-${i}`}>
              <div>
                <h3 className="font-black text-slate-950">{record.nama_murid ?? "Absensi Saya"}</h3>
                <p className="text-sm font-bold text-slate-500">{record.tanggal ?? "-"}</p>
              </div>
              <span className={`rounded-full px-4 py-2 text-sm font-black uppercase ${statusColor[(record.status as StatusLabel) ?? "hadir"] ?? "bg-slate-100 text-slate-600"}`}>
                {record.status ?? "-"}
              </span>
            </article>
          ))}
          {records.length === 0 && <EmptyState text="Belum ada riwayat absensi." />}
        </div>
      </div>
    </section>
  );
}

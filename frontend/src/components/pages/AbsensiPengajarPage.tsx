"use client";

import { FormEvent, useEffect, useState } from "react";
import { PHP_BASE, readJson } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";

type AbsensiPengajarRecord = {
  tanggal?: string;
  status?: string;
  keterangan?: string;
  nama?: string;
};

const statusColor: Record<string, string> = {
  hadir: "bg-emerald-100 text-emerald-800",
  izin:  "bg-sky-100 text-sky-800",
  sakit: "bg-amber-100 text-amber-800",
  alpha: "bg-rose-100 text-rose-800",
};

export function AbsensiPengajarPage({ csrfToken }: { csrfToken: string }) {
  const [records, setRecords] = useState<AbsensiPengajarRecord[]>([]);
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState("hadir");
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "ok" | "denied">("idle");
  const today                 = new Date().toISOString().slice(0, 10);

  function load() {
    readJson<AbsensiPengajarRecord[]>(`${PHP_BASE}/backend/data/riwayat-absensi-pengajar`)
      .then(setRecords)
      .catch(() => setRecords([]));
  }

  useEffect(() => { load(); }, []);

  const todayRecord = records.find((r) => r.tanggal === today);

  function getLocation() {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("Geolocation tidak tersedia")); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setLocStatus("idle");
    try {
      const data = new FormData(e.currentTarget);
      data.set("csrf_token", csrfToken);
      if (status === "hadir") {
        setLocStatus("loading");
        try {
          const loc = await getLocation();
          data.set("lat", String(loc.lat));
          data.set("lng", String(loc.lng));
          setLocStatus("ok");
        } catch {
          setLocStatus("denied");
          setMsg("Izinkan akses lokasi untuk absen hadir. Pastikan GPS aktif.");
          return;
        }
      }
      const res = await fetch(`${PHP_BASE}/backend/actions/tambah-absensi-pengajar`, {
        method: "POST",
        body: data,
        credentials: "include",
      });
      const json = await res.json();
      setMsg(json.success ? "Absensi hari ini tersimpan." : (json.error ?? "Gagal menyimpan."));
      if (json.success) load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-6">
      <form className="glass-card grid gap-4 rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6" onSubmit={submit}>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">Absensi Hari Ini</p>
          <h2 className="title-font mt-1 text-2xl font-black text-slate-950">{today}</h2>
          {todayRecord && (
            <p className="mt-1 text-sm font-bold text-slate-500">
              Sudah terinput: <span className="font-black text-sky-700">{todayRecord.status}</span>
              {todayRecord.keterangan ? ` — ${todayRecord.keterangan}` : ""}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          {(["hadir", "izin", "sakit", "alpha"] as const).map((st) => (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 px-4 py-3 font-black transition has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50 has-[:checked]:text-sky-800 sm:justify-start sm:px-5" key={st}>
              <input checked={status === st} className="accent-sky-600" name="status" onChange={() => setStatus(st)} required type="radio" value={st} />
              <span className="capitalize">{st}</span>
            </label>
          ))}
        </div>
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-slate-600">
          Untuk status <strong>Hadir</strong>, lokasi GPS akan direkam sebagai bukti kehadiran tanpa validasi jarak sekolah.
          {locStatus === "loading" && <span className="ml-2 animate-pulse">Mengambil lokasi...</span>}
          {locStatus === "ok" && <span className="ml-2 text-emerald-700">Lokasi berhasil direkam.</span>}
          {locStatus === "denied" && <span className="ml-2 text-rose-600">Akses lokasi ditolak. Aktifkan GPS dan izinkan akses.</span>}
        </p>

        <input className="field" maxLength={200} name="keterangan" placeholder="Keterangan (opsional)" type="text" />

        {msg && (
          <p className={`text-sm font-black ${msg.includes("tersimpan") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>
        )}
        <button className="btn-primary px-6 py-3 disabled:opacity-50" disabled={loading} type="submit">
          {loading ? "Menyimpan..." : todayRecord ? "Update Absensi Hari Ini" : "Simpan Absensi Hari Ini"}
        </button>
      </form>

      <div>
        <h2 className="title-font mb-3 text-xl font-black text-slate-800">Riwayat Absensi</h2>
        <div className="grid gap-3">
          {records.map((r, i) => (
            <article className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] p-5" key={`${r.tanggal}-${i}`}>
              <div>
                <h3 className="font-black text-slate-950">{r.nama ?? "Saya"}</h3>
                <p className="text-sm font-bold text-slate-500">
                  {r.tanggal ?? "-"}
                  {r.keterangan ? ` — ${r.keterangan}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-4 py-2 text-sm font-black uppercase ${statusColor[r.status ?? ""] ?? "bg-slate-100 text-slate-600"}`}>
                {r.status ?? "-"}
              </span>
            </article>
          ))}
          {records.length === 0 && <EmptyState text="Belum ada riwayat absensi." />}
        </div>
      </div>
    </section>
  );
}

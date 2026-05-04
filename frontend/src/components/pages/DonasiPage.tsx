"use client";

import { FormEvent, useState } from "react";
import { PHP_BASE, uploadWithProgress } from "@/lib/api";
import { DonationCard } from "@/components/ui/DonationCard";

function formatRupiah(value: string) {
  const number = Number(value.replace(/\D/g, ""));
  if (!number) return "";
  return new Intl.NumberFormat("id-ID").format(number);
}

export function DonasiPage({ csrfToken }: { csrfToken: string }) {
  const [nominal, setNominal] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function uploadBukti(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("csrf_token", csrfToken);
    data.set("nominal", nominal.replace(/\D/g, ""));
    setLoading(true);
    setMessage("");
    setProgress(1);
    try {
      let payload: { success?: boolean; error?: string; message?: string } | null = null;
      try {
        payload = await uploadWithProgress(`${PHP_BASE}/backend/uploads/donasi`, data, setProgress);
      } catch (error) {
        payload = error as { success?: boolean; error?: string; message?: string };
      }
      if (!payload?.success) {
        setMessage(payload?.error ?? "Upload bukti transfer gagal.");
        setProgress(0);
        return;
      }
      form.reset();
      setNominal("");
      setMessage(payload.message ?? "Bukti transfer berhasil dikirim.");
      window.setTimeout(() => setProgress(0), 900);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-5">
      <DonationCard />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-sm md:p-6" onSubmit={uploadBukti}>
          <h2 className="text-2xl font-black text-slate-950">Upload bukti transfer</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">Kirim bukti agar donasi bisa dicek oleh pengelola.</p>
          <div className="mt-5 grid gap-3">
            <input className="field" maxLength={100} name="nama" placeholder="Nama donatur" required />
            <input
              className="field"
              inputMode="numeric"
              onChange={(e) => setNominal(formatRupiah(e.target.value))}
              placeholder="Nominal donasi"
              required
              value={nominal}
            />
            <textarea className="field min-h-24 resize-y" maxLength={500} name="catatan" placeholder="Catatan opsional" />
            <input className="field" accept=".jpg,.jpeg,.png,.webp,.pdf" name="file" required type="file" />
            {message && <p className={`text-sm font-black ${message.includes("berhasil") ? "text-emerald-700" : "text-rose-600"}`}>{message}</p>}
            {progress > 0 && (
              <div className="rounded-2xl bg-sky-50 p-3">
                <div className="flex items-center justify-between text-xs font-black text-sky-700"><span>Upload bukti</span><span>{progress}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
            )}
            <button className="btn-primary px-6 py-3 disabled:opacity-50" disabled={loading} type="submit">
              {loading ? "Mengirim..." : "Kirim Bukti Transfer"}
            </button>
          </div>
        </form>

        <div className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-2xl font-black text-slate-950">Cara berdonasi</h2>
        <ol className="mt-4 grid gap-3 text-sm font-bold leading-6 text-slate-600">
          <li className="rounded-2xl bg-slate-50 p-4">1. Transfer ke rekening yang tercantum di atas.</li>
          <li className="rounded-2xl bg-slate-50 p-4">2. Simpan bukti transfer.</li>
          <li className="rounded-2xl bg-slate-50 p-4">3. Konfirmasi ke admin agar donasi bisa dicatat oleh pengelola.</li>
        </ol>
        </div>
      </div>
    </section>
  );
}

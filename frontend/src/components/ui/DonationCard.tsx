export function DonationCard() {
  return (
    <section className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 shadow-sm md:p-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Dukungan</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">Bantu Sekolah Kolong Langit terus berjalan</h2>
      <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-600">
        Donasi dipakai untuk mendukung materi belajar, dokumentasi kegiatan, dan kebutuhan operasional pembelajaran.
      </p>
      <div className="mt-4 grid gap-3 rounded-2xl bg-white p-4 text-sm font-bold text-slate-700 md:grid-cols-2">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-400">Transfer Bank</p>
          <p className="mt-1 text-lg font-black text-slate-950">1234567890</p>
          <p className="text-xs text-slate-500">a.n. Sekolah Kolong Langit</p>
        </div>
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-400">Konfirmasi</p>
          <p className="mt-1 text-lg font-black text-slate-950">WhatsApp Admin</p>
          <p className="text-xs text-slate-500">Kirim bukti transfer ke pengelola sekolah.</p>
        </div>
      </div>
    </section>
  );
}

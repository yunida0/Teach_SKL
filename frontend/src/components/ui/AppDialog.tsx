"use client";

type DialogTone = "info" | "danger" | "success" | "warning";

// Dialog kecil untuk mengganti alert/confirm browser di halaman React.
// Dibuat tetap sederhana karena dipakai untuk pesan error dan konfirmasi hapus.

const toneClass: Record<DialogTone, { icon: string; badge: string; primary: string }> = {
  info: { icon: "i", badge: "bg-sky-50 text-sky-700", primary: "bg-sky-700 hover:bg-sky-800" },
  danger: { icon: "!", badge: "bg-rose-50 text-rose-700", primary: "bg-rose-600 hover:bg-rose-700" },
  success: { icon: "✓", badge: "bg-emerald-50 text-emerald-700", primary: "bg-emerald-600 hover:bg-emerald-700" },
  warning: { icon: "!", badge: "bg-amber-50 text-amber-700", primary: "bg-amber-500 hover:bg-amber-600" },
};

export function AppDialog({
  cancelLabel = "Batal",
  confirmLabel = "OK",
  description,
  onCancel,
  onConfirm,
  open,
  title,
  tone = "info",
}: {
  cancelLabel?: string;
  confirmLabel?: string;
  description?: string;
  onCancel?: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  tone?: DialogTone;
}) {
  if (!open) return null;
  const styles = toneClass[tone];

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/20">
        <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl text-lg font-black ${styles.badge}`}>{styles.icon}</div>
        <h3 id="app-dialog-title" className="m-0 text-xl font-black text-slate-950">{title}</h3>
        {description && <p className="mt-2 mb-5 text-sm font-semibold leading-relaxed text-slate-600">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          {onCancel && <button className="rounded-full px-4 py-2.5 text-sm font-black text-slate-500 transition hover:bg-slate-100" onClick={onCancel} type="button">{cancelLabel}</button>}
          <button className={`rounded-full px-5 py-2.5 text-sm font-black text-white transition ${styles.primary}`} onClick={onConfirm} type="button">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

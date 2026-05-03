"use client";

import { useEffect, useRef, useState } from "react";
import { PHP_BASE } from "@/lib/api";

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "pdf"; url: string }
  | { status: "image"; url: string }
  | { status: "docx"; html: string }
  | { status: "unsupported"; ext: string }
  | { status: "error"; message: string };

function ext(filePath: string) {
  return (filePath.split(".").pop() ?? "").toLowerCase();
}

export function FileViewerModal({
  filePath,
  title,
  onClose,
}: {
  filePath: string;
  title: string;
  onClose: () => void;
}) {
  const [view, setView] = useState<ViewState>({ status: "loading" });
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileUrl = `${PHP_BASE}/${filePath}`;
  const extension = ext(filePath);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (["pdf"].includes(extension)) {
        setView({ status: "pdf", url: fileUrl });
        return;
      }
      if (["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) {
        setView({ status: "image", url: fileUrl });
        return;
      }
      if (extension === "docx") {
        setView({ status: "loading" });
        try {
          const mammoth = (await import("mammoth")).default;
          const res = await fetch(fileUrl, { credentials: "include" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (!cancelled) setView({ status: "docx", html: value });
        } catch (err) {
          if (!cancelled) setView({ status: "error", message: String(err) });
        }
        return;
      }
      setView({ status: "unsupported", ext: extension });
    }

    load();
    return () => { cancelled = true; };
  }, [fileUrl, extension]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={handleOverlayClick}
      ref={overlayRef}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-sky-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="hidden text-xs font-black uppercase tracking-[0.18em] text-sky-600 sm:block">Pratinjau File</p>
            <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">{title}</h2>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2 sm:ml-4 sm:gap-3">
            <a
              className="rounded-xl bg-sky-100 px-3 py-1.5 text-xs font-black text-sky-800 transition hover:bg-sky-200 sm:px-4 sm:py-2 sm:text-sm"
              download
              href={fileUrl}
            >
              Download
            </a>
            <button
              aria-label="Tutup"
              className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-rose-100 hover:text-rose-600 sm:h-9 sm:w-9"
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto">
          {view.status === "loading" && (
            <div className="flex h-64 items-center justify-center">
              <p className="font-black text-slate-400">Memuat file...</p>
            </div>
          )}

          {view.status === "pdf" && (
            <embed
              className="h-[70vh] w-full"
              src={view.url}
              type="application/pdf"
            />
          )}

          {view.status === "image" && (
            <div className="flex justify-center p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={title} className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow" src={view.url} />
            </div>
          )}

          {view.status === "docx" && (
            <div
              className="prose max-w-none overflow-x-auto p-4 text-slate-800 sm:p-8 [&_h1]:font-black [&_h1]:text-sky-900 [&_h2]:font-black [&_h2]:text-sky-800 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-sky-50 [&_th]:px-3 [&_th]:py-2 [&_th]:font-black"
              dangerouslySetInnerHTML={{ __html: view.html }}
            />
          )}

          {view.status === "unsupported" && (
            <div className="flex h-64 flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-2xl font-black text-slate-400">
                .{view.ext}
              </div>
              <div>
                <p className="font-black text-slate-700">Format .{view.ext} tidak bisa ditampilkan di browser.</p>
                <p className="mt-1 text-sm font-bold text-slate-400">Gunakan tombol Download di atas untuk membuka di aplikasi yang sesuai.</p>
              </div>
            </div>
          )}

          {view.status === "error" && (
            <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="font-black text-rose-700">Gagal memuat file.</p>
              <p className="text-sm font-bold text-slate-400">{view.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

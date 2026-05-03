"use client";

import { useEffect, useState } from "react";
import { PHP_BASE } from "@/lib/api";

// Reader materi untuk halaman E-Book.
// PDF dan gambar bisa langsung dibuka browser, DOCX dikonversi dulu pakai mammoth.
type ReaderState =
  | { status: "loading" }
  | { status: "pdf"; url: string }
  | { status: "image"; url: string }
  | { status: "docx"; html: string }
  | { status: "unsupported"; ext: string }
  | { status: "error"; message: string };

function getExt(filePath: string) {
  return (filePath.split(".").pop() ?? "").toLowerCase();
}

export function MateriReader({ filePath, title }: { filePath: string; title: string }) {
  const [reader, setReader] = useState<ReaderState>({ status: "loading" });
  const fileUrl = `${PHP_BASE}/${filePath}`;
  const ext = getExt(filePath);

  useEffect(() => {
    let ignore = false;

    async function loadFile() {
      if (ext === "pdf") return setReader({ status: "pdf", url: fileUrl });
      if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return setReader({ status: "image", url: fileUrl });

      if (ext === "docx") {
        try {
          const mammoth = (await import("mammoth")).default;
          const res = await fetch(fileUrl, { credentials: "include" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (!ignore) setReader({ status: "docx", html: value });
        } catch (err) {
          if (!ignore) setReader({ status: "error", message: String(err) });
        }
        return;
      }

      setReader({ status: "unsupported", ext });
    }

    loadFile();
    return () => { ignore = true; };
  }, [ext, fileUrl]);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      {reader.status === "loading" && <div className="grid h-80 place-items-center font-black text-slate-400">Memuat materi...</div>}
      {reader.status === "pdf" && <embed className="h-[76vh] w-full" src={reader.url} type="application/pdf" />}
      {reader.status === "image" && (
        <div className="flex justify-center p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={title} className="max-h-[72vh] max-w-full rounded-2xl object-contain" src={reader.url} />
        </div>
      )}
      {reader.status === "docx" && <div className="prose max-w-none overflow-x-auto p-5 text-slate-800 md:p-8 [&_h1]:font-black [&_h1]:text-sky-900 [&_h2]:font-black [&_h2]:text-sky-800 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-sky-50 [&_th]:px-3 [&_th]:py-2 [&_th]:font-black" dangerouslySetInnerHTML={{ __html: reader.html }} />}
      {reader.status === "unsupported" && <div className="grid h-80 place-items-center p-6 text-center"><div><p className="text-lg font-black text-slate-800">Preview .{reader.ext} belum tersedia.</p><p className="mt-1 text-sm font-bold text-slate-500">Silakan download file untuk membukanya.</p></div></div>}
      {reader.status === "error" && <div className="grid h-80 place-items-center p-6 text-center"><div><p className="text-lg font-black text-rose-700">Materi gagal dimuat.</p><p className="mt-1 text-sm font-bold text-slate-500">{reader.message}</p></div></div>}
    </div>
  );
}

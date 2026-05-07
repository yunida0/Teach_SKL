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

type PdfState =
  | { status: "loading"; pages: string[]; message: string }
  | { status: "ready"; pages: string[] }
  | { status: "error"; message: string };

export function PdfCanvasReader({ title, url }: { title: string; url: string }) {
  const [pdf, setPdf] = useState<PdfState>({ status: "loading", pages: [], message: "Menyiapkan reader PDF..." });

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.arrayBuffer();
        const documentProxy = await pdfjs.getDocument({ data }).promise;
        const renderedPages: string[] = [];
        for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
          if (cancelled) return;
          if (!cancelled) setPdf({ status: "loading", pages: renderedPages, message: `Memuat halaman ${pageNumber}/${documentProxy.numPages}...` });
          const page = await documentProxy.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const width = Math.min(980, Math.max(320, window.innerWidth - 32));
          const scale = width / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas tidak didukung browser ini.");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          renderedPages.push(canvas.toDataURL("image/jpeg", 0.9));
          if (!cancelled) setPdf({ status: "loading", pages: [...renderedPages], message: `Memuat halaman ${pageNumber}/${documentProxy.numPages}...` });
        }
        if (!cancelled) setPdf({ status: "ready", pages: renderedPages });
      } catch (error) {
        if (!cancelled) setPdf({ status: "error", message: String(error) });
      }
    }

    renderPdf();
    return () => { cancelled = true; };
  }, [url]);

  if (pdf.status === "loading") {
    return (
      <div className="max-h-[calc(100svh-8rem)] overflow-y-auto overscroll-contain bg-slate-100 p-3 [-webkit-overflow-scrolling:touch] sm:p-5">
        {pdf.pages.length === 0 ? <div className="grid min-h-[70svh] place-items-center p-6 text-center font-black text-slate-400">{pdf.message}</div> : null}
        <div className="mx-auto grid max-w-5xl gap-4">
          {pdf.pages.map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} alt={`${title} halaman ${index + 1}`} className="mx-auto h-auto w-full rounded-xl bg-white shadow-sm" src={src} />
          ))}
          {pdf.pages.length > 0 && <p className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-500 shadow-sm">{pdf.message}</p>}
        </div>
      </div>
    );
  }

  if (pdf.status === "error") {
    return <div className="grid min-h-[70svh] place-items-center p-6 text-center"><div><p className="text-lg font-black text-rose-700">PDF belum bisa dirender di browser ini.</p><p className="mt-1 text-sm font-bold text-slate-500">{pdf.message}</p><a className="mt-4 inline-flex rounded-full bg-sky-900 px-5 py-3 text-sm font-black text-white" href={url} rel="noreferrer" target="_blank">Buka / Download PDF</a></div></div>;
  }

  return (
    <div className="max-h-[calc(100svh-8rem)] overflow-y-auto overscroll-contain bg-slate-100 p-3 [-webkit-overflow-scrolling:touch] sm:p-5">
      <div className="mx-auto grid max-w-5xl gap-4">
        {pdf.pages.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} alt={`${title} halaman ${index + 1}`} className="mx-auto h-auto w-full rounded-xl bg-white shadow-sm" src={src} />
        ))}
      </div>
    </div>
  );
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
      {reader.status === "pdf" && (
        <PdfCanvasReader title={title} url={reader.url} />
      )}
      {reader.status === "image" && (
        <div className="max-h-[calc(100svh-8rem)] overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch] sm:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={title} className="mx-auto h-auto max-w-full rounded-2xl object-contain" src={reader.url} />
        </div>
      )}
      {reader.status === "docx" && <div className="prose max-h-[calc(100svh-8rem)] max-w-none overflow-auto overscroll-contain p-5 text-slate-800 [-webkit-overflow-scrolling:touch] md:p-8 [&_h1]:font-black [&_h1]:text-sky-900 [&_h2]:font-black [&_h2]:text-sky-800 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-sky-50 [&_th]:px-3 [&_th]:py-2 [&_th]:font-black" dangerouslySetInnerHTML={{ __html: reader.html }} />}
      {reader.status === "unsupported" && <div className="grid h-80 place-items-center p-6 text-center"><div><p className="text-lg font-black text-slate-800">Preview .{reader.ext} belum tersedia.</p><p className="mt-1 text-sm font-bold text-slate-500">Silakan download file untuk membukanya.</p></div></div>}
      {reader.status === "error" && <div className="grid h-80 place-items-center p-6 text-center"><div><p className="text-lg font-black text-rose-700">Materi gagal dimuat.</p><p className="mt-1 text-sm font-bold text-slate-500">{reader.message}</p></div></div>}
    </div>
  );
}

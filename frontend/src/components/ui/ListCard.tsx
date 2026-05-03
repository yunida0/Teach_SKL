"use client";

import { useState } from "react";
import { PHP_BASE } from "@/lib/api";
import { FileViewerModal } from "./FileViewerModal";

const VIEWABLE_EXT = ["pdf", "docx", "jpg", "jpeg", "png", "webp", "gif"];

function fileExt(path: string) {
  return (path.split(".").pop() ?? "").toLowerCase();
}

export function ListCard({
  href,
  meta,
  text,
  title,
}: {
  href?: string;
  meta?: string;
  text?: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const ext = href ? fileExt(href) : "";
  const canView = href ? VIEWABLE_EXT.includes(ext) : false;
  const fileUrl = href ? `${PHP_BASE}/${href}` : "";

  return (
    <>
      <article className="glass-card rounded-[1.5rem] p-5">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-600">{meta ?? "Teach SKL"}</p>
        <h3 className="mt-2 text-xl font-black text-slate-900">{title}</h3>
        {text && <p className="mt-3 leading-7 text-slate-600">{text}</p>}
        {href && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {canView && (
              <button
                className="inline-flex items-center gap-1 rounded-xl bg-sky-700 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-800"
                onClick={() => setOpen(true)}
                type="button"
              >
                Buka di sini
              </button>
            )}
            <a
              className={`inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-black transition ${
                canView
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-sky-700 text-white hover:bg-sky-800"
              }`}
              download={!canView}
              href={fileUrl}
              rel="noreferrer"
              target={canView ? "_blank" : undefined}
            >
              {canView ? "Download" : "Buka file →"}
            </a>
          </div>
        )}
      </article>

      {open && href && (
        <FileViewerModal filePath={href} onClose={() => setOpen(false)} title={title} />
      )}
    </>
  );
}

"use client";

import type { PageKey, User } from "@/types";
import { PHP_BASE } from "@/lib/api";
import { pageLabelFor } from "@/lib/utils";

export function Sidebar({
  activePage,
  onNavigate,
  onLogout,
  user,
  visibleNav,
}: {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  onLogout: () => void;
  user: User;
  visibleNav: PageKey[];
}) {
  const fotoProfil = user.foto ? `${PHP_BASE}/${user.foto}` : "";

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-sky-100 bg-white lg:block">
      <div className="flex h-full min-h-0 flex-col p-5">
        <div className="mb-5 shrink-0 overflow-hidden rounded-3xl bg-sky-900 text-white shadow-xl shadow-sky-950/10">
          <div className="flex items-center gap-3 p-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-lg font-black text-sky-900">
              {fotoProfil ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={user.nama} className="h-full w-full object-cover" src={fotoProfil} />
              ) : (
                "T"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="title-font truncate text-xl font-black leading-tight">Teach SKL</h2>
              <p className="truncate text-xs font-bold text-sky-300">{user.nama}</p>
            </div>
            <button
              aria-label="Buka detail profil"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-sky-100 transition hover:bg-white hover:text-sky-900"
              onClick={() => onNavigate("profil")}
              type="button"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.18 2.18 0 0 1-3.08 3.08l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21.5a2.18 2.18 0 0 1-4.36 0v-.06a1.8 1.8 0 0 0-1.18-1.68 1.8 1.8 0 0 0-1.9.4l-.04.04a2.18 2.18 0 1 1-3.08-3.08l.04-.04a1.8 1.8 0 0 0 .36-1.98 1.8 1.8 0 0 0-1.66-1.1H1.5a2.18 2.18 0 0 1 0-4.36h.06a1.8 1.8 0 0 0 1.68-1.18 1.8 1.8 0 0 0-.4-1.9l-.04-.04A2.18 2.18 0 1 1 5.88 3.44l.04.04a1.8 1.8 0 0 0 1.98.36h.02A1.8 1.8 0 0 0 9 2.18V2.1a2.18 2.18 0 0 1 4.36 0v.06a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.18 2.18 0 1 1 3.08 3.08l-.04.04a1.8 1.8 0 0 0-.36 1.98v.02A1.8 1.8 0 0 0 20.82 9h.08a2.18 2.18 0 0 1 0 4.36h-.06A1.8 1.8 0 0 0 19.4 15Z" />
              </svg>
            </button>
          </div>

          <div className="border-t border-white/10 px-5 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">{user.kategori}</p>
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2 pb-4">
            {visibleNav.map((page) => (
              <button
                className={`rounded-2xl px-4 py-3 text-left font-black transition ${
                  activePage === page ? "bg-sky-800 text-white shadow-lg" : "text-slate-600 hover:bg-sky-50"
                }`}
                key={page}
                onClick={() => onNavigate(page)}
                type="button"
              >
                {pageLabelFor(page, user.kategori)}
              </button>
            ))}
          </div>
        </nav>
        <button className="btn-ghost mt-4 w-full shrink-0 px-5 py-3" onClick={onLogout} type="button">
          Keluar
        </button>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { AdminSection, PageKey, User } from "@/types";
import { PHP_BASE } from "@/lib/api";
import { adminNav, pageLabelFor } from "@/lib/utils";

export function MobileNav({
  activePage,
  activeAdminSection,
  onAdminSectionChange,
  onNavigate,
  onLogout,
  loggingOut,
  user,
  visibleNav,
}: {
  activePage: PageKey;
  activeAdminSection?: AdminSection;
  onAdminSectionChange?: (section: AdminSection) => void;
  onNavigate: (page: PageKey) => void;
  onLogout: () => void;
  loggingOut?: boolean;
  user: User;
  visibleNav: PageKey[];
}) {
  const [open, setOpen] = useState(false);
  const fotoProfil = user.foto ? `${PHP_BASE}/${user.foto}` : "";
  const namaPanggilan = user.nama.trim().split(/\s+/)[0] || user.username;

  function nav(page: PageKey) {
    onNavigate(page);
    setOpen(false);
  }

  function navAdmin(section: AdminSection) {
    onAdminSectionChange?.(section);
    setOpen(false);
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* ── Fixed top bar ── */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-sky-100 bg-white/95 px-4 backdrop-blur-sm lg:hidden">
        <button
          aria-label="Buka navigasi"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 transition active:bg-slate-200"
          onClick={() => setOpen(true)}
          type="button"
        >
          <HamburgerIcon />
        </button>
        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="truncate font-black text-slate-900">
            {pageLabelFor(activePage, user.kategori)}
          </span>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sky-900 text-sm font-black text-white">
            T
          </div>
        </div>
      </header>

      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
      />

      {/* ── Slide-in drawer ── */}
      <div
        aria-label="Menu navigasi"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white p-5 shadow-2xl transition-transform duration-200 ease-in-out lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        role="dialog"
      >
        {/* User header */}
        <div className="mb-5 shrink-0 overflow-hidden rounded-3xl bg-sky-900 text-white shadow-xl">
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
              <h2 className="truncate text-xl font-black leading-tight">{namaPanggilan}</h2>
            </div>
            <button
              aria-label="Tutup menu"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-sky-100 transition hover:bg-white/20"
              onClick={() => setOpen(false)}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="border-t border-white/10 px-5 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">{user.kategori}</p>
          </div>
        </div>

        {/* Nav list */}
        <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-1.5 pb-4">
            {user.kategori === "admin" && onAdminSectionChange ? adminNav.map(([section, label]) => (
              <button
                className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                  activeAdminSection === section
                    ? "bg-sky-800 text-white shadow-lg"
                    : "text-slate-600 active:bg-sky-50"
                }`}
                key={section}
                onClick={() => navAdmin(section)}
                type="button"
              >
                {label}
              </button>
            )) : visibleNav.map((page) => (
              <button
                className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                  activePage === page
                    ? "bg-sky-800 text-white shadow-lg"
                    : "text-slate-600 active:bg-sky-50"
                }`}
                key={page}
                onClick={() => nav(page)}
                type="button"
              >
                {pageLabelFor(page, user.kategori)}
              </button>
            ))}
          </div>
        </nav>

        <button
          className={`btn-ghost mt-3 flex w-full shrink-0 items-center justify-center gap-2 px-5 py-3 text-sm transition duration-300 ease-out active:scale-[0.98] ${loggingOut ? "bg-sky-50 text-sky-700" : ""}`}
          disabled={loggingOut}
          onClick={() => { setOpen(false); onLogout(); }}
          type="button"
        >
          {loggingOut && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-700" aria-hidden="true" />}
          {loggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </>
  );
}

function HamburgerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

import type { PageKey } from "@/types";
import { greeting, pageLabels } from "@/lib/utils";

export function Header({
  activePage,
  remaining,
}: {
  activePage: PageKey;
  remaining: { years: number; months: number; days: number };
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-sky-100 bg-white/84 px-5 py-4 backdrop-blur md:px-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">{greeting()}</p>
        <h1 className="title-font text-3xl font-black text-slate-900">{pageLabels[activePage]}</h1>
      </div>
      <div className="hidden gap-2 text-sm font-black text-emerald-800 sm:flex">
        <span className="rounded-2xl bg-emerald-50 px-3 py-2">{remaining.years} th</span>
        <span className="rounded-2xl bg-emerald-50 px-3 py-2">{remaining.months} bl</span>
        <span className="rounded-2xl bg-emerald-50 px-3 py-2">{remaining.days} hr</span>
      </div>
    </header>
  );
}

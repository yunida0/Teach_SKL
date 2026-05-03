import { PHP_BASE } from "@/lib/api";

export function PlaceholderPage({ label }: { label: string }) {
  return (
    <section className="glass-card rounded-[2rem] p-8">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">Next shell ready</p>
      <h2 className="title-font mt-2 text-4xl font-black">{label}</h2>
      <p className="mt-4 max-w-2xl leading-8 text-slate-600">
        Halaman ini sudah masuk navigasi Next.js. Fitur detailnya masih bisa memakai endpoint PHP lama atau
        dimigrasikan bertahap ke komponen React.
      </p>
      <a className="btn-primary mt-6 inline-flex px-6 py-3" href={`${PHP_BASE}/dashboard.php`} target="_blank">
        Buka versi PHP klasik
      </a>
    </section>
  );
}

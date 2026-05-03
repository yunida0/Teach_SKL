export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-sky-200 bg-white/70 p-8 text-center font-black text-slate-500">
      {text}
    </div>
  );
}

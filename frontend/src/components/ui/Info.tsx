export function Info({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-2xl bg-white p-4">
      <span className="font-black text-sky-900">{label}:</span> {value}
    </p>
  );
}

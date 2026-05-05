"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export function CustomSelect({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  name,
  placeholder = "Pilih...",
  required,
  disabled,
  className = "",
}: Props) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  function select(v: string) {
    if (controlledValue === undefined) setInternalValue(v);
    onChange?.(v);
    setOpen(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`field flex w-full items-center justify-between gap-2 text-left ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={selected ? "text-slate-900 font-bold" : "text-slate-400 font-semibold"}>
          {selected?.label ?? placeholder}
        </span>
        <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-2xl border border-sky-100 bg-white shadow-xl">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`w-full px-4 py-2.5 text-left text-sm font-bold transition ${
                opt.value === value
                  ? "bg-sky-50 text-sky-800"
                  : "text-slate-700 hover:bg-sky-50 hover:text-sky-800"
              }`}
              onMouseDown={(e) => { e.preventDefault(); select(opt.value); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {required && !value && (
        <input
          tabIndex={-1}
          className="absolute inset-0 opacity-0 pointer-events-none"
          required
          value=""
          onChange={() => {}}
        />
      )}
    </div>
  );
}

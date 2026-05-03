"use client";

import { FormEvent, useEffect, useState } from "react";
import type { TeacherToken } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";

type TokenResponse = { success: boolean; error?: string; token?: TeacherToken };
type RevokeResponse = { success: boolean; error?: string };

export function AdminTokenPage({ csrfToken }: { csrfToken: string }) {
  const [tokens, setTokens] = useState<TeacherToken[]>([]);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [revealed, setRevealed] = useState<Set<number | string>>(new Set());
  const [copied, setCopied] = useState<number | string | null>(null);

  useEffect(() => {
    readJson<TeacherToken[]>(`${PHP_BASE}/backend/data/admin-tokens`)
      .then(setTokens)
      .catch(() => setTokens([]));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);

    const data = new FormData();
    data.set("csrf_token", csrfToken);
    data.set("label", label);

    try {
      const res = await readJson<TokenResponse>(`${PHP_BASE}/backend/actions/generate-token`, {
        method: "POST",
        body: data,
      });
      if (res.success && res.token) {
        setTokens((prev) => [res.token!, ...prev]);
        setLabel("");
        setMessage({ type: "ok", text: "Token berhasil dibuat." });
        setRevealed((prev) => new Set(prev).add(res.token!.id));
      } else {
        setMessage({ type: "err", text: res.error ?? "Gagal membuat token" });
      }
    } catch {
      setMessage({ type: "err", text: "Tidak dapat menghubungi server" });
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: number | string) {
    const data = new FormData();
    data.set("csrf_token", csrfToken);
    data.set("id", String(id));

    try {
      const res = await readJson<RevokeResponse>(`${PHP_BASE}/backend/actions/revoke-token`, {
        method: "POST",
        body: data,
      });
      if (res.success) {
        setTokens((prev) => prev.filter((t) => t.id !== id));
        setMessage({ type: "ok", text: "Token berhasil dicabut." });
      } else {
        setMessage({ type: "err", text: res.error ?? "Gagal mencabut token" });
      }
    } catch {
      setMessage({ type: "err", text: "Tidak dapat menghubungi server" });
    }
  }

  function toggleReveal(id: number | string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyToken(id: number | string, token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback — do nothing silently
    }
  }

  return (
    <section className="grid gap-5">
      {/* Header */}
      <div className="glass-card rounded-[2rem] p-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-600">Admin Panel</p>
        <h2 className="title-font mt-2 text-3xl font-black text-slate-950">Token Pengajar</h2>
        <p className="mt-2 text-slate-600">
          Buat dan kelola token yang dibutuhkan calon pengajar saat mendaftar akun.
        </p>
      </div>

      {/* Feedback */}
      {message && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-bold ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Create form */}
      <form
        className="glass-card rounded-[1.5rem] p-6"
        onSubmit={handleCreate}
      >
        <h3 className="mb-4 font-black text-slate-800">Buat Token Baru</h3>
        <div className="flex gap-3">
          <input
            className="field flex-1"
            maxLength={100}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label token (opsional, mis. Semester Ganjil 2026)"
            type="text"
            value={label}
          />
          <button
            className="btn-primary shrink-0 px-6 py-3"
            disabled={creating}
            type="submit"
          >
            {creating ? "Membuat..." : "Buat Token"}
          </button>
        </div>
      </form>

      {/* Token list */}
      {tokens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-sky-200 py-10 text-center text-sm font-bold text-slate-400">
          Belum ada token. Buat token pertama di atas.
        </p>
      ) : (
        <div className="grid gap-3">
          {tokens.map((t) => {
            const isRevealed = revealed.has(t.id);
            const isCopied = copied === t.id;

            return (
              <article
                className="glass-card rounded-[1.5rem] p-5"
                key={t.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {t.label ? (
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-sky-600">
                        {t.label}
                      </p>
                    ) : (
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Tanpa label
                      </p>
                    )}

                    {/* Token value */}
                    <div className="mt-2 flex items-center gap-2">
                      <code
                        className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold tracking-widest ${
                          isRevealed
                            ? "bg-sky-50 text-sky-900"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {isRevealed ? t.token : "••••••••••••••••••••"}
                      </code>
                      <button
                        className="rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-500 hover:bg-slate-100"
                        onClick={() => toggleReveal(t.id)}
                        type="button"
                      >
                        {isRevealed ? "Sembunyikan" : "Tampilkan"}
                      </button>
                      {isRevealed && (
                        <button
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                            isCopied
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-sky-600 hover:bg-sky-50"
                          }`}
                          onClick={() => copyToken(t.id, t.token)}
                          type="button"
                        >
                          {isCopied ? "Tersalin!" : "Salin"}
                        </button>
                      )}
                    </div>

                    {t.created_at && (
                      <p className="mt-2 text-xs font-bold text-slate-400">
                        Dibuat: {new Date(t.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>

                  <button
                    className="shrink-0 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 transition hover:bg-red-100"
                    onClick={() => handleRevoke(t.id)}
                    type="button"
                  >
                    Cabut
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

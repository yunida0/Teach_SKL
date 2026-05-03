"use client";

import { useEffect, useState } from "react";
import type { AdminUser, Category } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";
import { AppDialog } from "@/components/ui/AppDialog";

const FILTERS: Array<{ label: string; value: "" | Category }> = [
  { label: "Semua", value: "" },
  { label: "Pengajar", value: "pengajar" },
  { label: "Murid", value: "murid" },
  { label: "Tamu", value: "tamu" },
  { label: "Admin", value: "admin" },
];

const BADGE: Record<string, string> = {
  pengajar: "bg-sky-100 text-sky-700",
  murid: "bg-emerald-100 text-emerald-700",
  tamu: "bg-amber-100 text-amber-700",
  admin: "bg-purple-100 text-purple-700",
};

export function AdminUsersPage({
  csrfToken,
  currentUserId,
}: {
  csrfToken: string;
  currentUserId: number | string;
}) {
  const [all, setAll] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState<"" | Category>("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number | string; nama: string } | null>(null);

  useEffect(() => {
    readJson<AdminUser[]>(`${PHP_BASE}/backend/data/admin-users`)
      .then(setAll)
      .catch(() => setAll([]));
  }, []);

  const shown = filter === "" ? all : all.filter((u) => u.kategori === filter);

  const counts = {
    total: all.length,
    pengajar: all.filter((u) => u.kategori === "pengajar").length,
    murid: all.filter((u) => u.kategori === "murid").length,
    tamu: all.filter((u) => u.kategori === "tamu").length,
    admin: all.filter((u) => u.kategori === "admin").length,
  };

  async function handleDelete(userId: number | string, nama: string) {
    const data = new FormData();
    data.set("csrf_token", csrfToken);
    data.set("user_id", String(userId));

    try {
      const res = await readJson<{ success: boolean; error?: string }>(
        `${PHP_BASE}/backend/deletes/user-admin`,
        { method: "POST", body: data },
      );
      if (res.success) {
        setAll((prev) => prev.filter((u) => u.id !== userId));
        setMessage({ type: "ok", text: `Pengguna "${nama}" berhasil dihapus.` });
        setDeleteTarget(null);
      } else {
        setMessage({ type: "err", text: res.error ?? "Gagal menghapus pengguna" });
      }
    } catch {
      setMessage({ type: "err", text: "Tidak dapat menghubungi server" });
    }
  }

  return (
    <section className="grid gap-5">
      {/* Header with stats */}
      <div className="glass-card rounded-[2rem] p-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-600">Admin Panel</p>
        <h2 className="title-font mt-2 text-3xl font-black text-slate-950">Pengguna</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <StatChip label="Total" value={counts.total} tone="bg-slate-100 text-slate-600" />
          <StatChip label="Pengajar" value={counts.pengajar} tone="bg-sky-100 text-sky-700" />
          <StatChip label="Murid" value={counts.murid} tone="bg-emerald-100 text-emerald-700" />
          <StatChip label="Tamu" value={counts.tamu} tone="bg-amber-100 text-amber-700" />
          {counts.admin > 0 && (
            <StatChip label="Admin" value={counts.admin} tone="bg-purple-100 text-purple-700" />
          )}
        </div>
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

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              filter === f.value
                ? "bg-sky-800 text-white shadow-sm"
                : "bg-white text-slate-500 hover:bg-sky-50 hover:text-sky-700 border border-sky-100"
            }`}
            key={f.value}
            onClick={() => setFilter(f.value)}
            type="button"
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* User grid */}
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-sky-200 py-10 text-center text-sm font-bold text-slate-400">
          Tidak ada pengguna pada kategori ini.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((u) => (
            <article className="glass-card rounded-[1.5rem] p-5" key={u.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${
                        BADGE[u.kategori ?? ""] ?? "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.kategori}
                    </span>
                  </div>
                  <h3 className="mt-2 truncate text-lg font-black text-slate-950">
                    {u.nama ?? "—"}
                  </h3>
                  <p className="mt-0.5 text-sm font-bold text-slate-400">@{u.username}</p>
                  {u.created_at && (
                    <p className="mt-2 text-xs font-bold text-slate-300">
                      {new Date(u.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>

                {u.id !== currentUserId && (
                  <button
                    className="shrink-0 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 transition hover:bg-red-100"
                    onClick={() => setDeleteTarget({ id: u.id, nama: u.nama ?? String(u.id) })}
                    type="button"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <AppDialog
        open={Boolean(deleteTarget)}
        title="Hapus pengguna?"
        description={`Pengguna "${deleteTarget?.nama ?? "ini"}" akan dihapus permanen.`}
        tone="danger"
        cancelLabel="Batal"
        confirmLabel="Hapus"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id, deleteTarget.nama)}
      />
    </section>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <span className={`rounded-xl px-4 py-1.5 text-sm font-black ${tone}`}>
      {value} {label}
    </span>
  );
}

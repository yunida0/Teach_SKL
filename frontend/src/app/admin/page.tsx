"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { AdminSection, AuthResponse, User } from "@/types";
import { API_AUTH, readJson } from "@/lib/api";
import { AdminDashboardPage } from "@/components/pages/AdminDashboardPage";

export default function AdminRoute() {
  const [user, setUser] = useState<User | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");

  useEffect(() => {
    readJson<AuthResponse>(`${API_AUTH}?action=me`)
      .then((payload) => {
        setCsrfToken(payload.csrfToken ?? "");
        if (payload.user?.kategori === "admin") setUser(payload.user);
      })
      .catch(() => setMessage("Tidak bisa menghubungi backend."))
      .finally(() => setLoading(false));
  }, []);

  async function loginAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      let token = csrfToken;
      if (!token) {
        const csrf = await readJson<AuthResponse>(`${API_AUTH}?action=csrf`);
        token = csrf.csrfToken ?? "";
        setCsrfToken(token);
      }

      const data = new FormData(event.currentTarget);
      data.set("csrf_token", token);
      const payload = await readJson<AuthResponse>(`${API_AUTH}?action=login`, {
        method: "POST",
        body: data,
      });

      setCsrfToken(payload.csrfToken ?? token);
      if (!payload.success) {
        setMessage(payload.error ?? "Login admin gagal.");
        return;
      }

      if (payload.user?.kategori !== "admin") {
        setMessage("Akun ini bukan admin.");
        return;
      }

      setUser(payload.user);
    } catch {
      setMessage("Login admin gagal. Periksa koneksi backend.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f8fb] p-6">
        <div className="rounded-[2rem] border border-sky-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-xl font-black text-sky-900">A</div>
          <p className="font-black text-slate-900">Memuat Admin Panel...</p>
          <p className="mt-1 text-sm font-bold text-slate-500">Mengecek akses admin</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f8fb] p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-sky-100 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-xl font-black text-sky-900">A</div>
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">Secure Area</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Admin Panel</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">Login khusus administrator Teach SKL.</p>
          </div>

          {message && <div className="mt-5 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{message}</div>}

          <form className="mt-6 grid gap-3" onSubmit={loginAdmin}>
            <input className="field" name="username" placeholder="Username admin" required autoComplete="username" />
            <input className="field" name="password" placeholder="Password admin" required type="password" autoComplete="current-password" />
            <button className="btn-primary px-5 py-3" disabled={submitting} type="submit">
              {submitting ? "Memproses..." : "Masuk Admin"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link className="text-sm font-black text-sky-700 hover:underline" href="/">
              Kembali ke halaman utama
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb] p-5 md:p-8">
      <AdminDashboardPage activeSection={activeSection} csrfToken={csrfToken} onSectionChange={setActiveSection} user={user} />
    </main>
  );
}

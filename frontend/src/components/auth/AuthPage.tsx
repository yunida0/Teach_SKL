"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthResponse, Detail, User } from "@/types";
import { API_AUTH, readJson } from "@/lib/api";

type AuthMode = "login" | "register";

export function AuthPage({
  csrfToken,
  setCsrfToken,
  setUser,
  setDetail,
}: {
  csrfToken: string;
  setCsrfToken: (token: string) => void;
  setUser: (user: User | null) => void;
  setDetail: (detail: Detail | null) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [kategori, setKategori] = useState("");

  useEffect(() => {
    if (csrfToken) return;

    let mounted = true;
    readJson<AuthResponse>(`${API_AUTH}?action=csrf`)
      .then((payload) => {
        if (mounted) setCsrfToken(payload.csrfToken ?? "");
      })
      .catch(() => {
        if (mounted) setMessage("Tidak bisa menghubungi backend. Pastikan XAMPP/Apache aktif.");
      });

    return () => {
      mounted = false;
    };
  }, [csrfToken, setCsrfToken]);

  function updateMode(mode: AuthMode) {
    setAuthMode(mode);
    setMessage("");
    setKategori("");
    router.replace(mode === "register" ? `${pathname || "/"}?tab=register` : pathname || "/", { scroll: false });
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    setLoading(true);
    setMessage("");

    try {
      let activeCsrfToken = csrfToken;

      if (!activeCsrfToken) {
        const csrfPayload = await readJson<AuthResponse>(`${API_AUTH}?action=csrf`);
        activeCsrfToken = csrfPayload.csrfToken ?? "";
        setCsrfToken(activeCsrfToken);
      }

      if (!activeCsrfToken) {
        setMessage("Token keamanan belum siap. Coba lagi.");
        return;
      }

      const data = new FormData(form);
      data.set("csrf_token", activeCsrfToken);

      const payload = await readJson<AuthResponse>(`${API_AUTH}?action=${authMode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: data,
      });

      setCsrfToken(payload.csrfToken ?? activeCsrfToken);

      if (!payload.success) {
        setMessage(payload.error ?? "Aksi gagal.");
        return;
      }

      if (authMode === "register") {
        updateMode("login");
        setMessage(payload.message ?? "Pendaftaran berhasil. Silakan login.");
        return;
      }

      const nextUser = payload.user ?? null;
      const nextDetail = payload.detail ?? null;
      setUser(nextUser);
      setDetail(nextDetail);
      if (nextUser) {
        window.localStorage.setItem(
          "teach_skl_session_snapshot",
          JSON.stringify({
            detail: nextDetail,
            expiresAt: Date.now() + 1000 * 60 * 60 * 8,
            user: nextUser,
          }),
        );
      }
    } catch {
      setMessage("Request gagal. Periksa XAMPP/Apache dan proxy Next.js.");
    } finally {
      setLoading(false);
    }
  }

  const isSuccessMessage = message.toLowerCase().includes("berhasil");

  return (
    <main className="noise min-h-screen px-5 py-8 md:px-10">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-[#0f4f7f] p-8 text-white shadow-2xl md:p-12">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-300/30 blur-2xl" />
          <div className="absolute -bottom-24 left-12 h-72 w-72 rounded-full bg-amber-300/30 blur-2xl" />
          <p className="relative mb-5 inline-flex rounded-full bg-white/14 px-4 py-2 text-sm font-black uppercase tracking-[0.22em]">
            Teach SKL Next Portal
          </p>
          <h1 id="auth-title" className="title-font relative max-w-2xl text-5xl font-black leading-[0.95] md:text-7xl">
            Kelas digital yang terasa seperti ruang belajar premium.
          </h1>
          <p className="relative mt-6 max-w-xl text-lg leading-8 text-cyan-50/86">
            Frontend baru memakai Next.js + React + Tailwind, sementara backend PHP/MySQL tetap hidup di XAMPP.
          </p>
          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            {["CSRF safe", "PHP session", "Role aware"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/16 bg-white/12 p-4 font-black">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-6 md:p-8">
          <div className="mb-6 flex rounded-full bg-sky-50 p-1" role="tablist" aria-label="Pilih mode autentikasi">
            <button
              aria-selected={authMode === "login"}
              className={`flex-1 rounded-full px-5 py-3 font-black transition ${authMode === "login" ? "bg-white text-sky-800 shadow" : "text-slate-500"}`}
              onClick={() => updateMode("login")}
              role="tab"
              type="button"
            >
              Masuk
            </button>
            <button
              aria-selected={authMode === "register"}
              className={`flex-1 rounded-full px-5 py-3 font-black transition ${authMode === "register" ? "bg-white text-sky-800 shadow" : "text-slate-500"}`}
              onClick={() => updateMode("register")}
              role="tab"
              type="button"
            >
              Daftar
            </button>
          </div>

          {message && (
            <div
              className={`mb-4 rounded-2xl p-4 text-sm font-bold ${
                isSuccessMessage ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
              }`}
              role="status"
            >
              {message}
            </div>
          )}

          <form className="grid gap-3" onSubmit={submitAuth}>
            {authMode === "register" && (
              <div className="grid gap-1.5">
                <label className="text-sm font-black text-sky-900" htmlFor="auth-nama">
                  Nama lengkap
                </label>
                <input className="field" id="auth-nama" name="nama" placeholder="Masukkan nama lengkap" maxLength={100} required />
              </div>
            )}

            <div className="grid gap-1.5">
              <label className="text-sm font-black text-sky-900" htmlFor="auth-username">
                Username
              </label>
              <input className="field" id="auth-username" name="username" placeholder="Masukkan username" maxLength={50} required autoComplete="username" />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-black text-sky-900" htmlFor="auth-password">
                Password
              </label>
              <input
                className="field"
                id="auth-password"
                name="password"
                placeholder="Minimal 6 karakter"
                type="password"
                minLength={6}
                required
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {authMode === "register" && (
              <>
                <div className="grid gap-1.5">
                  <label className="text-sm font-black text-sky-900" htmlFor="auth-password-confirm">
                    Konfirmasi password
                  </label>
                  <input
                    className="field"
                    id="auth-password-confirm"
                    name="password_confirm"
                    placeholder="Ulangi password"
                    type="password"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-black text-sky-900" htmlFor="auth-kategori">
                    Kategori
                  </label>
                  <select
                    className="field"
                    id="auth-kategori"
                    name="kategori"
                    required
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    style={{ color: kategori ? "#184454" : "#88AAB5" }}
                  >
                    <option value="" disabled>
                      Pilih kategori
                    </option>
                    <option value="pengajar">Pengajar</option>
                    <option value="murid">Murid</option>
                    <option value="tamu">Tamu</option>
                  </select>
                </div>

                {kategori === "pengajar" && (
                  <div className="grid gap-3 rounded-3xl bg-sky-50/70 p-4">
                    <p className="text-sm font-black text-sky-900">Data Pengajar</p>
                    <div className="grid gap-1.5">
                      <label className="text-sm font-black text-sky-900" htmlFor="auth-teacher-token">
                        Token admin
                      </label>
                      <input
                        className="field"
                        id="auth-teacher-token"
                        name="teacher_token"
                        placeholder="Masukkan token dari admin"
                        required
                        autoComplete="off"
                      />
                      <span className="text-xs font-bold text-slate-500">Khusus role pengajar. Minta token ini ke admin sebelum daftar.</span>
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-sm font-black text-sky-900" htmlFor="auth-universitas">
                        Universitas
                      </label>
                      <input className="field" id="auth-universitas" name="universitas" placeholder="Nama universitas" required />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-sm font-black text-sky-900" htmlFor="auth-bidang">
                        Bidang
                      </label>
                      <input className="field" id="auth-bidang" name="bidang" placeholder="Bidang yang diajar" required />
                    </div>
                  </div>
                )}

                {kategori === "murid" && (
                  <div className="grid gap-3 rounded-3xl bg-sky-50/70 p-4">
                    <p className="text-sm font-black text-sky-900">Data Murid</p>
                    <div className="grid gap-1.5">
                      <label className="text-sm font-black text-sky-900" htmlFor="auth-tingkat">
                        Tingkat
                      </label>
                      <select className="field" id="auth-tingkat" name="tingkat" defaultValue="" required>
                        <option value="" disabled>
                          Pilih tingkat
                        </option>
                        {["TK", "SD", "SMP", "SMA"].map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-sm font-black text-sky-900" htmlFor="auth-umur">
                        Umur
                      </label>
                      <input className="field" id="auth-umur" name="umur" placeholder="Opsional" type="number" min={1} />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-sm font-black text-sky-900" htmlFor="auth-alamat">
                        Alamat
                      </label>
                      <input className="field" id="auth-alamat" name="alamat" placeholder="Opsional" />
                    </div>
                  </div>
                )}
              </>
            )}

            <button className="btn-primary mt-3 px-6 py-4" type="submit" disabled={loading}>
              {loading ? "Memproses..." : authMode === "login" ? "Masuk ke Dashboard" : "Buat Akun"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

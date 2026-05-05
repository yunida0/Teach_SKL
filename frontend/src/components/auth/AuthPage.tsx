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
        if (mounted) setMessage("Tidak bisa menghubungi backend. Coba refresh halaman.");
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
      setMessage("Request gagal. Periksa koneksi backend lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const isSuccessMessage = message.toLowerCase().includes("berhasil");

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-labelledby="auth-title">
        <div className="auth-card">
          <div className="auth-card-brand">
            <div className="auth-mark" aria-hidden="true">T</div>
            <div>
              <p className="auth-kicker">Portal Akademik Digital</p>
              <h1 id="auth-title" className="auth-card-title">Teach SKL</h1>
            </div>
          </div>

          <div className="af-tabs" role="tablist" aria-label="Pilih mode autentikasi">
            <button
              aria-selected={authMode === "login"}
              className={`af-tab ${authMode === "login" ? "active" : "inactive"}`}
              onClick={() => updateMode("login")}
              role="tab"
              type="button"
            >
              Masuk
            </button>
            <button
              aria-selected={authMode === "register"}
              className={`af-tab ${authMode === "register" ? "active" : "inactive"}`}
              onClick={() => updateMode("register")}
              role="tab"
              type="button"
            >
              Daftar
            </button>
          </div>

          {message && (
            <div className={`auth-message ${isSuccessMessage ? "success" : "error"}`} role="status">
              {message}
            </div>
          )}

          <form onSubmit={submitAuth} className="auth-form">
            {authMode === "register" && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-nama">
                  Nama lengkap
                </label>
                <input className="af-input" id="auth-nama" name="nama" placeholder="Masukkan nama lengkap" maxLength={100} required />
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-username">
                Username
              </label>
              <input className="af-input" id="auth-username" name="username" placeholder="Masukkan username" maxLength={50} required autoComplete="username" />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">
                Password
              </label>
              <input
                className="af-input"
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
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-password-confirm">
                    Konfirmasi password
                  </label>
                  <input
                    className="af-input"
                    id="auth-password-confirm"
                    name="password_confirm"
                    placeholder="Ulangi password"
                    type="password"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-kategori">
                    Kategori
                  </label>
                  <select
                    className="af-input"
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
                  <div className="auth-subform">
                    <p className="af-section-label">Data Pengajar</p>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="auth-teacher-token">
                        Token admin
                      </label>
                      <input
                        className="af-input"
                        id="auth-teacher-token"
                        name="teacher_token"
                        placeholder="Masukkan token dari admin"
                        required
                        autoComplete="off"
                      />
                      <span className="auth-help">Khusus role pengajar. Minta token ini ke admin sebelum daftar.</span>
                    </div>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="auth-universitas">
                        Universitas
                      </label>
                      <input className="af-input" id="auth-universitas" name="universitas" placeholder="Nama universitas" required />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="auth-bidang">
                        Bidang
                      </label>
                      <input className="af-input" id="auth-bidang" name="bidang" placeholder="Bidang yang diajar" required />
                    </div>
                  </div>
                )}

                {kategori === "murid" && (
                  <div className="auth-subform">
                    <p className="af-section-label">Data Murid</p>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="auth-tingkat">
                        Tingkat
                      </label>
                      <select className="af-input" id="auth-tingkat" name="tingkat" defaultValue="" required>
                        <option value="" disabled>
                          Pilih tingkat
                        </option>
                        {["TK", "SD", "SMP"].map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="auth-umur">
                        Umur
                      </label>
                      <input className="af-input" id="auth-umur" name="umur" placeholder="Opsional" type="number" min={1} />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="auth-alamat">
                        Alamat
                      </label>
                      <input className="af-input" id="auth-alamat" name="alamat" placeholder="Opsional" />
                    </div>
                  </div>
                )}
              </>
            )}

            <button className="af-btn" type="submit" disabled={loading}>
              {loading ? "Memproses..." : authMode === "login" ? "Masuk" : "Buat Akun"}
            </button>
          </form>
        </div>

        <p className="auth-footer">Teach SKL &copy; {new Date().getFullYear()}</p>
      </section>
    </main>
  );
}

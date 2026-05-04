"use client";

import { useRef, useState } from "react";
import type { Detail, User } from "@/types";
import { PHP_BASE, readJson, uploadWithProgress } from "@/lib/api";

type SaveResponse = {
  success: boolean;
  error?: string;
  message?: string;
  user?: User;
  detail?: Detail | null;
};

type Props = {
  csrfToken: string;
  detail: Detail | null;
  user: User;
  onUpdate: (user: User, detail: Detail | null) => void;
};

export function ProfileCard({ csrfToken, detail, user, onUpdate }: Props) {
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [nama, setNama] = useState(user.nama);
  const [universitas, setUniversitas] = useState(detail?.universitas ?? "");
  const [bidang, setBidang] = useState(detail?.bidang ?? "");
  const [telepon, setTelepon] = useState(detail?.telepon ?? "");
  const [tingkat, setTingkat] = useState(detail?.tingkat ?? "SD");
  const [umur, setUmur] = useState(String(detail?.umur ?? ""));
  const [alamat, setAlamat] = useState(detail?.alamat ?? "");

  const [showPassword, setShowPassword] = useState(false);
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [passwordKonfirmasi, setPasswordKonfirmasi] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);

  const fotoProfil = user.foto ? `${PHP_BASE}/${user.foto}` : "";

  function openEdit() {
    setNama(user.nama);
    setUniversitas(detail?.universitas ?? "");
    setBidang(detail?.bidang ?? "");
    setTelepon(detail?.telepon ?? "");
    setTingkat(detail?.tingkat ?? "SD");
    setUmur(String(detail?.umur ?? ""));
    setAlamat(detail?.alamat ?? "");
    setError("");
    setSuccess("");
    setEditing(true);
  }

  async function handleSave() {
    if (nama.trim() === "") { setError("Nama tidak boleh kosong"); return; }
    setSaving(true);
    setError("");
    setSuccess("");

    const data = new FormData();
    data.set("csrf_token", csrfToken);
    data.set("nama", nama.trim());

    if (user.kategori === "pengajar" || user.kategori === "admin" || user.kategori === "tamu") {
      data.set("universitas", universitas);
      data.set("bidang", bidang);
      data.set("telepon", telepon);
      data.set("alamat", alamat);
    }
    if (user.kategori === "murid") {
      data.set("tingkat", tingkat);
      data.set("umur", umur);
      data.set("alamat", alamat);
    }

    try {
      const res = await readJson<SaveResponse>(`${PHP_BASE}/backend/actions/update-profil`, {
        method: "POST",
        body: data,
      });
      if (!res.success) {
        setError(res.error ?? "Gagal menyimpan");
      } else {
        setSuccess("Profil berhasil disimpan");
        setEditing(false);
        if (res.user) onUpdate(res.user, res.detail ?? null);
      }
    } catch {
      setError("Tidak dapat menghubungi server");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError("");
    setSuccess("");
    setPhotoProgress(1);

    const data = new FormData();
    data.set("foto", file);
    data.set("csrf_token", csrfToken);

    try {
      let res: { success: boolean; path?: string; error?: string };
      try {
        res = await uploadWithProgress(`${PHP_BASE}/backend/uploads/foto`, data, setPhotoProgress);
      } catch (error) {
        res = error as { success: boolean; path?: string; error?: string };
      }
      if (res.success && res.path) {
        onUpdate({ ...user, foto: res.path }, detail);
        setSuccess("Foto profil berhasil diperbarui");
        window.setTimeout(() => setPhotoProgress(0), 900);
      } else {
        setError(res.error ?? "Gagal upload foto");
        setPhotoProgress(0);
      }
    } catch {
      setError("Gagal upload foto");
      setPhotoProgress(0);
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handlePasswordSave() {
    if (!passwordLama || !passwordBaru || !passwordKonfirmasi) {
      setError("Semua kolom password wajib diisi");
      return;
    }
    if (passwordBaru !== passwordKonfirmasi) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }
    if (passwordBaru.length < 6) {
      setError("Password baru minimal 6 karakter");
      return;
    }

    setSavingPassword(true);
    setError("");
    setSuccess("");

    const data = new FormData();
    data.set("csrf_token", csrfToken);
    data.set("password_lama", passwordLama);
    data.set("password_baru", passwordBaru);
    data.set("password_konfirmasi", passwordKonfirmasi);

    try {
      const res = await readJson<{ success: boolean; error?: string; message?: string }>(
        `${PHP_BASE}/backend/actions/ganti-password`,
        { method: "POST", body: data },
      );
      if (!res.success) {
        setError(res.error ?? "Gagal mengubah password");
      } else {
        setSuccess("Password berhasil diubah");
        setPasswordLama("");
        setPasswordBaru("");
        setPasswordKonfirmasi("");
        setShowPassword(false);
      }
    } catch {
      setError("Tidak dapat menghubungi server");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header card */}
      <div className="flex items-center gap-4 rounded-[1.4rem] border border-sky-100 bg-white p-4 shadow-sm md:gap-5 md:p-6">
        <div className="relative shrink-0">
          <div className="grid h-20 w-20 overflow-hidden rounded-2xl bg-sky-900 text-2xl font-black text-white">
            {fotoProfil ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={user.nama} className="h-full w-full object-cover" src={fotoProfil} />
            ) : (
              <span className="m-auto">{user.nama.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <button
            aria-label="Ganti foto profil"
            className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-xl border border-sky-100 bg-white text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:opacity-50"
            disabled={uploadingPhoto}
            onClick={() => fileRef.current?.click()}
            type="button"
          >
            {uploadingPhoto ? (
              <span className="text-[9px] font-black">...</span>
            ) : (
              <CameraIcon />
            )}
          </button>
          <input
            ref={fileRef}
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handlePhotoChange}
            type="file"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-black text-slate-900">{user.nama}</h2>
          <p className="mt-0.5 text-sm font-bold text-slate-500">@{user.username}</p>
          <span className="mt-2 inline-block rounded-full bg-sky-100 px-3 py-0.5 text-xs font-black uppercase tracking-[0.15em] text-sky-700">
            {user.kategori}
          </span>
        </div>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{success}</div>
      )}
      {photoProgress > 0 && (
        <div className="rounded-2xl bg-sky-50 px-4 py-3">
          <div className="flex items-center justify-between text-xs font-black text-sky-700"><span>Upload foto profil</span><span>{photoProgress}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${photoProgress}%` }} /></div>
        </div>
      )}

      {/* Profile info / edit */}
      <div className="rounded-[1.4rem] border border-sky-100 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-black text-slate-800">Informasi Profil</h3>
          {!editing && (
            <button
              className="rounded-xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 transition hover:bg-sky-100"
              onClick={openEdit}
              type="button"
            >
              Ubah Profil
            </button>
          )}
        </div>

        {editing ? (
          <div className="grid gap-4">
            <Field label="Nama Lengkap">
              <input
                className="profile-input"
                onChange={(e) => setNama(e.target.value)}
                value={nama}
              />
            </Field>
            <Field label="Username">
              <input className="profile-input" readOnly value={user.username} />
            </Field>

            {(user.kategori === "pengajar" || user.kategori === "admin" || user.kategori === "tamu") && (
              <>
                <Field label="Universitas">
                  <input
                    className="profile-input"
                    onChange={(e) => setUniversitas(e.target.value)}
                    value={universitas}
                  />
                </Field>
                <Field label="Bidang Studi">
                  <input
                    className="profile-input"
                    onChange={(e) => setBidang(e.target.value)}
                    value={bidang}
                  />
                </Field>
                <Field label="Telepon">
                  <input
                    className="profile-input"
                    onChange={(e) => setTelepon(e.target.value)}
                    type="tel"
                    value={telepon}
                  />
                </Field>
                <Field label="Alamat">
                  <textarea
                    className="profile-input min-h-20 resize-none"
                    onChange={(e) => setAlamat(e.target.value)}
                    value={alamat}
                  />
                </Field>
              </>
            )}

            {user.kategori === "murid" && (
              <>
                <Field label="Tingkat">
                  <select
                    className="profile-input"
                    onChange={(e) => setTingkat(e.target.value)}
                    value={tingkat}
                  >
                    {["TK", "SD", "SMP", "SMA"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Umur">
                  <input
                    className="profile-input"
                    max="99"
                    min="1"
                    onChange={(e) => setUmur(e.target.value)}
                    type="number"
                    value={umur}
                  />
                </Field>
                <Field label="Alamat">
                  <textarea
                    className="profile-input min-h-20 resize-none"
                    onChange={(e) => setAlamat(e.target.value)}
                    value={alamat}
                  />
                </Field>
              </>
            )}

            <div className="flex gap-3 pt-1">
              <button
                className="rounded-xl bg-sky-800 px-5 py-2.5 text-sm font-black text-white transition hover:bg-sky-900 disabled:opacity-60"
                disabled={saving}
                onClick={handleSave}
                type="button"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                onClick={() => { setEditing(false); setError(""); }}
                type="button"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-2">
            <InfoRow label="Nama" value={user.nama} />
            <InfoRow label="Username" value={`@${user.username}`} />
            <InfoRow label="Kategori" value={user.kategori} />
            {(user.kategori === "pengajar" || user.kategori === "admin" || user.kategori === "tamu") && (
              <>
                {detail?.universitas && <InfoRow label="Universitas" value={detail.universitas} />}
                {detail?.bidang && <InfoRow label="Bidang Studi" value={detail.bidang} />}
                {detail?.telepon && <InfoRow label="Telepon" value={detail.telepon} />}
                {detail?.alamat && <InfoRow label="Alamat" value={detail.alamat} />}
              </>
            )}
            {user.kategori === "murid" && (
              <>
                {detail?.tingkat && <InfoRow label="Tingkat" value={detail.tingkat} />}
                {detail?.umur && <InfoRow label="Umur" value={`${detail.umur} tahun`} />}
                {detail?.alamat && <InfoRow label="Alamat" value={detail.alamat} />}
              </>
            )}
          </dl>
        )}
      </div>

      {/* Password change */}
      <div className="rounded-[1.4rem] border border-sky-100 bg-white p-4 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black text-slate-800">Keamanan Akun</h3>
          <button
            className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100"
            onClick={() => { setShowPassword(!showPassword); setError(""); }}
            type="button"
          >
            {showPassword ? "Tutup" : "Ganti Password"}
          </button>
        </div>

        {showPassword && (
          <div className="mt-5 grid gap-4">
            <Field label="Password Saat Ini">
              <input
                autoComplete="current-password"
                className="profile-input"
                onChange={(e) => setPasswordLama(e.target.value)}
                type="password"
                value={passwordLama}
              />
            </Field>
            <Field label="Password Baru">
              <input
                autoComplete="new-password"
                className="profile-input"
                onChange={(e) => setPasswordBaru(e.target.value)}
                type="password"
                value={passwordBaru}
              />
            </Field>
            <Field label="Konfirmasi Password Baru">
              <input
                autoComplete="new-password"
                className="profile-input"
                onChange={(e) => setPasswordKonfirmasi(e.target.value)}
                type="password"
                value={passwordKonfirmasi}
              />
            </Field>
            <div className="pt-1">
              <button
                className="rounded-xl bg-sky-800 px-5 py-2.5 text-sm font-black text-white transition hover:bg-sky-900 disabled:opacity-60"
                disabled={savingPassword}
                onClick={handlePasswordSave}
                type="button"
              >
                {savingPassword ? "Menyimpan..." : "Simpan Password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <dt className="w-28 shrink-0 text-xs font-black uppercase tracking-wider text-slate-400">{label}:</dt>
      <dd className="font-bold text-slate-800">{value}</dd>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

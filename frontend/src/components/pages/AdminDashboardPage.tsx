"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  AdminAbsensi, AdminActivity, AdminContent, AdminLaporan,
  AdminSection, AdminUser, Category, Stats, TeacherToken, User,
} from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";
import { greeting } from "@/lib/utils";
import { AppDialog } from "@/components/ui/AppDialog";

type MsgState = { type: "ok" | "err"; text: string } | null;
type CreateUserResponse = { success: boolean; error?: string; user?: AdminUser };

export function AdminDashboardPage({ activeSection, csrfToken, onSectionChange, user }: { activeSection: AdminSection; csrfToken: string; onSectionChange: (section: AdminSection) => void; user: User }) {
  /* ── core data ───────────────────────────────────────────────── */
  const [stats, setStats] = useState<Stats>({ ebook: "-", tugas: "-", murid: "-", quiz: "-" });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tokens, setTokens] = useState<TeacherToken[]>([]);
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [content, setContent] = useState<AdminContent | null>(null);
  const [absensi, setAbsensi] = useState<AdminAbsensi | null>(null);
  const [laporan, setLaporan] = useState<AdminLaporan | null>(null);

  const loadedRef = useRef(new Set<string>());

  /* ── token ui ────────────────────────────────────────────────── */
  const [tokenLabel, setTokenLabel] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [tokenMsg, setTokenMsg] = useState<MsgState>(null);
  const [revealed, setRevealed] = useState<Set<number | string>>(new Set());
  const [copied, setCopied] = useState<number | string | null>(null);

  /* ── user ui ─────────────────────────────────────────────────── */
  const [filter, setFilter] = useState<"" | Category>("");
  const [query, setQuery] = useState("");
  const [userMsg, setUserMsg] = useState<MsgState>(null);
  const [createRole, setCreateRole] = useState<Category>("murid");
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: number | string; nama: string } | null>(null);

  /* ── content ui ──────────────────────────────────────────────── */
  const [contentMsg, setContentMsg] = useState<MsgState>(null);
  const [deleteContentTarget, setDeleteContentTarget] = useState<{ tipe: string; id: number } | null>(null);

  /* ── fetch ───────────────────────────────────────────────────── */
  function refreshAdminData() {
    readJson<Stats>(`${PHP_BASE}/backend/data/stats`).then(setStats).catch(() => undefined);
    readJson<AdminUser[]>(`${PHP_BASE}/backend/data/admin-users`).then(setUsers).catch(() => setUsers([]));
    readJson<TeacherToken[]>(`${PHP_BASE}/backend/data/admin-tokens`).then(setTokens).catch(() => setTokens([]));
    readJson<AdminActivity[]>(`${PHP_BASE}/backend/data/admin-activity`).then(setActivity).catch(() => setActivity([]));
  }

  useEffect(() => { refreshAdminData(); }, []);

  useEffect(() => {
    if (activeSection === "content" && !loadedRef.current.has("content")) {
      loadedRef.current.add("content");
      readJson<AdminContent>(`${PHP_BASE}/backend/data/admin-content`).then(setContent).catch(() => setContent(null));
    }
    if (activeSection === "absensi" && !loadedRef.current.has("absensi")) {
      loadedRef.current.add("absensi");
      readJson<AdminAbsensi>(`${PHP_BASE}/backend/data/admin-absensi`).then(setAbsensi).catch(() => setAbsensi(null));
    }
    if (activeSection === "laporan" && !loadedRef.current.has("laporan")) {
      loadedRef.current.add("laporan");
      readJson<AdminLaporan>(`${PHP_BASE}/backend/data/admin-laporan`).then(setLaporan).catch(() => setLaporan(null));
    }
  }, [activeSection]);

  /* ── derived ─────────────────────────────────────────────────── */
  const counts = useMemo(() => ({
    pengajar: users.filter((u) => u.kategori === "pengajar").length,
    murid:    users.filter((u) => u.kategori === "murid").length,
    tamu:     users.filter((u) => u.kategori === "tamu").length,
    admin:    users.filter((u) => u.kategori === "admin").length,
  }), [users]);

  const activeTokens = tokens.filter((t) => String(t.aktif ?? 1) === "1").length;
  const healthScore  = Math.min(100, 72 + Math.min(users.length, 18) + Math.min(tokens.length, 10));

  const shownUsers = users.filter((item) => {
    const roleMatch  = filter === "" || item.kategori === filter;
    const search     = query.trim().toLowerCase();
    const textMatch  = search === "" || `${item.nama ?? ""} ${item.username ?? ""} ${item.kategori ?? ""}`.toLowerCase().includes(search);
    return roleMatch && textMatch;
  });

  /* ── handlers ────────────────────────────────────────────────── */
  async function handleCreateToken(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setCreatingToken(true); setTokenMsg(null);
    const data = new FormData(e.currentTarget); data.set("csrf_token", csrfToken);
    try {
      const res = await readJson<{ success: boolean; error?: string; token?: TeacherToken }>(
        `${PHP_BASE}/backend/actions/generate-token`, { method: "POST", body: data },
      );
      if (res.success && res.token) {
        setTokens((p) => [res.token!, ...p]);
        setTokenLabel("");
        setTokenMsg({ type: "ok", text: "Token berhasil dibuat." });
        setRevealed((p) => new Set(p).add(res.token!.id));
        refreshAdminData();
      } else setTokenMsg({ type: "err", text: res.error ?? "Gagal membuat token" });
    } catch { setTokenMsg({ type: "err", text: "Tidak dapat menghubungi server" }); }
    finally { setCreatingToken(false); }
  }

  async function handleCreateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setCreatingUser(true); setUserMsg(null);
    const form = e.currentTarget;
    const data = new FormData(form); data.set("csrf_token", csrfToken); data.set("kategori", createRole);
    try {
      const res = await readJson<CreateUserResponse>(
        `${PHP_BASE}/backend/actions/admin-create-user`, { method: "POST", body: data },
      );
      if (res.success && res.user) {
        setUsers((p) => [res.user!, ...p]);
        setUserMsg({ type: "ok", text: `Akun ${res.user.username} berhasil dibuat.` });
        form.reset(); setCreateRole("murid"); refreshAdminData();
      } else setUserMsg({ type: "err", text: res.error ?? "Gagal membuat pengguna" });
    } catch { setUserMsg({ type: "err", text: "Tidak dapat menghubungi server" }); }
    finally { setCreatingUser(false); }
  }

  async function handleRevokeToken(id: number | string) {
    const data = new FormData(); data.set("csrf_token", csrfToken); data.set("id", String(id));
    try {
      const res = await readJson<{ success: boolean; error?: string }>(
        `${PHP_BASE}/backend/actions/revoke-token`, { method: "POST", body: data },
      );
      if (res.success) { setTokens((p) => p.filter((t) => t.id !== id)); setTokenMsg({ type: "ok", text: "Token dicabut." }); refreshAdminData(); }
      else setTokenMsg({ type: "err", text: res.error ?? "Gagal mencabut token" });
    } catch { setTokenMsg({ type: "err", text: "Tidak dapat menghubungi server" }); }
  }

  async function handleDeleteUser(userId: number | string, nama: string) {
    const data = new FormData(); data.set("csrf_token", csrfToken); data.set("user_id", String(userId));
    try {
      const res = await readJson<{ success: boolean; error?: string }>(
        `${PHP_BASE}/backend/deletes/user-admin`, { method: "POST", body: data },
      );
      if (res.success) { setUsers((p) => p.filter((u) => u.id !== userId)); setUserMsg({ type: "ok", text: `${nama} dihapus.` }); setDeleteUserTarget(null); refreshAdminData(); }
      else setUserMsg({ type: "err", text: res.error ?? "Gagal menghapus" });
    } catch { setUserMsg({ type: "err", text: "Tidak dapat menghubungi server" }); }
  }

  async function handleUpdateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editingUser) return; setUserMsg(null);
    const data = new FormData(e.currentTarget); data.set("csrf_token", csrfToken); data.set("user_id", String(editingUser.id));
    try {
      const res = await readJson<CreateUserResponse>(
        `${PHP_BASE}/backend/actions/admin-update-user`, { method: "POST", body: data },
      );
      if (res.success && res.user) {
        setUsers((p) => p.map((u) => (u.id === res.user!.id ? { ...u, ...res.user } : u)));
        setUserMsg({ type: "ok", text: "Pengguna diperbarui." }); setEditingUser(null); refreshAdminData();
      } else setUserMsg({ type: "err", text: res.error ?? "Gagal update" });
    } catch { setUserMsg({ type: "err", text: "Tidak dapat menghubungi server" }); }
  }

  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!resetUser) return;
    const data = new FormData(e.currentTarget); data.set("csrf_token", csrfToken); data.set("user_id", String(resetUser.id));
    try {
      const res = await readJson<{ success: boolean; error?: string }>(
        `${PHP_BASE}/backend/actions/admin-reset-password`, { method: "POST", body: data },
      );
      if (res.success) { setUserMsg({ type: "ok", text: `Password ${resetUser.username} direset.` }); setResetUser(null); }
      else setUserMsg({ type: "err", text: res.error ?? "Gagal reset" });
    } catch { setUserMsg({ type: "err", text: "Tidak dapat menghubungi server" }); }
  }

  async function handleDeleteContent(tipe: string, id: number) {
    setContentMsg(null);
    const data = new FormData(); data.set("csrf_token", csrfToken); data.set("tipe", tipe); data.set("id", String(id));
    try {
      const res = await readJson<{ success: boolean; error?: string }>(
        `${PHP_BASE}/backend/deletes/konten-admin`, { method: "POST", body: data },
      );
      if (res.success) {
        setContent((prev) => {
          if (!prev) return prev;
          const u = { ...prev };
          if (tipe === "ebook")       u.ebook       = prev.ebook.filter((x) => x.id !== id);
          if (tipe === "quiz")        u.quiz         = prev.quiz.filter((x) => x.id !== id);
          if (tipe === "tugas")       u.tugas        = prev.tugas.filter((x) => x.id !== id);
          if (tipe === "dokumentasi") u.dokumentasi  = prev.dokumentasi.filter((x) => x.id !== id);
          return u;
        });
        setDeleteContentTarget(null);
        setContentMsg({ type: "ok", text: "Item berhasil dihapus." });
      } else setContentMsg({ type: "err", text: res.error ?? "Gagal menghapus" });
    } catch { setContentMsg({ type: "err", text: "Tidak dapat menghubungi server" }); }
  }

  function exportUsersCsv() {
    const rows = [
      ["id", "nama", "username", "kategori", "created_at"],
      ...shownUsers.map((u) => [u.id, u.nama ?? "", u.username ?? "", u.kategori ?? "", u.created_at ?? ""]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "teach-skl-users.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function toggleReveal(id: number | string) {
    setRevealed((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function copyToken(id: number | string, token: string) {
    try { await navigator.clipboard.writeText(token); setCopied(id); setTimeout(() => setCopied(null), 1800); }
    catch { setTokenMsg({ type: "err", text: "Clipboard tidak tersedia" }); }
  }

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div className="grid gap-6">

      {/* ── hero ── */}
      <section className="relative overflow-hidden rounded-[2rem] bg-sky-950 p-6 text-white shadow-xl md:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-sky-300/10" />
        <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-start">
          <div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">{greeting()}, {user.nama}</h1>
          </div>
          <div className="grid min-w-56 gap-2 rounded-3xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wide text-sky-200">System Health</span>
              <strong>{healthScore}%</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-sky-300" style={{ width: `${healthScore}%` }} />
            </div>
            <p className="text-xs font-bold text-sky-100">{activeTokens} token aktif · {users.length} pengguna</p>
          </div>
        </div>
      </section>

      <div className="min-w-0 grid gap-6">
          {/* ── overview ── */}
          {activeSection === "overview" && (
            <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
            <StatCard label="Pengajar"    value={counts.pengajar} tone="bg-sky-500" />
            <StatCard label="Murid"       value={counts.murid}    tone="bg-emerald-500" />
            <StatCard label="Tamu"        value={counts.tamu}     tone="bg-amber-400" />
            <StatCard label="Admin"       value={counts.admin}    tone="bg-purple-500" />
            <StatCard label="E-Book"      value={stats.ebook}     tone="bg-cyan-600" />
            <StatCard label="Quiz"        value={stats.quiz}      tone="bg-violet-500" />
            <StatCard label="Bank Tugas"  value={stats.tugas}     tone="bg-rose-400" />
            <StatCard label="Token Aktif" value={activeTokens}    tone="bg-indigo-500" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
            <ActivityPanel activity={activity.slice(0, 6)} />
            <Panel title="Quick Actions" caption="Pintasan ke operasi admin yang sering digunakan.">
              <div className="grid gap-3">
                <QuickAction title="Buat akun baru"     text="Admin, pengajar, murid, atau tamu."           onClick={() => onSectionChange("create")} />
                <QuickAction title="Token pengajar"     text="Generate token untuk pendaftaran pengajar."   onClick={() => onSectionChange("tokens")} />
                <QuickAction title="Audit pengguna"     text="Cari, edit, reset password, hapus akun."      onClick={() => onSectionChange("users")} />
                <QuickAction title="Kelola konten"      text="Ebook, quiz, bank tugas, dokumentasi."        onClick={() => onSectionChange("content")} />
                <QuickAction title="Rekap absensi"      text="Kehadiran murid dan pengajar."                onClick={() => onSectionChange("absensi")} />
                <QuickAction title="Laporan &amp; nilai" text="Top scorer, raport, dan ulasan tamu."        onClick={() => onSectionChange("laporan")} />
              </div>
            </Panel>
          </div>
            </div>
          )}

          {activeSection === "create"   && <CreateUserPanel createRole={createRole} creatingUser={creatingUser} message={userMsg} onRoleChange={setCreateRole} onSubmit={handleCreateUser} />}
          {activeSection === "tokens"   && <TokenPanel copied={copied} creatingToken={creatingToken} message={tokenMsg} onCopy={copyToken} onCreate={handleCreateToken} onReveal={toggleReveal} onRevoke={handleRevokeToken} onTokenLabel={setTokenLabel} revealed={revealed} tokenLabel={tokenLabel} tokens={tokens} />}
          {activeSection === "users"    && <UsersPanel counts={counts} currentUserId={user.id} filter={filter} message={userMsg} onDelete={(id, nama) => setDeleteUserTarget({ id, nama })} onEdit={setEditingUser} onExport={exportUsersCsv} onFilter={setFilter} onQuery={setQuery} onReset={setResetUser} query={query} shownUsers={shownUsers} />}
          {activeSection === "content"  && <ContentPanel content={content} message={contentMsg} onDelete={(tipe, id) => setDeleteContentTarget({ tipe, id })} />}
          {activeSection === "absensi"  && <AbsensiPanel data={absensi} />}
          {activeSection === "laporan"  && <LaporanPanel data={laporan} />}
          {activeSection === "activity" && <ActivityPanel activity={activity} full />}
      </div>

      {editingUser && <EditUserModal onClose={() => setEditingUser(null)} onSubmit={handleUpdateUser} user={editingUser} />}
      {resetUser   && <ResetPasswordModal onClose={() => setResetUser(null)} onSubmit={handleResetPassword} user={resetUser} />}
      <AppDialog open={Boolean(deleteUserTarget)} title="Hapus pengguna?" description={`Pengguna "${deleteUserTarget?.nama ?? "ini"}" akan dihapus permanen.`} tone="danger" cancelLabel="Batal" confirmLabel="Hapus" onCancel={() => setDeleteUserTarget(null)} onConfirm={() => deleteUserTarget && handleDeleteUser(deleteUserTarget.id, deleteUserTarget.nama)} />
      <AppDialog open={Boolean(deleteContentTarget)} title="Hapus konten?" description="Item konten ini akan dihapus permanen." tone="danger" cancelLabel="Batal" confirmLabel="Hapus" onCancel={() => setDeleteContentTarget(null)} onConfirm={() => deleteContentTarget && handleDeleteContent(deleteContentTarget.tipe, deleteContentTarget.id)} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════════════════ */

function CreateUserPanel({ createRole, creatingUser, message, onRoleChange, onSubmit }: {
  createRole: Category; creatingUser: boolean; message: MsgState;
  onRoleChange: (r: Category) => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Panel title="Buat Akun Baru" caption="Provisioning akun lengkap dengan detail sesuai role.">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="field" name="nama"     placeholder="Nama lengkap" required />
          <input className="field" name="username" placeholder="Username"     required />
          <input className="field" name="password" placeholder="Password awal" type="password" minLength={6} required />
          <select className="field" value={createRole} onChange={(e) => onRoleChange(e.target.value as Category)}>
            <option value="murid">Murid</option>
            <option value="pengajar">Pengajar</option>
            <option value="tamu">Tamu</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {createRole === "pengajar" && (
          <div className="grid gap-3 md:grid-cols-2">
            <input className="field" name="universitas" placeholder="Universitas" />
            <input className="field" name="bidang"      placeholder="Bidang" />
            <input className="field" name="telepon"     placeholder="Telepon" />
            <input className="field" name="alamat"      placeholder="Alamat" />
          </div>
        )}
        {createRole === "murid" && (
          <div className="grid gap-3 md:grid-cols-3">
            <select className="field" name="tingkat" defaultValue="SD">
              <option value="TK">TK</option><option value="SD">SD</option>
              <option value="SMP">SMP</option><option value="SMA">SMA</option>
            </select>
            <input className="field" name="umur"   placeholder="Umur" type="number" min={1} />
            <input className="field" name="alamat" placeholder="Alamat" />
          </div>
        )}
        <button className="btn-primary rounded-2xl px-5 py-3" disabled={creatingUser} type="submit">
          {creatingUser ? "Membuat..." : "Buat Akun"}
        </button>
      </form>
      {message && <Message state={message} />}
    </Panel>
  );
}

function TokenPanel({ copied, creatingToken, message, onCopy, onCreate, onReveal, onRevoke, onTokenLabel, revealed, tokenLabel, tokens }: {
  copied: number | string | null; creatingToken: boolean; message: MsgState;
  onCopy: (id: number | string, token: string) => void;
  onCreate: (e: FormEvent<HTMLFormElement>) => void;
  onReveal: (id: number | string) => void;
  onRevoke: (id: number | string) => void;
  onTokenLabel: (v: string) => void;
  revealed: Set<number | string>; tokenLabel: string; tokens: TeacherToken[];
}) {
  return (
    <Panel title="Teacher Token Vault" caption="Generate, lihat, salin, atau cabut token pengajar.">
      <form className="flex gap-2" onSubmit={onCreate}>
        <input className="field flex-1 text-sm" name="label" maxLength={100} onChange={(e) => onTokenLabel(e.target.value)} placeholder="Label token (opsional)" type="text" value={tokenLabel} />
        <button className="btn-primary shrink-0 rounded-xl px-4 py-2 text-sm" disabled={creatingToken} type="submit">{creatingToken ? "..." : "Generate"}</button>
      </form>
      {message && <Message state={message} />}
      <div className="mt-4 max-h-[32rem] overflow-y-auto rounded-2xl border border-sky-50">
        {tokens.length === 0 ? <Empty text="Belum ada token" /> : tokens.map((t) => {
          const isRev = revealed.has(t.id);
          return (
            <div className="flex items-center gap-3 border-b border-sky-50 px-4 py-3 last:border-b-0" key={t.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-slate-500">{t.label || "Tanpa label"}</p>
                <code className={`mt-1 inline-flex rounded-lg px-2 py-1 text-xs font-bold ${isRev ? "bg-sky-50 text-sky-800" : "bg-slate-100 text-slate-400"}`}>
                  {isRev ? t.token : "••••••••••••••••••"}
                </code>
              </div>
              <button className="text-xs font-black text-slate-500 hover:text-slate-700" onClick={() => onReveal(t.id)} type="button">{isRev ? "Sembunyikan" : "Lihat"}</button>
              {isRev && <button className="text-xs font-black text-sky-600" onClick={() => onCopy(t.id, t.token)} type="button">{copied === t.id ? "Tersalin!" : "Salin"}</button>}
              <button className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-black text-red-500 hover:bg-red-100" onClick={() => onRevoke(t.id)} type="button">Cabut</button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function UsersPanel({ counts, currentUserId, filter, message, onDelete, onEdit, onExport, onFilter, onQuery, onReset, query, shownUsers }: {
  counts: Record<"pengajar" | "murid" | "tamu" | "admin", number>; currentUserId: number | string;
  filter: "" | Category; message: MsgState;
  onDelete: (id: number | string, nama: string) => void;
  onEdit: (u: AdminUser) => void; onExport: () => void;
  onFilter: (r: "" | Category) => void; onQuery: (v: string) => void;
  onReset: (u: AdminUser) => void; query: string; shownUsers: AdminUser[];
}) {
  const filters: Array<{ label: string; value: "" | Category }> = [
    { label: "Semua", value: "" },
    { label: `Pengajar (${counts.pengajar})`, value: "pengajar" },
    { label: `Murid (${counts.murid})`,       value: "murid" },
    { label: `Tamu (${counts.tamu})`,         value: "tamu" },
    { label: `Admin (${counts.admin})`,       value: "admin" },
  ];
  return (
    <Panel title="Manajemen Pengguna" caption="Cari, filter, edit profil, reset password, export CSV, atau hapus akun.">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input className="field" placeholder="Cari nama, username, atau role..." value={query} onChange={(e) => onQuery(e.target.value)} />
        <button className="rounded-2xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 hover:bg-sky-100" onClick={onExport} type="button">Export CSV</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button className={`rounded-xl px-3 py-1 text-xs font-black ${filter === f.value ? "bg-sky-800 text-white" : "bg-slate-100 text-slate-500"}`} key={f.value} onClick={() => onFilter(f.value)} type="button">{f.label}</button>
        ))}
      </div>
      {message && <Message state={message} />}
      <div className="mt-4 max-h-[34rem] overflow-y-auto rounded-2xl border border-sky-50">
        {shownUsers.length === 0 ? <Empty text="Tidak ada pengguna" /> : shownUsers.map((target) => (
          <div className="flex items-center gap-3 border-b border-sky-50 px-4 py-3 last:border-b-0" key={target.id}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sm font-black text-sky-800">{target.nama?.charAt(0) ?? "U"}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-black text-slate-800">{target.nama}</p>
                <KategoriBadge kategori={target.kategori} />
              </div>
              <p className="text-xs font-bold text-slate-400">
                @{target.username}
                {target.kategori === "murid" && target.tingkat ? ` · ${target.tingkat}` : ""}
                {target.kategori === "pengajar" && target.universitas ? ` · ${target.universitas}` : ""}
                {" · "}{target.created_at ?? "-"}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600 hover:bg-slate-100" onClick={() => onEdit(target)} type="button">Edit</button>
              <button className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-600 hover:bg-amber-100" onClick={() => onReset(target)} type="button">Reset PW</button>
              {target.id !== currentUserId && (
                <button className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-black text-red-500 hover:bg-red-100" onClick={() => onDelete(target.id, target.nama ?? String(target.id))} type="button">Hapus</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ContentPanel({ content, message, onDelete }: {
  content: AdminContent | null; message: MsgState;
  onDelete: (tipe: string, id: number) => void;
}) {
  const [tab, setTab] = useState<"ebook" | "quiz" | "tugas" | "dokumentasi">("ebook");

  if (!content) {
    return (
      <Panel title="Manajemen Konten" caption="Ebook, quiz, bank tugas, dokumentasi.">
        <p className="py-10 text-center text-sm font-bold text-slate-300">Memuat konten...</p>
      </Panel>
    );
  }

  const tabs: Array<["ebook" | "quiz" | "tugas" | "dokumentasi", string, number]> = [
    ["ebook",       "E-Book",      content.counts.ebook],
    ["quiz",        "Quiz",        content.counts.quiz],
    ["tugas",       "Bank Tugas",  content.counts.tugas],
    ["dokumentasi", "Dokumentasi", content.counts.dokumentasi],
  ];

  return (
    <Panel title="Manajemen Konten" caption="Lihat dan hapus konten dari semua modul.">
      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map(([key, label, count]) => (
          <button className={`rounded-xl px-3 py-1.5 text-xs font-black ${tab === key ? "bg-sky-800 text-white" : "bg-slate-100 text-slate-500"}`} key={key} onClick={() => setTab(key)} type="button">
            {label} <span className="ml-1 opacity-70">({count})</span>
          </button>
        ))}
      </div>
      {message && <Message state={message} />}
      <div className="max-h-[36rem] overflow-y-auto rounded-2xl border border-sky-50">
        {tab === "ebook" && (content.ebook.length === 0 ? <Empty text="Belum ada ebook" /> : content.ebook.map((e) => (
          <ContentRow key={e.id} title={e.judul_materi} meta={`${e.pelajaran} · ${e.tanggal_upload}`} onDelete={() => onDelete("ebook", e.id)} />
        )))}
        {tab === "quiz" && (content.quiz.length === 0 ? <Empty text="Belum ada quiz" /> : content.quiz.map((q) => (
          <ContentRow key={q.id} title={q.soal ? `${q.soal.substring(0, 60)}…` : "Quiz"} meta={`${q.pelajaran} · ${q.tipe}`} onDelete={() => onDelete("quiz", q.id)} />
        )))}
        {tab === "tugas" && (content.tugas.length === 0 ? <Empty text="Belum ada tugas" /> : content.tugas.map((t) => (
          <ContentRow key={t.id} title={t.judul_tugas} meta={`${t.pelajaran} · Deadline: ${t.deadline ?? "-"}`} onDelete={() => onDelete("tugas", t.id)} />
        )))}
        {tab === "dokumentasi" && (content.dokumentasi.length === 0 ? <Empty text="Belum ada dokumentasi" /> : content.dokumentasi.map((d) => (
          <ContentRow key={d.id} title={d.judul} meta={`${d.tipe} · ${d.tanggal_upload}`} onDelete={() => onDelete("dokumentasi", d.id)} />
        )))}
      </div>
    </Panel>
  );
}

function AbsensiPanel({ data }: { data: AdminAbsensi | null }) {
  if (!data) {
    return (
      <Panel title="Rekap Absensi" caption="Statistik kehadiran murid dan pengajar.">
        <p className="py-10 text-center text-sm font-bold text-slate-300">Memuat data absensi...</p>
      </Panel>
    );
  }

  const statuses = ["hadir", "izin", "sakit", "alpha"] as const;
  const statusColor: Record<string, string> = {
    hadir: "bg-emerald-100 text-emerald-700",
    izin:  "bg-amber-100 text-amber-700",
    sakit: "bg-sky-100 text-sky-700",
    alpha: "bg-red-100 text-red-700",
  };
  const muridTotal    = Object.values(data.murid).reduce((a, b) => a + b, 0);
  const pengajarTotal = Object.values(data.pengajar).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Absensi Murid" caption={`Total ${muridTotal} catatan`}>
          <div className="grid gap-4">
            {statuses.map((s) => (
              <div className="flex items-center gap-3" key={s}>
                <span className={`w-16 shrink-0 rounded-xl px-2 py-1 text-center text-xs font-black ${statusColor[s]}`}>{s}</span>
                <div className="min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-sky-400 transition-all" style={{ width: muridTotal ? `${((data.murid[s] ?? 0) / muridTotal) * 100}%` : "0%" }} />
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-black text-slate-700">{data.murid[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Absensi Pengajar" caption={`Total ${pengajarTotal} catatan`}>
          <div className="grid gap-4">
            {statuses.map((s) => (
              <div className="flex items-center gap-3" key={s}>
                <span className={`w-16 shrink-0 rounded-xl px-2 py-1 text-center text-xs font-black ${statusColor[s]}`}>{s}</span>
                <div className="min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-emerald-400 transition-all" style={{ width: pengajarTotal ? `${((data.pengajar[s] ?? 0) / pengajarTotal) * 100}%` : "0%" }} />
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-black text-slate-700">{data.pengajar[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Catatan Terbaru" caption="30 catatan absensi terakhir lintas murid dan pengajar.">
        <div className="max-h-[28rem] overflow-y-auto rounded-2xl border border-sky-50">
          {data.recent.length === 0 ? <Empty text="Belum ada catatan" /> : data.recent.map((r, i) => (
            <div className="flex items-center gap-3 border-b border-sky-50 px-4 py-3 last:border-b-0" key={i}>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-800">{r.nama}</p>
                <p className="text-xs font-bold text-slate-400">{r.tipe} · {r.tanggal}</p>
              </div>
              <span className={`rounded-xl px-2 py-1 text-xs font-black ${statusColor[r.status] ?? "bg-slate-100 text-slate-500"}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function LaporanPanel({ data }: { data: AdminLaporan | null }) {
  if (!data) {
    return (
      <Panel title="Laporan & Statistik" caption="Top scorer, raport bulanan, dan ulasan tamu.">
        <p className="py-10 text-center text-sm font-bold text-slate-300">Memuat laporan...</p>
      </Panel>
    );
  }

  const months = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.65fr]">
        <Panel title="Top Scorer Quiz" caption="10 murid dengan rata-rata nilai quiz tertinggi.">
          <div className="max-h-[24rem] overflow-y-auto rounded-2xl border border-sky-50">
            {data.top_scores.length === 0 ? <Empty text="Belum ada data nilai" /> : data.top_scores.map((s, i) => (
              <div className="flex items-center gap-3 border-b border-sky-50 px-4 py-3 last:border-b-0" key={i}>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sm font-black text-sky-700">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-slate-800">{s.nama}</p>
                  <p className="text-xs font-bold text-slate-400">@{s.username} · {s.total_quiz} quiz</p>
                </div>
                <strong className="text-lg font-black text-sky-700">{s.rata_nilai}</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Ulasan Tamu" caption={`${data.total_ulasan} ulasan · rata-rata ${data.avg_rating ?? "-"} ★`}>
          <div className="grid gap-3">
            {[5, 4, 3, 2, 1].map((r) => (
              <div className="flex items-center gap-3" key={r}>
                <span className="w-6 shrink-0 text-sm font-black text-amber-400">{r}★</span>
                <div className="min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-amber-400 transition-all" style={{ width: data.total_ulasan ? `${((data.ulasan[r] ?? 0) / data.total_ulasan) * 100}%` : "0%" }} />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-black text-slate-500">{data.ulasan[r] ?? 0}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Raport Bulanan Terbaru" caption="15 entri raport terakhir lintas murid.">
        <div className="max-h-[24rem] overflow-y-auto rounded-2xl border border-sky-50">
          {data.raport.length === 0 ? <Empty text="Belum ada raport" /> : data.raport.map((r, i) => (
            <div className="flex items-center gap-3 border-b border-sky-50 px-4 py-3 last:border-b-0" key={i}>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-800">{r.nama}</p>
                <p className="text-xs font-bold text-slate-400">{months[Number(r.bulan)] ?? r.bulan} {r.tahun}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-800">{r.nilai_akhir ?? "-"}</p>
                <p className="text-xs font-bold text-slate-400">Quiz: {r.nilai_quiz ?? "-"}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function EditUserModal({ onClose, onSubmit, user }: {
  onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void; user: AdminUser;
}) {
  const [role, setRole] = useState<Category>(user.kategori ?? "murid");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form className="w-full max-w-2xl rounded-[1.6rem] bg-white p-6 shadow-2xl" onSubmit={onSubmit}>
        <div className="mb-5 flex items-center justify-between">
          <div><h3 className="text-xl font-black text-slate-900">Edit Pengguna</h3><p className="text-sm font-bold text-slate-400">@{user.username}</p></div>
          <button className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-black hover:bg-slate-200" onClick={onClose} type="button">Tutup</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="field" name="nama" defaultValue={user.nama} placeholder="Nama" required />
          <select className="field" name="kategori" value={role} onChange={(e) => setRole(e.target.value as Category)}>
            <option value="murid">Murid</option><option value="pengajar">Pengajar</option>
            <option value="tamu">Tamu</option><option value="admin">Admin</option>
          </select>
        </div>
        {role === "pengajar" && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="field" name="universitas" defaultValue={user.universitas} placeholder="Universitas" />
            <input className="field" name="bidang"      defaultValue={user.bidang}      placeholder="Bidang" />
            <input className="field" name="telepon"     defaultValue={user.telepon}     placeholder="Telepon" />
            <input className="field" name="alamat"      defaultValue={user.alamat}      placeholder="Alamat" />
          </div>
        )}
        {role === "murid" && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <select className="field" name="tingkat" defaultValue={user.tingkat ?? "SD"}>
              <option value="TK">TK</option><option value="SD">SD</option>
              <option value="SMP">SMP</option><option value="SMA">SMA</option>
            </select>
            <input className="field" name="umur"   defaultValue={user.umur}   placeholder="Umur" type="number" />
            <input className="field" name="alamat" defaultValue={user.alamat} placeholder="Alamat" />
          </div>
        )}
        <button className="btn-primary mt-5 rounded-2xl px-5 py-3" type="submit">Simpan Perubahan</button>
      </form>
    </div>
  );
}

function ResetPasswordModal({ onClose, onSubmit, user }: {
  onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void; user: AdminUser;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form className="w-full max-w-md rounded-[1.6rem] bg-white p-6 shadow-2xl" onSubmit={onSubmit}>
        <div className="mb-5 flex items-center justify-between">
          <div><h3 className="text-xl font-black text-slate-900">Reset Password</h3><p className="text-sm font-bold text-slate-400">@{user.username}</p></div>
          <button className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-black hover:bg-slate-200" onClick={onClose} type="button">Tutup</button>
        </div>
        <input className="field" name="password" placeholder="Password baru (min. 6 karakter)" type="password" minLength={6} required />
        <button className="btn-primary mt-5 rounded-2xl px-5 py-3" type="submit">Reset Password</button>
      </form>
    </div>
  );
}

function ActivityPanel({ activity, full = false }: { activity: AdminActivity[]; full?: boolean }) {
  return (
    <Panel title="Activity Timeline" caption="Jejak operasional terbaru lintas modul.">
      <div className={`grid gap-2 overflow-y-auto pr-1 ${full ? "max-h-[42rem]" : "max-h-[24rem]"}`}>
        {activity.map((item, i) => (
          <article className="rounded-2xl border border-sky-50 bg-slate-50 p-4" key={`${item.type}-${item.time}-${i}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-slate-800">{item.title || "Aktivitas"}</p>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-sky-700">{item.type}</span>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-500">{item.meta}</p>
            <p className="mt-2 text-xs font-bold text-slate-400">{item.time ?? "-"}</p>
          </article>
        ))}
        {activity.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-300">Belum ada aktivitas</p>}
      </div>
    </Panel>
  );
}

function ContentRow({ meta, onDelete, title }: { meta: string; onDelete: () => void; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-sky-50 px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-slate-800">{title}</p>
        <p className="text-xs font-bold text-slate-400">{meta}</p>
      </div>
      <button className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-black text-red-500 hover:bg-red-100" onClick={onDelete} type="button">Hapus</button>
    </div>
  );
}

function QuickAction({ onClick, text, title }: { onClick: () => void; text: string; title: string }) {
  return (
    <button className="rounded-2xl border border-sky-50 bg-slate-50 p-4 text-left transition hover:border-sky-100 hover:bg-sky-50" onClick={onClick} type="button">
      <p className="font-black text-slate-800">{title}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-500">{text}</p>
    </button>
  );
}

function Panel({ caption, children, title }: { caption: string; children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-[1.4rem] border border-sky-100 bg-white p-6 shadow-sm">
      <h3 className="font-black text-slate-800">{title}</h3>
      <p className="mt-1 text-xs font-bold text-slate-400">{caption}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Message({ state }: { state: Exclude<MsgState, null> }) {
  return <p className={`mt-3 rounded-2xl px-3 py-2 text-xs font-bold ${state.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{state.text}</p>;
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm font-bold text-slate-300">{text}</p>;
}

function StatCard({ label, tone, value }: { label: string; tone: string; value: number | string }) {
  return (
    <div className={`${tone} min-h-24 rounded-2xl p-5 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}>
      <strong className="block text-3xl leading-none">{value}</strong>
      <span className="mt-2 block text-sm font-black">{label}</span>
    </div>
  );
}

function KategoriBadge({ kategori }: { kategori?: Category | string }) {
  const map: Record<string, string> = {
    pengajar: "bg-sky-100 text-sky-700",
    murid:    "bg-emerald-100 text-emerald-700",
    tamu:     "bg-amber-100 text-amber-700",
    admin:    "bg-purple-100 text-purple-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${map[kategori ?? ""] ?? "bg-slate-100 text-slate-500"}`}>{kategori}</span>;
}

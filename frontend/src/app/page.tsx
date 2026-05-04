"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminSection, AuthResponse, Detail, PageKey, User } from "@/types";
import { API_AUTH, readJson } from "@/lib/api";
import { navFor, pageLabels } from "@/lib/utils";
import { AuthPage } from "@/components/auth/AuthPage";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { EbookPage } from "@/components/pages/EbookPage";
import { TugasPage } from "@/components/pages/TugasPage";
import { QuizPage } from "@/components/pages/QuizPage";
import { PointMuridPage } from "@/components/pages/PointMuridPage";
import { DaftarMuridPage } from "@/components/pages/DaftarMuridPage";
import { AbsensiMuridPage } from "@/components/pages/AbsensiMuridPage";
import { AbsensiPengajarPage } from "@/components/pages/AbsensiPengajarPage";
import { RaportPage } from "@/components/pages/RaportPage";
import { DokumentasiPage } from "@/components/pages/DokumentasiPage";
import { UlasanPage } from "@/components/pages/UlasanPage";
import { DonasiPage } from "@/components/pages/DonasiPage";
import { PlaceholderPage } from "@/components/pages/PlaceholderPage";
import { AdminDashboardPage } from "@/components/pages/AdminDashboardPage";
import { MobileNav } from "@/components/layout/MobileNav";

const SESSION_CACHE_KEY = "teach_skl_session_snapshot";
const SESSION_CACHE_TTL = 1000 * 60 * 60 * 8;
const PROFILE_PAGE: PageKey = "profil";

type SessionSnapshot = {
  expiresAt: number;
  user: User;
  detail: Detail | null;
};

function readSessionSnapshot(): SessionSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as SessionSnapshot;
    if (!snapshot.user || snapshot.expiresAt <= Date.now()) {
      window.localStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return snapshot;
  } catch {
    window.localStorage.removeItem(SESSION_CACHE_KEY);
    return null;
  }
}

function writeSessionSnapshot(user: User | null, detail: Detail | null) {
  if (typeof window === "undefined") return;

  if (!user) {
    window.localStorage.removeItem(SESSION_CACHE_KEY);
    return;
  }

  window.localStorage.setItem(
    SESSION_CACHE_KEY,
    JSON.stringify({
      detail,
      expiresAt: Date.now() + SESSION_CACHE_TTL,
      user,
    } satisfies SessionSnapshot),
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [message, setMessage] = useState("");
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [activeAdminSection, setActiveAdminSection] = useState<AdminSection>("overview");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const snapshot = readSessionSnapshot();
    if (snapshot) {
      window.setTimeout(() => {
        setUser(snapshot.user);
        setDetail(snapshot.detail);
        if (snapshot.user.kategori === "admin") setActivePage("adminpanel");
        if (snapshot.user.kategori === "tamu") setActivePage("dokumentasi");
        setCheckingSession(false);
      }, 0);
    }

    readJson<AuthResponse>(`${API_AUTH}?action=me`)
      .then((payload) => {
        setCsrfToken(payload.csrfToken ?? "");
        setUser(payload.user ?? null);
        setDetail(payload.detail ?? null);
        if (payload.user?.kategori === "admin") setActivePage("adminpanel");
        if (payload.user?.kategori === "tamu") setActivePage("dokumentasi");
        writeSessionSnapshot(payload.user ?? null, payload.detail ?? null);
      })
      .catch(() => {
        if (!snapshot) setMessage("Tidak bisa menghubungi backend PHP. Coba refresh halaman.");
      })
      .finally(() => setCheckingSession(false));
  }, []);

  const visibleNav = useMemo(() => (user ? navFor(user.kategori) : []), [user]);
  const allowedPages = useMemo(() => (user ? [...visibleNav, PROFILE_PAGE] : visibleNav), [user, visibleNav]);
  const effectiveActivePage = user && !allowedPages.includes(activePage) ? visibleNav[0] ?? "dashboard" : activePage;

  function navigate(page: PageKey) {
    setActivePage(page);
    if (page === PROFILE_PAGE) return;
    if (page === "adminpanel" && user?.kategori === "admin") return;
    if (user?.kategori === "admin") setActiveAdminSection("overview");
  }

  function changeAdminSection(section: AdminSection) {
    setActiveAdminSection(section);
    if (user?.kategori === "admin") setActivePage("adminpanel");
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    const data = new FormData();
    data.set("csrf_token", csrfToken);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 320));
      await readJson<AuthResponse>(`${API_AUTH}?action=logout`, { method: "POST", body: data });
      writeSessionSnapshot(null, null);
      setUser(null);
      setDetail(null);
      setActivePage("dashboard");
      const next = await readJson<AuthResponse>(`${API_AUTH}?action=csrf`);
      setCsrfToken(next.csrfToken ?? "");
    } finally {
      setLoggingOut(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f8fb] p-6">
        <div className="rounded-[2rem] border border-sky-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-xl font-black text-sky-900">T</div>
          <p className="font-black text-slate-900">Memuat sesi...</p>
          <p className="mt-1 text-sm font-bold text-slate-500">Mengecek sesi login</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <AuthPage
        csrfToken={csrfToken}
        setCsrfToken={setCsrfToken}
        setDetail={setDetail}
        setUser={setUser}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb]">
      <Sidebar
        activePage={effectiveActivePage}
        activeAdminSection={activeAdminSection}
        onAdminSectionChange={changeAdminSection}
        onLogout={logout}
        loggingOut={loggingOut}
        onNavigate={navigate}
        user={user}
        visibleNav={visibleNav}
      />
      <MobileNav
        activePage={effectiveActivePage}
        activeAdminSection={activeAdminSection}
        onAdminSectionChange={changeAdminSection}
        onLogout={logout}
        loggingOut={loggingOut}
        onNavigate={navigate}
        user={user}
        visibleNav={visibleNav}
      />
      <section className="pt-14 lg:pl-72 lg:pt-0">
        <div className="p-4 md:p-8">
          {message && (
            <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">{message}</div>
          )}
          <PageContent
            activePage={effectiveActivePage}
            activeAdminSection={activeAdminSection}
            csrfToken={csrfToken}
            detail={detail}
            setDetail={setDetail}
            setMessage={setMessage}
            setUser={setUser}
            onAdminSectionChange={changeAdminSection}
            user={user}
          />
        </div>
      </section>
    </main>
  );
}

function PageContent({
  activePage,
  activeAdminSection,
  csrfToken,
  detail,
  setDetail,
  setMessage,
  setUser,
  onAdminSectionChange,
  user,
}: {
  activePage: PageKey;
  activeAdminSection: AdminSection;
  csrfToken: string;
  detail: Detail | null;
  setDetail: (d: Detail | null) => void;
  setMessage: (message: string) => void;
  setUser: (u: User) => void;
  onAdminSectionChange: (section: AdminSection) => void;
  user: User;
}) {
  if (activePage === "dashboard") return <DashboardHome user={user} />;
  if (activePage === "profil")
    return (
      <ProfileCard
        csrfToken={csrfToken}
        detail={detail}
        onUpdate={(u, d) => { setUser(u); setDetail(d); writeSessionSnapshot(u, d); }}
        user={user}
      />
    );
  if (activePage === "ebook")
    return <EbookPage category={user.kategori} csrfToken={csrfToken} isPengajar={user.kategori === "pengajar"} setMessage={setMessage} studentLevel={detail?.tingkat} />;
  if (activePage === "banktugas")
    return <TugasPage category={user.kategori} csrfToken={csrfToken} />;
  if (activePage === "quiz")
    return <QuizPage category={user.kategori} csrfToken={csrfToken} />;
  if (activePage === "pointmurid")
    return <PointMuridPage category={user.kategori} />;
  if (activePage === "daftarmurid")
    return <DaftarMuridPage />;
  if (activePage === "absensimurid")
    return <AbsensiMuridPage category={user.kategori} csrfToken={csrfToken} />;
  if (activePage === "absensipengajar")
    return <AbsensiPengajarPage csrfToken={csrfToken} />;
  if (activePage === "raport")
    return <RaportPage category={user.kategori} csrfToken={csrfToken} />;
  if (activePage === "dokumentasi")
    return <DokumentasiPage category={user.kategori} csrfToken={csrfToken} />;
  if (activePage === "adminpanel")
    return <AdminDashboardPage activeSection={activeAdminSection} csrfToken={csrfToken} onSectionChange={onAdminSectionChange} user={user} />;
  if (activePage === "ulasan")
    return <UlasanPage category={user.kategori} csrfToken={csrfToken} />;
  if (activePage === "donasi")
    return <DonasiPage csrfToken={csrfToken} />;
  return <PlaceholderPage label={pageLabels[activePage]} />;
}

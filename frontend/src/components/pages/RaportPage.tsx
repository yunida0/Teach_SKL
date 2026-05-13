"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Category, MuridListItem, RaportItem } from "@/types";
import { PHP_BASE, readJson } from "@/lib/api";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { subjects, subjectsByLevel } from "@/lib/utils";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type Breakdown = { quiz: number; tugas: number; kehadiran: number; bonus: number; nilai_akhir: number };
type RaportResponse = { success?: boolean; nilai_akhir?: number; breakdown?: Omit<Breakdown, "nilai_akhir">; error?: string };
type RaportModalMode = "generate" | "edit";

function scoreTone(score: number) {
  if (score >= 85) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (score >= 70) return "border-sky-200 bg-sky-50 text-sky-800";
  if (score >= 55) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function StatPill({ label, value, unit = "" }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-black text-slate-800">{value}{unit}</p>
    </div>
  );
}

function subjectOptions(level?: string, currentSubject?: string) {
  const levelSubjects = level ? subjectsByLevel[level] : undefined;
  const merged = [currentSubject, ...(levelSubjects?.length ? levelSubjects : subjects)].filter(Boolean) as string[];
  return Array.from(new Set(merged)).map((subject) => ({ value: subject, label: subject }));
}

function RaportEmptyState({ isPengajar }: { isPengajar: boolean }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-sky-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-2xl font-black text-sky-800">R</div>
      <h3 className="mt-3 text-2xl font-black text-slate-900">Belum ada raport</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
        {isPengajar
          ? "Pilih nama murid dari daftar, lalu generate raport lewat popup."
          : "Raport kamu belum digenerate oleh pengajar. Nilai akhir, quiz, tugas, dan kehadiran akan tampil di sini."}
      </p>
    </div>
  );
}

function RaportCard({ item, index, onEdit }: { item: RaportItem; index: number; onEdit?: (item: RaportItem) => void }) {
  const monthIndex = Number(item.bulan ?? 1) - 1;
  const finalScore = Number(item.nilai_akhir ?? 0);
  const quizScore = Number(item.nilai_quiz ?? 0);
  const tugasScore = Number(item.nilai_tugas ?? 0);
  const kehadiranScore = Number(item.nilai_kehadiran ?? 0);
  const bonus = Number(item.bonus_poin ?? 0);

  return (
    <article className="rounded-2xl border border-sky-100 bg-white p-3 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-900 text-sm font-black text-white">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">{monthNames[monthIndex] ?? item.bulan} {item.tahun}</p>
          <h3 className="truncate text-base font-black text-slate-950 md:text-lg">{item.nama ?? "Murid"}</h3>
          <p className="truncate text-xs font-bold text-slate-400">{item.pelajaran ?? "Umum"}</p>
        </div>
        <div className={`shrink-0 rounded-2xl border px-4 py-2 text-center ${scoreTone(finalScore)}`}>
          <p className="text-[0.65rem] font-black uppercase tracking-wide opacity-80">Nilai Akhir</p>
          <p className="text-2xl font-black leading-none">{finalScore}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-sky-50 pt-3 sm:grid-cols-4">
        <StatPill label="Quiz (40%)" value={quizScore} />
        <StatPill label="Tugas (40%)" value={tugasScore} />
        <StatPill label="Kehadiran (20%)" value={kehadiranScore} unit="%" />
        <StatPill label="Bonus / Koreksi" value={bonus > 0 ? `+${bonus}` : bonus} />
      </div>

      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-[0.6fr_1.4fr]">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">Status</p>
          <p className={`font-black ${finalScore >= 70 ? "text-emerald-700" : "text-rose-600"}`}>
            {finalScore >= 70 ? "Tuntas" : "Perlu Dampingi"}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2">
          <p className="text-[0.68rem] font-black uppercase tracking-wide text-amber-500">Catatan</p>
          <p className="text-xs font-semibold leading-snug text-amber-900">{item.catatan || "Belum ada catatan."}</p>
        </div>
      </div>

      {onEdit && (
        <button className="mt-3 w-full rounded-xl bg-sky-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-800" onClick={() => onEdit(item)} type="button">
          Edit Nilai & Keterangan
        </button>
      )}
    </article>
  );
}

function RaportModal({ csrfToken, mode, murid, item, onClose, onSaved }: { csrfToken: string; mode: RaportModalMode; murid?: MuridListItem | null; item?: RaportItem | null; onClose: () => void; onSaved: () => void }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastBreakdown, setLastBreakdown] = useState<Breakdown | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);
  const thisYear = new Date().getFullYear();
  const isEdit = mode === "edit";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setLastBreakdown(null);
    setGeneratedCount(0);
    try {
      const baseData = new FormData(e.currentTarget);
      const targetSubjects = isEdit ? [String(baseData.get("pelajaran") ?? defaultSubject)] : mapelOptions.map((opt) => opt.value);
      let lastJson: RaportResponse | null = null;

      for (const [index, subject] of targetSubjects.entries()) {
        const data = new FormData();
        data.set("murid_id", String(baseData.get("murid_id") ?? ""));
        data.set("tahun", String(baseData.get("tahun") ?? ""));
        data.set("bulan", String(baseData.get("bulan") ?? ""));
        data.set("csrf_token", csrfToken);
        data.set("pelajaran", subject);
        data.set("manual_mode", "1");

        if (isEdit) {
          data.set("nilai_quiz", String(baseData.get("nilai_quiz") ?? 0));
          data.set("nilai_tugas", String(baseData.get("nilai_tugas") ?? 0));
          data.set("nilai_kehadiran", String(baseData.get("nilai_kehadiran") ?? 0));
          data.set("bonus_poin", String(baseData.get("bonus_poin") ?? 0));
          data.set("catatan", String(baseData.get("catatan") ?? ""));
        } else {
          data.set("nilai_quiz", String(baseData.get(`nilai_quiz_${index}`) ?? 0));
          data.set("nilai_tugas", String(baseData.get(`nilai_tugas_${index}`) ?? 0));
          data.set("nilai_kehadiran", String(baseData.get(`nilai_kehadiran_${index}`) ?? 0));
          data.set("bonus_poin", String(baseData.get(`bonus_poin_${index}`) ?? 0));
          data.set("catatan", String(baseData.get(`catatan_${index}`) ?? ""));
        }

        const res = await fetch(`${PHP_BASE}/backend/actions/input-raport`, {
          method: "POST",
          body: data,
          credentials: "include",
        });
        const json = await res.json() as RaportResponse;
        if (!json.success) {
          setMsg(json.error ?? `Gagal menyimpan ${subject}.`);
          return;
        }
        lastJson = json;
      }

      setMsg(isEdit ? `Raport tersimpan. Nilai akhir: ${lastJson?.nilai_akhir ?? 0}` : `${targetSubjects.length} mapel raport berhasil digenerate.`);
      setGeneratedCount(targetSubjects.length);
      if (lastJson?.breakdown) setLastBreakdown({ ...lastJson.breakdown, nilai_akhir: lastJson.nilai_akhir ?? 0 });
      onSaved();
    } catch {
      setMsg("Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  const activeMuridId = String(item?.murid_id ?? murid?.id ?? "");
  const activeMuridName = item?.nama ?? murid?.nama ?? "Murid";
  const mapelOptions = subjectOptions(murid?.tingkat, item?.pelajaran);
  const defaultSubject = item?.pelajaran ?? mapelOptions[0]?.value ?? "Lainnya";

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white p-4 shadow-2xl md:p-6" onSubmit={submit}>
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-sky-100 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">{isEdit ? "Edit khusus murid" : "Auto dari Quiz + Tugas + Kehadiran"}</p>
            <h2 className="title-font text-2xl font-black text-slate-950 md:text-3xl">{isEdit ? "Edit Raport" : "Generate Raport"}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{activeMuridName} · {murid?.tingkat ?? "-"}</p>
          </div>
          <button className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600" onClick={onClose} type="button">Tutup</button>
        </div>

        <input name="murid_id" type="hidden" value={activeMuridId} />

        <div className="grid gap-3">
          {isEdit ? <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Mata Pelajaran</label>
            <CustomSelect
              name="pelajaran"
              defaultValue={defaultSubject}
              required
              disabled={isEdit}
              options={mapelOptions.some((opt) => opt.value === defaultSubject) ? mapelOptions : [{ value: defaultSubject, label: defaultSubject }, ...mapelOptions]}
              placeholder="Pilih mapel"
            />
            <p className="mt-1 text-xs font-semibold text-slate-400">Mapel otomatis mengikuti tingkat murid: TK, SD, atau SMP.</p>
          </div> : <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Input Nilai Semua Mapel</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Isi nilai untuk semua mapel tingkat {murid?.tingkat ?? "murid"}. Sekali simpan akan membuat semua raport mapel.</p>
          </div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Tahun</label>
              <input className="field" defaultValue={item?.tahun ?? thisYear} max={thisYear + 1} min={2020} name="tahun" required type="number" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Bulan</label>
              <CustomSelect
                name="bulan"
                defaultValue={String(item?.bulan ?? new Date().getMonth() + 1)}
                required
                options={monthNames.map((m, i) => ({ value: String(i + 1), label: m }))}
                placeholder="Bulan"
              />
            </div>
          </div>

          {!isEdit && (
            <div className="grid max-h-[38vh] gap-3 overflow-y-auto pr-1">
              {mapelOptions.map((opt, index) => (
                <div className="rounded-2xl border border-sky-100 bg-white p-3 shadow-sm" key={opt.value}>
                  <p className="mb-3 text-sm font-black text-slate-950">{opt.label}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Quiz</label>
                      <input className="field" defaultValue={0} max={100} min={0} name={`nilai_quiz_${index}`} required type="number" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Tugas</label>
                      <input className="field" defaultValue={0} max={100} min={0} name={`nilai_tugas_${index}`} required type="number" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Hadir %</label>
                      <input className="field" defaultValue={100} max={100} min={0} name={`nilai_kehadiran_${index}`} required type="number" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Bonus</label>
                      <input className="field" defaultValue={0} max={30} min={-30} name={`bonus_poin_${index}`} type="number" />
                    </div>
                  </div>
                  <textarea className="field mt-2 resize-none" name={`catatan_${index}`} placeholder={`Catatan ${opt.label} (opsional)`} rows={2} />
                </div>
              ))}
            </div>
          )}

          {isEdit && (
            <div className="grid gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Nilai Quiz</label>
                <input className="field" defaultValue={item?.nilai_quiz ?? 0} max={100} min={0} name="nilai_quiz" required type="number" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Nilai Tugas</label>
                <input className="field" defaultValue={item?.nilai_tugas ?? 0} max={100} min={0} name="nilai_tugas" required type="number" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Kehadiran (%)</label>
                <input className="field" defaultValue={item?.nilai_kehadiran ?? 0} max={100} min={0} name="nilai_kehadiran" required type="number" />
              </div>
            </div>
          )}

          {isEdit && <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Bonus / Koreksi Poin <span className="font-semibold normal-case text-slate-400">(-30 s/d +30)</span></label>
            <input className="field" defaultValue={item?.bonus_poin ?? 0} max={30} min={-30} name="bonus_poin" type="number" />
          </div>}

          {isEdit && <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Keterangan / Catatan Murid <span className="font-semibold normal-case text-slate-400">(opsional)</span></label>
            <textarea className="field resize-none" defaultValue={item?.catatan ?? ""} name="catatan" placeholder="Contoh: Rajin, perlu tingkatkan kehadiran..." rows={3} />
          </div>}

          {lastBreakdown && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="mb-1 text-xs font-black text-emerald-700">{generatedCount > 1 ? `${generatedCount} Mapel Tersimpan` : "Breakdown Tersimpan"}</p>
              <div className="grid grid-cols-4 gap-1 text-center text-xs">
                <div><span className="font-black text-slate-700">{lastBreakdown.quiz}</span><br/><span className="text-slate-400">Quiz</span></div>
                <div><span className="font-black text-slate-700">{lastBreakdown.tugas}</span><br/><span className="text-slate-400">Tugas</span></div>
                <div><span className="font-black text-slate-700">{lastBreakdown.kehadiran}%</span><br/><span className="text-slate-400">Hadir</span></div>
                <div><span className="font-black text-slate-700">{lastBreakdown.bonus > 0 ? `+${lastBreakdown.bonus}` : lastBreakdown.bonus}</span><br/><span className="text-slate-400">Bonus</span></div>
              </div>
              <p className="mt-1 text-center text-sm font-black text-emerald-800">Nilai Akhir: {lastBreakdown.nilai_akhir}</p>
            </div>
          )}

          {msg && (!lastBreakdown || generatedCount > 1) && <p className={`text-sm font-black ${msg.includes("tersimpan") || msg.includes("berhasil") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>}

          <button className="btn-primary px-6 py-3 disabled:opacity-50" disabled={loading} type="submit">
            {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Generate Semua Mapel"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StudentRaportList({ items, murids, onGenerate, onOpenEdit }: { items: RaportItem[]; murids: MuridListItem[]; onGenerate: (murid: MuridListItem) => void; onOpenEdit: (murid: MuridListItem) => void }) {
  const countByStudent = useMemo(() => {
    const map = new Map<string, { count: number; latest?: RaportItem }>();
    items.forEach((item) => {
      const key = String(item.murid_id ?? "");
      const current = map.get(key);
      if (!current) map.set(key, { count: 1, latest: item });
      else map.set(key, { count: current.count + 1, latest: current.latest ?? item });
    });
    return map;
  }, [items]);

  return (
    <div className="grid gap-3">
      {murids.map((murid, index) => {
        const summary = countByStudent.get(String(murid.id));
        const latest = summary?.latest;
        return (
          <article className="group relative rounded-2xl border border-sky-100 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md" key={murid.id}>
            <div className="flex min-w-0 items-center gap-3 pr-0 sm:pr-52">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-900 text-sm font-black text-white">{index + 1}</span>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-slate-950">{murid.nama ?? `Murid #${murid.id}`}</h3>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{murid.tingkat ?? "-"} · {summary?.count ?? 0} raport mapel</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:absolute sm:right-3 sm:top-3 sm:mt-0 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
              {latest && <span className={`rounded-xl border bg-white px-3 py-1.5 text-xs font-black shadow-sm ${scoreTone(Number(latest.nilai_akhir ?? 0))}`}>Terakhir: {Number(latest.nilai_akhir ?? 0)}</span>}
              <button className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm transition hover:bg-emerald-50" onClick={() => onGenerate(murid)} type="button">Generate</button>
              <button className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-sky-700 shadow-sm transition hover:bg-sky-50" onClick={() => onOpenEdit(murid)} type="button">Edit</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StudentEditView({ murid, items, onBack, onEditRecord, onGenerate }: { murid: MuridListItem; items: RaportItem[]; onBack: () => void; onEditRecord: (item: RaportItem) => void; onGenerate: () => void }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-[1.75rem] border border-sky-100 bg-white p-4 shadow-sm">
        <button className="mb-3 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600" onClick={onBack} type="button">← Kembali ke daftar murid</button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Halaman Edit Raport</p>
            <h2 className="text-2xl font-black text-slate-900">{murid.nama ?? `Murid #${murid.id}`}</h2>
            <p className="text-sm font-bold text-slate-500">{murid.tingkat ?? "-"}</p>
          </div>
          <button className="btn-primary px-5 py-2.5 text-sm" onClick={onGenerate} type="button">Generate Raport Baru</button>
        </div>
      </div>
      <div className="grid gap-2">
        {items.map((item, i) => <RaportCard index={i} item={item} key={`${item.murid_id}-${item.tahun}-${item.bulan}-${i}`} onEdit={onEditRecord} />)}
      </div>
      {items.length === 0 && <RaportEmptyState isPengajar />}
    </div>
  );
}

export function RaportPage({ category, csrfToken }: { category: Category; csrfToken: string }) {
  const [items, setItems] = useState<RaportItem[]>([]);
  const [murids, setMurids] = useState<MuridListItem[]>([]);
  const [modal, setModal] = useState<null | { mode: RaportModalMode; murid?: MuridListItem; item?: RaportItem }>(null);
  const [editMurid, setEditMurid] = useState<MuridListItem | null>(null);

  function load() {
    readJson<RaportItem[]>(`${PHP_BASE}/backend/data/raport`).then(setItems).catch(() => setItems([]));
  }

  useEffect(() => { load(); }, []);

  const isPengajar = category === "pengajar";

  useEffect(() => {
    if (!isPengajar) return;
    readJson<MuridListItem[]>(`${PHP_BASE}/backend/data/murid-for-absensi`).then(setMurids).catch(() => setMurids([]));
  }, [isPengajar]);

  const editItems = editMurid ? items.filter((item) => String(item.murid_id) === String(editMurid.id)) : [];

  return (
    <section className="grid items-start gap-6">
      {isPengajar ? (
        editMurid ? (
          <StudentEditView
            items={editItems}
            murid={editMurid}
            onBack={() => setEditMurid(null)}
            onEditRecord={(item) => setModal({ mode: "edit", item, murid: editMurid })}
            onGenerate={() => setModal({ mode: "generate", murid: editMurid })}
          />
        ) : (
          <div className="grid content-start gap-4">
            <div className="rounded-[1.75rem] border border-sky-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Raport Murid</p>
              <h2 className="text-2xl font-black text-slate-900">Daftar Murid ({murids.length})</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">Mapel raport otomatis mengikuti tingkat murid: TK, SD, atau SMP.</p>
            </div>
            <StudentRaportList items={items} murids={murids} onGenerate={(murid) => setModal({ mode: "generate", murid })} onOpenEdit={setEditMurid} />
            {murids.length === 0 && <RaportEmptyState isPengajar />}
          </div>
        )
      ) : (
        <div className="grid content-start gap-4">
          <div className="rounded-[1.75rem] border border-sky-100 bg-white p-4 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">Raport Saya ({items.length})</h2>
          </div>
          <div className="grid gap-2">
            {items.map((item, i) => <RaportCard index={i} item={item} key={`${item.murid_id}-${item.tahun}-${item.bulan}-${i}`} />)}
          </div>
          {items.length === 0 && <RaportEmptyState isPengajar={false} />}
        </div>
      )}

      {modal && (
        <RaportModal
          csrfToken={csrfToken}
          item={modal.item}
          mode={modal.mode}
          murid={modal.murid}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </section>
  );
}

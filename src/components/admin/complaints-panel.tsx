// অভিযোগ অ্যাডমিন — অভিযোগ ব্যবস্থাপনা: অনুসন্ধান/ফিল্টার, বিস্তারিত, যাচাই-বাছাই (স্ট্যাটাস পরিবর্তন), ডিলিট

"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hash,
  ImageIcon,
  Landmark,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  ThumbsUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Chip, inputCls, textareaCls } from "@/components/ui/kit";
import { useStore, useTaxoMaps, type Complaint, type ComplaintStatus } from "@/lib/store";
import { deleteComplaint, setComplaintStatus } from "@/lib/db";
import { DISTRICT_BY_ID } from "@/lib/data";
import { bn, bnCompactMoney, bnDate, bnTimeAgo } from "@/lib/bn";

const STATUS_META: Record<ComplaintStatus, { label: string; color: "accent" | "success" | "warning" | "danger" }> = {
  pending: { label: "যাচাই চলছে", color: "warning" },
  verified: { label: "যাচাইকৃত", color: "success" },
  resolved: { label: "সমাধান হয়েছে", color: "accent" },
  rejected: { label: "বাতিল", color: "danger" },
  removed: { label: "সরানো হয়েছে", color: "danger" },
};

const STATUS_ACTIONS: { status: ComplaintStatus; label: string; variant: "primary" | "outline" | "danger" | "tertiary" }[] = [
  { status: "verified", label: "যাচাই করুন", variant: "primary" },
  { status: "resolved", label: "সমাধান হয়েছে", variant: "outline" },
  { status: "pending", label: "আবার যাচাইয়ে পাঠান", variant: "tertiary" },
  { status: "rejected", label: "বাতিল করুন", variant: "danger" },
];

export function ComplaintsPanel() {
  const d = useStore();
  const taxo = useTaxoMaps();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [branch, setBranch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const items = useMemo(() => {
    if (!d) return [];
    const needle = q.trim().toLowerCase();
    return d.complaints
      .filter((c) => {
        if (status && c.status !== status) return false;
        if (branch) {
          const cat = taxo.CAT.get(c.categoryId);
          if (!cat || cat.branch !== branch) return false;
        }
        if (needle) {
          const dep = taxo.DEP.get(c.departmentId);
          const hay = `${c.title}\n${c.description}\n${c.code}\n${dep?.name ?? ""}\n${c.location?.district ?? ""}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const rank: Record<ComplaintStatus, number> = { pending: 0, verified: 1, resolved: 2, rejected: 3, removed: 4 };
        return rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt);
      });
  }, [d, q, status, branch, taxo]);

  const open = openId ? items.find((c) => c.id === openId) ?? d?.complaints.find((c) => c.id === openId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* ফিল্টার বার */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3.5">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="শিরোনাম, কোড, দপ্তর বা জেলা দিয়ে খুঁজুন…"
            aria-label="অভিযোগ খুঁজুন"
            className={`${inputCls} ps-9`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">অবস্থা</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ComplaintStatus | "")}
              className={`${inputCls} h-10`}
            >
              <option value="">সব অবস্থা</option>
              {(Object.keys(STATUS_META) as ComplaintStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">শাখা</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className={`${inputCls} h-10`}>
              <option value="">সব শাখা</option>
              {taxo.branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-2 flex items-end justify-between gap-2">
            <p className="tnum text-xs text-muted">
              {d ? `${bn(items.length)} টি ফলাফল · মোট ${bn(d.complaints.length)}` : "লোড হচ্ছে…"}
            </p>
            {(q || status || branch) && (
              <Button size="sm" variant="ghost" onPress={() => { setQ(""); setStatus(""); setBranch(""); }}>
                <X className="size-3.5" aria-hidden />
                মুছুন
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* তালিকা */}
      {!d ? (
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">
          কোনো অভিযোগ মেলেনি।
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenId(c.id)}
              className={`flex w-full items-start gap-3 px-4 py-3.5 text-start transition-colors hover:bg-surface-secondary/60 ${i > 0 ? "border-t border-border/70" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip color={STATUS_META[c.status].color} variant="soft" size="sm">
                    {STATUS_META[c.status].label}
                  </Chip>
                  <Chip variant="tertiary" size="sm">{taxo.CAT.get(c.categoryId)?.name ?? "অজানা"}</Chip>
                  {(c.evidence?.length ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-accent">
                      <ImageIcon className="size-3" aria-hidden />
                      {bn(c.evidence.length)}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-1 text-[14px] font-bold">{c.title}</p>
                <p className="mt-0.5 line-clamp-1 text-[12px] text-muted">
                  {c.code} · {taxo.DEP.get(c.departmentId)?.name ?? "—"} · {c.location?.district ?? DISTRICT_BY_ID.get(c.districtId)?.name ?? "—"} · {bnTimeAgo(c.createdAt)}
                </p>
              </div>
              <ChevronRight className="mt-3 size-4 shrink-0 text-muted" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {/* বিস্তারিত মডাল */}
      {open && (
        <ComplaintDetailModal c={open} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

// ─── বিস্তারিত মডাল (যাচাই-নিয়ন্ত্রণসহ) ───────────────────────
function ComplaintDetailModal({ c, onClose }: { c: Complaint; onClose: () => void }) {
  const taxo = useTaxoMaps();
  const cat = taxo.CAT.get(c.categoryId);
  const dep = taxo.DEP.get(c.departmentId);
  const [note, setNote] = useState(c.statusNote ?? "");
  const [busy, setBusy] = useState<ComplaintStatus | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const photos = c.evidence ?? [];

  const changeStatus = async (status: ComplaintStatus) => {
    setBusy(status);
    const ok = await setComplaintStatus(c.id, status, status === c.status ? c.statusNote : note);
    setBusy(null);
    if (ok) {
      toast.success(`অবস্থা পরিবর্তন হয়েছে: ${STATUS_META[status].label}`);
      onClose();
    } else {
      toast.error("পরিবর্তন করা যায়নি — Realtime Database নিয়ম যাচাই করুন।");
    }
  };

  const doDelete = async () => {
    setBusy("delete");
    const ok = await deleteComplaint(c.id);
    setBusy(null);
    if (ok) {
      toast.success("অভিযোগটি (মন্তব্য/প্রতিক্রিয়াসহ) মুছে ফেলা হয়েছে।");
      onClose();
    } else {
      toast.error("মুছে ফেলা যায়নি — Realtime Database নিয়ম যাচাই করুন।");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="অভিযোগের বিস্তারিত"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => onClose()}
    >
      <div
        className="thin-scroll max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-background p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <Chip color={STATUS_META[c.status].color} variant="soft" size="md">
            {STATUS_META[c.status].label}
          </Chip>
          <button
            type="button"
            aria-label="বন্ধ করুন"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-surface-secondary text-muted"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <h2 className="mt-3 text-lg font-extrabold leading-snug">{c.title}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span className="font-mono">{c.code}</span>
          <span>{bnDate(c.createdAt)} ({bnTimeAgo(c.createdAt)})</span>
          {c.updatedAt && <span>হালনাগাদ: {bnTimeAgo(c.updatedAt)}</span>}
        </p>

        {/* তথ্য গ্রিড */}
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-surface-secondary p-3.5 text-[13px]">
          <span className="inline-flex items-center gap-2">
            <Building2 className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0"><span className="text-muted">দপ্তর:</span> {dep?.name ?? "—"}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0"><span className="text-muted">অবস্থান:</span> {c.location ? [c.location.division, c.location.district, c.location.upazila, c.location.union].filter(Boolean).join(" › ") : (DISTRICT_BY_ID.get(c.districtId)?.name ?? "—")}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Banknote className="size-4 shrink-0 text-danger" aria-hidden />
            <span className="min-w-0"><span className="text-muted">ক্ষতি:</span> {bnCompactMoney(c.moneyLost)}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Landmark className="size-4 shrink-0 text-warning" aria-hidden />
            <span className="min-w-0"><span className="text-muted">জনগণের অর্থ:</span> {bnCompactMoney(c.publicMoney)}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-warning" aria-hidden />
            <span className="min-w-0"><span className="text-muted">সময়:</span> {bn(c.timeWasted)} দিন</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Users className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0"><span className="text-muted">ক্ষতিগ্রস্ত:</span> {bn(c.peopleCount)} জন</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <ThumbsUp className="size-4 shrink-0 text-success" aria-hidden />
            <span className="min-w-0"><span className="text-muted">সমর্থন:</span> {bn(c.supports)} · আপত্তি: {bn(c.objections)}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0"><span className="text-muted">মন্তব্য:</span> {bn(c.commentCount)}</span>
          </span>
          <span className="col-span-2 inline-flex items-center gap-2">
            <Hash className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0"><span className="text-muted">ধরন:</span> {cat?.name ?? "—"} ({cat?.branch ?? "—"})</span>
          </span>
        </div>

        <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed">{c.description}</p>

        {/* প্রমাণ-ছবি */}
        {photos.length > 0 && (
          <section aria-label="প্রমাণ-ছবি" className="mt-3">
            <h3 className="text-sm font-bold">প্রমাণ-ছবি ({bn(photos.length)})</h3>
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightbox(i)}
                  className="size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-secondary"
                  aria-label={`ছবি ${bn(i + 1)} বড় করে দেখুন`}
                >
                  <img src={p} alt={`প্রমাণ-ছবি ${bn(i + 1)}`} className="size-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* অ্যাডমিন নোট */}
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-semibold">অ্যাডমিন নোট (প্রকাশ্য, ঐচ্ছিক)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="যেমন: প্রমাণ যাচাই করা হয়েছে; সংশ্লিষ্ট দপ্তরের জবাব প্রতীক্ষিত…"
            className={textareaCls}
          />
        </label>

        {/* স্ট্যাটাস অ্যাকশন */}
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_ACTIONS.filter((a) => a.status !== c.status).map((a) => (
            <Button
              key={a.status}
              size="sm"
              variant={a.variant}
              isDisabled={busy !== null}
              onPress={() => void changeStatus(a.status)}
            >
              {busy === a.status && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {a.label}
            </Button>
          ))}
          {confirmDelete ? (
            <span className="inline-flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-1.5">
              <span className="text-xs font-semibold text-danger">নিশ্চিত?</span>
              <Button size="sm" variant="danger" isDisabled={busy !== null} onPress={() => void doDelete()}>
                {busy === "delete" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
                হ্যাঁ, মুছুন
              </Button>
              <Button size="sm" variant="tertiary" onPress={() => setConfirmDelete(false)}>না</Button>
            </span>
          ) : (
            <Button size="sm" variant="outline" className="text-danger" isDisabled={busy !== null} onPress={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" aria-hidden />
              মুছে ফেলুন
            </Button>
          )}
        </div>
      </div>

      {/* লাইটবক্স */}
      {lightbox !== null && photos[lightbox] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ছবি বড় করে দেখুন"
          className="fixed inset-0 z-[80] flex flex-col bg-black/90"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="tnum text-sm font-semibold">{bn(lightbox + 1)} / {bn(photos.length)}</span>
            <button
              type="button"
              aria-label="বন্ধ করুন"
              onClick={() => setLightbox(null)}
              className="flex size-10 items-center justify-center rounded-full bg-white/10"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            <img src={photos[lightbox]} alt={`প্রমাণ-ছবি ${bn(lightbox + 1)}`} className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
          {photos.length > 1 && (
            <div className="flex items-center justify-center gap-3 pb-6" onClick={(e) => e.stopPropagation()}>
              <Button variant="tertiary" size="sm" isDisabled={lightbox === 0} onPress={() => setLightbox((i) => (i === null ? 0 : Math.max(0, i - 1)))}>
                <ChevronLeft className="size-4" aria-hidden />
                আগের
              </Button>
              <Button variant="tertiary" size="sm" isDisabled={lightbox === photos.length - 1} onPress={() => setLightbox((i) => (i === null ? 0 : Math.min(photos.length - 1, i + 1)))}>
                পরের
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// অভিযোগ — হোম স্ক্রিন (somossha.me-অনুপ্রাণিত):
// হিরো ব্যানার → হিসাব কার্ড → দুই মিনিটের রেকর্ড → সবচেয়ে গুরুতর → ফিড → উক্তি

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/kit";
import {
  Bell,
  ChevronDown,
  Flame,
  Landmark,
  Quote,
  Timer,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  listComplaints,
  useStore,
  computeStats,
  severityScore,
  topSeverity,
  type SortKey,
} from "@/lib/store";
import { useTaxoMaps } from "@/lib/store";
import { bn, bnCompactMoney } from "@/lib/bn";
import { ComplaintCard } from "../complaint-card";
import { DbBanner, EmptyState, FeedSkeleton } from "../parts";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "সাম্প্রতিক" },
  { key: "support", label: "সর্বাধিক সমর্থন" },
  { key: "money", label: "সর্বাধিক ক্ষতি" },
];

const PAGE_SIZE = 8;

export function HomeScreen({
  onOpen,
  onExplore,
  onStats,
  onAdd,
}: {
  onOpen: (id: string) => void;
  onExplore: () => void;
  onStats: () => void;
  onAdd: () => void;
}) {
  const d = useStore();
  const taxo = useTaxoMaps();
  const [branch, setBranch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);

  const stats = useMemo(() => (d ? computeStats(d) : null), [d]);
  const severe = useMemo(() => (d ? topSeverity(d, 3) : null), [d]);
  const feed = useMemo(
    () => (d ? listComplaints(d, { branch, sort }, { page, pageSize: PAGE_SIZE }) : null),
    [d, branch, sort, page]
  );

  const ready = d !== null;

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
      {/* ─── ডাটাবেজ সংযোগ সমস্যা হলে সতর্কবার্তা ─── */}
      {d?.error && <DbBanner error={d.error} />}

      {/* ─── অফিসিয়াল নোটিশ (অ্যাডমিন প্যানেল থেকে) ─── */}
      {d?.notices.filter((n) => n.active).slice(0, 1).map((n) => (
        <section
          key={n.id}
          aria-label="নোটিশ"
          className="flex items-start gap-2.5 rounded-2xl border border-accent/25 bg-accent/[0.06] px-3.5 py-3"
        >
          <Bell className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-foreground">{n.title}</p>
            {n.body && <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{n.body}</p>}
          </div>
        </section>
      ))}

      {/* ─── হিরো ব্যানার (somossha-স্টাইল হালকা পিচ টিন্ট) ─── */}
      <section aria-label="পরিচিতি">
        <div className="relative overflow-hidden rounded-2xl border border-accent/15 bg-accent/[0.06] p-4">
          <div
            className="pointer-events-none absolute -end-6 -top-6 grid grid-cols-2 gap-1.5 opacity-[0.16]"
            aria-hidden
          >
            <span className="size-8 rounded-md bg-accent" />
            <span className="size-8 rounded-md bg-accent" />
            <span className="size-8 rounded-md bg-accent" />
            <span className="size-8 rounded-md border-2 border-accent" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-accent">
            সমাধান সব সমস্যার, অভিযোগই প্রথম পদক্ষেপ
          </p>
          <h2 className="mt-1.5 max-w-[19rem] text-[17px] font-extrabold leading-snug tracking-tight text-foreground">
            সরকারি দপ্তর ও জনপ্রতিনিধিরা নাগরিকের সঙ্গে আসলে কী করে — তার একটি প্রকাশ্য, যাচাইযোগ্য হিসাব।
          </h2>
          {stats && (
            <p className="tnum mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-accent-foreground">
              <Users className="size-3.5" aria-hidden />
              {bn(stats.totalVictims)} জন ভুক্তভোগী, {bn(stats.totalComplaints)} টি সমস্যায়
            </p>
          )}
          <p className="mt-2 max-w-[18rem] text-[11px] leading-relaxed text-muted">
            প্রতিটি অভিযোগ একটি সমস্যা। যিনি লিখেছেন এবং যাঁরা সমর্থন দিয়েছেন — সবাই এই হিসাবের ভেতরে।
          </p>
        </div>
      </section>

      {/* ─── হিসাব কার্ড (somossha-মডেল: নাগরিকের ক্ষতি / জনগণের অর্থ / ক্ষতিগ্রস্ত) ─── */}
      <section aria-label="এক নজরে হিসাব">
        {ready && stats ? (
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-border bg-surface p-3.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-danger/10 text-danger">
                  <Wallet className="size-5" aria-hidden />
                </span>
                <p className="tnum mt-2 text-2xl font-extrabold leading-none">
                  {bnCompactMoney(stats.totalMoney)}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-foreground">নাগরিকের ক্ষতি</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted">
                  সরাসরি পকেট ও সময় থেকে; রসিদ বা প্রত্যক্ষ অভিজ্ঞতাভিত্তিক
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-3.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <Landmark className="size-5" aria-hidden />
                </span>
                <p className="tnum mt-2 flex items-baseline gap-1 text-2xl font-extrabold leading-none">
                  {bnCompactMoney(stats.totalPublicMoney)}
                  <span className="text-[10px] font-semibold text-muted">(অনুমান)</span>
                </p>
                <p className="mt-1 text-[11px] font-semibold text-foreground">জনগণের অর্থ</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted">
                  নথি বা প্রকাশিত সূত্রভিত্তিক — নাগরিকের হিসাবের সঙ্গে যোগ হয় না
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onStats}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3.5 text-start transition-colors active:bg-surface-secondary"
              aria-label="বিশ্লেষণ দেখুন"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Users className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="tnum text-xl font-extrabold leading-none">{bn(stats.totalPeople)}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    ক্ষতিগ্রস্ত মানুষ · {bn(stats.totalComplaints)} টি প্রকাশিত অভিযোগ
                  </p>
                </div>
              </div>
              <TrendingUp className="size-4 text-muted" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-[124px] animate-pulse rounded-2xl border border-border bg-surface ${i === 2 ? "col-span-2 !h-[74px]" : ""}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── দুই মিনিটের রেকর্ড নোটিশ (somossha-স্টাইল স্ট্রিপ) ─── */}
      <section
        aria-label="অভিজ্ঞতা যোগ করুন"
        className="flex items-center justify-between gap-3 rounded-xl bg-accent/[0.07] px-3.5 py-2.5"
      >
        <p className="min-w-0 text-[12px] leading-snug text-foreground">
          আপনার কাউন্টারের গল্পও যুক্ত হোক — <span className="font-bold text-accent">দুই মিনিটের রেকর্ড</span>
        </p>
        <Button size="sm" onPress={onAdd} className="shrink-0">
          <Timer className="size-3.5" aria-hidden />
          লিখুন
        </Button>
      </section>

      {/* ─── সবচেয়ে গুরুতর ─── */}
      {ready && severe && severe.length > 0 && (
        <section aria-label="সবচেয়ে গুরুতর অভিযোগ">
          <div className="mb-2 flex items-center gap-1.5">
            <Flame className="size-4 text-accent" aria-hidden />
            <h2 className="text-sm font-bold text-foreground">সবচেয়ে গুরুতর</h2>
          </div>
          <p className="mb-2.5 text-[11px] leading-relaxed text-muted">
            ক্রম নির্ধারিত হয় ক্ষতির পরিমাণ, সমর্থন, ক্ষতিগ্রস্ত মানুষ ও সময়ের ভিত্তিতে।
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {severe.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpen(c.id)}
                className={`flex w-full items-center gap-3 px-3.5 py-3 text-start transition-colors active:bg-surface-secondary ${
                  i > 0 ? "border-t border-border/70" : ""
                }`}
              >
                <span
                  className={`tnum flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                    i === 0 ? "bg-accent text-accent-foreground" : "bg-surface-secondary text-muted"
                  }`}
                >
                  {bn(i + 1)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{c.title}</span>
                <span className="tnum shrink-0 text-[11px] font-bold text-accent">
                  {bnCompactMoney(c.moneyLost + c.publicMoney)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── শাখা চিপ — অনুভূমিক স্ক্রল ─── */}
      <section aria-label="শাখা অনুযায়ী ফিল্টার">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
          {["সব শাখা", ...taxo.branches].map((b) => {
            const isActive = b === "সব শাখা" ? branch === "" : branch === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setBranch(b === "সব শাখা" ? "" : b);
                  setPage(1);
                }}
                aria-pressed={isActive}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  isActive
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-surface text-muted"
                }`}
              >
                {b}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── সাজানো + ফলাফল ─── */}
      <div className="flex items-center justify-between gap-2">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSort(s.key);
                setPage(1);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                sort === s.key ? "bg-accent/10 text-accent" : "bg-surface-secondary text-muted"
              }`}
              aria-pressed={sort === s.key}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onExplore}
          className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold text-accent"
        >
          খুঁজুন
        </button>
      </div>

      {/* ─── ফিড ─── */}
      {!ready ? (
        <FeedSkeleton rows={4} />
      ) : feed && feed.items.length > 0 ? (
        <>
          <p className="tnum text-xs text-muted">
            {bn(feed.total)} টি অভিযোগ{branch ? ` · ${branch}` : ""}
          </p>
          <div className="flex flex-col gap-3">
            {feed.items.map((c) => (
              <ComplaintCard key={c.id} c={c} onPress={() => onOpen(c.id)} />
            ))}
          </div>
          {feed.hasMore ? (
            <Button variant="outline" className="mx-auto mt-1" onPress={() => setPage((p) => p + 1)}>
              <ChevronDown className="size-4" aria-hidden />
              আরও দেখুন
            </Button>
          ) : (
            <p className="pt-1 text-center text-xs text-muted">
              — সব {bn(feed.total)} টি অভিযোগ দেখানো হয়েছে —
            </p>
          )}
        </>
      ) : (
        <EmptyState
          title="কোনো অভিযোগ পাওয়া যায়নি"
          body="এখনো কোনো অভিযোগ জমা হয়নি। নিচের + বোতামে চেপে প্রথম অভিযোগটি আপনিই করে ফেলুন।"
        />
      )}

      {/* ─── উক্তি (somossha-আত্মা) ─── */}
      <section aria-label="আমাদের বিশ্বাস" className="rounded-2xl border border-border bg-surface p-4">
        <Quote className="size-4 text-accent" aria-hidden />
        <p className="mt-2 text-[14px] font-bold leading-relaxed text-foreground">
          হিসাব চাইতে কারও অনুমতি লাগে না।
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          রাস্তা, বরাদ্দ, ভাতা, ভোট: যা কিছু জনগণের, তার হিসাব জনগণের কাছেই থাকা উচিত।
        </p>
      </section>
    </div>
  );
}

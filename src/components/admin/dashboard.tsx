// অভিযোগ অ্যাডমিন — ড্যাশবোর্ড: স্ট্যাট কার্ড, চার্ট, সংযোগ-অবস্থা, সাম্প্রতিক অভিযোগ

"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock4,
  Database,
  EyeOff,
  Flame,
  ThumbsUp,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Chip } from "@/components/ui/kit";
import { computeStats, useStore } from "@/lib/store";
import { bn, bnCompactMoney, bnTimeAgo } from "@/lib/bn";
import { DbBanner } from "@/components/abhijog/parts";

export function DashboardPanel({ onOpenComplaints }: { onOpenComplaints: () => void }) {
  const d = useStore();
  const stats = useMemo(() => (d ? computeStats(d) : null), [d]);

  const cards = stats
    ? [
        { label: "মোট অভিযোগ", value: bn(d!.complaints.length), icon: <Database className="size-5" aria-hidden />, cls: "bg-accent/10 text-accent" },
        { label: "যাচাই চলছে", value: bn(stats.byStatus.pending), icon: <Clock4 className="size-5" aria-hidden />, cls: "bg-warning/10 text-warning" },
        { label: "যাচাইকৃত", value: bn(stats.byStatus.verified), icon: <BadgeCheck className="size-5" aria-hidden />, cls: "bg-success/10 text-success" },
        { label: "সমাধান", value: bn(stats.byStatus.resolved), icon: <CheckCircle2 className="size-5" aria-hidden />, cls: "bg-accent/10 text-accent" },
        { label: "বাতিল", value: bn(stats.byStatus.rejected), icon: <XCircle className="size-5" aria-hidden />, cls: "bg-danger/10 text-danger" },
        { label: "স্বয়ংক্রিয়-সরানো", value: bn(stats.byStatus.removed), icon: <EyeOff className="size-5" aria-hidden />, cls: "bg-danger/10 text-danger" },
        { label: "মোট সমর্থন", value: bn(d!.complaints.reduce((s, c) => s + c.supports, 0)), icon: <ThumbsUp className="size-5" aria-hidden />, cls: "bg-success/10 text-success" },
        { label: "নাগরিকের ক্ষতি", value: bnCompactMoney(stats.totalMoney), icon: <TrendingUp className="size-5" aria-hidden />, cls: "bg-warning/10 text-warning" },
      ]
    : [];

  const statusDonut = stats
    ? ([
        ["যাচাই চলছে", stats.byStatus.pending, "rgb(var(--warning))"],
        ["যাচাইকৃত", stats.byStatus.verified, "rgb(var(--success))"],
        ["সমাধান", stats.byStatus.resolved, "rgb(var(--accent))"],
        ["বাতিল", stats.byStatus.rejected, "rgb(var(--danger))"],
        ["সরানো", stats.byStatus.removed, "rgb(var(--muted))"],
      ] as [string, number, string][])
        .filter(([, v]) => v > 0)
        .map(([name, value, fill]) => ({ name, value, fill }))
    : [];

  const branchBar = (stats?.byBranch ?? []).slice(0, 8).map((b) => ({
    name: b.branch.length > 12 ? b.branch.slice(0, 11) + "…" : b.branch,
    অভিযোগ: b.count,
  }));

  const recent = (d?.complaints ?? []).slice(0, 6);
  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid rgba(128,128,128,.25)",
    fontSize: 12,
    background: "rgb(var(--background))",
    color: "rgb(var(--foreground))",
  };

  return (
    <div className="flex flex-col gap-5">
      {d?.error && <DbBanner error={d.error} />}

      {/* স্ট্যাট কার্ড */}
      <section aria-label="পরিসংখ্যান">
        {!stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-border bg-surface p-4">
                <span className={`flex size-9 items-center justify-center rounded-xl ${c.cls}`}>{c.icon}</span>
                <p className="tnum mt-2.5 text-2xl font-extrabold leading-none">{c.value}</p>
                <p className="mt-1.5 text-[11px] font-semibold text-muted">{c.label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* চার্ট */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="স্ট্যাটাস বিতরণ" className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-bold">যাচাই-অবস্থা বিতরণ</h2>
          {statusDonut.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted">এখনো কোনো অভিযোগ নেই।</p>
          ) : (
            <>
              <div className="mx-auto mt-2 h-52 w-full max-w-xs" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDonut} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={3} strokeWidth={0}>
                      {statusDonut.map((s, i) => (
                        <Cell key={i} fill={s.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {statusDonut.map((s) => (
                  <span key={s.name} className="inline-flex items-center gap-1.5 text-[10px] text-muted">
                    <span className="size-2 rounded-full" style={{ background: s.fill }} aria-hidden />
                    {s.name} · <span className="tnum">{bn(s.value)}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        <section aria-label="শাখা অনুযায়ী" className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-bold">শাখা অনুযায়ী (প্রকাশ্য)</h2>
          {branchBar.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted">এখনো কোনো অভিযোগ নেই।</p>
          ) : (
            <div className="mt-2 h-60 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchBar} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-34} textAnchor="end" height={64} stroke="currentColor" opacity={0.6} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} stroke="currentColor" opacity={0.6} />
                  <Tooltip cursor={{ fill: "currentColor", opacity: 0.06 }} contentStyle={tooltipStyle} />
                  <Bar dataKey="অভিযোগ" fill="rgb(var(--accent))" radius={[6, 6, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* সাম্প্রতিক */}
      <section aria-label="সাম্প্রতিক অভিযোগ" className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Flame className="size-4 text-accent" aria-hidden />
            সাম্প্রতিক জমা
          </h2>
          <Button size="sm" variant="ghost" onPress={onOpenComplaints}>
            সব দেখুন
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted">
            Realtime Database খালি — নোটিশ/অভিযোগ এলে এখানে রিয়েলটাইম দেখা যাবে। সেটিংস ট্যাব থেকে নমুনা ডাটা যোগ করা যায়।
          </p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-xl border border-border">
            {recent.map((c, i) => (
              <div key={c.id} className={`flex items-center gap-3 px-3.5 py-2.5 text-[13px] ${i > 0 ? "border-t border-border/70" : ""}`}>
                <Chip
                  variant="soft"
                  size="sm"
                  color={c.status === "pending" ? "warning" : c.status === "verified" ? "success" : c.status === "resolved" ? "accent" : "danger"}
                >
                  {c.status === "pending" ? "যাচাই চলছে" : c.status === "verified" ? "যাচাইকৃত" : c.status === "resolved" ? "সমাধান" : c.status === "rejected" ? "বাতিল" : "সরানো"}
                </Chip>
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                <span className="tnum hidden shrink-0 text-[10px] text-muted sm:inline">{bnTimeAgo(c.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-2xl border border-border bg-surface p-3.5 text-[11px] leading-relaxed text-muted">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        সব ডাটা Firebase Realtime Database থেকে onValue-তে রিয়েলটাইম আসছে — নতুন অভিযোগ জমা হলে এই পাতা নিজেই হালনাগাদ হবে।
      </div>
    </div>
  );
}

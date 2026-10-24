// অভিযোগ — বিশ্লেষণ স্ক্রিন: হিসাব, চার্ট, স্বচ্ছতা সূচক

"use client";

import { useMemo } from "react";
import { Card, Chip, ProgressBar } from "@/components/ui/kit";
import { Info } from "lucide-react";
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
import { computeStats, transparencyList, useStore } from "@/lib/store";
import { bn, bnCompactMoney, bnTimeAgo } from "@/lib/bn";
import { FeedSkeleton } from "../parts";

export function StatsScreen() {
  const d = useStore();
  const stats = useMemo(() => (d ? computeStats(d) : null), [d]);
  const rows = useMemo(
    () => (stats ? transparencyList(stats).slice(0, 10) : null),
    [stats]
  );

  if (!d || !stats || !rows) {
    return (
      <div className="px-4 pb-6 pt-4">
        <FeedSkeleton rows={3} />
      </div>
    );
  }

  const branchChart = stats.byBranch.slice(0, 8).map((b) => ({
    name: b.branch.length > 12 ? b.branch.slice(0, 11) + "…" : b.branch,
    অভিযোগ: b.count,
  }));

  // ডোনাট: নাগরিকের ক্ষতি শাখাভিত্তিক (somossha-স্টাইল বড় কমলা ডোনাট)
  const donutData = stats.byBranch
    .filter((b) => b.money > 0)
    .slice(0, 5)
    .map((b) => ({ name: b.branch, value: b.money }));
  const DONUT_COLORS = [
    "rgb(var(--accent))",
    "rgb(var(--accent) / 0.65)",
    "rgb(var(--accent) / 0.45)",
    "rgb(var(--accent) / 0.3)",
    "rgb(var(--accent) / 0.18)",
  ];
  const maxDistrictCount = Math.max(1, ...stats.byDistrict.map((x) => x.count));

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
      {/* এক নজরে */}
      <section aria-label="মূল হিসাব">
        <h2 className="mb-2.5 text-sm font-bold text-foreground">এক নজরে</h2>
        <div className="grid grid-cols-2 gap-2.5 text-sm sm:grid-cols-4">
          {[
            ["মোট অভিযোগ", bn(stats.totalComplaints)],
            ["নাগরিকের ক্ষতি", bnCompactMoney(stats.totalMoney)],
            ["জনগণের অর্থ (অনুমান)", bnCompactMoney(stats.totalPublicMoney)],
            ["ভুক্তভোগী", bn(stats.totalVictims) + " জন"],
            ["ক্ষতিগ্রস্ত", bn(stats.totalPeople) + " জন"],
            ["সময় নষ্ট", bn(stats.totalTime) + " দিন"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border bg-surface p-3.5">
              <p className="tnum text-lg font-extrabold leading-none">{value}</p>
              <p className="mt-1.5 text-[11px] text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ডোনাট — নাগরিকের ক্ষতির বিতরণ */}
      {donutData.length > 0 && (
        <section aria-label="ক্ষতির বিতরণ">
          <h2 className="mb-2.5 text-sm font-bold text-foreground">নাগরিকের ক্ষতি শাখাভিত্তিক</h2>
          <Card variant="default" className="p-3">
            <div className="h-56 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="88%"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(128,128,128,.25)",
                      fontSize: 12,
                      background: "rgb(var(--background))",
                      color: "rgb(var(--foreground))",
                    }}
                    formatter={(v: number | string) => bnCompactMoney(Number(v))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {donutData.map((dd, i) => (
                <span key={dd.name} className="inline-flex items-center gap-1.5 text-[10px] text-muted">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    aria-hidden
                  />
                  {dd.name}
                </span>
              ))}
            </div>
            <p className="mt-2 border-t border-border/70 pt-2 text-[10px] text-muted">
              হিসাবটি নাগরিকের সরাসরি ক্ষতির; জনগণের অর্থ আলাদা — যোগ করা হয় না।
            </p>
          </Card>
        </section>
      )}

      {/* শাখা অনুযায়ী */}
      {branchChart.length > 0 && (
        <section aria-label="শাখা অনুযায়ী অভিযোগ">
          <h2 className="mb-2.5 text-sm font-bold text-foreground">শাখা অনুযায়ী অভিযোগ</h2>
          <Card variant="default" className="p-3">
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-32}
                    textAnchor="end"
                    height={62}
                    stroke="currentColor"
                    opacity={0.6}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} stroke="currentColor" opacity={0.6} />
                  <Tooltip
                    cursor={{ fill: "currentColor", opacity: 0.06 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(128,128,128,.25)",
                      fontSize: 12,
                      background: "rgb(var(--background))",
                      color: "rgb(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="অভিযোগ" fill="rgb(var(--accent))" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* সর্বাধিক অভিযোগের দপ্তর */}
      {stats.byDepartment.length > 0 && (
        <section aria-label="সর্বাধিক অভিযোগের দপ্তর">
          <h2 className="mb-2.5 text-sm font-bold text-foreground">সর্বাধিক অভিযোগের দপ্তর</h2>
          <Card variant="default" className="flex flex-col gap-3 p-4">
            {stats.byDepartment.slice(0, 8).map((dep, i) => (
              <div key={dep.name} className="flex items-center gap-3">
                <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[11px] font-bold">
                  {bn(i + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold">{dep.name}</p>
                    <span className="tnum shrink-0 text-[11px] text-muted">
                      {bn(dep.count)} টি · {bnCompactMoney(dep.money)}
                    </span>
                  </div>
                  <ProgressBar
                    className="mt-1.5"
                    size="sm"
                    value={Math.round((dep.count / Math.max(1, stats.byDepartment[0].count)) * 100)}
                    aria-label={`${dep.name} — ${bn(dep.count)} অভিযোগ`}
                  />
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* জেলা অনুযায়ী */}
      {stats.byDistrict.length > 0 && (
        <section aria-label="জেলা অনুযায়ী অভিযোগ">
          <h2 className="mb-2.5 text-sm font-bold text-foreground">জেলা অনুযায়ী</h2>
          <Card variant="default" className="flex flex-col gap-3 p-4">
            {stats.byDistrict.slice(0, 8).map((dt) => (
              <div key={dt.name} className="flex items-center gap-3">
                <p className="w-24 shrink-0 truncate text-[12px] font-semibold">{dt.name}</p>
                <ProgressBar
                  className="flex-1"
                  size="sm"
                  value={Math.round((dt.count / maxDistrictCount) * 100)}
                  aria-label={`${dt.name} — ${bn(dt.count)} অভিযোগ`}
                />
                <span className="tnum w-6 shrink-0 text-end text-[11px] font-bold">{bn(dt.count)}</span>
              </div>
            ))}
            {stats.byDistrict.length > 8 && (
              <p className="text-[10px] text-muted">
                + আরও {bn(stats.byDistrict.length - 8)} টি জেলায় অভিযোগ আছে
              </p>
            )}
          </Card>
        </section>
      )}

      {/* স্বচ্ছতা সূচক */}
      <section aria-label="স্বচ্ছতা সূচক">
        <h2 className="mb-1 text-sm font-bold text-foreground">স্বচ্ছতা সূচক</h2>
        <Card variant="secondary" className="mt-2 flex items-start gap-2 p-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <p className="text-xs leading-relaxed text-muted">
            অভিযোগ-ঘনত্ব থেকে গণনাকৃত নির্দেশক — যে দপ্তরে অনুপাতহারে বেশি অভিযোগ, সেটির স্কোর কম।
            এটি কোনো সরকারি র‍্যাংকিং নয়; নাগরিক-নজরদারির সূচনাবিন্দু মাত্র।
          </p>
        </Card>
        <div className="mt-3 flex flex-col gap-2.5">
          {rows.map((r, i) => {
            const lv =
              r.score >= 70
                ? { label: "তুলনামূলক ভালো", color: "success" as const }
                : r.score >= 45
                  ? { label: "নজরে রাখুন", color: "warning" as const }
                  : { label: "ঝুঁকিপূর্ণ", color: "danger" as const };
            return (
              <div key={r.name} className="rounded-2xl border border-border bg-surface p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="tnum flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold">
                    {bn(i + 1)}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{r.name}</p>
                  <Chip color={lv.color} variant="soft" size="sm">{lv.label}</Chip>
                </div>
                <div className="mt-2 flex items-center gap-2.5">
                  <ProgressBar
                    className="flex-1"
                    size="sm"
                    value={r.score}
                    aria-label={`${r.name} স্বচ্ছতা স্কোর ${bn(r.score)}`}
                  />
                  <span className="tnum text-[11px] font-bold text-foreground">{bn(r.score)}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  {r.count > 0 ? `${bn(r.count)} টি অভিযোগ প্রকাশিত` : "কোনো অভিযোগ নেই"} · {r.branch}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-center text-[11px] text-muted">
        হালনাগাদ: {bnTimeAgo(new Date())} পর্যন্ত প্রকাশিত অভিযোগের ভিত্তিতে
      </p>
    </div>
  );
}

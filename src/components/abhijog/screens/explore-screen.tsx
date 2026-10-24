// অভিযোগ — খুঁজুন স্ক্রিন: অনুসন্ধান + বিস্তারিত ফিল্টার

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, SelectField } from "@/components/ui/kit";
import { Search, X } from "lucide-react";
import { listComplaints, useStore, useTaxoMaps, type SortKey } from "@/lib/store";
import { getDistricts, getDivisions, useGeoList } from "@/lib/geo";
import { bn } from "@/lib/bn";
import { ComplaintCard } from "../complaint-card";
import { EmptyState, FeedSkeleton } from "../parts";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "সাম্প্রতিক" },
  { key: "support", label: "সমর্থন" },
  { key: "money", label: "ক্ষতি" },
];

export function ExploreScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const d = useStore();
  const taxo = useTaxoMaps();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [divisionFilterId, setDivisionFilterId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);

  // অবস্থানের তালিকা (UnifiedAPI, ক্যাশসহ) — বিভাগ না বাছলে সব ৬৪ জেলা
  const divisions = useGeoList(getDivisions, [], true);
  const districts = useGeoList(
    () => getDistricts(divisionFilterId || undefined),
    [divisionFilterId],
    true
  );

  // ডিবাউন্স অনুসন্ধান
  const onSearchChange = (v: string) => {
    setText(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQ(v), 300);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const filteredCategories = useMemo(
    () => taxo.categories.filter((c) => !branch || c.branch === branch),
    [taxo, branch]
  );

  const results = useMemo(
    () =>
      d
        ? listComplaints(
            d,
            {
              q,
              branch,
              categoryId,
              departmentId,
              districtId,
              districtName: districts.items.find((x) => x.id === districtId)?.bn_name,
              sort,
            },
            { page: 1, pageSize: 50 }
          )
        : null,
    [d, q, branch, categoryId, departmentId, districtId, districts.items, sort]
  );

  const hasFilters = !!(q || branch || categoryId || departmentId || divisionFilterId || districtId);
  const clearAll = () => {
    setText(""); setQ(""); setBranch(""); setCategoryId(""); setDepartmentId("");
    setDivisionFilterId(""); setDistrictId("");
  };

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-3">
      {/* অনুসন্ধান ঘর */}
      <div ref={inputWrapRef} className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={text}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="শব্দ, দপ্তর বা কোড (r/xxxxxx)…"
          aria-label="অভিযোগ খুঁজুন"
          autoComplete="off"
          className="h-11 w-full rounded-2xl border border-border bg-surface ps-10 pe-10 text-sm outline-none transition-colors placeholder:text-muted/70 focus:border-accent"
        />
        {text && (
          <button
            type="button"
            onClick={() => { setText(""); setQ(""); }}
            aria-label="অনুসন্ধান মুছুন"
            className="absolute end-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-surface-secondary text-muted"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* সাজানো চিপ */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSort(s.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              sort === s.key ? "bg-accent/10 text-accent" : "bg-surface-secondary text-muted"
            }`}
            aria-pressed={sort === s.key}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ফিল্টার */}
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="শাখা"
          value={branch}
          onChange={(v) => { setBranch(v); setCategoryId(""); }}
          options={taxo.branches.map((b) => ({ value: b, label: b }))}
          placeholder="সব শাখা"
        />

        <SelectField
          label="ধরন"
          value={categoryId}
          onChange={setCategoryId}
          options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder={branch ? "সব ধরন" : "আগে শাখা বাছুন"}
          disabled={!branch}
        />

        <SelectField
          label="দপ্তর"
          value={departmentId}
          onChange={setDepartmentId}
          options={taxo.departments.map((dp) => ({ value: dp.id, label: dp.name }))}
          placeholder="সব দপ্তর"
        />

        <SelectField
          label="বিভাগ"
          value={divisionFilterId}
          onChange={(v) => { setDivisionFilterId(v); setDistrictId(""); }}
          options={divisions.items.map((dv) => ({ value: dv.id, label: dv.bn_name }))}
          placeholder="সব বিভাগ"
          disabled={divisions.loading || divisions.error}
        />

        <SelectField
          label="জেলা"
          value={districtId}
          onChange={setDistrictId}
          options={districts.items.map((dt) => ({ value: dt.id, label: dt.bn_name }))}
          placeholder={districts.loading ? "লোড হচ্ছে…" : districts.error ? "আনা যায়নি" : "সব জেলা"}
          disabled={districts.loading || districts.error}
          className="col-span-2"
        />
      </div>

      {/* ফলাফল হেডার */}
      {d && (
        <div className="flex items-center justify-between">
          <p className="tnum text-xs text-muted">
            {results ? bn(results.total) : "—"} টি ফলাফল
          </p>
          {hasFilters && (
            <Button size="sm" variant="ghost" onPress={clearAll}>
              <X className="size-3.5" aria-hidden />
              ফিল্টার মুছুন
            </Button>
          )}
        </div>
      )}

      {/* ফলাফল */}
      {!d ? (
        <FeedSkeleton rows={3} />
      ) : results && results.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {results.items.map((c) => (
            <ComplaintCard key={c.id} c={c} onPress={() => onOpen(c.id)} />
          ))}
        </div>
      ) : d ? (
        <EmptyState
          title="কিছু মেলেনি"
          body="ভিন্ন শব্দ দিয়ে খুঁজুন বা ফিল্টার পরিবর্তন করুন — যেমন 'ভূমি', 'ঘুষ' বা কোড r/xxxxxx।"
        />
      ) : null}

      {/* জনপ্রিয় সাজেশন */}
      {!hasFilters && d && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-muted">জনপ্রিয়:</span>
          {["ঘুষ", "নামজারি", "পাসপোর্ট", "রাস্তা", "ভোট"].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => { setText(w); setQ(w); }}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted transition-colors active:bg-surface-secondary"
            >
              {w}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

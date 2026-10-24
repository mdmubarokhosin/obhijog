// অভিযোগ — সাবমিট শিট: নতুন অভিযোগ জমা দেওয়ার বটম-শিট (vaul)
// অবস্থান — দুই মোড (ইউজারের নির্দেশ):
//   ① ম্যানুয়াল নির্বাচন: বিভাগ → জেলা → উপজেলা → ইউনিয়ন (UnifiedAPI — সবগুলো আবশ্যক)
//   ② সরাসরি লোকেশন (GPS): নাম না জানলে ডিভাইসের লোকেশন থেকে ৪ ধাপ অটোমেটিক বসে যায়;
//      যে ধাপ মেলে না সেটি ম্যানুয়ালি বাছতে হয় (তালিকা স্বয়ংক্রিয়ভাবে লোড থাকে)।
// শাখা/ধরন/দপ্তর: অ্যাডমিন প্যানেলের ট্যাক্সোনমি (RTDB) — খালি হলে বিল্ট-ইন ডিফল্ট।
// প্রমাণ-ছবি: কমপক্ষে ১টি আবশ্যক → GitHub API-তে হোস্ট হয়ে jsDelivr URL হয়।

"use client";

import { useMemo, useState } from "react";
import { Button, Field, SelectField, inputCls, textareaCls, type SelectOption } from "@/components/ui/kit";
import { toast } from "sonner";
import { CheckCircle2, EyeOff, Loader2, LocateFixed, MapPin, PencilLine, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { createComplaint, useTaxoMaps, type LocationInfo } from "@/lib/store";
import {
  GEO_ERROR_MSG,
  gpsErrMsg,
  getCurrentPosition,
  getDistricts,
  getDivisions,
  getUnions,
  getUpazilas,
  resolveLocationByCoords,
  useGeoList,
  type GeoDistrict,
  type GeoDivision,
  type GeoListState,
  type GeoUnion,
  type GeoUpazila,
  type ResolvedGeo,
} from "@/lib/geo";
import { bn } from "@/lib/bn";
import { PhotoPicker, MAX_PHOTOS } from "../photo-picker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

const req = <span className="text-danger"> *</span>;

type LocMode = "manual" | "gps";

export function SubmitSheet({ open, onOpenChange, onCreated }: Props) {
  const [branch, setBranch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [upazilaId, setUpazilaId] = useState("");
  const [unionId, setUnionId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotosLocal] = useState<string[]>([]);
  const [moneyLost, setMoneyLost] = useState("");
  const [publicMoney, setPublicMoney] = useState("");
  const [timeWasted, setTimeWasted] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // অবস্থান-মোড + GPS অবস্থা
  const [locMode, setLocMode] = useState<LocMode>("manual");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsResult, setGpsResult] = useState<ResolvedGeo | null>(null);
  const [gpsError, setGpsError] = useState("");

  // ট্যাক্সোনমি (RTDB → ফলব্যাক ডিফল্ট)
  const taxo = useTaxoMaps();
  const filteredCategories = useMemo(
    () => taxo.categories.filter((c) => !branch || c.branch === branch),
    [taxo, branch]
  );

  // ── অবস্থান: ক্যাসকেডিং তালিকা (ক্যাশে থাকলে সঙ্গে সঙ্গে, নইলে API থেকে) ──
  const divisions = useGeoList(getDivisions, [], true);
  const districts = useGeoList<GeoDistrict>(
    () => getDistricts(divisionId || undefined),
    [divisionId],
    !!divisionId
  );
  const upazilas = useGeoList<GeoUpazila>(() => getUpazilas(districtId), [districtId], !!districtId);
  const unions = useGeoList<GeoUnion>(() => getUnions(upazilaId), [upazilaId], !!upazilaId);

  const anyGeoError =
    divisions.error ||
    (!!divisionId && districts.error) ||
    (!!districtId && upazilas.error) ||
    (!!upazilaId && unions.error);

  const retryGeo = () => {
    divisions.retry();
    if (divisionId) districts.retry();
    if (districtId) upazilas.retry();
    if (upazilaId) unions.retry();
  };

  /** সরাসরি লোকেশন: GPS → রিভার্স-জিওকোড → ৪ ধাপ অটো-ফিল */
  const locateMe = async () => {
    if (gpsBusy) return;
    setGpsBusy(true);
    setGpsError("");
    try {
      const { lat, lon } = await getCurrentPosition();
      const res = await resolveLocationByCoords(lat, lon);
      if (!res.ok) {
        setGpsError("লোকেশন পাওয়া গেছে, কিন্তু বিভাগ/জেলার সঙ্গে মেলানো যায়নি — ম্যানুয়ালি বাছুন।");
        setGpsResult(res);
        return;
      }
      // ক্যাসকেড অটো-ফিল (প্যারেন্ট আগে; মিলে যায়নি এমন ধাপ খালি — ম্যানুয়াল বাছাই)
      setDivisionId(res.divisionId);
      setDistrictId(res.districtId);
      setUpazilaId(res.upazilaId);
      setUnionId(res.unionId);
      setGpsResult(res);
      const filled = [res.divisionName, res.districtName, res.upazilaName, res.unionName].filter(Boolean).length;
      if (filled < 4) {
        toast.info(`বিভাগ ও জেলা বসেছে — বাকি ${bn(4 - filled)}টি ধাপ তালিকা থেকে বাছুন।`);
      } else {
        toast.success("অবস্থান স্বয়ংক্রিয়ভাবে নির্ধারিত হয়েছে।");
      }
    } catch (e) {
      setGpsError(gpsErrMsg(e));
      setGpsResult(null);
    } finally {
      setGpsBusy(false);
    }
  };

  const valid =
    branch && categoryId && departmentId &&
    divisionId && districtId && upazilaId && unionId &&
    photos.length >= 1 &&
    title.trim().length >= 10 && title.trim().length <= 200 &&
    description.trim().length >= 30;

  const reset = () => {
    setBranch(""); setCategoryId(""); setDepartmentId("");
    setDivisionId(""); setDistrictId(""); setUpazilaId(""); setUnionId("");
    setTitle(""); setDescription(""); setPhotosLocal([]);
    setMoneyLost(""); setPublicMoney(""); setTimeWasted(""); setPeopleCount("");
    setLocMode("manual"); setGpsResult(null); setGpsError("");
  };

  const submit = async () => {
    if (!valid || submitting) {
      if (!submitting) {
        toast.error(
          "সব আবশ্যক ঘর পূরণ করুন — অবস্থানের ৪টি ধাপ (সরাসরি লোকেশন বা ম্যানুয়াল), কমপক্ষে ১টি প্রমাণ-ছবি, শিরোনাম ≥১০ ও বিবরণ ≥৩০ অক্ষর।"
        );
      }
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error("অফলাইন — ইন্টারনেট সংযোগের পর আবার চেষ্টা করুন।");
      return;
    }
    const div = divisions.items.find((x) => x.id === divisionId);
    const dis = districts.items.find((x) => x.id === districtId);
    const upa = upazilas.items.find((x) => x.id === upazilaId);
    const uni = unions.items.find((x) => x.id === unionId);
    const location: LocationInfo = {
      divisionId,
      division: div?.bn_name ?? "",
      districtId,
      district: dis?.bn_name ?? "",
      upazilaId,
      upazila: upa?.bn_name ?? "",
      unionId,
      union: uni?.bn_name ?? "",
    };

    setSubmitting(true);
    const res = await createComplaint({
      title,
      description,
      categoryId,
      departmentId,
      districtId,
      location,
      photos,
      moneyLost: parseInt(moneyLost, 10) || 0,
      publicMoney: parseInt(publicMoney, 10) || 0,
      timeWasted: parseInt(timeWasted, 10) || 0,
      peopleCount: parseInt(peopleCount, 10) || 1,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `অভিযোগ জমা হয়েছে! কোড: ${res.code} — সংরক্ষণ করুন।` +
        (res.hosted > 0 ? ` ${bn(res.hosted)}টি ছবি GitHub-এ হোস্ট হয়েছে।` : "")
    );
    reset();
    onOpenChange(false);
    onCreated(res.id);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        aria-describedby={undefined}
        className="mx-auto max-h-[94dvh] w-full max-w-[480px] rounded-t-3xl border-border bg-background outline-none"
      >
        <DrawerHeader className="relative items-center justify-center pt-3">
          <DrawerTitle className="text-center text-base font-extrabold">নতুন অভিযোগ করুন</DrawerTitle>
        </DrawerHeader>

        <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-2 pt-3">
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-accent/10 p-3.5">
            <EyeOff className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <p className="text-xs leading-relaxed">
              আপনার নাম, ফোন বা ইমেইল কোথাও লাগবে না। অভিযোগ সঙ্গে সঙ্গে প্রকাশ হয় এবং
              <strong> শুধু পদ ও দপ্তরের নাম</strong> ব্যবহার করা হয় — ব্যক্তির নাম নয়।
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            {/* শাখা / ধরন / দপ্তর — অ্যাডমিনের ট্যাক্সোনমি থেকে (রিয়েলটাইম) */}
            <div className="grid grid-cols-2 gap-2.5">
              <SelectField
                label={<>শাখা{req}</>}
                value={branch}
                onChange={(v) => { setBranch(v); setCategoryId(""); }}
                options={taxo.branches.map((b) => ({ value: b, label: b }))}
                placeholder="শাখা নির্বাচন"
              />
              <SelectField
                label={<>ধরন{req}</>}
                value={categoryId}
                onChange={setCategoryId}
                options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder={branch ? "ধরন নির্বাচন" : "আগে শাখা বাছুন"}
                disabled={!branch}
              />
              <SelectField
                label={<>দপ্তর / অফিস{req}</>}
                value={departmentId}
                onChange={setDepartmentId}
                options={taxo.departments.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="দপ্তর নির্বাচন"
                className="col-span-2"
              />
            </div>

            {/* অবস্থান — দুই মোড: ম্যানুয়াল / সরাসরি লোকেশন */}
            <div className="rounded-2xl border border-border bg-surface-secondary/40 p-3">
              <p className="mb-2 text-xs font-bold text-foreground">
                অবস্থান — ৪ ধাপ <span className="font-semibold text-danger">(আবশ্যক)</span>
              </p>

              {/* মোড-টগল */}
              <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-surface p-1">
                <ModeTab
                  active={locMode === "gps"}
                  onClick={() => { setLocMode("gps"); if (!gpsResult) void locateMe(); }}
                  icon={<LocateFixed className="size-4" aria-hidden />}
                  label="সরাসরি লোকেশন"
                />
                <ModeTab
                  active={locMode === "manual"}
                  onClick={() => setLocMode("manual")}
                  icon={<PencilLine className="size-4" aria-hidden />}
                  label="ম্যানুয়াল নির্বাচন"
                />
              </div>

              {/* GPS মোড — স্ট্যাটাস কার্ড */}
              {locMode === "gps" && (
                <div className="mb-3 rounded-xl border border-border bg-background p-3">
                  {gpsBusy ? (
                    <div className="flex items-center gap-2.5">
                      <Loader2 className="size-5 animate-spin text-accent" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-xs font-bold">লোকেশন সনাক্ত করা হচ্ছে…</p>
                        <p className="mt-0.5 text-[10px] text-muted">GPS চালু রাখুন — কয়েক সেকেন্ড লাগতে পারে।</p>
                      </div>
                    </div>
                  ) : gpsError ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-[11px] leading-relaxed text-danger">{gpsError}</p>
                      <Button size="sm" variant="outline" className="self-start" onPress={() => void locateMe()}>
                        <RefreshCw className="size-3.5" aria-hidden />
                        আবার খুঁজুন
                      </Button>
                    </div>
                  ) : gpsResult ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {gpsResult.ok ? (
                          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                        ) : (
                          <MapPin className="size-4 shrink-0 text-warning" aria-hidden />
                        )}
                        <p className="text-xs font-bold">
                          {gpsResult.ok ? "লোকেশন সনাক্ত হয়েছে" : "সনাক্তকরণ আংশিক"}
                        </p>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted">
                        {gpsResult.ok
                          ? "স্বয়ংক্রিয়ভাবে নির্ধারিত অবস্থান নিচে বসেছে — ভুল মনে হলে তালিকা থেকে বদলে নিতে পারেন।"
                          : "বিভাগ/জেলা মেলেনি — নিচের তালিকা থেকে ম্যানুয়ালি বাছুন।"}
                      </p>
                      <Button size="sm" variant="outline" className="self-start" onPress={() => void locateMe()}>
                        <LocateFixed className="size-3.5" aria-hidden />
                        আবার সনাক্ত করুন
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-[11px] leading-relaxed text-muted">
                        বিভাগ, জেলা, উপজেলা বা ইউনিয়নের নাম জানা না থাকলে এক ট্যাপে ডিভাইসের লোকেশন
                        থেকে অবস্থান স্বয়ংক্রিয়ভাবে বসে যাবে। নাম জানলে &ldquo;ম্যানুয়াল নির্বাচন&rdquo; ব্যবহার করুন —
                        যেকোনো একটি বাধ্যতামূলক।
                      </p>
                      <Button size="sm" className="self-start" onPress={() => void locateMe()}>
                        <LocateFixed className="size-3.5" aria-hidden />
                        লোকেশন সনাক্ত করুন
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <GeoSelect<GeoDivision>
                  label="বিভাগ"
                  value={divisionId}
                  onChange={(v) => { setDivisionId(v); setDistrictId(""); setUpazilaId(""); setUnionId(""); }}
                  list={divisions}
                  active
                  waitingPlaceholder="বিভাগ নির্বাচন"
                />
                <GeoSelect<GeoDistrict>
                  label="জেলা"
                  value={districtId}
                  onChange={(v) => { setDistrictId(v); setUpazilaId(""); setUnionId(""); }}
                  list={districts}
                  active={!!divisionId}
                  waitingPlaceholder="আগে বিভাগ বাছুন"
                />
                <GeoSelect<GeoUpazila>
                  label="উপজেলা / থানা"
                  value={upazilaId}
                  onChange={(v) => { setUpazilaId(v); setUnionId(""); }}
                  list={upazilas}
                  active={!!districtId}
                  waitingPlaceholder="আগে জেলা বাছুন"
                />
                <GeoSelect<GeoUnion>
                  label="ইউনিয়ন"
                  value={unionId}
                  onChange={setUnionId}
                  list={unions}
                  active={!!upazilaId}
                  waitingPlaceholder="আগে উপজেলা বাছুন"
                />
              </div>
              {anyGeoError && (
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-danger/10 px-3 py-2">
                  <p className="text-[11px] leading-snug text-danger">{GEO_ERROR_MSG}</p>
                  <Button size="sm" variant="outline" onPress={retryGeo}>
                    <RefreshCw className="size-3.5" aria-hidden />
                    আবার
                  </Button>
                </div>
              )}
              <p className="mt-2 text-[10px] leading-relaxed text-muted">
                তথ্যসূত্র: সরকারি প্রশাসনিক এলাকা (UnifiedAPI) — সরাসরি লোকেশন দিলে বিভাগ, জেলা, উপজেলা ও
                ইউনিয়ন অটোমেটিক বসে যায়; নইলে ম্যানুয়ালি নির্বাচন করুন (দায়িত্ব নির্দিষ্ট করতে প্রয়োজন)।
              </p>
            </div>

            <Field label={<>শিরোনাম{req}</>} hint="ব্যক্তির নাম নয়; দপ্তর ও ঘটনা লিখুন।">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="কী ঘটেছে — এক বাক্যে (১০–২০০ অক্ষর)"
                className={inputCls}
              />
            </Field>

            <Field
              label={<>বিবরণ{req}</>}
              hint={`${bn(description.trim().length)} অক্ষর — ন্যূনতম ৩০`}
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ঘটনার বিস্তারিত — কখন, কোথায়, কী চাওয়া হয়েছিল, কত টাকা ও সময় খরচ হলো (৩০–৪০০০ অক্ষর)…"
                rows={4}
                className={textareaCls}
              />
            </Field>

            {/* প্রমাণ-ছবি (আবশ্যক) */}
            <Field
              label={<>প্রমাণ-ছবি{req}</>}
              hint={`কমপক্ষে ১টি আবশ্যক — রশিদ, ডকুমেন্ট, স্ক্রিনশট বা ঘটনাস্থলের ছবি (সর্বোচ্চ ${bn(MAX_PHOTOS)}টি)`}
            >
              <PhotoPicker photos={photos} onChange={setPhotosLocal} />
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="নাগরিকের ক্ষতি (৳)">
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  inputMode="numeric"
                  value={moneyLost}
                  onChange={(e) => setMoneyLost(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field
                label="জনগণের অর্থ (অনুমান) (৳)"
                hint="প্রকল্প/বরাদ্দের টাকা হলে; না জানলে খালি"
              >
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  inputMode="numeric"
                  value={publicMoney}
                  onChange={(e) => setPublicMoney(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="সময় নষ্ট (দিন)">
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  inputMode="numeric"
                  value={timeWasted}
                  onChange={(e) => setTimeWasted(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="ক্ষতিগ্রস্ত মানুষ">
                <input
                  type="number"
                  min={1}
                  placeholder="1"
                  inputMode="numeric"
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <p className="inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              প্রকাশের পর অ্যাডমিন যাচাই করবেন এবং পাঠকরা সমর্থন/আপত্তি দিয়ে সহায়তা করবেন; পর্যাপ্ত আপত্তিতে স্বয়ংক্রিয়ভাবে সরে যাবে। কোডটি সংরক্ষণ করুন।
            </p>
          </div>
        </div>

        <DrawerFooter className="mx-auto w-full max-w-[480px] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="tertiary" className="flex-1" isDisabled={submitting} onPress={() => onOpenChange(false)}>
            বাতিল
          </Button>
          <Button className="flex-[2]" isDisabled={!valid || submitting} onPress={submit}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {submitting ? "জমা হচ্ছে…" : "প্রকাশ করুন"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ─── মোড-টগলের একটি ট্যাব ───────────────────────────────────
function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-bold transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface-secondary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── অবস্থানের একটি ধাপ — নেটিভ <select>, Android-এ সিস্টেম পিকার ──
function GeoSelect<T extends { id: string; bn_name: string }>({
  label,
  value,
  onChange,
  list,
  active,
  waitingPlaceholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  list: GeoListState<T>;
  active: boolean;
  waitingPlaceholder: string;
}) {
  const options: SelectOption[] = list.items.map((x) => ({ value: x.id, label: x.bn_name }));
  const busy = !active || list.loading || list.error;
  const placeholder = !active
    ? waitingPlaceholder
    : list.loading
      ? "লোড হচ্ছে…"
      : list.error
        ? "আনা যায়নি"
        : "নির্বাচন করুন";
  return (
    <SelectField
      label={<>{label}{req}</>}
      value={value}
      onChange={onChange}
      options={busy ? [] : options}
      placeholder={placeholder}
      disabled={busy}
    />
  );
}

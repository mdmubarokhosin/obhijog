// অভিযোগ — ডিটেইল স্ক্রিন: বিস্তারিত, যাচাই (সমর্থন/আপত্তি), মন্তব্য

"use client";

import { useMemo, useState } from "react";
import { Button, Chip, textareaCls } from "@/components/ui/kit";
import { toast } from "sonner";
import {
  Banknote,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  Hash,
  Landmark,
  MapPin,
  Send,
  Share2,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Users,
  X,
} from "lucide-react";
import {
  addComment,
  getComplaint,
  locationLabel,
  reactToComplaint,
  useComments,
  useStore,
  useTaxoMaps,
  type Stance,
} from "@/lib/store";
import { DISTRICT_BY_ID } from "@/lib/data";
import { bn, bnDate, bnMoney, bnTimeAgo } from "@/lib/bn";
import { StatusChip } from "../parts";

export function DetailScreen({ id }: { id: string }) {
  const d = useStore();
  const taxo = useTaxoMaps();
  const c = useMemo(() => (d ? getComplaint(d, id) : undefined), [d, id]);
  const { items: comments } = useComments(id);

  const [body, setBody] = useState("");
  const [stance, setStance] = useState<Stance>("support");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const myReaction = d?.reactions[id] ?? null;

  const share = async () => {
    if (!c) return;
    const text = `${c.title} — কোড: ${c.code} (অভিযোগ অ্যাপ)`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "অভিযোগ", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("কোড ও শিরোনাম কপি হয়েছে।");
    } catch {
      // ব্যবহারকারী শেয়ার বাতিল করলে নীরব
    }
  };

  const react = async (action: Stance) => {
    if (!c) return;
    const res = await reactToComplaint(c.id, action);
    if (res === "already") {
      toast.info("আপনি ইতিমধ্যে একবার প্রতিক্রিয়া জানিয়েছেন — একজন একবারই পারেন।");
      return;
    }
    if (res === "error") {
      toast.error("প্রতিক্রিয়া সংরক্ষণ করা যায়নি — সংযোগ দেখে আবার চেষ্টা করুন।");
      return;
    }
    if (res === "ok") {
      toast.success(action === "support" ? "আপনার সমর্থন যোগ হয়েছে।" : "আপনার আপত্তি যোগ হয়েছে।");
    }
  };

  const send = async () => {
    if (body.trim().length < 5) {
      toast.error("মন্তব্য কমপক্ষে ৫ অক্ষরের হতে হবে।");
      return;
    }
    const res = await addComment(id, body, stance);
    if (res === "ok") {
      setBody("");
      toast.success("মন্তব্য যোগ হয়েছে।");
    } else {
      toast.error("মন্তব্য সংরক্ষণ করা যায়নি — সংযোগ দেখে আবার চেষ্টা করুন।");
    }
  };

  if (!d) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    );
  }

  if (!c) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="font-bold">অভিযোগটি পাওয়া যায়নি</p>
        <p className="mt-1 text-sm text-muted">কোডটি আবার যাচাই করুন।</p>
      </div>
    );
  }

  const cat = taxo.CAT.get(c.categoryId);
  const dep = taxo.DEP.get(c.departmentId);
  const locText = c.location
    ? locationLabel(c.location)
    : (DISTRICT_BY_ID.get(c.districtId)?.name ?? "");
  const photos = c.evidence ?? [];
  const total = c.supports + c.objections;
  const supportPct = total > 0 ? Math.round((c.supports / total) * 100) : 100;

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
      {/* অবস্থা ব্যানার */}
      {c.status === "removed" && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger">
          পর্যাপ্ত পাঠক-আপত্তির কারণে এই অভিযোগটি সরিয়ে নেওয়া হয়েছে — আর ফিডে দেখা যাবে না।
        </div>
      )}
      {c.status === "rejected" && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger">
          যাচাইয়ে এই অভিযোগটি বাতিল করা হয়েছে — ফিডে দেখা যায় না; কোড দিয়ে ট্র্যাক করা যায়।
        </div>
      )}
      {c.statusNote && (
        <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-3.5 text-[13px] leading-relaxed">
          <span className="font-bold text-accent">অ্যাডমিনের নোট: </span>
          {c.statusNote}
        </div>
      )}

      {/* চিপ সারি */}
      <div className="flex flex-wrap gap-1.5">
        <StatusChip status={c.status} />
        <Chip color="accent" variant="soft" size="sm">{cat?.name ?? "অজানা"}</Chip>
        <Chip variant="tertiary" size="sm">{cat?.branch ?? "—"}</Chip>
        <Chip variant="tertiary" size="sm" className="font-mono">{c.code}</Chip>
      </div>

      <h2 className="text-xl font-extrabold leading-snug tracking-tight">{c.title}</h2>

      {/* তথ্য গ্রিড */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-secondary p-3.5 text-[13px]">
        <span className="inline-flex items-center gap-2">
          <Building2 className="size-4 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0"><span className="text-muted">দপ্তর:</span> {dep?.name}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0"><span className="text-muted">অবস্থান:</span> {locText || "—"}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <Banknote className="size-4 shrink-0 text-danger" aria-hidden />
          <span className="min-w-0"><span className="text-muted">ক্ষতি:</span> {bnMoney(c.moneyLost)}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-warning" aria-hidden />
          <span className="min-w-0"><span className="text-muted">সময়:</span> {bn(c.timeWasted)} দিন</span>
        </span>
        {c.publicMoney > 0 && (
          <span className="inline-flex items-center gap-2">
            <Landmark className="size-4 shrink-0 text-warning" aria-hidden />
            <span className="min-w-0"><span className="text-muted">জনগণের অর্থ (অনুমান):</span> {bnMoney(c.publicMoney)}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-2">
          <Users className="size-4 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0"><span className="text-muted">ক্ষতিগ্রস্ত:</span> {bn(c.peopleCount)} জন</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <Hash className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="min-w-0"><span className="text-muted">তারিখ:</span> {bnDate(c.createdAt)}</span>
        </span>
      </div>

      {/* বিবরণ */}
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">{c.description}</p>

      {/* প্রমাণ-ছবি */}
      {photos.length > 0 && (
        <section aria-label="প্রমাণ-ছবি">
          <h3 className="text-sm font-bold">প্রমাণ-ছবি ({bn(photos.length)})</h3>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(i)}
                className="size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-secondary"
                aria-label={`প্রমাণ-ছবি ${bn(i + 1)} বড় করে দেখুন`}
              >
                <img src={p} alt={`প্রমাণ-ছবি ${bn(i + 1)}`} className="size-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted">ছবি ট্যাপ করে বড় করে দেখুন — যাচাইয়ের ভিত্তি হিসেবে ব্যবহার করুন।</p>
        </section>
      )}

      {/* যাচাই বার */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="tnum font-semibold text-accent">
            <ThumbsUp className="me-1 inline size-3.5" aria-hidden />
            {bn(c.supports)} সমর্থন
          </span>
          <span className="inline-flex items-center gap-1 text-muted">
            <ShieldCheck className="size-3.5" aria-hidden />
            পাঠকের যাচাই — প্ল্যাটফর্ম নয়
          </span>
          <span className="tnum font-semibold text-danger">
            {bn(c.objections)} আপত্তি
            <ThumbsDown className="ms-1 inline size-3.5" aria-hidden />
          </span>
        </div>
        <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-danger/25" role="img" aria-label={`সমর্থন ${bn(supportPct)} শতাংশ`}>
          <div className="bg-accent transition-all duration-500" style={{ width: `${supportPct}%` }} />
        </div>
        <div className="mt-3 flex gap-2.5">
          <Button
            className="flex-1"
            variant={myReaction === "support" ? "primary" : "outline"}
            onPress={() => react("support")}
            aria-pressed={myReaction === "support"}
          >
            <ThumbsUp className="size-4" aria-hidden />
            সমর্থন
          </Button>
          <Button
            className="flex-1"
            variant={myReaction === "oppose" ? "danger" : "outline"}
            onPress={() => react("oppose")}
            aria-pressed={myReaction === "oppose"}
          >
            <ThumbsDown className="size-4" aria-hidden />
            আপত্তি
          </Button>
        </div>
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted">
          <EyeOff className="size-3" aria-hidden />
          একজন ব্যবহারকারী একবারই প্রতিক্রিয়া জানাতে পারেন — ডিভাইস-আইডি দিয়ে নিশ্চিত করা হয়
        </p>
      </div>

      {/* মন্তব্য */}
      <section aria-label="মন্তব্য">
        <h3 className="text-sm font-bold">মন্তব্য ({bn(comments.length)})</h3>
        {comments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">এখনো কোনো মন্তব্য নেই — প্রথম মন্তব্যটি আপনিই করুন।</p>
        ) : (
          <div className="mt-2.5 flex flex-col gap-2.5">
            {comments.map((cm) => (
              <div key={cm.id} className="rounded-2xl bg-surface-secondary p-3.5">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted">
                  <Chip color={cm.stance === "support" ? "success" : "warning"} variant="soft" size="sm">
                    {cm.stance === "support" ? "সমর্থনে" : "সন্দেহে"}
                  </Chip>
                  {bnTimeAgo(cm.createdAt)}
                </div>
                <p className="text-[13px] leading-relaxed">{cm.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* নতুন মন্তব্য */}
        <div className="mt-3 flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStance("support")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${stance === "support" ? "bg-success/15 text-success" : "bg-surface-secondary text-muted"}`}
              aria-pressed={stance === "support"}
            >
              সমর্থনে
            </button>
            <button
              type="button"
              onClick={() => setStance("oppose")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${stance === "oppose" ? "bg-warning/15 text-warning" : "bg-surface-secondary text-muted"}`}
              aria-pressed={stance === "oppose"}
            >
              সন্দেহে
            </button>
          </div>
          <textarea
            aria-label="মন্তব্য লিখুন"
            placeholder="আপনার অভিজ্ঞতা বা প্রমাণ সংক্রান্ত মন্তব্য লিখুন…"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={textareaCls}
          />
          <Button className="self-end" onPress={send} isDisabled={body.trim().length < 5}>
            <Send className="size-4" aria-hidden />
            মন্তব্য করুন
          </Button>
        </div>
      </section>

      {/* শেয়ার (নিচে ছোট বোতাম) */}
      <Button variant="ghost" size="sm" className="mx-auto" onPress={share}>
        <Share2 className="size-4" aria-hidden />
        শেয়ার করুন
      </Button>

      {/* লাইটবক্স */}
      {lightbox !== null && photos[lightbox] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="প্রমাণ-ছবি বড় করে দেখুন"
          className="fixed inset-0 z-[100] flex flex-col bg-black/90"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="tnum text-sm font-semibold">{bn(lightbox + 1)} / {bn(photos.length)}</span>
            <button
              type="button"
              aria-label="বন্ধ করুন"
              onClick={() => setLightbox(null)}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[lightbox]}
              alt={`প্রমাণ-ছবি ${bn(lightbox + 1)}`}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
          {photos.length > 1 && (
            <div
              className="flex items-center justify-center gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="tertiary"
                size="sm"
                isDisabled={lightbox === 0}
                onPress={() => setLightbox((i) => (i === null ? 0 : Math.max(0, i - 1)))}
              >
                <ChevronLeft className="size-4" aria-hidden />
                আগের
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                isDisabled={lightbox === photos.length - 1}
                onPress={() => setLightbox((i) => (i === null ? 0 : Math.min(photos.length - 1, i + 1)))}
              >
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

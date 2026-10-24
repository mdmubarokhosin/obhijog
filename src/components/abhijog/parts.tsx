// অভিযোগ — শেয়ার্ড UI অংশ (অ্যাপ বার, স্কেলেটন, খালি অবস্থা)

"use client";

import { Chip, Skeleton, Spinner } from "@/components/ui/kit";
import { ArrowLeft, CloudOff, Inbox } from "lucide-react";
import type { ComplaintStatus } from "@/lib/store";
import { bn } from "@/lib/bn";

// ─── অ্যাপ বার (স্ক্রিনের উপরে স্থায়ী সারি — স্ক্রলে সরে না) ──
export function AppBar({
  title,
  subtitle,
  leading,
  trailing,
}: {
  title?: React.ReactNode;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-14 shrink-0 items-center gap-1 border-b border-border/60 bg-background/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
      {leading}
      <div className="min-w-0 flex-1 px-1">
        {title !== undefined && (
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight">{title}</h1>
        )}
        {subtitle && <p className="truncate text-[11px] text-muted">{subtitle}</p>}
      </div>
      {trailing}
    </header>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label="পেছনে যান"
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:bg-surface-secondary"
    >
      <ArrowLeft className="size-5" aria-hidden />
    </button>
  );
}

// ─── লোগো (৩ ভরা ঘর + ১ ফাঁকা ঘর — "৩ জন ভুক্তভোগী, ১ টি সমস্যায়") ──
export function LogoMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box =
    size === "lg"
      ? "size-12 rounded-2xl"
      : size === "sm"
        ? "size-7 rounded-lg"
        : "size-9 rounded-xl";
  const cell = size === "lg" ? "size-3.5" : size === "sm" ? "size-2" : "size-2.5";
  const gap = size === "sm" ? "gap-[3px]" : "gap-1";
  return (
    <span className={`flex shrink-0 items-center justify-center bg-accent ${box}`} aria-hidden>
      <span className={`grid grid-cols-2 ${gap}`}>
        <span className={`${cell} rounded-[3px] bg-white`} />
        <span className={`${cell} rounded-[3px] bg-white`} />
        <span className={`${cell} rounded-[3px] bg-white`} />
        <span className={`${cell} rounded-[3px] border-[1.5px] border-white/85`} />
      </span>
    </span>
  );
}

// ─── অভিযোগের অবস্থা চিপ ───────────────────────────────────
export function StatusChip({ status }: { status: ComplaintStatus }) {
  const map: Record<
    ComplaintStatus,
    { label: string; color: "accent" | "success" | "warning" | "danger" }
  > = {
    pending: { label: "যাচাই চলছে", color: "warning" },
    verified: { label: "যাচাইকৃত", color: "success" },
    resolved: { label: "সমাধান হয়েছে", color: "accent" },
    rejected: { label: "বাতিল", color: "danger" },
    removed: { label: "সরানো হয়েছে", color: "danger" },
  };
  const it = map[status];
  return (
    <Chip color={it.color} variant="soft" size="sm">
      {it.label}
    </Chip>
  );
}

// ─── ডাটাবেজ সংযোগ ব্যানার (RTDB নিয়ম/নেটওয়ার্ক সমস্যায়) ──
export function DbBanner({ error }: { error: string }) {
  const denied = error.includes("permission") || error.includes("Permission");
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning/10 p-3.5"
    >
      <CloudOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground">ডাটাবেজ সংযোগ প্রতিষ্ঠিত হয়নি</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          {denied
            ? "Realtime Database নিয়ম সেট হয়নি। Firebase কনসোল → Realtime Database → Rules-এ প্রজেক্টের database.rules.json ফাইলের নিয়ম বসিয়ে Publish করুন (README-তে ধাপে ধাপে গাইড আছে)।"
            : "ইন্টারনেট সংযোগ দেখুন — সংযোগ এলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।"}
        </p>
      </div>
    </div>
  );
}

// ─── খালি অবস্থা ───────────────────────────────────────────
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-secondary">
        <Inbox className="size-6 text-muted" aria-hidden />
      </span>
      <div>
        <p className="font-bold text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-[16rem] text-sm leading-relaxed text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}

// ─── লোডিং স্কেলেটন (অ্যাপ-জাতীয় অনুভূতি) ──────────────────
export function FeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="লোড হচ্ছে">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-4 w-11/12" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-4/6" />
          <div className="mt-3 flex items-center gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CenterSpinner({ label = "লোড হচ্ছে…" }: { label?: string }) {
  return (
    <div className="flex min-h-[14rem] items-center justify-center">
      <Spinner size="lg" aria-label={label} />
    </div>
  );
}

// ─── অনুপস্থিত তথ্যের ড্যাশ ────────────────────────────────
export function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-surface-secondary px-3 py-2">
      <span className="tnum text-base font-extrabold leading-none">{bn(value)}</span>
      <span className="mt-1 text-[10px] text-muted">{label}</span>
    </div>
  );
}

// অভিযোগ — প্রোফাইল স্ক্রিন: পরিচিতি, সেটিংস, নীতিমালা, অ্যাপ তথ্য

"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Button, Chip } from "@/components/ui/kit";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Download,
  EyeOff,
  FileText,
  Info,
  Moon,
  RefreshCcw,
  ShieldCheck,
  Wallet,
  Wrench,
} from "lucide-react";
import { myActivity, resetStore, useStore } from "@/lib/store";
import { bn } from "@/lib/bn";
import { LogoMark } from "../parts";

// PWA ইনস্টল প্রম্পট টাইপ (lib.dom-এ এখনো নেই)
export interface ObhijogInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __obhijogInstallPrompt?: ObhijogInstallPromptEvent | null;
    addEventListener(
      type: "beforeinstallprompt",
      listener: (e: ObhijogInstallPromptEvent) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: "beforeinstallprompt",
      listener: (e: ObhijogInstallPromptEvent) => void,
      options?: boolean | EventListenerOptions
    ): void;
  }
}

export function ProfileScreen({ onFees }: { onFees: () => void }) {
  const d = useStore();
  const { theme, setTheme } = useTheme();
  const [canInstall, setCanInstall] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    // beforeinstallprompt ইভেন্ট-ভিত্তিক — সিঙ্ক্রোনাস setState নয়
    const onPrompt = () => setCanInstall(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    const raf = requestAnimationFrame(() => {
      setCanInstall(Boolean(window.__obhijogInstallPrompt));
    });
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      cancelAnimationFrame(raf);
    };
  }, []);

  const act = useMemo(() => (d ? myActivity(d) : null), [d]);

  const install = async () => {
    const p = window.__obhijogInstallPrompt;
    if (!p) return;
    await p.prompt();
    const choice = await p.userChoice;
    if (choice.outcome === "accepted") setCanInstall(false);
    window.__obhijogInstallPrompt = null;
  };

  const doReset = () => {
    resetStore();
    setResetOpen(false);
    toastReset();
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
      {/* পরিচিতি কার্ড */}
      <section className="flex items-center gap-4 rounded-3xl border border-border bg-gradient-to-br from-accent/8 to-transparent p-4">
        <LogoMark size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold">অতিথি নাগরিক</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted">
            <EyeOff className="size-3" aria-hidden />
            লগইন ছাড়া সম্পূর্ণ বেনামে ব্যবহারযোগ্য
          </p>
        </div>
      </section>

      {/* আমার কার্যক্রম */}
      {act && (
        <section className="grid grid-cols-3 gap-2.5" aria-label="আমার কার্যক্রম">
          {[
            ["অভিযোগ", act.myComplaints],
            ["সমর্থন/আপত্তি", act.myReactions],
            ["মন্তব্য", act.myComments],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex flex-col items-center rounded-2xl border border-border bg-surface py-3">
              <span className="tnum text-lg font-extrabold leading-none">{bn(Number(value))}</span>
              <span className="mt-1 text-[10px] text-muted">{label}</span>
            </div>
          ))}
        </section>
      )}

      {/* সেটিংস */}
      <section aria-label="সেটিংস">
        <h2 className="mb-2 px-1 text-xs font-bold text-muted">সেটিংস</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="flex items-center gap-2.5 text-sm font-semibold">
              <Moon className="size-4 text-accent" aria-hidden />
              ডার্ক মোড
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={theme === "dark"}
              aria-label="ডার্ক মোড চালু/বন্ধ"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`relative shrink-0 rounded-full border-2 transition-colors ${
                theme === "dark" ? "border-accent bg-accent" : "border-muted/40 bg-surface-secondary"
              }`}
              style={{ height: 22, width: 40 }}
            >
              <span
                className={`absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full shadow transition-all ${
                  theme === "dark" ? "left-[19px] bg-white" : "left-[3px] bg-muted"
                }`}
              />
            </button>
          </div>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={install}
            disabled={!canInstall}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start transition-colors active:bg-surface-secondary disabled:opacity-50"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold">
              <Download className="size-4 text-accent" aria-hidden />
              অ্যাপ ইনস্টল করুন
            </span>
            {canInstall ? (
              <ChevronRight className="size-4 text-muted" aria-hidden />
            ) : (
              <span className="text-[11px] text-muted">ইনস্টল করা বা অনুপলব্ধ</span>
            )}
          </button>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => window.open("/admin/", "_blank")}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start transition-colors active:bg-surface-secondary"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold">
              <Wrench className="size-4 text-accent" aria-hidden />
              অ্যাডমিন প্যানেল
            </span>
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </button>
        </div>
      </section>
      <section aria-label="তথ্য ও নীতিমালা">
        <h2 className="mb-2 px-1 text-xs font-bold text-muted">তথ্য ও নীতিমালা</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <button
            type="button"
            onClick={onFees}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start transition-colors active:bg-surface-secondary"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold">
              <Wallet className="size-4 text-accent" aria-hidden />
              সরকারি ফি — নির্ধারিত বনাম প্রকৃত
            </span>
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </button>
          <div className="h-px bg-border" />
          <details name="policies" className="acc-item">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 transition-colors active:bg-surface-secondary">
              <span className="flex items-center gap-2.5 text-sm font-semibold">
                <ShieldCheck className="size-4 text-accent" aria-hidden />
                যাচাই পদ্ধতি ও নীতিমালা
              </span>
              <ChevronDown className="acc-chev size-4 shrink-0 text-muted" aria-hidden />
            </summary>
            <div className="flex flex-col gap-2 px-4 pb-3 text-xs leading-relaxed text-muted">
              <p>· অভিযোগ মানেই দোষ প্রমাণিত নয় — সমস্যা একটি নাগরিক হিসাব, কোনো সরকারি অভিযোগ কর্তৃপক্ষ নয়।</p>
              <p>· কোনো ব্যক্তির নাম বা ছবি প্রকাশ হয় না — শুধু পদ ও দপ্তর; অভিযোগকারীর কোনো ব্যক্তিগত তথ্য সংগ্রহ করা হয় না।</p>
              <p>· অভিযোগ সঙ্গে সঙ্গে ডাটাবেজে জমা হয়; অ্যাডমিন যাচাই করে “যাচাইকৃত” ব্যাজ দেন; পাঠকরা সমর্থন/আপত্তি দিয়ে সহায়তা করেন।</p>
              <p>· আপত্তি সমর্থনের চেয়ে ৩০-এর বেশি এবং নিজেও ৩০ পার হলে অভিযোগ স্বয়ংক্রিয়ভাবে সরে যায়; সংশ্লিষ্ট দপ্তরের জবাব দেওয়ার অধিকার সবসময় খোলা।</p>
              <p>· প্রমাণ (রশিদ, কল রেকর্ড, ছবি) সংরক্ষণ করে রাখা অভিযোগকারীর দায়িত্ব।</p>
            </div>
          </details>
          <div className="h-px bg-border" />
          <details name="policies" className="acc-item">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 transition-colors active:bg-surface-secondary">
              <span className="flex items-center gap-2.5 text-sm font-semibold">
                <FileText className="size-4 text-accent" aria-hidden />
                গোপনীয়তা
              </span>
              <ChevronDown className="acc-chev size-4 shrink-0 text-muted" aria-hidden />
            </summary>
            <div className="flex flex-col gap-2 px-4 pb-3 text-xs leading-relaxed text-muted">
              <p>· এই অ্যাপে কোনো অ্যাকাউন্ট, ফোন বা ইমেইল লাগে না — বেনামে ব্যবহার করা যায়।</p>
              <p>· অভিযোগ ও মন্তব্য Google Firebase (Realtime Database) রিয়েলটাইম ডাটাবেজে প্রকাশ্যভাবে সংরক্ষিত হয় — অভিযোগকারীর পরিচয় কোথাও সংরক্ষণ করা হয় না।</p>
              <p>· এই ডিভাইসের ব্যক্তিগত তালিকা (আমার জমা/প্রতিক্রিয়া) মুছতে &quot;লোকাল ডাটা রিসেট&quot; ব্যবহার করুন।</p>
            </div>
          </details>
          <div className="h-px bg-border" />
          <details name="policies" className="acc-item">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 transition-colors active:bg-surface-secondary">
              <span className="flex items-center gap-2.5 text-sm font-semibold">
                <Info className="size-4 text-accent" aria-hidden />
                অ্যাপ সম্পর্কে
              </span>
              <ChevronDown className="acc-chev size-4 shrink-0 text-muted" aria-hidden />
            </summary>
            <div className="flex flex-col gap-2 px-4 pb-3 text-xs leading-relaxed text-muted">
              <p>অভিযোগ — নাগরিক-চালিত জবাবদিহিতা প্ল্যাটফর্ম। এটি কোনো সংবাদমাধ্যম, আদালত বা সরকারি অভিযোগ সেল নয়; এটি জনগণের হিসাবের খাতা।</p>
              <p>প্রকাশিত প্রতিটি লেখা নাগরিকের ব্যক্তিগত অভিজ্ঞতা — প্রমাণিত অভিযোগ নয়।</p>
              <p className="inline-flex items-center gap-2 pt-1">
                <Chip size="sm" variant="tertiary">সংস্করণ {bn("2.0.1")}</Chip>
                <Chip size="sm" variant="tertiary">Next.js · Firebase · PWA</Chip>
              </p>
            </div>
          </details>
        </div>
      </section>

      {/* লোকাল ডাটা রিসেট */}
      <section aria-label="ডেটা নিয়ন্ত্রণ">
        <Button
          variant="outline"
          className="w-full text-danger"
          onPress={() => setResetOpen(true)}
        >
          <RefreshCcw className="size-4" aria-hidden />
          এই ডিভাইসের লোকাল ডাটা রিসেট করুন
        </Button>
        {d && (
          <p className="mt-2 text-center text-[11px] text-muted">
            রিয়েলটাইম ডাটাবেজ · Realtime Database: {bn(d.complaints.length)} টি অভিযোগ লোড হয়েছে
          </p>
        )}
      </section>

      {/* রিসেট নিশ্চিতকরণ */}
      {resetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="রিসেট নিশ্চিত করুন"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 pb-10 backdrop-blur-sm"
          onClick={() => setResetOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold">লোকাল ডাটা রিসেট?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              এই ডিভাইসের “আমার জমা” তালিকা, প্রতিক্রিয়া ও ক্যাশ মুছে যাবে। রিয়েলটাইম ডাটাবেজে প্রকাশ্য অভিযোগগুলো থেকে যাবে।
            </p>
            <div className="mt-4 flex gap-2.5">
              <Button variant="outline" className="flex-1" onPress={() => setResetOpen(false)}>
                বাতিল
              </Button>
              <Button variant="danger" className="flex-1" onPress={doReset}>
                রিসেট করুন
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toastReset() {
  toast.success("সব ডেটা রিসেট হয়েছে — অ্যাপ প্রাথমিক অবস্থায় ফিরেছে।");
}

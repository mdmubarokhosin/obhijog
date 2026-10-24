// অভিযোগ — অ্যাপ শেল: অ্যাপ বার, স্ক্রিন ট্রানজিশন, বটম নেভিগেশন + FAB
// (স্প্ল্যাশ স্ক্রিন নেই — অ্যাপ সরাসরি কনটেন্টে ঢোকে)

"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart3,
  Home,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  User,
} from "lucide-react";
import { hydrateStore, useStore } from "@/lib/store";
import { NavProvider, registerScrollEl, routeKey, useNav, type Route } from "@/lib/nav";
import { AppBar, BackButton, LogoMark } from "./parts";
import { HomeScreen } from "./screens/home-screen";
import { ExploreScreen } from "./screens/explore-screen";
import { StatsScreen } from "./screens/stats-screen";
import { TrackScreen } from "./screens/track-screen";
import { ProfileScreen } from "./screens/profile-screen";
import { DetailScreen } from "./screens/detail-screen";
import { FeesScreen } from "./screens/fees-screen";
import { SubmitSheet } from "./screens/submit-sheet";

export function AbhijogApp() {
  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  );
}

function Shell() {
  const d = useStore();
  const { route, push, switchTab, back } = useNav();
  const [submitOpen, setSubmitOpen] = useState(false);

  // স্টোর hydrate + SW নিবন্ধন
  useEffect(() => {
    hydrateStore();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const key = routeKey(route);

  return (
    <div className="app-bg flex min-h-dvh justify-center">
      <div className="app-frame relative flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-background md:my-6 md:h-[calc(100dvh-3rem)] md:rounded-[2rem] md:border md:border-border md:shadow-2xl">
        {/* স্ক্রিনভেদে অ্যাপ বার */}
        <AppBar
          leading={
            route.s === "detail" || route.s === "fees" ? (
              <BackButton onPress={back} />
            ) : (
              <span className="ps-2"><LogoMark /></span>
            )
          }
          title={
            route.s === "detail" || route.s === "fees"
              ? route.s === "fees"
                ? "সরকারি ফি"
                : "অভিযোগের বিস্তারিত"
              : undefined
          }
          subtitle={route.s === "detail" || route.s === "fees" ? "অভিযোগ" : undefined}
          trailing={
            route.s === "home" ? (
              <span className="flex items-center gap-1 pe-1">
                <span className="me-1 hidden text-end sm:block">
                  <span className="block text-[15px] font-extrabold leading-none">অভিযোগ</span>
                  <span className="block text-[9px] text-muted">প্রকাশ্য হিসাব · যাচাইযোগ্য</span>
                </span>
                <button
                  type="button"
                  aria-label="অভিযোগ খুঁজুন"
                  onClick={() => switchTab("explore")}
                  className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors active:bg-surface-secondary"
                >
                  <Search className="size-5" aria-hidden />
                </button>
              </span>
            ) : route.s === "detail" ? (
              <DetailShareButton />
            ) : undefined
          }
        />

        {/* স্ক্রিন কনটেন্ট (স্ক্রলযোগ্য) */}
        <main
          ref={(el) => {
            registerScrollEl(el);
          }}
          className="relative flex-1 overflow-y-auto overscroll-y-contain"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={key}
              initial={{ opacity: 0, x: route.s === "detail" || route.s === "fees" ? 40 : 0, y: route.s === "detail" || route.s === "fees" ? 0 : 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 0, y: route.s === "detail" || route.s === "fees" ? 0 : -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-h-full"
            >
              {route.s === "home" && (
                <HomeScreen
                  onOpen={(id) => push({ s: "detail", id })}
                  onExplore={() => switchTab("explore")}
                  onStats={() => switchTab("stats")}
                  onAdd={() => setSubmitOpen(true)}
                />
              )}
              {route.s === "explore" && <ExploreScreen onOpen={(id) => push({ s: "detail", id })} />}
              {route.s === "stats" && <StatsScreen />}
              {route.s === "track" && <TrackScreen onOpen={(id) => push({ s: "detail", id })} />}
              {route.s === "profile" && <ProfileScreen onFees={() => push({ s: "fees" })} />}
              {route.s === "fees" && <FeesScreen />}
              {route.s === "detail" && <DetailScreen id={route.id} />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* বটম নেভিগেশন + সেন্টার FAB */}
        <BottomNav current={route.s} onSwitch={switchTab} onAdd={() => setSubmitOpen(true)} />

        {/* সাবমিট শিট */}
        <SubmitSheet
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          onCreated={(id) => push({ s: "detail", id })}
        />
      </div>
    </div>
  );
}

function DetailShareButton() {
  const d = useStore();
  const { route } = useNav();
  const c = useMemo(
    () => (d && route.s === "detail" ? d.complaints.find((x) => x.id === route.id) : undefined),
    [d, route]
  );
  const share = async () => {
    if (!c) return;
    const text = `${c.title} — কোড: ${c.code} (অভিযোগ অ্যাপ)`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "অভিযোগ", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toastCopied();
    } catch {
      // বাতিল করা হলে নীরব
    }
  };
  return (
    <button
      type="button"
      aria-label="শেয়ার করুন"
      onClick={share}
      className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors active:bg-surface-secondary"
    >
      <Share2 className="size-5" aria-hidden />
    </button>
  );
}

// বটম নেভিগেশন (M3 navigation bar অনুপ্রাণিত)
function BottomNav({
  current,
  onSwitch,
  onAdd,
}: {
  current: Route["s"];
  onSwitch: (s: Route["s"]) => void;
  onAdd: () => void;
}) {
  const hidden = current === "detail" || current === "fees";
  const items: { key: Route["s"]; label: string; icon: React.ReactNode }[] = [
    { key: "home", label: "হোম", icon: <Home className="size-5" aria-hidden /> },
    { key: "stats", label: "বিশ্লেষণ", icon: <BarChart3 className="size-5" aria-hidden /> },
    { key: "track", label: "আমার", icon: <ShieldCheck className="size-5" aria-hidden /> },
    { key: "profile", label: "প্রোফাইল", icon: <User className="size-5" aria-hidden /> },
  ];

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.nav
          key="bottomnav"
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          aria-label="নিম্ন নেভিগেশন"
          className="relative z-10 shrink-0 border-t border-border/70 bg-surface/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur"
        >
          <div className="grid grid-cols-5 items-end px-2">
            {items.slice(0, 2).map((it) => (
              <NavItem
                key={it.key}
                label={it.label}
                icon={it.icon}
                active={current === it.key}
                onPress={() => onSwitch(it.key)}
              />
            ))}

            {/* সেন্টার FAB */}
            <div className="flex justify-center">
              <motion.button
                type="button"
                onClick={onAdd}
                whileTap={{ scale: 0.9 }}
                aria-label="নতুন অভিযোগ করুন"
                className="-mt-7 flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/30 transition-colors"
              >
                <Plus className="size-7" aria-hidden />
              </motion.button>
            </div>

            {items.slice(2).map((it) => (
              <NavItem
                key={it.key}
                label={it.label}
                icon={it.icon}
                active={current === it.key}
                onPress={() => onSwitch(it.key)}
              />
            ))}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

function NavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-current={active ? "page" : undefined}
      className="flex flex-col items-center gap-0.5 py-1"
    >
      <span
        className={`flex h-7 items-center justify-center rounded-full px-4 transition-colors ${
          active ? "bg-accent/15 text-accent" : "text-muted"
        }`}
      >
        {icon}
      </span>
      <span className={`text-[10px] font-semibold leading-none ${active ? "text-accent" : "text-muted"}`}>
        {label}
      </span>
    </button>
  );
}

function toastCopied() {
  toast.success("কোড ও শিরোনাম কপি হয়েছে।");
}

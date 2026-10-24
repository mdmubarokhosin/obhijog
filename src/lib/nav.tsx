// অভিযোগ — অ্যাপ-স্টাইল নেভিগেশন
// history API-ভিত্তিক: Android-এর ব্যাক-বাটন/PWA ব্যাক জেসচার স্ক্রিনের মধ্যে কাজ করে।
// ট্যাব বদল replaceState করে (হিস্টোরি দূষিত হয় না); ডিটেইল/ফি স্ক্রিন pushState করে।

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type Route =
  | { s: "home" }
  | { s: "explore" }
  | { s: "stats" }
  | { s: "track" }
  | { s: "profile" }
  | { s: "fees" }
  | { s: "detail"; id: string };

export const TAB_ROUTES: Route["s"][] = ["home", "explore", "stats", "track", "profile"];

export function routeKey(r: Route): string {
  return r.s === "detail" ? `detail-${r.id}` : r.s;
}

interface NavValue {
  route: Route;
  /** নতুন স্ক্রিন খোলা (হিস্টোরিতে যোগ হয় — ব্যাক দিলে ফিরে আসবে) */
  push: (r: Route) => void;
  /** ট্যাব বদল (হিস্টোরি এন্ট্রি যোগ হয় না) */
  switchTab: (s: Route["s"]) => void;
  /** পেছনে যাওয়া (ব্রাউজার ব্যাকের মতো) */
  back: () => void;
  /** এই রুট কি push-করা (অ্যানিমেশনের জন্য) */
  isPushed: (r: Route) => boolean;
}

const NavCtx = createContext<NavValue | null>(null);

export function useNav(): NavValue {
  const v = useContext(NavCtx);
  if (!v) throw new Error("useNav must be used within <NavProvider>");
  return v;
}

const PUSHED: Route["s"][] = ["detail", "fees"];

// ─── স্ক্রল কনটেইনার (অ্যাপ-ফ্রেমের <main>) নিবন্ধন ─────────────
// অ্যাপ-ফ্রেমে উইন্ডো স্ক্রল হয় না — <main> স্ক্রল হয়; তাই scroll-memory
// উইন্ডোর বদলে এই এলিমেন্টের উপর চালাতে হয় (আগে এটি ভাঙা ছিল)।
let scrollEl: HTMLElement | null = null;

export function registerScrollEl(el: HTMLElement | null) {
  scrollEl = el;
}

function currentScroll(): number {
  return scrollEl ? scrollEl.scrollTop : window.scrollY;
}

function scrollToY(y: number, behavior?: ScrollBehavior) {
  if (scrollEl) scrollEl.scrollTo({ top: y, behavior });
  else window.scrollTo(0, y);
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>({ s: "home" });
  const scrollMem = useRef<Map<string, number>>(new Map());
  const routeRef = useRef<Route>({ s: "home" });

  useEffect(() => {
    // রেন্ডারের পরে রেফ সিঙ্ক করা (lint-safe)
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    // প্রথম এন্ট্রিতে রাষ্ট্র বসানো
    window.history.replaceState({ r: { s: "home" } }, "");
    const onPop = (e: PopStateEvent) => {
      const next = (e.state as { r?: Route } | null)?.r ?? { s: "home" as const };
      // বর্তমান স্ক্রল মনে রাখা
      scrollMem.current.set(routeKey(routeRef.current), currentScroll());
      setRoute(next);
      // আগের স্ক্রল পুনরুদ্ধার (native feel)
      requestAnimationFrame(() => {
        const y = scrollMem.current.get(routeKey(next));
        scrollToY(y ?? 0);
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const push = useCallback((r: Route) => {
    scrollMem.current.set(routeKey(routeRef.current), currentScroll());
    window.history.pushState({ r }, "");
    setRoute(r);
    scrollToY(0);
  }, []);

  const switchTab = useCallback((s: Route["s"]) => {
    if (routeKey(routeRef.current) === s) {
      scrollToY(0, "smooth");
      return;
    }
    scrollMem.current.set(routeKey(routeRef.current), currentScroll());
    window.history.replaceState({ r: { s } }, "");
    setRoute({ s } as Route);
    const y = scrollMem.current.get(s);
    scrollToY(y ?? 0);
  }, []);

  const back = useCallback(() => {
    window.history.back();
  }, []);

  const isPushed = useCallback((r: Route) => PUSHED.includes(r.s), []);

  const value = useMemo<NavValue>(
    () => ({ route, push, switchTab, back, isPushed }),
    [route, push, switchTab, back, isPushed]
  );

  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>;
}

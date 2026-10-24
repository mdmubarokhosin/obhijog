// অভিযোগ — অ্যাডমিন প্যানেল শেল (all-in-one)
//
// অথেনটিকেশন — শুধু Realtime Database (Firebase Auth নয়):
//   · RTDB-তে কোনো অ্যাডমিন না থাকলে → লগইন-পেজের জায়গায় **প্রথম অ্যাডমিন
//     তৈরির রেজিস্ট্রেশন পেজ** লোড হয় (ইউজারের নির্দেশ)।
//   · অ্যাডমিন থাকলে → ইউজারনেম + পাসওয়ার্ড লগইন (PBKDF2-হ্যাশ মিলিয়ে)।
//   · সেশন: র‍্যান্ডম টোকেন — RTDB + localStorage (৩০ দিন)।
//
// ট্যাব: ড্যাশবোর্ড · অভিযোগ (যাচাই-বাছাই) · মন্তব্য · নোটিশ ·
//       শাখা/ধরন/দপ্তর (CRUD) · সেটিংস (GitHub ছবি-হোস্টিং + অ্যাডমিন + নমুনা)

"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  ExternalLink,
  FolderCog,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { countAdmins, loginAdmin, logoutAdmin, registerFirstAdmin, verifySession, type AdminRecord } from "@/lib/admin-auth";
import { hydrateStore, useStore } from "@/lib/store";
import { Button, Chip, inputCls } from "@/components/ui/kit";
import { LogoMark } from "@/components/abhijog/parts";
import { DashboardPanel } from "./dashboard";
import { ComplaintsPanel } from "./complaints-panel";
import { AdminsPanel, CommentsPanel, GithubSettingsPanel, NoticesPanel, SeedPanel } from "./misc-panels";
import { TaxonomiesPanel } from "./taxonomies-panel";

type Phase = "loading" | "register" | "login" | "ready" | "setup";
type Tab = "dashboard" | "complaints" | "comments" | "notices" | "taxonomies" | "settings";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "ড্যাশবোর্ড", icon: <LayoutDashboard className="size-5" aria-hidden /> },
  { key: "complaints", label: "অভিযোগ", icon: <BarChart3 className="size-5" aria-hidden /> },
  { key: "comments", label: "মন্তব্য", icon: <MessageSquare className="size-5" aria-hidden /> },
  { key: "notices", label: "নোটিশ", icon: <Bell className="size-5" aria-hidden /> },
  { key: "taxonomies", label: "শাখা/ধরন/দপ্তর", icon: <Building2 className="size-5" aria-hidden /> },
  { key: "settings", label: "সেটিংস", icon: <Settings className="size-5" aria-hidden /> },
];

export function AdminApp() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [admin, setAdmin] = useState<AdminRecord | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");

  // প্রথম লোড: সেশন আছে কি না, নইলে অ্যাডমিন-সংখ্যা (0 হলে রেজিস্ট্রেশন)
  useEffect(() => {
    void (async () => {
      hydrateStore();
      const sess = await verifySession();
      if (sess) {
        setAdmin(sess);
        setPhase("ready");
        return;
      }
      const n = await countAdmins();
      if (n === null) setPhase("setup"); // RTDB পাওয়া যায়নি / Rules অনুমতি দেয়নি
      else if (n === 0) setPhase("register"); // প্রথম অ্যাডমিন তৈরির পালা
      else setPhase("login");
    })();
  }, []);

  if (phase === "loading") return <FullScreenLoader label="অ্যাডমিন প্যানেল লোড হচ্ছে…" />;
  if (phase === "register") return <RegisterScreen onDone={(a) => { setAdmin(a); setPhase("ready"); }} />;
  if (phase === "login") return <LoginScreen onDone={(a) => { setAdmin(a); setPhase("ready"); }} />;
  if (phase === "setup") return <SetupScreen />;

  return <Shell admin={admin} tab={tab} setTab={setTab} onLogout={() => { setAdmin(null); setPhase("login"); }} />;
}

function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="size-7 animate-spin text-accent" aria-hidden />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

// ─── প্রথম অ্যাডমিন রেজিস্ট্রেশন (ডাটাবেজ খালি হলেই শুধু) ──────
function RegisterScreen({ onDone }: { onDone: (a: AdminRecord) => void }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (busy) return;
    setError("");
    if (password !== confirm) {
      setError("দুইবার লেখা পাসওয়ার্ড মিলছে না।");
      return;
    }
    setBusy(true);
    const res = await registerFirstAdmin(username, displayName, password);
    setBusy(false);
    if (res.ok) {
      toast.success(`স্বাগতম, ${res.admin.displayName}! প্রথম অ্যাডমিন অ্যাকাউন্ট তৈরি হয়েছে।`);
      onDone(res.admin);
    } else {
      setError(res.error);
    }
  };

  return (
    <AuthShell
      title="প্রথম অ্যাডমিন তৈরি করুন"
      intro="ডাটাবেজে কোনো অ্যাডমিন পাওয়া যায়নি — নিরাপত্তার জন্য আগে একটি অ্যাডমিন অ্যাকাউন্ট তৈরি করুন। এরপর এই পেজটি আর দেখাবে না; সরাসরি লগইন হবে।"
      error={error}
      busy={busy}
      onSubmit={submit}
      submitLabel="অ্যাডমিন তৈরি করুন"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold">ইউজারনেম</span>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputCls}
          placeholder="যেমন: admin"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold">প্রদর্শন-নাম (ঐচ্ছিক)</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputCls}
          placeholder="যেমন: মোহাম্মদ মুবারক"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold">পাসওয়ার্ড</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          placeholder="কমপক্ষে ৬ অক্ষর"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold">পাসওয়ার্ড আবার</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputCls}
          placeholder="••••••••"
        />
      </label>
    </AuthShell>
  );
}

// ─── লগইন ───────────────────────────────────────────────────
function LoginScreen({ onDone }: { onDone: (a: AdminRecord) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    const res = await loginAdmin(username, password);
    setBusy(false);
    if (res.ok) {
      toast.success(`স্বাগতম, ${res.admin.displayName}!`);
      onDone(res.admin);
    } else {
      setError(res.error);
    }
  };

  return (
    <AuthShell
      title="অ্যাডমিন লগইন"
      intro="শুধু অনুমোদিত অ্যাডমিনের জন্য — ইউজারনেম ও পাসওয়ার্ড রিয়েলটাইম ডাটাবেজে (হ্যাশ-আকারে) সংরক্ষিত।"
      error={error}
      busy={busy}
      onSubmit={submit}
      submitLabel="লগইন করুন"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold">ইউজারনেম</span>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputCls}
          placeholder="আপনার ইউজারনেম"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold">পাসওয়ার্ড</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          placeholder="••••••••"
        />
      </label>
    </AuthShell>
  );
}

function AuthShell({
  title,
  intro,
  error,
  busy,
  onSubmit,
  submitLabel,
  children,
}: {
  title: string;
  intro: string;
  error: string;
  busy: boolean;
  onSubmit: () => void;
  submitLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark size="lg" />
          <h1 className="mt-1 text-lg font-extrabold">অভিযোগ — অ্যাডমিন প্যানেল</h1>
          <p className="text-xs leading-relaxed text-muted">{intro}</p>
        </div>

        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
          {children}
          {error && (
            <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-xs leading-relaxed text-danger">
              {error}
            </p>
          )}
          <Button type="submit" isDisabled={busy} className="mt-1">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
            {busy ? "অপেক্ষা করুন…" : submitLabel}
          </Button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
          পাসওয়ার্ড PBKDF2-SHA256 দিয়ে হ্যাশ হয়ে রিয়েলটাইম ডাটাবেজে থাকে —
          প্লেইনটেক্সট কোথাও সংরক্ষিত হয় না।
        </p>
      </div>
    </div>
  );
}

// ─── সেটআপ-প্রয়োজন (RTDB নেই বা Rules অনুমতি দেয়নি) ─────────
export const RULES_SNIPPET = `{
  "rules": {
    "complaints": { ".read": true, ".indexOn": ["createdAt"], "$id": { ".write": true } },
    "comments": { ".read": true, "$cid": { ".indexOn": ["createdAt"], "$c": { ".write": true } } },
    "reactions": { ".read": true, "$id": { "$c": { ".write": true } } },
    "notices": { ".read": true, ".write": true, ".indexOn": ["createdAt"] },
    "taxonomies": { ".read": true, ".write": true },
    "settings": { ".read": true, ".write": true },
    "admins": { ".read": true, ".write": true }
  }
}`;

function SetupScreen() {
  return (
    <Centered title="Realtime Database সেটআপ প্রয়োজন">
      <p>
        অ্যাডমিন তথ্য পড়া যায়নি — Firebase প্রজেক্টে <b>Realtime Database</b> তৈরি নেই বা নিয়ম (Rules)
        অনুমতি দিচ্ছে না। ধাপগুলো:
      </p>
      <ol className="list-decimal space-y-1 ps-5">
        <li>Firebase কনসোল → Realtime Database → <b>Create Database</b> (locked মোডে শুরু করুন)</li>
        <li>Rules ট্যাবে নিচের নিয়মটি বসিয়ে <b>Publish</b> করুন</li>
        <li>এই পাতা রিফ্রেশ করুন — <b>প্রথম অ্যাডমিন তৈরির রেজিস্ট্রেশন</b> খুলে যাবে</li>
      </ol>
      <pre className="thin-scroll max-h-56 overflow-auto rounded-xl bg-surface-secondary p-3 font-mono text-[10.5px] leading-relaxed">{RULES_SNIPPET}</pre>
      <p className="text-[11px]">
        পূর্ণ নিয়ম রিপোর <code className="font-mono">database.rules.json</code> ফাইলে; বিস্তারিত README-র ৬-ধাপ সেটআপ গাইডে।
      </p>
    </Centered>
  );
}

function Centered({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 text-sm leading-relaxed">
        <div className="mb-3 flex items-center gap-2.5">
          <ShieldAlert className="size-6 text-warning" aria-hidden />
          <h1 className="text-base font-extrabold">{title}</h1>
        </div>
        <div className="flex flex-col gap-2.5 text-muted [&_b]:text-foreground [&_code]:text-foreground">
          {children}
        </div>
        <Button
          variant="outline"
          className="mt-4 w-full"
          onPress={() => window.location.reload()}
        >
          আবার চেষ্টা করুন (রিফ্রেশ)
        </Button>
      </div>
    </div>
  );
}

// ─── শেল (সাইডবার + কনটেন্ট) ────────────────────────────────
function Shell({
  admin,
  tab,
  setTab,
  onLogout,
}: {
  admin: AdminRecord | null;
  tab: Tab;
  setTab: (t: Tab) => void;
  onLogout: () => void;
}) {
  const d = useStore();
  const pending = d ? d.complaints.filter((c) => c.status === "pending").length : 0;

  const logout = async () => {
    await logoutAdmin();
    toast.success("লগআউট হয়েছে।");
    onLogout();
  };

  return (
    <div className="flex min-h-dvh bg-surface-secondary/60">
      {/* সাইডবার (ডেস্কটপ) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-e border-border bg-background lg:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <LogoMark />
          <div className="min-w-0">
            <p className="text-sm font-extrabold leading-none">অভিযোগ</p>
            <p className="mt-1 text-[10px] text-muted">অ্যাডমিন প্যানেল</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-1" aria-label="অ্যাডমিন মেনু">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.key ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface-secondary"
              }`}
            >
              {t.icon}
              {t.label}
              {t.key === "complaints" && pending > 0 && (
                <span className="tnum ms-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {pending}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <p className="flex items-center gap-1.5 truncate text-[11px] font-semibold">
            <UserPlus className="size-3.5 shrink-0 text-accent" aria-hidden />
            {admin?.displayName ?? admin?.username}
            {admin?.role === "super" && <Chip color="accent" variant="soft" size="sm">সুপার</Chip>}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onPress={() => window.open("/", "_blank")}>
              <ExternalLink className="size-3.5" aria-hidden />
              সাইট
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-danger" onPress={() => void logout()}>
              <LogOut className="size-3.5" aria-hidden />
              লগআউট
            </Button>
          </div>
        </div>
      </aside>

      {/* মূল কলাম */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* মোবাইল টপবার + ট্যাব */}
        <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <LogoMark size="sm" />
              <p className="text-sm font-extrabold">অ্যাডমিন প্যানেল</p>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onPress={() => window.open("/", "_blank")} aria-label="সাইট দেখুন">
                <ExternalLink className="size-3.5" aria-hidden />
              </Button>
              <Button size="sm" variant="outline" className="text-danger" onPress={() => void logout()} aria-label="লগআউট">
                <LogOut className="size-3.5" aria-hidden />
              </Button>
            </div>
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-2.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  tab === t.key ? "bg-accent text-accent-foreground" : "bg-surface-secondary text-muted"
                }`}
              >
                {t.icon}
                {t.label}
                {t.key === "complaints" && pending > 0 && (
                  <span className="tnum rounded-full bg-white/25 px-1.5 text-[10px] font-bold">
                    {pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* কনটেন্ট */}
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h1 className="mb-1 hidden text-xl font-extrabold lg:block">{TABS.find((t) => t.key === tab)?.label}</h1>
            {tab === "dashboard" && <DashboardPanel onOpenComplaints={() => setTab("complaints")} />}
            {tab === "complaints" && <ComplaintsPanel />}
            {tab === "comments" && <CommentsPanel />}
            {tab === "notices" && <NoticesPanel />}
            {tab === "taxonomies" && <TaxonomiesPanel />}
            {tab === "settings" && (
              <div className="flex flex-col gap-5">
                <GithubSettingsPanel />
                <AdminsPanel admin={admin} />
                <SeedPanel />
                <SetupInfoPanel />
              </div>
            )}
          </div>
        </main>

        <footer className="mt-auto border-t border-border/70 px-4 py-3 text-center text-[10px] text-muted">
          অভিযোগ অ্যাডমিন প্যানেল · Firebase Realtime Database
        </footer>
      </div>
    </div>
  );
}

function SetupInfoPanel() {
  return (
    <section aria-label="সেটআপ তথ্য" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <FolderCog className="size-4 text-accent" aria-hidden />
        সেটআপ তথ্য
      </h2>
      <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
        <li>· প্রজেক্ট: <span className="font-mono">obhijog</span> · সব ডাটা <b>Realtime Database</b>-এ (Firestore ব্যবহৃত হয় না)</li>
        <li>· ছবি: GitHub API-তে আপলোড → jsDelivr CDN থেকে লোড (উপরের GitHub কার্ডে সেটআপ)</li>
        <li>· ডোমেইন: <span className="font-mono">https://domain.pages.dev/</span> · অ্যাডমিন: <span className="font-mono">https://domain.pages.dev/admin</span></li>
        <li>· নিয়ম: রিপোর <span className="font-mono">database.rules.json</span> Firebase কনসোলের Realtime Database → Rules-এ বসান</li>
      </ul>
    </section>
  );
}

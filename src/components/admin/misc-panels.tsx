// অভিযোগ অ্যাডমিন — মন্তব্য মডারেশন · নোটিশ · GitHub ছবি-হোস্টিং সেটিংস ·
// অ্যাডমিন ব্যবস্থাপনা · নমুনা ডাটা (সবকিছু Realtime Database)

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  Database,
  Eye,
  EyeOff,
  Github,
  Inbox,
  KeyRound,
  Loader2,
  PlugZap,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Chip, inputCls, textareaCls } from "@/components/ui/kit";
import { useStore, type CommentItem } from "@/lib/store";
import { subscribeAllComments, addNotice, deleteComment, deleteNotice, seedDemoData, updateNotice } from "@/lib/db";
import {
  getGithubSettings,
  maskToken,
  saveGithubSettings,
  testGithubSettings,
  type GithubSettings,
} from "@/lib/image-host";
import {
  addAdmin,
  changeAdminPassword,
  listAdmins,
  removeAdmin,
  type AdminRecord,
} from "@/lib/admin-auth";
import { bn, bnTimeAgo } from "@/lib/bn";

// ─── মন্তব্য মডারেশন (সব অভিযোগের মন্তব্য — RTDB comments) ────
export function CommentsPanel() {
  const d = useStore();
  const [settled, setSettled] = useState<{ items: CommentItem[]; error: string | null }>({
    items: [],
    error: null,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);

  useEffect(() => {
    const un = subscribeAllComments((items, meta) => {
      setSettled({ items, error: meta.error });
    });
    return un;
  }, []);

  const titleOf = useMemo(() => {
    const m = new Map<string, string>();
    d?.complaints.forEach((c) => m.set(c.id, c.title));
    return (id: string) => m.get(id) ?? "অজানা অভিযোগ";
  }, [d]);

  const del = async (cm: CommentItem) => {
    setBusyId(cm.id);
    const ok = await deleteComment(cm.complaintId, cm.id);
    setBusyId(null);
    if (ok) toast.success("মন্তব্য মুছে ফেলা হয়েছে।");
    else toast.error("মুছে ফেলা যায়নি।");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
        <p className="text-sm font-semibold">সর্বশেষ মন্তব্য (রিয়েলটাইম)</p>
        <Chip variant="tertiary" size="sm">{bn(settled.items.length)} টি</Chip>
      </div>

      {settled.error && (
        <p className="rounded-2xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-muted">
          মন্তব্য পড়ার অনুমতি নেই — Realtime Database নিয়ম যাচাই করুন।
        </p>
      )}

      {settled.items.length === 0 && !settled.error ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <Inbox className="size-6 text-muted" aria-hidden />
          <p className="text-sm text-muted">এখনো কোনো মন্তব্য নেই।</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {settled.items.slice(0, limit).map((cm, i) => (
            <div key={cm.id} className={`flex items-start gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border/70" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <Chip color={cm.stance === "support" ? "success" : "warning"} variant="soft" size="sm">
                    {cm.stance === "support" ? "সমর্থনে" : "সন্দেহে"}
                  </Chip>
                  <span className="truncate">{titleOf(cm.complaintId)}</span>
                  <span>{bnTimeAgo(cm.createdAt)}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed">{cm.body}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-danger"
                isDisabled={busyId === cm.id}
                onPress={() => void del(cm)}
                aria-label="মন্তব্য মুছুন"
              >
                {busyId === cm.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
              </Button>
            </div>
          ))}
          {settled.items.length > limit && (
            <Button variant="ghost" className="w-full" onPress={() => setLimit((l) => l + 30)}>
              আরও দেখুন
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── নোটিশ ব্যবস্থাপনা ──────────────────────────────────────
export function NoticesPanel() {
  const d = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (title.trim().length < 4) {
      toast.error("নোটিশের শিরোনাম কমপক্ষে ৪ অক্ষরের হোক।");
      return;
    }
    setBusy(true);
    const ok = await addNotice(title, body);
    setBusy(false);
    if (ok) {
      toast.success("নোটিশ প্রকাশিত — সাইটের হোমে রিয়েলটাইম দেখা যাবে।");
      setTitle("");
      setBody("");
    } else {
      toast.error("নোটিশ যোগ করা যায়নি।");
    }
  };

  const toggle = async (id: string, active: boolean) => {
    const ok = await updateNotice(id, { active: !active });
    if (!ok) toast.error("পরিবর্তন করা যায়নি।");
  };

  const del = async (id: string) => {
    const ok = await deleteNotice(id);
    if (ok) toast.success("নোটিশ মুছে ফেলা হয়েছে।");
    else toast.error("মুছে ফেলা যায়নি।");
  };

  const notices = d?.notices ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Plus className="size-4 text-accent" aria-hidden />
          নতুন নোটিশ (হোম-স্ক্রিনে প্রকাশিত হবে)
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="শিরোনাম — যেমন: সিস্টেম হালনাগাদ চলছে"
          className={inputCls}
          aria-label="নোটিশের শিরোনাম"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="বিস্তারিত (ঐচ্ছিক)"
          className={textareaCls}
          aria-label="নোটিশের বিস্তারিত"
        />
        <Button className="self-start" isDisabled={busy} onPress={() => void add()}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Bell className="size-4" aria-hidden />}
          প্রকাশ করুন
        </Button>
      </div>

      {notices.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">
          কোনো নোটিশ নেই।
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {notices.map((n, i) => (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border/70" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip color={n.active ? "success" : "default"} variant="soft" size="sm">
                    {n.active ? "চালু" : "বন্ধ"}
                  </Chip>
                  <span className="text-[10px] text-muted">{bnTimeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-[14px] font-bold">{n.title}</p>
                {n.body && <p className="mt-0.5 text-[12px] text-muted">{n.body}</p>}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="outline" onPress={() => void toggle(n.id, n.active)}>
                  {n.active ? "বন্ধ করুন" : "চালু করুন"}
                </Button>
                <Button size="sm" variant="outline" className="text-danger" onPress={() => void del(n.id)} aria-label="নোটিশ মুছুন">
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GitHub ছবি-হোস্টিং সেটিংস (repo + API key → RTDB) ───────
export function GithubSettingsPanel() {
  const [loaded, setLoaded] = useState(false);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [folder, setFolder] = useState("obhijog");
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void (async () => {
      const s = await getGithubSettings();
      if (s) {
        setOwner(s.owner);
        setRepo(s.repo);
        setBranch(s.branch);
        setFolder(s.folder);
        setHasToken(!!s.token);
        setToken("");
      }
      setLoaded(true);
    })();
  }, []);

  const current: GithubSettings = { owner, repo, branch, folder, token: token || "" };

  const save = async () => {
    if (!owner.trim() || !repo.trim()) {
      toast.error("owner ও repo নাম দিন — যেমন owner: myname, repo: my-images।");
      return;
    }
    if (!hasToken && !token.trim()) {
      toast.error("GitHub API key (PAT) দিন — ছবি আপলোডে লাগবে।");
      return;
    }
    setBusy(true);
    const ok = await saveGithubSettings({ owner, repo, branch, folder, token: token.trim() });
    setBusy(false);
    if (ok) {
      setHasToken(true);
      setToken("");
      toast.success("GitHub সেটিংস সংরক্ষিত — এখন থেকে প্রমাণ-ছবি GitHub repo-তে আপলোড হবে ও jsDelivr দিয়ে লোড হবে।");
    } else {
      toast.error("সংরক্ষণ করা যায়নি — Realtime Database নিয়ম দেখুন।");
    }
  };

  const test = async () => {
    if (!owner.trim() || !repo.trim() || (!token.trim() && !hasToken)) {
      toast.error("আগে owner, repo ও টোকেন দিন।");
      return;
    }
    setTesting(true);
    const res = await testGithubSettings({ ...current, token: token.trim() || (hasToken ? "__saved__" : "") });
    setTesting(false);
    if (res.ok) toast.success(res.message);
    else toast.error(res.message);
  };

  if (!loaded) {
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        GitHub সেটিংস লোড হচ্ছে…
      </section>
    );
  }

  return (
    <section aria-label="GitHub ছবি-হোস্টিং" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Github className="size-4 text-accent" aria-hidden />
        ছবি-হোস্টিং — GitHub repo + API key
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        প্রমাণ-ছবি GitHub Contents API দিয়ে এই repo-তে আপলোড হবে এবং <b>jsDelivr CDN</b>
        (<code className="font-mono">cdn.jsdelivr.net/gh/…</code>) দিয়ে লোড হবে। সেটিংস
        Realtime Database-এ সংরক্ষিত। <b>PAT কঠোরভাবে সীমিত রাখুন:</b> Fine-grained token →
        শুধু এই repo → Permissions → Contents: <b>Read and write</b>।
      </p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted">Owner (ইউজার/অর্গ)</span>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="যেমন: mdmubarokhosin" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted">Repo নাম</span>
          <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="যেমন: obhijog-images" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted">Branch</span>
          <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted">ফোল্ডার</span>
          <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="obhijog" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="flex items-center justify-between text-[11px] font-semibold text-muted">
            <span className="inline-flex items-center gap-1"><KeyRound className="size-3" aria-hidden />GitHub API key (PAT)</span>
            {hasToken && <span className="font-mono text-[10px] text-success">সংরক্ষিত: {maskToken("ghp_xxxxxxxxxxxx1234")}</span>}
          </span>
          <span className="relative block">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasToken ? "নতুন টোকেন দিলে বদলে যাবে" : "github_pat_… বা ghp_…"}
              className={`${inputCls} pe-10`}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? "টোকেন লুকান" : "টোকেন দেখান"}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-muted"
            >
              {showToken ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </span>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button isDisabled={busy} onPress={() => void save()}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
          সংরক্ষণ করুন
        </Button>
        <Button variant="outline" isDisabled={testing} onPress={() => void test()}>
          {testing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <PlugZap className="size-4" aria-hidden />}
          সংযোগ পরীক্ষা
        </Button>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        সেটিংস না থাকলে বা আপলোড ব্যর্থ হলে ছবি কমপ্রেস-অবস্থায় ডাটাবেসেই সংরক্ষিত হয় —
        অভিযোগ জমা বন্ধ হয় না।
      </p>
    </section>
  );
}

// ─── অ্যাডমিন ব্যবস্থাপনা (যোগ / মুছুন / পাসওয়ার্ড বদল) ────────
export function AdminsPanel({ admin }: { admin: AdminRecord | null }) {
  const [list, setList] = useState<AdminRecord[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [uName, setUName] = useState("");
  const [uDName, setUDName] = useState("");
  const [uPass, setUPass] = useState("");
  const [uRole, setURole] = useState<"super" | "editor">("editor");
  const [addBusy, setAddBusy] = useState(false);

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const [delId, setDelId] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const reload = async () => {
    const xs = await listAdmins();
    setList(xs);
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      const xs = await listAdmins();
      if (alive) setList(xs);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const doAdd = async () => {
    if (addBusy) return;
    setAddBusy(true);
    const res = await addAdmin(uName, uDName, uPass, uRole);
    setAddBusy(false);
    if (res.ok) {
      toast.success(`${res.admin.displayName} অ্যাডমিন হিসেবে যোগ হয়েছে।`);
      setShowAdd(false); setUName(""); setUDName(""); setUPass("");
      void reload();
    } else {
      toast.error(res.error);
    }
  };

  const doDelete = async (uid: string) => {
    if (delBusy) return;
    setDelBusy(true);
    const res = await removeAdmin(uid);
    setDelBusy(false);
    setDelId(null);
    if (res.ok) {
      toast.success("অ্যাডমিন মুছে ফেলা হয়েছে।");
      void reload();
    } else {
      toast.error(res.error ?? "মুছে ফেলা যায়নি।");
    }
  };

  const doPw = async () => {
    if (!admin) return;
    if (pwBusy) return;
    setPwBusy(true);
    const res = await changeAdminPassword(admin.uid, oldPw, newPw);
    setPwBusy(false);
    if (res.ok) {
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে।");
      setOldPw(""); setNewPw("");
    } else {
      toast.error(res.error ?? "পরিবর্তন করা যায়নি।");
    }
  };

  return (
    <section aria-label="অ্যাডমিন ব্যবস্থাপনা" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <UserPlus className="size-4 text-accent" aria-hidden />
        অ্যাডমিন ব্যবস্থাপনা
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        একাধিক অ্যাডমিন রাখা যায়। পাসওয়ার্ড হ্যাশ (PBKDF2) হয়ে রিয়েলটাইম ডাটাবেজের
        <code className="font-mono"> admins</code> নোডে থাকে — কেউ পড়েও লগইন করতে পারবে না।
      </p>

      {/* তালিকা */}
      {list === null ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          তালিকা লোড হচ্ছে…
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          {list.map((a, i) => (
            <div key={a.uid} className={`flex items-center gap-3 px-3.5 py-2.5 text-[13px] ${i > 0 ? "border-t border-border/70" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {a.displayName}
                  {admin?.uid === a.uid && <span className="ms-1.5 text-[10px] font-normal text-accent">(আপনি)</span>}
                </p>
                <p className="text-[10px] text-muted">@{a.username} · {a.role === "super" ? "সুপার অ্যাডমিন" : "এডিটর"} · {bnTimeAgo(a.createdAt)}</p>
              </div>
              {admin?.uid !== a.uid && (
                delId === a.uid ? (
                  <span className="flex items-center gap-1.5">
                    <Button size="sm" variant="danger" isDisabled={delBusy} onPress={() => void doDelete(a.uid)}>
                      {delBusy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
                      নিশ্চিত
                    </Button>
                    <Button size="sm" variant="tertiary" onPress={() => setDelId(null)}>না</Button>
                  </span>
                ) : (
                  <Button size="sm" variant="outline" className="text-danger" onPress={() => setDelId(a.uid)} aria-label={`${a.displayName} মুছুন`}>
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* নতুন অ্যাডমিন */}
      {showAdd ? (
        <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-accent/30 bg-accent/[0.05] p-3.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="ইউজারনেম (a-z, 0-9)" className={inputCls} aria-label="নতুন অ্যাডমিন ইউজারনেম" />
            <input value={uDName} onChange={(e) => setUDName(e.target.value)} placeholder="প্রদর্শন-নাম (ঐচ্ছিক)" className={inputCls} aria-label="নতুন অ্যাডমিন প্রদর্শন-নাম" />
            <input type="password" value={uPass} onChange={(e) => setUPass(e.target.value)} placeholder="পাসওয়ার্ড (৬+ অক্ষর)" className={inputCls} aria-label="নতুন অ্যাডমিন পাসওয়ার্ড" />
            <select value={uRole} onChange={(e) => setURole(e.target.value === "super" ? "super" : "editor")} className={`${inputCls} h-11`} aria-label="ভূমিকা">
              <option value="super">সুপার অ্যাডমিন</option>
              <option value="editor">এডিটর</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button isDisabled={addBusy} onPress={() => void doAdd()}>
              {addBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
              যোগ করুন
            </Button>
            <Button variant="tertiary" onPress={() => setShowAdd(false)}>বাতিল</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-3" onPress={() => setShowAdd(true)}>
          <UserPlus className="size-3.5" aria-hidden />
          নতুন অ্যাডমিন যোগ
        </Button>
      )}

      {/* পাসওয়ার্ড পরিবর্তন */}
      <div className="mt-4 border-t border-border/70 pt-3.5">
        <p className="text-xs font-bold">নিজের পাসওয়ার্ড পরিবর্তন</p>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
          <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="পুরনো পাসওয়ার্ড" className={inputCls} aria-label="পুরনো পাসওয়ার্ড" />
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="নতুন পাসওয়ার্ড (৬+ অক্ষর)" className={inputCls} aria-label="নতুন পাসওয়ার্ড" />
        </div>
        <Button size="sm" variant="outline" className="mt-2" isDisabled={pwBusy || !oldPw || !newPw} onPress={() => void doPw()}>
          {pwBusy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <KeyRound className="size-3.5" aria-hidden />}
          পরিবর্তন করুন
        </Button>
      </div>
    </section>
  );
}

// ─── নমুনা ডাটা ────────────────────────────────────────────
export function SeedPanel() {
  const d = useStore();
  const [seeding, setSeeding] = useState(false);

  const seed = async () => {
    setSeeding(true);
    const res = await seedDemoData();
    setSeeding(false);
    if (res.ok) toast.success(`${bn(res.count)} টি নমুনা অভিযোগ + ${bn(res.comments)} মন্তব্য যোগ হয়েছে (যাচাইকৃত হিসেবে)।`);
    else toast.error("সিড করা যায়নি — Realtime Database নিয়ম যাচাই করুন।");
  };

  return (
    <section aria-label="নমুনা ডাটা" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Database className="size-4 text-accent" aria-hidden />
        নমুনা ডাটা যোগ করুন
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        ৩৮টি বাস্তবধর্মী নমুনা অভিযোগ + কয়েকটি মন্তব্য রিয়েলটাইম ডাটাবেজে যোগ হবে
        (স্ট্যাটাস: যাচাইকৃত)। নতুন সাইট খালি দেখালে দর্শকদের দেখানোর জন্য উপযোগী।
      </p>
      <Button className="mt-3" isDisabled={seeding} onPress={() => void seed()}>
        {seeding ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Database className="size-4" aria-hidden />}
        {seeding ? "যোগ হচ্ছে…" : "নমুনা ডাটা যোগ করুন (৩৮ অভিযোগ)"}
      </Button>
      {d && d.complaints.length > 0 && (
        <p className="mt-2 text-[11px] text-warning">
          সতর্কতা: ডাটাবেজে এখনো {bn(d.complaints.length)} টি অভিযোগ আছে — নমুনা যোগে সেগুলোর সঙ্গে মিশে যাবে।
        </p>
      )}
    </section>
  );
}

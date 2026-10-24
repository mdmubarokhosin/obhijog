// অভিযোগ — রিয়েলটাইম স্টোর (Firebase **Realtime Database** + onValue)
// সব ডাটা RTDB থেকে লোড হয় (Firestore নয় — ইউজারের স্পষ্ট নির্দেশ);
// যেকোনো ডিভাইস থেকে সঙ্গে সঙ্গে সিঙ্ক হয়।
// শুধু ব্যক্তিগত অবস্থা (আমার জমা, আমার প্রতিক্রিয়া, ডিভাইস-আইডি) localStorage-এ থাকে।

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BRANCHES, CATEGORIES, DEPARTMENTS, type Category, type Department, DISTRICT_BY_ID } from "./data";
import { normBn } from "./geo";
import { subscribeTaxonomies, type Taxonomies } from "./taxonomy";
import {
  addComment as dbAddComment,
  addComplaint as dbAddComplaint,
  migrateLocalData,
  reactToComplaint as dbReact,
  subscribeComplaints,
  subscribeComments,
  subscribeNotices,
  type Complaint,
  type ComplaintStatus,
  type CommentItem,
  type LocationInfo,
  type NewComplaintInput,
  type Notice,
  type Stance,
  isPubliclyVisible,
} from "./db";

// টাইপগুলো স্ক্রিনগুলো আগের মতোই store থেকে নেবে
export type { Complaint, ComplaintStatus, CommentItem, LocationInfo, NewComplaintInput, Notice, Stance };

// ─── অবস্থান লেবেল ──────────────────────────────────────────
/** প্রদর্শনের জন্য পূর্ণ চেইন — খালি ধাপগুলো বাদ */
export function locationLabel(loc?: LocationInfo): string {
  if (!loc) return "";
  return [loc.division, loc.district, loc.upazila, loc.union].filter(Boolean).join(" › ");
}

/** কার্ডের জন্য সংক্ষিপ্ত লেবেল — জেলা (· উপজেলা) */
export function locationShort(loc?: LocationInfo): string {
  if (!loc) return "";
  return loc.upazila ? `${loc.district} · ${loc.upazila}` : loc.district;
}

// ─── স্টোর স্টেট ────────────────────────────────────────────
export interface StoreState {
  /** RTDB-র সব অভিযোগ (createdAt desc) — পাবলিক স্ক্রিন ফিল্টার করে দেখায় */
  complaints: Complaint[];
  notices: Notice[];
  /** শাখা/ধরন/দপ্তর — অ্যাডমিন প্যানেল থেকে CRUD; খালি হলে বিল্ট-ইন ডিফল্ট */
  taxonomies: Taxonomies | null;
  /** প্রথম স্ন্যাপশট এসেছে কি না — false হলে স্কেলেটন */
  loaded: boolean;
  /** সাবস্ক্রিপশন ত্রুটি (permission-denied / unavailable ইত্যাদি) */
  error: string | null;
  /** ব্যক্তিগত অবস্থা — localStorage */
  mine: string[];
  reactions: Record<string, Stance>;
  myComments: number;
}

interface LocalState {
  clientId: string;
  mine: string[];
  reactions: Record<string, Stance>;
  myComments: number;
}

// ─── ব্যক্তিগত অবস্থা (localStorage) ────────────────────────
const CLIENT_KEY = "abhijog.client.v1";
const MINE_KEY = "abhijog.mine.v3";
const REACT_KEY = "abhijog.reactions.v3";
const MYCOMMENTS_KEY = "abhijog.mycomments.v1";

function loadLocal(): LocalState {
  const empty: LocalState = { clientId: "", mine: [], reactions: {}, myComments: 0 };
  if (typeof window === "undefined") return empty;
  const read = <T,>(key: string, fallback: T): T => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  let clientId = read<string>(CLIENT_KEY, "");
  if (!clientId) {
    clientId = `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e12).toString(36)}`;
    try {
      window.localStorage.setItem(CLIENT_KEY, JSON.stringify(clientId));
    } catch {
      /* কোটা — এই সেশনেই থাকবে */
    }
  }
  return {
    clientId,
    mine: read<string[]>(MINE_KEY, []),
    reactions: read<Record<string, Stance>>(REACT_KEY, {}),
    myComments: read<number>(MYCOMMENTS_KEY, 0),
  };
}

function saveLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* কোটা সমস্যা — মেমরিতেই থাকবে */
  }
}

// ─── স্টোর ইন্টার্নাল ───────────────────────────────────────
let state: StoreState | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

let local: LocalState = { clientId: "", mine: [], reactions: {}, myComments: 0 };
const unsubs: Array<() => void> = [];

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): StoreState | null {
  return state;
}

function getServerSnapshot(): StoreState | null {
  return null;
}

/** null মানে এখনো Realtime Database সংযোগ শুরু হয়নি — UI-তে স্কেলেটন দেখান */
export function useStore(): StoreState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ─── ট্যাক্সোনমি (শাখা/ধরন/দপ্তর) — RTDB + বিল্ট-ইন ফলব্যাক ───
export interface MergedTaxo {
  branches: string[];
  categories: Category[];
  departments: Department[];
  CAT: Map<string, Category>;
  DEP: Map<string, Department>;
}

/** RTDB-র ট্যাক্সোনমি খালি/অনুপস্থিত হলে বিল্ট-ইন ডিফল্ট প্রযোজ্য হয় */
export function mergedTaxo(t: Taxonomies | null | undefined): MergedTaxo {
  const hasRtdb = !!t && (t.branches.length > 0 || t.types.length > 0 || t.departments.length > 0);
  const branches = hasRtdb && t!.branches.length > 0 ? t!.branches.map((b) => b.name) : [...BRANCHES];
  const categories: Category[] = hasRtdb && t!.types.length > 0
    ? t!.types.map((x) => ({ id: x.id, name: x.name, branch: x.branch }))
    : CATEGORIES;
  const departments: Department[] = hasRtdb && t!.departments.length > 0
    ? t!.departments.map((x) => ({ id: x.id, name: x.name, branch: x.branch, officeKind: x.officeKind }))
    : DEPARTMENTS;
  return {
    branches,
    categories,
    departments,
    CAT: new Map(categories.map((c) => [c.id, c])),
    DEP: new Map(departments.map((dep) => [dep.id, dep])),
  };
}

function taxoMapsOf(d: StoreState): MergedTaxo {
  return mergedTaxo(d.taxonomies);
}

/** স্ক্রিনে শাখা/ধরন/দপ্তরের তালিকা + নাম-লুকআপ ম্যাপ (রিয়েলটাইম) */
export function useTaxoMaps(): MergedTaxo {
  const d = useStore();
  const t = d?.taxonomies ?? null;
  return useMemo(() => mergedTaxo(t), [t]);
}

/** ক্লায়েন্টে স্টোর চালু (hydration-safe — শুধু ইফেক্ট থেকে ডাকতে হবে) */
export function hydrateStore() {
  if (state || typeof window === "undefined") return;
  local = loadLocal();
  state = {
    complaints: [],
    notices: [],
    taxonomies: null,
    loaded: false,
    error: null,
    mine: local.mine,
    reactions: local.reactions,
    myComments: local.myComments,
  };
  emit();

  // Realtime Database সাবস্ক্রিপশন
  try {
    unsubs.push(
      subscribeComplaints((complaints, meta) => {
        if (!state) return;
        state = { ...state, complaints, loaded: true, error: meta.error };
        emit();
      })
    );
    unsubs.push(
      subscribeNotices((notices, meta) => {
        if (!state) return;
        state = { ...state, notices, error: state.error ?? (meta.error ? meta.error : null) };
        emit();
      })
    );
    unsubs.push(
      subscribeTaxonomies((taxonomies) => {
        if (!state) return;
        state = { ...state, taxonomies };
        emit();
      })
    );
  } catch {
    if (state) {
      state = { ...state, loaded: true, error: "unavailable" };
      emit();
    }
  }

  // পুরনো লোকাল ডাটা থাকলে একবার রিয়েলটাইম ডাটাবেজে তুলি (best-effort)
  void migrateLocalData();
}

/** ব্যক্তিগত ডিভাইস-আইডি — প্রতিক্রিয়ার ইউনিকনেসের জন্য */
export function clientId(): string {
  return local.clientId;
}

// ─── রিয়েলটাইম মন্তব্য-হুক (ডিটেইল স্ক্রিন) ──────────────────
export function useComments(
  complaintId: string
): { items: CommentItem[]; loading: boolean; error: string | null } {
  const [settled, setSettled] = useState<{
    id: string;
    items: CommentItem[];
    error: string | null;
  }>({ id: "", items: [], error: null });

  useEffect(() => {
    const un = subscribeComments(complaintId, (items, meta) => {
      setSettled({ id: complaintId, items, error: meta.error });
    });
    return un;
  }, [complaintId]);

  const done = settled.id === complaintId;
  return {
    items: done ? settled.items : [],
    loading: !done,
    error: done ? settled.error : null,
  };
}

// ─── অ্যাকশন (অ্যাসিঙ্ক — Realtime Database) ─────────────────
export type SubmitResult =
  | { ok: true; id: string; code: string; hosted: number }
  | { ok: false; error: string };

export async function createComplaint(input: NewComplaintInput): Promise<SubmitResult> {
  const res = await dbAddComplaint(input);
  if (res.ok) {
    local.mine = [res.id, ...local.mine.filter((x) => x !== res.id)].slice(0, 200);
    saveLocal(MINE_KEY, local.mine);
    if (state) {
      state = { ...state, mine: local.mine };
      emit();
    }
  }
  return res;
}

export type ReactResult = "ok" | "already" | "notfound" | "error";

export async function reactToComplaint(id: string, action: Stance): Promise<ReactResult> {
  const res = await dbReact(id, local.clientId, action);
  if (res === "ok") {
    local.reactions = { ...local.reactions, [id]: action };
    saveLocal(REACT_KEY, local.reactions);
    if (state) {
      state = { ...state, reactions: local.reactions };
      emit();
    }
  }
  return res;
}

export async function addComment(
  complaintId: string,
  body: string,
  stance: Stance
): Promise<"ok" | "error"> {
  if (body.trim().length < 5) return "error";
  const res = await dbAddComment(complaintId, body, stance);
  if (res === "ok") {
    local.myComments += 1;
    saveLocal(MYCOMMENTS_KEY, local.myComments);
    if (state) {
      state = { ...state, myComments: local.myComments };
      emit();
    }
  }
  return res;
}

/** ব্যক্তিগত (লোকাল) ডাটা মুছুন — রিয়েলটাইম ডাটাবেজের প্রকাশ্য ডাটা থাকে */
export function resetStore() {
  local.mine = [];
  local.reactions = {};
  local.myComments = 0;
  saveLocal(MINE_KEY, local.mine);
  saveLocal(REACT_KEY, local.reactions);
  saveLocal(MYCOMMENTS_KEY, local.myComments);
  try {
    window.localStorage.removeItem("abhijog.geo.v1");
    window.localStorage.removeItem("abhijog.store.v2");
    window.localStorage.removeItem("abhijog.photos.v1");
  } catch {
    /* নীরব */
  }
  if (state) {
    state = { ...state, mine: [], reactions: {}, myComments: 0 };
    emit();
  }
}

// ─── সিলেক্টর ──────────────────────────────────────────────
export function getComplaint(d: StoreState, id: string): Complaint | undefined {
  return d.complaints.find((c) => c.id === id);
}

export function getComments(d: StoreState, _id: string): CommentItem[] {
  // রিয়েলটাইম মন্তব্য এখন useComments হুকে (detail-screen) — সামঞ্জস্যে খালি
  void d;
  void _id;
  return [];
}

export interface ComplaintFilters {
  q?: string;
  branch?: string;
  categoryId?: string;
  departmentId?: string;
  districtId?: string;
  /** জেলার বাংলা নাম — পুরনো নমুনা-অভিযোগ (location ছাড়া) মেলাতে */
  districtName?: string;
  sort?: SortKey;
  /** সব স্ট্যাটাস (অ্যাডমিন); ডিফল্টে বাতিল/সরানো বাদ */
  anyStatus?: boolean;
}

export type SortKey = "recent" | "support" | "money";

export function listComplaints(
  d: StoreState,
  f: ComplaintFilters,
  opts?: { mineOnly?: boolean; page?: number; pageSize?: number }
): { items: Complaint[]; total: number; hasMore: boolean } {
  const q = (f.q ?? "").trim().toLowerCase();
  const { CAT, DEP } = taxoMapsOf(d);
  let items = d.complaints.filter((c) => {
    if (opts?.mineOnly) return d.mine.includes(c.id);
    if (!f.anyStatus && !isPubliclyVisible(c)) return false;
    if (f.branch) {
      const cat = CAT.get(c.categoryId);
      if (!cat || cat.branch !== f.branch) return false;
    }
    if (f.categoryId && c.categoryId !== f.categoryId) return false;
    if (f.departmentId && c.departmentId !== f.departmentId) return false;
    if (f.districtId) {
      const cLocId = c.location?.districtId ?? c.districtId;
      const cLocName = normBn(c.location?.district ?? DISTRICT_BY_ID.get(c.districtId)?.name ?? "");
      if (cLocId !== f.districtId && cLocName !== normBn(f.districtName ?? "")) return false;
    }
    if (q) {
      const dep = DEP.get(c.departmentId);
      const hay = `${c.title}\n${c.description}\n${c.code}\n${dep?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sort = f.sort ?? "recent";
  items = [...items].sort((a, b) => {
    if (sort === "support") return b.supports - a.supports || b.createdAt.localeCompare(a.createdAt);
    if (sort === "money") return b.moneyLost - a.moneyLost || b.createdAt.localeCompare(a.createdAt);
    return b.createdAt.localeCompare(a.createdAt);
  });

  const total = items.length;
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.max(1, opts?.pageSize ?? 8);
  const sliced = items.slice(0, page * pageSize);
  return { items: sliced, total, hasMore: sliced.length < total };
}

export function findByCode(d: StoreState, code: string): Complaint | undefined {
  const c = code.trim().toLowerCase().replace(/^r\//, "");
  if (!c) return undefined;
  return d.complaints.find((x) => x.code.replace(/^r\//, "").toLowerCase() === c);
}

export interface Stats {
  totalComplaints: number;
  totalMoney: number;
  /** জনগণের অর্থ (অনুমান) — আলাদা হিসাব */
  totalPublicMoney: number;
  /** ভুক্তভোগী: অভিযোগকারী + সমর্থনদাতা */
  totalVictims: number;
  totalPeople: number;
  totalTime: number;
  totalDepartments: number;
  totalCategories: number;
  totalDistricts: number;
  byStatus: Record<ComplaintStatus, number>;
  byBranch: { branch: string; count: number; money: number }[];
  byDepartment: { name: string; count: number; money: number; supports: number }[];
  byDistrict: { name: string; count: number; money: number }[];
  byCategory: { name: string; count: number; branch: string }[];
}

export function computeStats(d: StoreState): Stats {
  const pub = d.complaints.filter(isPubliclyVisible);
  const { CAT, DEP } = taxoMapsOf(d);
  const byBranch = new Map<string, { count: number; money: number }>();
  const byDepartment = new Map<string, { count: number; money: number; supports: number }>();
  const byDistrict = new Map<string, { count: number; money: number }>();
  const byCategory = new Map<string, { count: number; branch: string }>();

  let totalMoney = 0;
  let totalPublicMoney = 0;
  let totalVictims = 0;
  let totalPeople = 0;
  let totalTime = 0;

  for (const c of pub) {
    totalMoney += c.moneyLost;
    totalPublicMoney += c.publicMoney;
    totalVictims += 1 + c.supports;
    totalPeople += c.peopleCount;
    totalTime += c.timeWasted;
    const cat = CAT.get(c.categoryId);
    const dep = DEP.get(c.departmentId);
    const dis = c.location?.district
      ? { name: c.location.district }
      : DISTRICT_BY_ID.get(c.districtId);
    if (cat) {
      const b = byBranch.get(cat.branch) ?? { count: 0, money: 0 };
      b.count += 1;
      b.money += c.moneyLost;
      byBranch.set(cat.branch, b);
      const k = byCategory.get(cat.name) ?? { count: 0, branch: cat.branch };
      k.count += 1;
      byCategory.set(cat.name, k);
    }
    if (dep) {
      const b = byDepartment.get(dep.name) ?? { count: 0, money: 0, supports: 0 };
      b.count += 1;
      b.money += c.moneyLost;
      b.supports += c.supports;
      byDepartment.set(dep.name, b);
    }
    if (dis) {
      const b = byDistrict.get(dis.name) ?? { count: 0, money: 0 };
      b.count += 1;
      b.money += c.moneyLost;
      byDistrict.set(dis.name, b);
    }
  }

  const byStatus: Record<ComplaintStatus, number> = {
    pending: 0,
    verified: 0,
    rejected: 0,
    resolved: 0,
    removed: 0,
  };
  for (const c of d.complaints) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;

  const toSorted = <T extends Record<string, unknown>>(
    m: Map<string, T>,
    key: keyof T
  ): (T & { name: string })[] =>
    [...m.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => (b[key] as number) - (a[key] as number));

  return {
    totalComplaints: pub.length,
    totalMoney,
    totalPublicMoney,
    totalVictims,
    totalPeople,
    totalTime,
    totalDepartments: new Set(pub.map((c) => c.departmentId)).size,
    totalCategories: new Set(pub.map((c) => c.categoryId)).size,
    totalDistricts: new Set(pub.map((c) => c.location?.districtId ?? c.districtId)).size,
    byStatus,
    byBranch: [...byBranch.entries()]
      .map(([branch, v]) => ({ branch, ...v }))
      .sort((a, b) => b.count - a.count),
    byDepartment: toSorted(byDepartment, "count") as Stats["byDepartment"],
    byDistrict: toSorted(byDistrict, "count") as Stats["byDistrict"],
    byCategory: toSorted(byCategory, "count") as Stats["byCategory"],
  };
}

/** গুরুতর-স্কোর: ক্ষতির পরিমাণ, সমর্থন, ক্ষতিগ্রস্ত মানুষ ও সময়ের ভিত্তিতে */
export function severityScore(c: Complaint): number {
  const days = Math.max(0, (Date.now() - new Date(c.createdAt).getTime()) / 86400000);
  const moneyPart = (c.moneyLost + c.publicMoney) / 100000;
  const supportPart = c.supports * 8;
  const peoplePart = Math.min(60, c.peopleCount * 2);
  const timePart = Math.min(40, c.timeWasted / 30);
  const freshness = Math.max(0, 1 - days / 90);
  return Math.round(moneyPart + supportPart + peoplePart + timePart + freshness * 50);
}

export function topSeverity(d: StoreState, n = 3): Complaint[] {
  return d.complaints
    .filter(isPubliclyVisible)
    .sort((a, b) => severityScore(b) - severityScore(a))
    .slice(0, n);
}

/** দপ্তরভিত্তিক স্বচ্ছতা তালিকা — অভিযোগ-ঘনত্ব থেকে গণনাকৃত ০–১০০ স্কোর */
export function transparencyList(
  stats: Stats,
  allDepartments: { name: string; branch: string }[] = DEPARTMENTS
) {
  const counts = new Map(stats.byDepartment.map((x) => [x.name, x.count]));
  const total = Math.max(1, stats.totalComplaints);
  const max = Math.max(1, ...stats.byDepartment.map((x) => x.count));
  return allDepartments
    .map((dep) => {
      const count = counts.get(dep.name) ?? 0;
      const score = Math.max(
        3,
        Math.min(98, Math.round(100 - (count / max) * 70 - (count / total) * 30))
      );
      return { name: dep.name, branch: dep.branch, count, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** আমার কার্যক্রমের হিসাব (প্রোফাইল স্ক্রিনের জন্য) */
export function myActivity(d: StoreState) {
  return {
    myComplaints: d.mine.length,
    myReactions: Object.keys(d.reactions).length,
    myComments: d.myComments,
  };
}

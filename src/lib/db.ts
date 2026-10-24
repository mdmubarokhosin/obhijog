// অভিযোগ — Firebase **Realtime Database** ডাটা-লেয়ার (Firestore নয়)
// সব ডাটা RTDB-তে থাকে; onValue দিয়ে রিয়েলটাইম সিঙ্ক হয়।
//
// RTDB গঠন:
//   complaints/{id}                     — অভিযোগ (createdAt = মিলিসেকেন্ড সংখ্যা, orderByChild-এর জন্য)
//   comments/{complaintId}/{cid}        — মন্তব্য (ডিনরমালাইজড, টপ-লেভেল)
//   reactions/{complaintId}/{clientId}  — সমর্থন/আপত্তি (এক ডিভাইস একবারই)
//   notices/{id}                        — নোটিশ
//   taxonomies/{branches|types|departments} — শাখা/ধরন/দপ্তর (অ্যাডমিন CRUD) → taxonomy.ts
//   settings/github                     — ছবি-হোস্টিং সেটিংস → image-host.ts
//   admins/{uid}                        — অ্যাডমিন (PBKDF2 হ্যাশ) → admin-auth.ts

import {
  get,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  runTransaction,
  update,
  type DatabaseReference,
} from "firebase/database";
import { initFirebase } from "./firebase";
import { DISTRICT_BY_ID } from "./data";
import { buildSeed } from "./seed-samples";

// ─── টাইপ ──────────────────────────────────────────────────
export interface LocationInfo {
  divisionId: string;
  division: string; // বাংলা নাম (bn_name)
  districtId: string;
  district: string;
  upazilaId: string;
  upazila: string;
  unionId: string;
  union: string;
}

export type ComplaintStatus =
  | "pending" // নতুন জমা — অ্যাডমিন যাচাই বাকি
  | "verified" // অ্যাডমিন যাচাইকৃত
  | "rejected" // অ্যাডমিন বাতিল
  | "resolved" // সমাধান হয়েছে
  | "removed"; // পাঠক-আপত্তিতে স্বয়ংক্রিয় সরানো

export type Stance = "support" | "oppose";

export interface Complaint {
  id: string;
  code: string;
  title: string;
  description: string;
  categoryId: string;
  departmentId: string;
  districtId: string; // লেগেসি (পুরনো নমুনা) — নতুনগুলোতে location.districtId ব্যবহৃত হয়
  location?: LocationInfo;
  moneyLost: number;
  /** জনগণের অর্থ (অনুমান) — নাগরিকের হিসাবের সঙ্গে যোগ হয় না (somossha-মডেল) */
  publicMoney: number;
  timeWasted: number;
  peopleCount: number;
  supports: number;
  objections: number;
  commentCount: number;
  /** প্রমাণ-ছবি (jsDelivr URL অথবা ফলব্যাক dataURL) — কমপক্ষে ১টি আবশ্যক */
  evidence: string[];
  status: ComplaintStatus;
  /** অ্যাডমিনের প্রকাশ্য নোট (ঐচ্ছিক) */
  statusNote?: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}

export interface CommentItem {
  id: string;
  complaintId: string;
  body: string;
  stance: Stance;
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  active: boolean;
  createdAt: string;
}

/** পাবলিক ফিডে দৃশ্যমান স্ট্যাটাস (বাতিল/সরানো শুধু কোড-ট্র্যাকিং ও অ্যাডমিনে) */
export function isPubliclyVisible(c: Complaint): boolean {
  return c.status === "pending" || c.status === "verified" || c.status === "resolved";
}

// ─── RTDB অ্যাক্সেসর ─────────────────────────────────────────
function dbRef(path: string): DatabaseReference {
  const f = initFirebase();
  if (!f) throw new Error("firebase_unavailable");
  return ref(f.db, path);
}

/** RTDB ত্রুটি → বাংলা বার্তা */
export function dbErrMsg(e: unknown): string {
  const s = typeof e === "object" && e ? `${(e as { code?: string }).code ?? ""} ${(e as Error).message ?? ""}` : String(e);
  if (s.includes("permission_denied") || s.includes("Permission denied"))
    return "Realtime Database পাওয়া যায়নি বা নিয়ম (Rules) অনুমতি দিচ্ছে না — Firebase কনসোলে Realtime Database তৈরি করে database.rules.json-এর নিয়ম বসান (README দেখুন)।";
  if (s.includes("unavailable") || s.includes("network") || s.includes("offline") || s.includes("Client is offline"))
    return "ইন্টারনেট সংযোগ নেই — সংযোগ এলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।";
  return "ডাটাবেজ সংযোগে সমস্যা — আবার চেষ্টা করুন।";
}

/** RTDB মান (createdAt ms সংখ্যা বা লেগেসি ISO) → ISO স্ট্রিং */
function isoOf(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v).toISOString();
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  return new Date().toISOString();
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function toComplaint(id: string, d: Record<string, unknown>): Complaint {
  return {
    id,
    code: typeof d.code === "string" ? d.code : "",
    title: typeof d.title === "string" ? d.title : "",
    description: typeof d.description === "string" ? d.description : "",
    categoryId: typeof d.categoryId === "string" ? d.categoryId : "",
    departmentId: typeof d.departmentId === "string" ? d.departmentId : "",
    districtId: typeof d.districtId === "string" ? d.districtId : "",
    location: (d.location as LocationInfo | undefined) ?? undefined,
    moneyLost: num(d.moneyLost),
    publicMoney: num(d.publicMoney),
    timeWasted: num(d.timeWasted),
    peopleCount: num(d.peopleCount, 1),
    supports: num(d.supports),
    objections: num(d.objections),
    commentCount: num(d.commentCount),
    evidence: Array.isArray(d.evidence) ? (d.evidence as string[]).filter((x) => typeof x === "string") : [],
    status: (d.status as ComplaintStatus) ?? "pending",
    statusNote: typeof d.statusNote === "string" && d.statusNote ? d.statusNote : undefined,
    createdAt: isoOf(d.createdAt),
    updatedAt: d.updatedAt ? isoOf(d.updatedAt) : undefined,
  };
}

// ─── সাবস্ক্রিপশন (রিয়েলটাইম onValue) ─────────────────────────
export type SubMeta = { error: string | null };

export function subscribeComplaints(cb: (items: Complaint[], meta: SubMeta) => void): () => void {
  const q = query(dbRef("complaints"), orderByChild("createdAt"), limitToLast(500));
  return onValue(
    q,
    (snap) => {
      const items: Complaint[] = [];
      snap.forEach((ch) => {
        const v = ch.val();
        if (v) items.push(toComplaint(ch.key as string, v as Record<string, unknown>));
      });
      cb(items.reverse(), { error: null }); // নতুন → পুরনো
    },
    (err) => cb([], { error: (err as { code?: string }).code ?? "error" })
  );
}

export function subscribeNotices(cb: (items: Notice[], meta: SubMeta) => void): () => void {
  const q = query(dbRef("notices"), orderByChild("createdAt"), limitToLast(50));
  return onValue(
    q,
    (snap) => {
      const items: Notice[] = [];
      snap.forEach((ch) => {
        const v = ch.val() as Record<string, unknown> | null;
        if (v)
          items.push({
            id: ch.key as string,
            title: typeof v.title === "string" ? v.title : "",
            body: typeof v.body === "string" ? v.body : "",
            active: v.active !== false,
            createdAt: isoOf(v.createdAt),
          });
      });
      cb(items.reverse(), { error: null });
    },
    (err) => cb([], { error: (err as { code?: string }).code ?? "error" })
  );
}

/** একটি অভিযোগের মন্তব্য — ডিটেইল স্ক্রিনে রিয়েলটাইম */
export function subscribeComments(complaintId: string, cb: (items: CommentItem[], meta: SubMeta) => void): () => void {
  const q = query(dbRef(`comments/${complaintId}`), orderByChild("createdAt"), limitToLast(200));
  return onValue(
    q,
    (snap) => {
      const items: CommentItem[] = [];
      snap.forEach((ch) => {
        const v = ch.val() as Record<string, unknown> | null;
        if (v)
          items.push({
            id: ch.key as string,
            complaintId,
            body: typeof v.body === "string" ? v.body : "",
            stance: (v.stance as Stance) ?? "support",
            createdAt: isoOf(v.createdAt),
          });
      });
      cb(items, { error: null }); // পুরনো → নতুন
    },
    (err) => cb([], { error: (err as { code?: string }).code ?? "error" })
  );
}

/** অ্যাডমিন: সব মন্তব্য (টপ-লেভেল comments নোড) — মডারেশনের জন্য */
export function subscribeAllComments(cb: (items: CommentItem[], meta: SubMeta) => void): () => void {
  return onValue(
    dbRef("comments"),
    (snap) => {
      const items: CommentItem[] = [];
      snap.forEach((perComplaint) => {
        const complaintId = perComplaint.key as string;
        perComplaint.forEach((ch) => {
          const v = ch.val() as Record<string, unknown> | null;
          if (v)
            items.push({
              id: `${complaintId}/${ch.key}`,
              complaintId,
              body: typeof v.body === "string" ? v.body : "",
              stance: (v.stance as Stance) ?? "support",
              createdAt: isoOf(v.createdAt),
            });
        });
      });
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      cb(items, { error: null });
    },
    (err) => cb([], { error: (err as { code?: string }).code ?? "error" })
  );
}

// ─── পাবলিক অ্যাকশন ─────────────────────────────────────────
export interface NewComplaintInput {
  title: string;
  description: string;
  categoryId: string;
  departmentId: string;
  districtId: string;
  location?: LocationInfo;
  /** প্রমাণ-ছবি (compressed dataURL) — আবশ্যক; জমার সময় GitHub-এ হোস্ট হয় */
  photos: string[];
  moneyLost: number;
  publicMoney: number;
  timeWasted: number;
  peopleCount: number;
}

export function randomCode(): string {
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 6; i++) s += hex[Math.floor(Math.random() * 16)];
  return `r/${s}`;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export async function addComplaint(
  input: NewComplaintInput
): Promise<{ ok: true; id: string; code: string; hosted: number } | { ok: false; error: string }> {
  const code = randomCode();
  try {
    // প্রমাণ-ছবি আগে হোস্ট করি (GitHub সেটিংস না থাকলে dataURL ফলব্যাক)
    const { uploadEvidencePhotos } = await import("./image-host");
    const up = await uploadEvidencePhotos(input.photos);
    const now = Date.now();
    const r = push(dbRef("complaints"));
    await setImpl(r, {
      code,
      title: input.title.trim(),
      description: input.description.trim(),
      categoryId: input.categoryId,
      departmentId: input.departmentId,
      districtId: input.districtId,
      location: input.location ?? null,
      moneyLost: clamp(input.moneyLost || 0, 0, 1000000000),
      publicMoney: clamp(input.publicMoney || 0, 0, 10000000000),
      timeWasted: clamp(input.timeWasted || 0, 0, 100000),
      peopleCount: clamp(input.peopleCount || 1, 1, 1000000),
      supports: 0,
      objections: 0,
      commentCount: 0,
      evidence: up.urls.slice(0, 3),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, id: r.key as string, code, hosted: up.hosted };
  } catch (e) {
    return { ok: false, error: dbErrMsg(e) };
  }
}

// set — firebase/database-এর set-এর চেয়ে আলাদা নামে wrapper (কলিশন এড়াতে)
async function setImpl(r: DatabaseReference, value: unknown): Promise<void> {
  const { set } = await import("firebase/database");
  await set(r, value);
}

/** সমর্থন/আপত্তি — ডিভাইস-আইডি দিয়ে একবারই; পর্যাপ্ত আপত্তিতে স্বয়ংক্রিয় সরানো */
export async function reactToComplaint(
  complaintId: string,
  clientId: string,
  action: Stance
): Promise<"ok" | "already" | "notfound" | "error"> {
  try {
    const rSnap = await get(dbRef(`reactions/${complaintId}/${clientId}`));
    if (rSnap.exists()) return "already";
    const cSnap = await get(dbRef(`complaints/${complaintId}`));
    if (!cSnap.exists()) return "notfound";

    const res = await runTransaction(dbRef(`complaints/${complaintId}`), (cur: Record<string, unknown> | null) => {
      if (!cur) return cur; // মাঝপথে মুছে গেলে বাতিল
      const supports = num(cur.supports) + (action === "support" ? 1 : 0);
      const objections = num(cur.objections) + (action === "oppose" ? 1 : 0);
      const autoRemove = objections >= supports + 30 && objections >= 30;
      return {
        ...cur,
        supports,
        objections,
        ...(autoRemove ? { status: "removed" } : {}),
        updatedAt: Date.now(),
      };
    });
    if (!res.committed) return "error";
    await setImpl(dbRef(`reactions/${complaintId}/${clientId}`), { stance: action, createdAt: Date.now() });
    return "ok";
  } catch {
    return "error";
  }
}

export async function addComment(complaintId: string, body: string, stance: Stance): Promise<"ok" | "error"> {
  try {
    const r = push(dbRef(`comments/${complaintId}`));
    await setImpl(r, { body: body.trim(), stance, createdAt: Date.now() });
    await runTransaction(dbRef(`complaints/${complaintId}`), (cur: Record<string, unknown> | null) => {
      if (!cur) return cur;
      return { ...cur, commentCount: num(cur.commentCount) + 1, updatedAt: Date.now() };
    });
    return "ok";
  } catch {
    return "error";
  }
}

// ─── অ্যাডমিন অ্যাকশন ────────────────────────────────────────
export async function setComplaintStatus(id: string, status: ComplaintStatus, statusNote?: string): Promise<boolean> {
  try {
    await update(dbRef(`complaints/${id}`), {
      status,
      // null = ফিল্ড মুছে ফেলা (RTDB update সেমান্টিক্স)
      statusNote: statusNote?.trim() ? statusNote.trim() : null,
      updatedAt: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

/** অভিযোগ + মন্তব্য + প্রতিক্রিয়া সম্পূর্ণ মুছে ফেলা */
export async function deleteComplaint(id: string): Promise<boolean> {
  try {
    await remove(dbRef(`comments/${id}`));
    await remove(dbRef(`reactions/${id}`));
    await remove(dbRef(`complaints/${id}`));
    return true;
  } catch {
    return false;
  }
}

export async function deleteComment(complaintId: string, commentId: string): Promise<boolean> {
  try {
    // মন্তব্য-আইডি "complaintId/cid" আকারে আসতে পারে (subscribeAllComments)
    const cid = commentId.includes("/") ? commentId.split("/").pop() as string : commentId;
    await remove(dbRef(`comments/${complaintId}/${cid}`));
    await runTransaction(dbRef(`complaints/${complaintId}`), (cur: Record<string, unknown> | null) => {
      if (!cur) return cur;
      return { ...cur, commentCount: Math.max(0, num(cur.commentCount) - 1), updatedAt: Date.now() };
    });
    return true;
  } catch {
    return false;
  }
}

// ─── নোটিশ ─────────────────────────────────────────────────
export async function addNotice(title: string, body: string): Promise<boolean> {
  try {
    const r = push(dbRef("notices"));
    await setImpl(r, { title: title.trim(), body: body.trim(), active: true, createdAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}

export async function updateNotice(id: string, patch: Partial<Pick<Notice, "title" | "body" | "active">>): Promise<boolean> {
  try {
    await update(dbRef(`notices/${id}`), patch);
    return true;
  } catch {
    return false;
  }
}

export async function deleteNotice(id: string): Promise<boolean> {
  try {
    await remove(dbRef(`notices/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ─── সিড (নমুনা ডাটা → RTDB) — অ্যাডমিন-অনলি ──────────────────
export async function seedDemoData(): Promise<{ ok: boolean; count: number; comments: number }> {
  const seed = buildSeed();
  try {
    const { set } = await import("firebase/database");
    for (const c of seed.complaints) {
      const comments = seed.comments[c.id] ?? [];
      await set(dbRef(`complaints/${c.id}`), {
        code: c.code,
        title: c.title,
        description: c.description,
        categoryId: c.categoryId,
        departmentId: c.departmentId,
        districtId: c.districtId,
        location: null,
        moneyLost: c.moneyLost,
        publicMoney: c.publicMoney,
        timeWasted: c.timeWasted,
        peopleCount: c.peopleCount,
        supports: c.supports,
        objections: c.objections,
        commentCount: comments.length,
        evidence: [],
        status: "verified",
        createdAt: new Date(c.createdAt).getTime(),
        updatedAt: new Date(c.createdAt).getTime(),
      });
      for (const cm of comments) {
        await set(dbRef(`comments/${c.id}/${cm.id}`), {
          body: cm.body,
          stance: cm.stance,
          createdAt: new Date(cm.createdAt).getTime(),
        });
      }
    }
    return { ok: true, count: seed.complaints.length, comments: Object.values(seed.comments).flat().length };
  } catch {
    return { ok: false, count: 0, comments: 0 };
  }
}

// ─── পুরনো লোকাল ডাটা → RTDB মাইগ্রেশন (একবার, best-effort) ──
const MIGRATED_KEY = "abhijog.migrated.v4";

export async function migrateLocalData(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(MIGRATED_KEY)) return;
  try {
    const raw = window.localStorage.getItem("abhijog.store.v2");
    if (!raw) {
      window.localStorage.setItem(MIGRATED_KEY, "1");
      return;
    }
    const parsed = JSON.parse(raw) as { complaints?: Array<Record<string, unknown>> };
    const photos = JSON.parse(window.localStorage.getItem("abhijog.photos.v1") ?? "{}") as Record<string, string[]>;
    const mine = (parsed.complaints ?? []).filter((c) => typeof c.id === "string" && c.id.startsWith("u-"));
    if (mine.length === 0) {
      window.localStorage.setItem(MIGRATED_KEY, "1");
      return;
    }
    for (const c of mine) {
      const id = String(c.id);
      const legacyDistrict = DISTRICT_BY_ID.get(String(c.districtId ?? ""));
      const statusRaw = String(c.status ?? "published");
      try {
        await setImpl(dbRef(`complaints/${id}`), {
          code: String(c.code ?? randomCode()),
          title: String(c.title ?? ""),
          description: String(c.description ?? ""),
          categoryId: String(c.categoryId ?? ""),
          departmentId: String(c.departmentId ?? ""),
          districtId: String(c.districtId ?? ""),
          location: (c.location as LocationInfo | undefined) ?? {
            divisionId: "",
            division: "",
            districtId: String(c.districtId ?? ""),
            district: legacyDistrict?.name ?? "",
            upazilaId: "",
            upazila: "",
            unionId: "",
            union: "",
          },
          moneyLost: typeof c.moneyLost === "number" ? c.moneyLost : 0,
          publicMoney: typeof c.publicMoney === "number" ? c.publicMoney : 0,
          timeWasted: typeof c.timeWasted === "number" ? c.timeWasted : 0,
          peopleCount: typeof c.peopleCount === "number" ? c.peopleCount : 1,
          supports: typeof c.supports === "number" ? c.supports : 0,
          objections: typeof c.objections === "number" ? c.objections : 0,
          commentCount: 0,
          evidence: (photos[id] ?? []).slice(0, 3),
          status: statusRaw === "removed" ? "removed" : "pending",
          createdAt: Date.parse(typeof c.createdAt === "string" ? c.createdAt : "") || Date.now(),
          updatedAt: Date.now(),
        });
      } catch {
        // নিয়ম/সংযোগ সমস্যা — এই নোড বাদ, বাকিগুলো চেষ্টা চলবে
      }
    }
    window.localStorage.setItem(MIGRATED_KEY, "1");
  } catch {
    // ভাঙা লোকাল ডাটা — চুপচাপ বাদ
  }
}

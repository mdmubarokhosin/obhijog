// অভিযোগ — অ্যাডমিন অথেনটিকেশন (শুধু Realtime Database, Firebase Auth নয়)
//
// ফ্লো (ইউজারের নির্দেশ অনুযায়ী):
//   · ডাটাবেজে কোনো অ্যাডমিন না থাকলে → /admin লগইন-পেজের বদলে
//     **প্রথম অ্যাডমিন তৈরির রেজিস্ট্রেশন পেজ** দেখাবে।
//   · পাসওয়ার্ড কখনো প্লেইনটেক্সটে থাকে না — PBKDF2-SHA256 (১২০ হাজার রাউন্ড, র‍্যান্ডম সল্ট)।
//   · সেশন: র‍্যান্ডম টোকেন RTDB-র admins/{uid}/session-এ + localStorage-এ; ৩০ দিন মেয়াদ।

import { get, push, ref, remove, set, update } from "firebase/database";
import { initFirebase } from "./firebase";
import { dbErrMsg } from "./db";

// ─── টাইপ ──────────────────────────────────────────────────
export interface AdminRecord {
  uid: string;
  username: string;
  displayName: string;
  role: "super" | "editor";
  createdAt: string;
}

export type AdminResult =
  | { ok: true; admin: AdminRecord }
  | { ok: false; error: string };

interface AdminNode {
  username?: string;
  displayName?: string;
  salt?: string;
  hash?: string;
  role?: string;
  createdAt?: number;
  session?: { token?: string; exp?: number } | null;
}

const SESSION_KEY = "abhijog.admin.session.v1";
const SESSION_DAYS = 30;

// ─── ইউটিলিটি ──────────────────────────────────────────────
function toHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

/** ইউজারনেম → RTDB-নিরাপদ uid */
export function usernameToUid(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export function validateUsername(username: string): string | null {
  const uid = usernameToUid(username);
  if (uid.length < 3) return "ইউজারনেম কমপক্ষে ৩ অক্ষরের হোক (a-z, 0-9, . _ -)।";
  if (uid.length > 24) return "ইউজারনেম সর্বোচ্চ ২৪ অক্ষরের হোক।";
  if (uid !== username.trim().toLowerCase()) return "ইউজারনেমে শুধু a-z, 0-9, ডট, আন্ডারস্কোর বা হাইফেন চলবে।";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হোক।";
  if (password.length > 72) return "পাসওয়ার্ড সর্বোচ্চ ৭২ অক্ষরের হোক।";
  return null;
}

/** PBKDF2-SHA256 → hex (crypto.subtle লাগে — https/localhost প্রয়োজন) */
async function pbkdf2(password: string, salt: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("insecure_context");
  }
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 120000 },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(bits));
}

function hashErrMsg(e: unknown): string {
  const s = e instanceof Error ? e.message : String(e);
  if (s.includes("insecure_context"))
    return "নিরাপদ পরিবেশ (HTTPS বা localhost) ছাড়া পাসওয়ার্ড এনক্রিপশন চলে না — সাইটটি https-এ খুলুন।";
  if (s.includes("permission_denied"))
    return "Realtime Database নিয়ম (Rules) অনুমতি দিচ্ছে না — database.rules.json-এর নিয়ম বসান (README দেখুন)।";
  return dbErrMsg(e);
}

function toAdmin(uid: string, v: AdminNode): AdminRecord {
  return {
    uid,
    username: typeof v.username === "string" ? v.username : uid,
    displayName: typeof v.displayName === "string" && v.displayName ? v.displayName : uid,
    role: v.role === "editor" ? "editor" : "super",
    createdAt: new Date(typeof v.createdAt === "number" ? v.createdAt : Date.now()).toISOString(),
  };
}

// ─── সেশন (localStorage) ───────────────────────────────────
function loadSession(): { uid: string; token: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { uid?: string; token?: string };
    return p.uid && p.token ? { uid: p.uid, token: p.token } : null;
  } catch {
    return null;
  }
}

function saveSession(uid: string, username: string, token: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ uid, username, token }));
  } catch {
    /* কোটা — চুপচাপ */
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* চুপচাপ */
  }
}

// ─── ডাটাবেজ অপারেশন ───────────────────────────────────────
function adminsRef() {
  const f = initFirebase();
  if (!f) throw new Error("firebase_unavailable");
  return ref(f.db, "admins");
}

/**
 * অ্যাডমিন-সংখ্যা যাচাই — null মানে পড়া গেল না (Rules/সংযোগ সমস্যা)।
 * 0 হলে /admin-এ প্রথম-অ্যাডমিন রেজিস্ট্রেশন দেখানো হবে।
 */
export async function countAdmins(): Promise<number | null> {
  try {
    const snap = await get(adminsRef());
    if (!snap.exists()) return 0;
    return Object.keys(snap.val() as Record<string, unknown>).length;
  } catch {
    return null;
  }
}

/** সব অ্যাডমিনের তালিকা (সেটিংস ট্যাবে) — null মানে পড়া গেল না */
export async function listAdmins(): Promise<AdminRecord[] | null> {
  try {
    const snap = await get(adminsRef());
    if (!snap.exists()) return [];
    const out: AdminRecord[] = [];
    const obj = snap.val() as Record<string, AdminNode>;
    for (const [uid, v] of Object.entries(obj)) out.push(toAdmin(uid, v ?? {}));
    out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return out;
  } catch {
    return null;
  }
}

/** প্রথম অ্যাডমিন তৈরি (শুধু ডাটাবেজ খালি থাকলে) + স্বয়ংক্রিয় লগইন */
export async function registerFirstAdmin(username: string, displayName: string, password: string): Promise<AdminResult> {
  const errU = validateUsername(username);
  if (errU) return { ok: false, error: errU };
  const errP = validatePassword(password);
  if (errP) return { ok: false, error: errP };
  const uid = usernameToUid(username);
  try {
    const snap = await get(adminsRef());
    if (snap.exists() && Object.keys(snap.val() as object).length > 0) {
      return { ok: false, error: "অ্যাডমিন আগেই আছেন — লগইন করুন।" };
    }
    const salt = randomHex(16);
    const hash = await pbkdf2(password, salt);
    const token = randomHex(32);
    const exp = Date.now() + SESSION_DAYS * 86400000;
    await set(ref(initFirebase()!.db, `admins/${uid}`), {
      username: username.trim().toLowerCase(),
      displayName: displayName.trim() || username.trim().toLowerCase(),
      salt,
      hash,
      role: "super",
      createdAt: Date.now(),
      session: { token, exp },
    });
    saveSession(uid, username.trim().toLowerCase(), token);
    return {
      ok: true,
      admin: { uid, username: username.trim().toLowerCase(), displayName: displayName.trim() || username.trim().toLowerCase(), role: "super", createdAt: new Date().toISOString() },
    };
  } catch (e) {
    return { ok: false, error: hashErrMsg(e) };
  }
}

/** লগইন — ইউজারনেম + পাসওয়ার্ড যাচাই করে নতুন সেশন-টোকেন দেয় */
export async function loginAdmin(username: string, password: string): Promise<AdminResult> {
  const uid = usernameToUid(username);
  if (!uid) return { ok: false, error: "ইউজারনেম দিন।" };
  if (!password) return { ok: false, error: "পাসওয়ার্ড দিন।" };
  try {
    const snap = await get(ref(initFirebase()!.db, `admins/${uid}`));
    if (!snap.exists()) return { ok: false, error: "ইউজারনেম বা পাসওয়ার্ড ভুল।" };
    const v = snap.val() as AdminNode;
    if (!v.salt || !v.hash) return { ok: false, error: "এই অ্যাকাউন্টের তথ্য অসম্পূর্ণ — README-র সেটআপ দেখুন।" };
    const hash = await pbkdf2(password, v.salt);
    if (hash !== v.hash) return { ok: false, error: "ইউজারনেম বা পাসওয়ার্ড ভুল।" };
    const token = randomHex(32);
    const exp = Date.now() + SESSION_DAYS * 86400000;
    await update(ref(initFirebase()!.db, `admins/${uid}/session`), { token, exp });
    saveSession(uid, v.username ?? uid, token);
    return { ok: true, admin: toAdmin(uid, v) };
  } catch (e) {
    return { ok: false, error: hashErrMsg(e) };
  }
}

/** সেশন পুনরুদ্ধার — localStorage-টোকেন RTDB-র সঙ্গে মিললে লগইন-ধরা হয় */
export async function verifySession(): Promise<AdminRecord | null> {
  try {
    const s = loadSession();
    if (!s) return null;
    const snap = await get(ref(initFirebase()!.db, `admins/${s.uid}`));
    if (!snap.exists()) {
      clearSession();
      return null;
    }
    const v = snap.val() as AdminNode;
    const sess = v.session ?? null;
    if (!sess || sess.token !== s.token || typeof sess.exp !== "number" || sess.exp < Date.now()) {
      clearSession();
      return null;
    }
    return toAdmin(s.uid, v);
  } catch {
    return null;
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    const s = loadSession();
    if (s) await remove(ref(initFirebase()!.db, `admins/${s.uid}/session`));
  } catch {
    /* চুপচাপ */
  }
  clearSession();
}

/** নতুন অ্যাডমিন যোগ (লগইন করা অ্যাডমিন থেকে) */
export async function addAdmin(username: string, displayName: string, password: string, role: "super" | "editor"): Promise<AdminResult> {
  const errU = validateUsername(username);
  if (errU) return { ok: false, error: errU };
  const errP = validatePassword(password);
  if (errP) return { ok: false, error: errP };
  const uid = usernameToUid(username);
  try {
    const dup = await get(ref(initFirebase()!.db, `admins/${uid}`));
    if (dup.exists()) return { ok: false, error: "এই ইউজারনেমে অ্যাডমিন আগেই আছেন।" };
    const salt = randomHex(16);
    const hash = await pbkdf2(password, salt);
    await set(ref(initFirebase()!.db, `admins/${uid}`), {
      username: username.trim().toLowerCase(),
      displayName: displayName.trim() || username.trim().toLowerCase(),
      salt,
      hash,
      role,
      createdAt: Date.now(),
      session: null,
    });
    return {
      ok: true,
      admin: { uid, username: username.trim().toLowerCase(), displayName: displayName.trim() || uid, role, createdAt: new Date().toISOString() },
    };
  } catch (e) {
    return { ok: false, error: hashErrMsg(e) };
  }
}

/** অ্যাডমিন মুছুন — শেষ অ্যাডমিন ও নিজেকে মুছতে দেওয়া হয় না */
export async function removeAdmin(uid: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const snap = await get(adminsRef());
    if (!snap.exists()) return { ok: false, error: "অ্যাডমিন পাওয়া যায়নি।" };
    const all = snap.val() as Record<string, AdminNode>;
    if (!(uid in all)) return { ok: false, error: "অ্যাডমিন পাওয়া যায়নি।" };
    if (Object.keys(all).length <= 1) return { ok: false, error: "শেষ অ্যাডমিন মুছতে দেওয়া হয় না — লক-আউট হয়ে যাবে।" };
    const s = loadSession();
    if (s && s.uid === uid) return { ok: false, error: "নিজের অ্যাকাউন্ট লগইন থেকে মুছতে দেওয়া হয় না।" };
    await remove(ref(initFirebase()!.db, `admins/${uid}`));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: hashErrMsg(e) };
  }
}

/** পাসওয়ার্ড পরিবর্তন — পুরনো পাসওয়ার্ড যাচাই বাধ্যতামূলক */
export async function changeAdminPassword(uid: string, oldPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const errP = validatePassword(newPassword);
  if (errP) return { ok: false, error: errP };
  try {
    const snap = await get(ref(initFirebase()!.db, `admins/${uid}`));
    if (!snap.exists()) return { ok: false, error: "অ্যাকাউন্ট পাওয়া যায়নি।" };
    const v = snap.val() as AdminNode;
    if (!v.salt || !v.hash) return { ok: false, error: "অ্যাকাউন্টের তথ্য অসম্পূর্ণ।" };
    const oldHash = await pbkdf2(oldPassword, v.salt);
    if (oldHash !== v.hash) return { ok: false, error: "পুরনো পাসওয়ার্ড ভুল।" };
    const salt = randomHex(16);
    const hash = await pbkdf2(newPassword, salt);
    await update(ref(initFirebase()!.db, `admins/${uid}`), { salt, hash });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: hashErrMsg(e) };
  }
}

/** push-কী দরকার হলে (সংরক্ষিত) */
export const _push = push;

// অভিযোগ — শাখা / ধরন / দপ্তর-অফিস (ট্যাক্সোনমি) — Realtime Database
//
// ইউজারের নির্দেশ: অ্যাডমিন প্যানেল থেকে শাখা, ধরন, দপ্তর/অফিস ইত্যাদি
// যোগ, এডিট, ডিলিট ও সম্পাদনা করা যাবে।
//
// RTDB গঠন:
//   taxonomies/branches/{id}: { name, order }
//   taxonomies/types/{id}:    { name, branch, order }
//   taxonomies/departments/{id}: { name, branch, officeKind, order }
//
// পাবলিক অ্যাপে RTDB-র তালিকা প্রযোজ্য হয়; খালি/ত্রুটিতে বিল্ট-ইন ডিফল্ট
// (data.ts-এর ৮ শাখা × ৪৩ ধরন × দপ্তর) ব্যবহৃত হয় — অ্যাপ কখনো খালি দেখায় না।

import { onValue, push, ref, remove, set, update, type DatabaseReference } from "firebase/database";
import { initFirebase } from "./firebase";
import type { Category, Department } from "./data";

// ─── টাইপ ──────────────────────────────────────────────────
export interface TaxoBranch {
  id: string;
  name: string;
  order: number;
}

export interface TaxoType extends Category {
  order: number;
}

export interface TaxoDepartment extends Department {
  order: number;
}

export interface Taxonomies {
  branches: TaxoBranch[];
  types: TaxoType[];
  departments: TaxoDepartment[];
}

export type TaxoPath = "branches" | "types" | "departments";

export const TAXO_PATHS: TaxoPath[] = ["branches", "types", "departments"];

export function taxoPathLabel(p: TaxoPath): string {
  if (p === "branches") return "শাখা";
  if (p === "types") return "ধরন";
  return "দপ্তর / অফিস";
}

function taxoRef(path: TaxoPath): DatabaseReference {
  const f = initFirebase();
  if (!f) throw new Error("firebase_unavailable");
  return ref(f.db, `taxonomies/${path}`);
}

function taxoRootRef(): DatabaseReference {
  const f = initFirebase();
  if (!f) throw new Error("firebase_unavailable");
  return ref(f.db, "taxonomies");
}

// ─── সাবস্ক্রিপশন (রিয়েলটাইম) ─────────────────────────────────
export function subscribeTaxonomies(cb: (t: Taxonomies) => void): () => void {
  return onValue(
    taxoRootRef(),
    (snap) => {
      const v = (snap.val() ?? {}) as {
        branches?: Record<string, { name?: string; order?: number }>;
        types?: Record<string, { name?: string; branch?: string; order?: number }>;
        departments?: Record<string, { name?: string; branch?: string; officeKind?: string; order?: number }>;
      };
      const branches: TaxoBranch[] = Object.entries(v.branches ?? {})
        .filter(([, x]) => x && typeof x.name === "string" && x.name.trim())
        .map(([id, x]) => ({ id, name: (x.name as string).trim(), order: typeof x.order === "number" ? x.order : 9999 }));
      const types: TaxoType[] = Object.entries(v.types ?? {})
        .filter(([, x]) => x && typeof x.name === "string" && x.name.trim())
        .map(([id, x]) => ({
          id,
          name: (x.name as string).trim(),
          branch: typeof x.branch === "string" ? x.branch : "",
          order: typeof x.order === "number" ? x.order : 9999,
        }));
      const departments: TaxoDepartment[] = Object.entries(v.departments ?? {})
        .filter(([, x]) => x && typeof x.name === "string" && x.name.trim())
        .map(([id, x]) => ({
          id,
          name: (x.name as string).trim(),
          branch: typeof x.branch === "string" ? x.branch : "",
          officeKind: typeof x.officeKind === "string" ? x.officeKind : "",
          order: typeof x.order === "number" ? x.order : 9999,
        }));
      const byOrder = <T extends { order: number; name: string }>(a: T, b: T) =>
        a.order - b.order || a.name.localeCompare(b.name, "bn");
      cb({
        branches: branches.sort(byOrder),
        types: types.sort(byOrder),
        departments: departments.sort(byOrder),
      });
    },
    () => cb({ branches: [], types: [], departments: [] })
  );
}

// ─── CRUD ─────────────────────────────────────────────────
export interface TaxoItemData {
  name: string;
  /** types/departments-এর জন্য শাখা */
  branch?: string;
  /** departments-এর জন্য */
  officeKind?: string;
}

/** নতুন আইটেম যোগ (push-কী) বা id দিলে সম্পাদনা */
export async function saveTaxoItem(path: TaxoPath, id: string | null, data: TaxoItemData): Promise<{ ok: boolean; error?: string }> {
  try {
    const name = data.name.trim();
    if (name.length < 2) return { ok: false, error: "নাম কমপক্ষে ২ অক্ষরের হোক।" };
    if ((path === "types" || path === "departments") && !data.branch?.trim())
      return { ok: false, error: "শাখা নির্বাচন করুন।" };
    const base: Record<string, unknown> = { name };
    if (path === "types" || path === "departments") base.branch = data.branch!.trim();
    if (path === "departments") base.officeKind = data.officeKind?.trim() ?? "";
    if (id) {
      await update(taxoRef(path), { [id]: base });
    } else {
      const r = push(taxoRef(path));
      if (!r.key) return { ok: false, error: "কী তৈরি করা যায়নি।" };
      await set(r, { ...base, order: Date.now() });
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "সংরক্ষণ করা যায়নি — Rules/সংযোগ দেখুন।" };
  }
}

export async function deleteTaxoItem(path: TaxoPath, id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await remove(ref(initFirebase()!.db, `taxonomies/${path}/${id}`));
    return { ok: true };
  } catch {
    return { ok: false, error: "মুছে ফেলা যায়নি — Rules/সংযোগ দেখুন।" };
  }
}

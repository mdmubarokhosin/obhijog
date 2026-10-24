// অভিযোগ — অবস্থানের তথ্য (বিভাগ / জেলা / উপজেলা / ইউনিয়ন)
// ডেটা উৎস: UnifiedAPI — https://unifiedapi.pages.dev/docs
// সব রিকোয়েস্ট ক্লায়েন্ট-সাইডে; localStorage-এ ৭ দিনের ক্যাশ (অফলাইনেও আগের তালিকা কাজ করে)।

import { useCallback, useEffect, useRef, useState } from "react";

// ─── টাইপ ──────────────────────────────────────────────────
export interface GeoDivision {
  id: string;
  name: string;
  bn_name: string;
}

export interface GeoDistrict {
  id: string;
  division_id: string;
  name: string;
  bn_name: string;
}

export interface GeoUpazila {
  id: string;
  district_id: string;
  name: string;
  bn_name: string;
}

export interface GeoUnion {
  id: string;
  upazila_id: string;
  name: string;
  bn_name: string;
}

// ─── কনস্ট্যান্ট ────────────────────────────────────────────
const BASE = "https://unifiedapi.pages.dev/api/geo/v1.0";
const CACHE_KEY = "abhijog.geo.v1";
const TTL = 7 * 24 * 60 * 60 * 1000; // ৭ দিন

interface GeoCache {
  savedAt: number;
  divisions: GeoDivision[];
  districts: Record<string, GeoDistrict[]>; // কী: division_id অথবা "all"
  upazilas: Record<string, GeoUpazila[]>;   // কী: district_id
  unions: Record<string, GeoUnion[]>;       // কী: upazila_id
}

let cache: GeoCache | null = null;
const inflight = new Map<string, Promise<unknown>>();

function loadCache(): GeoCache {
  if (cache) return cache;
  const empty: GeoCache = { savedAt: 0, divisions: [], districts: {}, upazilas: {}, unions: {} };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GeoCache;
      if (parsed && typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt < TTL) {
        cache = {
          savedAt: parsed.savedAt,
          divisions: parsed.divisions ?? [],
          districts: parsed.districts ?? {},
          upazilas: parsed.upazilas ?? {},
          unions: parsed.unions ?? {},
        };
        return cache;
      }
    }
  } catch {
    // ভাঙা ক্যাশ — নতুন করে শুরু
  }
  cache = empty;
  return cache;
}

function saveCache() {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // কোটা শেষ — ক্যাশ ছাড়াই চলবে
  }
}

/** বাংলা নাম তুলনার জন্য স্বাভাবিকীকরণ (য়/ড়/ঢ়-এর ইউনিকোড রূপভেদ মেটানো) */
export function normBn(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\u09DF/g, "\u09AF\u09BC") // য় → য + ়
    .replace(/\u09DC/g, "\u09A1\u09BC") // ড় → ড + ়
    .replace(/\u09DD/g, "\u09A2\u09BC"); // ঢ় → ঢ + ়
}

const byBnName = <T extends { bn_name: string }>(a: T, b: T) =>
  normBn(a.bn_name).localeCompare(normBn(b.bn_name), "bn");

async function fetchList<T>(path: string, cacheKey: string): Promise<T[]> {
  const c = loadCache();
  const hit = c.savedAt > 0 && (cacheKey in c.districts || cacheKey in c.upazilas || cacheKey in c.unions || (cacheKey === "divisions" && c.divisions.length > 0));
  if (hit) {
    if (cacheKey === "divisions") return c.divisions as T[];
    if (cacheKey in c.districts) return c.districts[cacheKey] as T[];
    if (cacheKey in c.upazilas) return c.upazilas[cacheKey] as T[];
    return c.unions[cacheKey] as T[];
  }

  const existing = inflight.get(cacheKey);
  if (existing) return existing as Promise<T[]>;

  const p = (async () => {
    const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`geo_http_${res.status}`);
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (!json || json.success !== true || !Array.isArray(json.data)) {
      throw new Error("geo_bad_shape");
    }
    const items = json.data as T[];
    // ক্যাশে রাখা
    const cc = loadCache();
    if (cacheKey === "divisions") cc.divisions = items as GeoDivision[];
    else if (path.startsWith("/districts")) cc.districts[cacheKey] = items as GeoDistrict[];
    else if (path.startsWith("/upazilas")) cc.upazilas[cacheKey] = items as GeoUpazila[];
    else cc.unions[cacheKey] = items as GeoUnion[];
    cc.savedAt = Date.now();
    saveCache();
    return items;
  })().finally(() => inflight.delete(cacheKey));

  inflight.set(cacheKey, p);
  return p;
}

// ─── ফেচার ─────────────────────────────────────────────────
export function getDivisions(): Promise<GeoDivision[]> {
  return fetchList<GeoDivision>("/divisions", "divisions").then((xs) => [...xs].sort(byBnName));
}

/** divisionId খালি হলে সব ৬৪ জেলা */
export function getDistricts(divisionId?: string): Promise<GeoDistrict[]> {
  const key = divisionId || "all";
  const path = divisionId ? `/districts?division_id=${encodeURIComponent(divisionId)}` : "/districts";
  return fetchList<GeoDistrict>(path, key).then((xs) => [...xs].sort(byBnName));
}

export function getUpazilas(districtId: string): Promise<GeoUpazila[]> {
  return fetchList<GeoUpazila>(`/upazilas?district_id=${encodeURIComponent(districtId)}`, `up:${districtId}`)
    .then((xs) => [...xs].sort(byBnName));
}

export function getUnions(upazilaId: string): Promise<GeoUnion[]> {
  return fetchList<GeoUnion>(`/unions?upazila_id=${encodeURIComponent(upazilaId)}`, `un:${upazilaId}`)
    .then((xs) => [...xs].sort(byBnName));
}

export const GEO_ERROR_MSG =
  "অবস্থানের তালিকা আনা যায়নি — ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।";

// ─── সরাসরি লোকেশন (GPS → বিভাগ/জেলা/উপজেলা/ইউনিয়ন স্বয়ংক্রিয়) ──
//
// ইউজারের নির্দেশ: ইউজার লোকেশনের নাম না জানলে "সরাসরি লোকেশন" দিয়ে
// বিভাগ, জেলা, থানা ও ইউনিয়ন অটোমেটিক বসে যাবে; নইলে ম্যানুয়াল সিলেকশন।
//
// প্রবাহ: navigator.geolocation → রিভার্স-জিওকোড (BigDataCloud ফ্রি ক্লায়েন্ট
// API, ফলব্যাক Nominatim/OSM) → নাম-প্রার্থী → UnifiedAPI তালিকার সঙ্গে ম্যাচ।
// যে ধাপ মেলে না, সেটি ম্যানুয়ালি বাছাইয়ের জন্য খোলা থাকে।

export const GPS_ERROR_MSG: Record<string, string> = {
  "1": "লোকেশনের অনুমতি দেওয়া হয়নি — ব্রাউজার সেটিংস থেকে অনুমতি দিয়ে আবার চেষ্টা করুন।",
  "2": "লোকেশন নির্ধারণ সম্ভব হয়নি — GPS চালু করে আবার চেষ্টা করুন।",
  "3": "সময় শেষ — আবার চেষ্টা করুন।",
};

export function gpsErrMsg(e: unknown): string {
  if (typeof e === "object" && e && "code" in e) {
    const code = String((e as { code: unknown }).code);
    if (code in GPS_ERROR_MSG) return GPS_ERROR_MSG[code];
  }
  if (e instanceof Error && e.message === "insecure_geo")
    return "লোকেশন সেবা শুধু HTTPS বা localhost-এ চলে।";
  return "লোকেশন নির্ধারণ করা যায়নি — আবার চেষ্টা করুন বা ম্যানুয়ালি বাছুন।";
}

/** ডিভাইসের বর্তমান অবস্থান (promise-wrapper, ১৮ সেকেন্ড টাইমআউট) */
export function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("insecure_geo"));
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      reject(new Error("insecure_geo"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 18000, maximumAge: 60000 }
    );
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<{ candidates: string[] }> {
  // ১) BigDataCloud ফ্রি ক্লায়েন্ট API (কী লাগে না, ব্রাউজার-বান্ধব)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=bn`,
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const j = (await res.json()) as Record<string, unknown>;
      const cands = [
        j.principalSubdivision,
        j.city,
        j.locality,
        j.principalSubdivisionCode,
      ].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      if (cands.length > 0) return { candidates: cands };
    }
  } catch {
    // ফলব্যাকে যাই
  }
  // ২) Nominatim (OSM) — বাংলা ভাষায়
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&accept-language=bn`,
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const j = (await res.json()) as { address?: Record<string, unknown> };
      const a = j.address ?? {};
      const cands = [a.state, a.state_district, a.county, a.city, a.town, a.municipality, a.village, a.suburb, a.neighbourhood, a.hamlet]
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      if (cands.length > 0) return { candidates: cands };
    }
  } catch {
    // দুটোই ব্যর্থ
  }
  return { candidates: [] };
}

/** "ঢাকা বিভাগ" → "ঢাকা", "Dhaka Division" → খালি (বাংলা ছাড়া অমিল) */
function stripDivisionSuffix(s: string): string {
  return s
    .replace(/\s*বিভাগ\s*$/u, "")
    .replace(/\s*division\s*$/iu, "")
    .trim();
}

const matchesBn = (a: string, b: string) => {
  const x = normBn(a);
  const y = normBn(b);
  return x === y || (x.length >= 3 && y.includes(x)) || (y.length >= 3 && x.includes(y));
};

/**
 * GPS-স্থানাঙ্ক → UnifiedAPI-র বিভাগ/জেলা/উপজেলা/ইউনিয়ন-আইডি।
 * যে ধাপ মেলে না তার আইডি থাকে না — সেটি ম্যানুয়ালি বাছতে হবে।
 */
export async function resolveLocationByCoords(lat: number, lon: number): Promise<ResolvedGeo> {
  const names: string[] = [];
  let { candidates } = await reverseGeocode(lat, lon);
  names.push(...candidates);
  // বাংলা-নাম না পেলে ইংরেজি ভাষায় দ্বিতীয় চেষ্টা (UnifiedAPI-র name ফিল্ড ইংরেজিও থাকে)
  if (candidates.length === 0) {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        { headers: { Accept: "application/json" } }
      );
      if (res.ok) {
        const j = (await res.json()) as Record<string, unknown>;
        candidates = [j.principalSubdivision, j.city, j.locality].filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0
        );
        names.push(...candidates);
      }
    } catch {
      /* নীরব */
    }
  }
  if (candidates.length === 0) throw new Error("no_reverse");

  // বিভাগ
  const divisions = await getDivisions();
  let divisionId = "";
  let divisionName = "";
  for (const c of candidates) {
    const bare = stripDivisionSuffix(c);
    const hit = divisions.find((d) => matchesBn(d.bn_name, bare) || matchesBn(d.name, bare));
    if (hit) {
      divisionId = hit.id;
      divisionName = hit.bn_name;
      break;
    }
  }

  // জেলা
  const districts = await getDistricts(divisionId || undefined);
  let districtId = "";
  let districtName = "";
  for (const c of candidates) {
    const bare = stripDivisionSuffix(c);
    const hit = districts.find((d) => matchesBn(d.bn_name, bare) || matchesBn(d.name, bare));
    if (hit && (!divisionId || hit.division_id === divisionId)) {
      districtId = hit.id;
      districtName = hit.bn_name;
      break;
    }
  }
  // বিভাগ না মিললেও জেলা মিললে বিভাগ বসাই (জেলা-আইডিতে division_id আছে)
  if (!divisionId && districtId) {
    const d = districts.find((x) => x.id === districtId);
    if (d) {
      const parent = divisions.find((v) => v.id === d.division_id);
      if (parent) {
        divisionId = parent.id;
        divisionName = parent.bn_name;
      }
    }
  }

  // উপজেলা
  let upazilaId = "";
  let upazilaName = "";
  if (districtId) {
    const upazilas = await getUpazilas(districtId);
    for (const c of candidates) {
      const bare = stripDivisionSuffix(c);
      const hit = upazilas.find((u) => matchesBn(u.bn_name, bare) || matchesBn(u.name, bare));
      if (hit) {
        upazilaId = hit.id;
        upazilaName = hit.bn_name;
        break;
      }
    }
  }

  // ইউনিয়ন
  let unionId = "";
  let unionName = "";
  if (upazilaId) {
    const unions = await getUnions(upazilaId);
    for (const c of candidates) {
      const bare = stripDivisionSuffix(c);
      const hit = unions.find((u) => matchesBn(u.bn_name, bare) || matchesBn(u.name, bare));
      if (hit) {
        unionId = hit.id;
        unionName = hit.bn_name;
        break;
      }
    }
  }

  return { ok: !!(divisionId || districtId), names, divisionId, divisionName, districtId, districtName, upazilaId, upazilaName, unionId, unionName };
}

export interface ResolvedGeo {
  ok: boolean;
  names: string[];
  divisionId: string;
  divisionName: string;
  districtId: string;
  districtName: string;
  upazilaId: string;
  upazilaName: string;
  unionId: string;
  unionName: string;
}

// ─── হুক ───────────────────────────────────────────────────
export interface GeoListState<T> {
  items: T[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}

/**
 * একটি তালিকা লোড করার হুক — enabled=false হলে আনে না (ক্যাসকেডের জন্য)।
 * loading ডেরাইভড: শেষ সেটেল-কী বর্তমান কী-এর সঙ্গে না মিললে লোডিং ধরা হয়।
 */
export function useGeoList<T>(
  fetcher: () => Promise<T[]>,
  deps: unknown[],
  enabled = true
): GeoListState<T> {
  const [bump, setBump] = useState(0);
  const key = `${deps.map((d) => String(d)).join("|")}#${bump}#${enabled}`;
  const [settled, setSettled] = useState<{ key: string; items: T[]; error: boolean }>({
    key: "",
    items: [],
    error: false,
  });
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void (async () => {
      try {
        const xs = await fetcherRef.current();
        if (alive) setSettled({ key, items: xs, error: false });
      } catch {
        if (alive) setSettled({ key, items: [], error: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [key, enabled]);

  const retry = useCallback(() => setBump((b) => b + 1), []);

  if (!enabled) return { items: [], loading: false, error: false, retry };
  const done = settled.key === key;
  if (!done) return { items: [], loading: true, error: false, retry };
  return { items: settled.items, loading: false, error: settled.error, retry };
}

// অভিযোগ — প্রমাণ-ছবি হোস্টিং (GitHub Repo API + jsDelivr CDN)
//
// ইউজারের নির্দেশ: ছবি আপলোডের hosting হিসেবে GitHub repo API ব্যবহৃত হবে;
// repo ও API key অ্যাডমিন প্যানেল থেকে সেটআপ করা যাবে, ডাটাবেস (Realtime Database)
// থেকে লোড হবে; আর ছবি লোড হবে jsDelivr CDN দিয়ে।
//
// প্রবাহ: dataURL → GitHub Contents API (PUT /repos/{owner}/{repo}/contents/{path})
//        → jsDelivr URL (https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path})
// ফলব্যাক: GitHub সেটিংস না থাকলে বা আপলোড ব্যর্থ হলে ছবি কমপ্রেস-অবস্থায়
//          Realtime Database-এই (dataURL) সংরক্ষিত হয় — অ্যাপ বন্ধ হয় না।
//
// ⚠️ নিরাপত্তা-নোট: টোকেনটি ক্লায়েন্ট-সাইড আপলোডের জন্য RTDB-তে থাকে —
// তাই অবশ্যই **Fine-grained PAT** ব্যবহার করুন: শুধু একটি repo,
// Permission → Contents: Read and write, মেয়াদ সীমিত। বিস্তারিত README-তে।

import { get, ref, update } from "firebase/database";
import { initFirebase } from "./firebase";

// ─── সেটিংস ────────────────────────────────────────────────
export interface GithubSettings {
  owner: string; // repo-মালিক (ইউজার/অর্গ)
  repo: string; // repo-নাম
  branch: string; // ডিফল্ট main
  folder: string; // repo-র ভেতরের ফোল্ডার (ডিফল্ট obhijog)
  token: string; // GitHub Personal Access Token (fine-grained, Contents:RW)
}

export interface GithubSettingsPublic {
  owner: string;
  repo: string;
  branch: string;
  folder: string;
  /** টোকেন মাস্কড (gh●●●●1234) — প্যানেলে দেখানোর জন্য */
  tokenMasked: string;
  hasToken: boolean;
}

export async function getGithubSettings(): Promise<GithubSettings | null> {
  try {
    const f = initFirebase();
    if (!f) return null;
    const snap = await get(ref(f.db, "settings/github"));
    if (!snap.exists()) return null;
    const v = snap.val() as Partial<GithubSettings>;
    return {
      owner: typeof v.owner === "string" ? v.owner.trim() : "",
      repo: typeof v.repo === "string" ? v.repo.trim() : "",
      branch: typeof v.branch === "string" && v.branch.trim() ? v.branch.trim() : "main",
      folder: typeof v.folder === "string" && v.folder.trim() ? v.folder.trim() : "obhijog",
      token: typeof v.token === "string" ? v.token.trim() : "",
    };
  } catch {
    return null;
  }
}

export async function saveGithubSettings(s: GithubSettings): Promise<boolean> {
  try {
    const f = initFirebase();
    if (!f) return false;
    await update(ref(f.db, "settings/github"), {
      owner: s.owner.trim(),
      repo: s.repo.trim(),
      branch: s.branch.trim() || "main",
      folder: s.folder.trim() || "obhijog",
      token: s.token.trim(),
    });
    return true;
  } catch {
    return false;
  }
}

export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 10) return "●".repeat(token.length);
  return `${token.slice(0, 4)}${"●".repeat(8)}${token.slice(-4)}`;
}

export function isGithubConfigured(s: GithubSettings | null): boolean {
  return !!s && !!s.owner && !!s.repo && !!s.token;
}

// ─── সংযোগ-পরীক্ষা (সেটিংস সেভের আগে/পরে চেক) ──────────────────
export async function testGithubSettings(
  s: GithubSettings
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}`, {
      headers: {
        Authorization: `Bearer ${s.token.trim()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (res.status === 401) return { ok: false, message: "টোকেন অবৈধ বা মেয়াদোত্তীর্ণ (401) — নতুন PAT তৈরি করুন।" };
    if (res.status === 404) return { ok: false, message: "repo পাওয়া যায়নি (404) — owner/repo বানান ও টোকেনের repo-অনুমতি দেখুন।" };
    if (!res.ok) return { ok: false, message: `GitHub API ত্রুটি (${res.status}) — পরে আবার চেষ্টা করুন।` };
    const j = (await res.json()) as { full_name?: string; default_branch?: string; private?: boolean };
    const notes: string[] = [];
    if (j.default_branch && j.default_branch !== (s.branch.trim() || "main"))
      notes.push(`সতর্কতা: repo-র ডিফল্ট ব্রাঞ্চ "${j.default_branch}", আপনি লিখেছেন "${s.branch.trim() || "main"}"।`);
    if (j.private) notes.push("সতর্কতা: প্রাইভেট repo — jsDelivr প্রাইভেট repo-র ছবি সার্ভ করে না; পাবলিক repo ব্যবহার করুন।");
    return {
      ok: true,
      message: `সংযোগ ঠিক — ${j.full_name ?? `${s.owner}/${s.repo}`}${notes.length ? " · " + notes.join(" · ") : ""}`,
    };
  } catch {
    return { ok: false, message: "সংযোগ সম্ভব হয়নি — ইন্টারনেট দেখুন।" };
  }
}

// ─── আপলোড ────────────────────────────────────────────────
export interface UploadedPhotos {
  /** প্রতিটি ছবির প্রকাশ্য URL (jsDelivr) বা ফলব্যাক dataURL */
  urls: string[];
  /** কতগুলো GitHub-এ হোস্ট হলো */
  hosted: number;
  /** কতগুলো ব্যর্থ → dataURL ফলব্যাক */
  failed: number;
}

const GB = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/;

export async function uploadEvidencePhotos(dataURLs: string[]): Promise<UploadedPhotos> {
  if (dataURLs.length === 0) return { urls: [], hosted: 0, failed: 0 };
  const cfg = await getGithubSettings();
  if (!isGithubConfigured(cfg)) return { urls: [...dataURLs], hosted: 0, failed: 0 };
  const owner = cfg!.owner;
  const repo = cfg!.repo;
  const branch = cfg!.branch || "main";
  const folder = (cfg!.folder || "obhijog").replace(/^\/+|\/+$/g, "");

  const urls: string[] = [];
  let hosted = 0;
  let failed = 0;

  for (const du of dataURLs) {
    const m = GB.exec(du);
    if (!m) {
      urls.push(du);
      failed++;
      continue;
    }
    try {
      const ext = m[1] === "image/png" ? "png" : "jpg";
      const path = `${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${cfg!.token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `অভিযোগ — প্রমাণ-ছবি (obhijog) ${new Date().toISOString()}`,
            content: m[2],
            branch,
          }),
        }
      );
      if (!res.ok) throw new Error(`gh_${res.status}`);
      urls.push(`https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`);
      hosted++;
    } catch {
      urls.push(du); // ফলব্যাক: ডাটাবেসেই সংরক্ষণ — অভিযোগ আটকায় না
      failed++;
    }
  }
  return { urls, hosted, failed };
}

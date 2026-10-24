# অভিযোগ — নাগরিক জবাবদিহিতা প্ল্যাটফর্ম (PWA + Firebase Realtime Database + অ্যাডমিন প্যানেল)

সরকারি দপ্তর ও জনপ্রতিনিধিরা নাগরিকের সঙ্গে আসলে কী করে — তার একটি **প্রকাশ্য, যাচাইযোগ্য হিসাব** —
নাম গোপন রেখে অভিযোগ করুন, অন্যদের অভিযোগ পড়ুন, সমর্থন/আপত্তি জানান।

- **সাইট:** `https://domain.pages.dev/`
- **অ্যাডমিন প্যানেল:** `https://domain.pages.dev/admin`
- **ডাটাবেজ:** Google Firebase **Realtime Database** — রিয়েলটাইম (onValue); যেকোনো ডিভাইস থেকে সঙ্গে সঙ্গে সিঙ্ক
  ⚠️ **Firestore কোনোভাবেই ব্যবহৃত হয় না** (স্পষ্ট নির্দেশ) — সবকিছু Realtime Database-এ
- **ছবি-হোস্টিং:** GitHub Repo API (Contents) → আপলোড, **jsDelivr CDN** → লোড; repo + API key অ্যাডমিন প্যানেল থেকে সেটআপ করা যায় (Realtime Database-এ সংরক্ষিত)
- **অ্যাডমিন:** ইউজারনেম+পাসওয়ার্ড (PBKDF2-হ্যাশ, Realtime Database-এ) — ডাটাবেজে অ্যাডমিন না থাকলে `/admin` স্বয়ংক্রিয়ভাবে **প্রথম অ্যাডমিন তৈরির রেজিস্ট্রেশন পেজ** দেখায়
- **ফন্ট:** Noto Serif Bengali — সাইটের সব জায়গায় (হেডিং, বডি, সংখ্যা — সর্বত্র)
- **ডিজাইন:** [somossha.me](https://somossha.me/)-অনুপ্রাণিত — সাদা পটভূমিতে উষ্ণ কমলা (#F14A0A)

---

## ✨ ফিচারসমূহ

| ফিচার | বর্ণনা |
|---|---|
| 🔴 রিয়েলটাইম ডাটাবেজ | সব অভিযোগ/মন্তব্য/নোটিশ/ট্যাক্সোনমি Firebase **Realtime Database**-এ — onValue দিয়ে সব স্ক্রিনে লাইভ আপডেট |
| 🛡️ অল-ইন-ওয়ান অ্যাডমিন প্যানেল | `/admin` — ড্যাশবোর্ড (স্ট্যাট+চার্ট), অভিযোগ যাচাই-বাছাই (যাচাইকৃত/বাতিল/সমাধান/আবার-যাচাই + প্রকাশ্য নোট), মন্তব্য মডারেশন, নোটিশ, **শাখা/ধরন/দপ্তর CRUD**, GitHub ছবি-হোস্টিং সেটিংস, অ্যাডমিন ব্যবস্থাপনা (যোগ/মুছুন/পাসওয়ার্ড বদল), নমুনা-ডাটা সিডার |
| 👤 প্রথম-অ্যাডমিন রেজিস্ট্রেশন | ডাটাবেজে কোনো অ্যাডমিন না থাকলে লগইন-পেজের বদলে রেজিস্ট্রেশন পেজ লোড হয়; পাসওয়ার্ড PBKDF2-SHA256 (১২০k রাউন্ড) দিয়ে হ্যাশ |
| 🕵️ বেনামে অভিযোগ | কোনো অ্যাকাউন্ট/লগইন নেই — নাম, ফোন, ইমেইল কিছুই লাগে না; কোনো ব্যক্তির নাম/ছবি প্রকাশ হয় না |
| ✅ দুই-স্তরের যাচাই | অ্যাডমিন যাচাই (pending → verified/rejected/resolved) + পাঠক-সমর্থন/আপত্তি; ৩০+ বেশি আপত্তিতে স্বয়ংক্রিয় সরানো |
| 🏷️ শাখা/ধরন/দপ্তর — অ্যাডমিন-নিয়ন্ত্রিত | বিল্ট-ইন ৪৩ ধরন × ৮ শাখা × দপ্তর ডিফল্ট; অ্যাডমিন প্যানেল থেকে নিজের তালিকা যোগ/এডিট/ডিলিট করলে সাইটে সঙ্গে সঙ্গে প্রযোজ্য হয় |
| 📍 অবস্থান — ৪ ধাপ, দুই মোড | ① **ম্যানুয়াল নির্বাচন:** বিভাগ → জেলা → উপজেলা → ইউনিয়ন (সবগুলো আবশ্যক; তথ্য [UnifiedAPI](https://unifiedapi.pages.dev/docs) থেকে, ৭ দিনের ক্যাশ) ② **সরাসরি লোকেশন (GPS):** নাম না জানলে এক ট্যাপে ডিভাইসের লোকেশন থেকে বিভাগ/জেলা/উপজেলা/ইউনিয়ন স্বয়ংক্রিয়ভাবে বসে যায় (রিভার্স-জিওকোড: BigDataCloud → Nominatim ফলব্যাক); যে ধাপ মেলে না সেটি ম্যানুয়ালি বাছাই |
| 🖼️ প্রমাণ-ছবি (আবশ্যক) → GitHub + jsDelivr | ক্যামেরা/গ্যালারি থেকে সর্বোচ্চ ৩টি; ডিভাইসেই ১০২৪px JPEG-এ সংকুচিত; GitHub Contents API দিয়ে আপলোড → `cdn.jsdelivr.net/gh/...` URL ডাটাবেসে; GitHub সেটিংস না থাকলে ছবি ডাটাবেসেই (dataURL) — জমা বন্ধ হয় না; লাইটবক্সসহ গ্যালারি |
| 💰 দুই-স্তরের হিসাব | নাগরিকের ক্ষতি (সরাসরি) + জনগণের অর্থ (অনুমান) — আলাদা, যোগ হয় না (somossha-মডেল) |
| 🔎 খুঁজুন ও ফিল্টার | শব্দ/কোড অনুসন্ধান + শাখা, ধরন, দপ্তর, বিভাগ, জেলা ফিল্টার |
| 📊 বিশ্লেষণ | ডোনাট, শাখা/দপ্তর/জেলা-চার্ট, গণনাকৃত স্বচ্ছতা সূচক |
| 🎫 কোড-ট্র্যাকিং | ইউনিক কোড (r/xxxxxx) দিয়ে যেকোনো ডিভাইস থেকে অভিযোগের যাচাই-অবস্থা |
| 📣 নোটিশ | অ্যাডমিন প্যানেল থেকে হোম-স্ক্রিনে প্রকাশ্য নোটিশ (চালু/বন্ধ) |
| 🌙 ডার্ক মোড + 📲 PWA | সম্পূর্ণ থিম-সুইচ, Android-এ হোম-স্ক্রিন ইনস্টল, অফলাইন Service Worker |
| ⚡ স্প্ল্যাশ নেই | অ্যাপ খোলার সঙ্গে সঙ্গেই কনটেন্ট |

## 🧱 টেক স্ট্যাক

- **Next.js 16** (App Router, static export → `out/`) + **React 19** + **TypeScript**
- **Firebase 13** — Realtime Database (রিয়েলটাইম onValue), Analytics; **Auth ব্যবহৃত হয় না** (কাস্টম PBKDF2 অথ)
- **Tailwind CSS 3** — সম্পূর্ণ pure-JS (Termux/Android-নিরাপদ)
- framer-motion, vaul, recharts, sonner, lucide-react
- next/font/local — **Noto Serif Bengali** প্রজেক্টের ভেতরে vendor করা (বিল্ডে নেটওয়ার্ক লাগে না)

> **কেন Tailwind 3?** Tailwind 4-এর oxide/lightningcss নেটিভ বাইনারি চায়, যা Termux/Android-এ নেই। Tailwind 3 সম্পূর্ণ pure-JS।

---

## 🔥 সেটআপ (একবার — ~৭ মিনিট)

Firebase প্রজেক্ট **obhijog** তৈরি আছে; নিচের ধাপগুলো কনসোলে করতে হবে:
👉 <https://console.firebase.google.com/project/obhijog>

### ১) Realtime Database তৈরি করুন
- Console → **Build → Realtime Database → Create Database**
- Location: কাছের রিজিয়ন → **Start in locked mode** ঠিক রাখুন

### ২) নিরাপত্তা-নিয়ম বসান
- Realtime Database → **Rules** ট্যাব → রিপোর মূলের **`database.rules.json`** ফাইলের পুরো কনটেন্ট বসিয়ে **Publish**
- এই নিয়মে পাবলিক পড়া/লেখা ও `.indexOn: createdAt` অন্তর্ভুক্ত — রেজিস্ট্রেশন, জমা, যাচাই সব চলবে

### ৩) প্রথম অ্যাডমিন তৈরি করুন (কোডে নয় — সাইট থেকেই)
- সাইটের `/admin` খুলুন → ডাটাবেজে অ্যাডমিন না থাকায় **রেজিস্ট্রেশন পেজ** আসবে
- ইউজারনেম + প্রদর্শন-নাম + পাসওয়ার্ড দিয়ে **অ্যাডমিন তৈরি করুন** → স্বয়ংক্রিয় লগইন
- এরপর থেকেই লগইন-পেজ; সেটিংস ট্যাব থেকে আরও অ্যাডমিন যোগ/মুছতে পারবেন, পাসওয়ার্ড বদলাতে পারবেন

### ৪) ছবি-হোস্টিং: GitHub repo + API key
1. GitHub-এ একটি **পাবলিক** repo তৈরি করুন (যেমন `obhijog-images`) — jsDelivr প্রাইভেট repo সার্ভ করে না
2. **Fine-grained PAT** তৈরি করুন: <https://github.com/settings/personal-access-tokens/new>
   - Repository access → **Only select repositories** → ওই repo
   - Permissions → Contents → **Read and write**
   - মেয়াদ: সীমিত রাখুন (যেমন ৯০ দিন) — শুধু এই এক কাজে ব্যবহৃত হবে
3. অ্যাডমিন প্যানেল → **সেটিংস → ছবি-হোস্টিং** → Owner, Repo, Branch (main), ফোল্ডার (obhijog), PAT বসিয়ে **সংরক্ষণ** → **সংযোগ পরীক্ষা**
4. এরপর প্রতিটি প্রমাণ-ছবি GitHub API-তে আপলোড হবে এবং সাইটে `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}` দিয়ে লোড হবে

> ⚠️ **নিরাপত্তা-নোট:** টোকেনটি ক্লায়েন্ট-সাইড আপলোডের জন্য Realtime Database-এ থাকে (সার্ভারহীন স্ট্যাটিক অ্যাপের সীমাবদ্ধতা)। তাই অবশ্যই এক-repo, Contents:RW, মেয়াদ-সীমিত fine-grained টোকেন ব্যবহার করুন — দুর্ব্যবহার হলে শুধু ওই টোকেনটি revoke করলেই হবে। সেটিংস না থাকলে/আপলোড ব্যর্থ হলে ছবি কমপ্রেস-অবস্থায় ডাটাবেসেই সংরক্ষিত হয় — অভিযোগ জমা আটকায় না।

### ৫) Analytics (ঐচ্ছিক)
- কনফিগে measurementId আছে; Analytics স্বয়ংক্রিয়ভাবে যুক্ত হয় (সমর্থিত না হলে নীরবে বাদ)

### ৬) ডিপ্লয়ের পর
- কিছু করতে হয় না — কোনো Authorized-domain সেটিং লাগে না (Auth ব্যবহৃত হয় না)

---

## 🚀 লোকাল ডেভ (Termux সহ)

```bash
npm install        # প্রথমবার
npm run dev        # next dev --webpack -p 3000   (Turbopack Android-এ চলে না — README শেষে ব্যাখ্যা)
npm run build      # প্রোডাকশন বিল্ড → out/
npm run preview    # out/ ফোল্ডার লোকালি সার্ভ (node scripts/serve.js)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

- `dev`/`build` — দুটোতেই `--webpack`: Turbopack-এর নেটিভ বাইনারি android/arm64 (Termux)-এ নেই; WASM-only পরিবেশে Next.js নিজেই Webpack সাজেস্ট করে।
- `next.config.ts` → `output: "export"` — সম্পূর্ণ ক্লায়েন্ট-সাইড অ্যাপ (কোনো সার্ভার/API নেই)।

---

## ☁️ GitHub + Cloudflare Pages ডিপ্লয়

1. **GitHub repo:**
   ```bash
   git init && git add -A && git commit -m "অভিযোগ v2.0.1 — এডমিন রিডাইরেক্ট-লুপ ফিক্স + Realtime Database + GitHub ছবি-হোস্টিং + অ্যাডমিন প্যানেল"
   git branch -M main
   git remote add origin https://github.com/<আপনার-ইউজারনেম>/obhijog.git
   git push -u origin main
   ```
2. **Cloudflare Pages:**
   - Dashboard → Workers & Pages → Create → **Pages** → Connect to Git → ওই repo
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `out`
   - Environment variable: `NODE_VERSION` = `22`
   - Save and Deploy → সাইট: `https://<প্রজেক্ট>.pages.dev/` · অ্যাডমিন: `https://<প্রজেক্ট>.pages.dev/admin`

   > ⚠️ **v2.0.1 গুরুত্বপূর্ণ ফিক্স:** আগের সংস্করণে `public/_redirects`-এ `/admin → admin.html (200)` rewrite ছিল।
   > Cloudflare Pages-এর স্বয়ংক্রিয় pretty-URL ক্যানোনিকালাইজেশন (`admin.html` → `/admin`) এর সঙ্গে সংঘর্ষে
   > `/admin`-এ **অসীম 308 রিডাইরেক্ট লুপ** হতো — এডমিন প্যানেল খুলত না। এখন `next.config.ts`-এ
   > `trailingSlash: true` — এক্সপোর্ট হয় `out/admin/index.html`, Cloudflare নিজেই সার্ভ করে,
   > `_redirects`-এ কোনো rewrite রাখা যাবে না (ফাইলে ব্যাখ্যা লেখা আছে)।

---

## 🗄️ Realtime Database গঠন

```
complaints/{pushId}        — অভিযোগ (code, title, description, categoryId, departmentId,
                             location{division,district,upazila,union × id+নাম}, moneyLost,
                             publicMoney, timeWasted, peopleCount, supports, objections,
                             commentCount, evidence[URL/dataURL], status, statusNote?, createdAt(ms))
comments/{complaintId}/{cid} — মন্তব্য (body, stance, createdAt)
reactions/{complaintId}/{clientId} — {stance, createdAt} (এক ডিভাইস একবারই)
notices/{pushId}           — {title, body, active, createdAt}
taxonomies/branches/{id}   — {name, order}          ← অ্যাডমিন CRUD
taxonomies/types/{id}      — {name, branch, order}  ← অ্যাডমিন CRUD
taxonomies/departments/{id} — {name, branch, officeKind, order} ← অ্যাডমিন CRUD
settings/github            — {owner, repo, branch, folder, token}  ← ছবি-হোস্টিং
admins/{uid}               — {username, displayName, salt, hash, role, createdAt, session{token, exp}}
```

- কোনো অ্যাডমিন না থাকলে `/admin` রেজিস্ট্রেশন দেখায়; থাকলে লগইন।
- ট্যাক্সোনমি খালি হলে সাইট বিল্ট-ইন ডিফল্টে চলে (৮ শাখা × ৪৩ ধরন × দপ্তর) — অ্যাডমিন যোগ করলে সেটিই প্রযোজ্য।

---

## 🧪 যাচাইকৃত E2E (v2.0.0)

- হোম/বিশ্লেষণ/খুঁজুন/ট্র্যাক/প্রোফাইল — Noto Serif Bengali সর্বত্র ✓
- অবস্থান: ম্যানুয়াল ক্যাসকেড (ঢাকা → ১৩ জেলা → সাভার → ১২ ইউনিয়ন → আশুলিয়া) ✓ · GPS ট্যাব (অনুমতি-না-থাকার বাংলা এরর + আবার খুঁজুন) ✓
- ছবি কমপ্রেশন (canvas ১০২৪px JPEG) → প্রিভিউ → প্রকাশ → RTDB-তে জমা → ডিটেইলে অবস্থান-চেইন + ছবি ✓
- `/admin`: খালি ডাটাবেজ → **প্রথম-অ্যাডমিন রেজিস্ট্রেশন** → অ্যাকাউন্ট তৈরি → ড্যাশবোর্ড → অভিযোগ যাচাই (status: verified + নোট RTDB-তে) → শাখা যোগ/মুছুন → GitHub সেটিংস সেভ → লগআউট ✓
- যাচাইকৃত অভিযোগ পাবলিক ফিডে ✓ · পরীক্ষার পর টেস্ট-ডাটা সম্পূর্ণ পরিষ্কার ✓
- tsc 0 error · eslint 0 error · `npm run build` (static export) সফল ✓

---

## 🔒 Turbopack ত্রুটির ব্যাখ্যা (Termux/Android)

Next.js 16-এর ডিফল্ট বান্ডলার Turbopack-এর নেটিভ বাইনারি প্ল্যাটফর্মভেদে আলাদা; android/arm64
(Termux)-এ তা নেই — শুধু WASM bindings লোড হয়, আর Turbopack WASM-এ চলে না:

```
Error: Turbopack is not supported on this platform (android/arm64) because native bindings
are not available. ... To use Next.js on this platform, use Webpack instead: next dev --webpack
```

তাই `package.json`-এ dev ও build — দুটোতেই `--webpack` দেওয়া আছে (স্থায়ী সমাধান; নতুন করে কিছু করতে হয় না)।

---

## 📂 গুরুত্বপূর্ণ ফাইল

| ফাইল | কাজ |
|---|---|
| `src/lib/firebase.ts` | Firebase init (প্রজেক্ট obhijog — ইউজারের কনফিগ) — শুধু RTDB + Analytics |
| `src/lib/db.ts` | RTDB ডাটা-লেয়ার — সাবস্ক্রিপশন, জমা, প্রতিক্রিয়া, মন্তব্য, যাচাই, নোটিশ, সিড, মাইগ্রেশন |
| `src/lib/admin-auth.ts` | PBKDF2 হ্যাশ, প্রথম-অ্যাডমিন রেজিস্ট্রেশন, লগইন/সেশন/অ্যাডমিন-ব্যবস্থাপনা |
| `src/lib/image-host.ts` | GitHub Contents API আপলোড + jsDelivr URL + সংযোগ-পরীক্ষা |
| `src/lib/taxonomy.ts` | শাখা/ধরন/দপ্তর — রিয়েলটাইম সাবস্ক্রিপশন + CRUD |
| `src/lib/geo.ts` | UnifiedAPI ৪-ধাপ + GPS রিভার্স-জিওকোড (BigDataCloud/Nominatim) ম্যাচিং |
| `src/lib/store.ts` | রিয়েলটাইম স্টোর + ট্যাক্সোনমি-মার্জ (RTDB → বিল্ট-ইন ফলব্যাক) |
| `database.rules.json` | Realtime Database নিয়ম — কনসোলে Rules ট্যাবে বসান |
| `public/_redirects` | খালি (শুধু নোট) — rewrite নিষিদ্ধ, v2.0.1 লুপ-ফিক্স ব্যাখ্যা |

## 📜 লাইসেন্স

MIT — নিজের প্রজেক্টে স্বাধীনভাবে ব্যবহার/পরিবর্তন করুন।

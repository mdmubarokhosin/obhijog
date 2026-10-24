import type { NextConfig } from "next";

// অভিযোগ — সম্পূর্ণ ক্লায়েন্ট-সাইড অ্যাপ (কোনো সার্ভার/API নেই)।
// Cloudflare Pages-এ static export হিসেবেই ডিপ্লয় হয়: npm run build → out/
//
// ⚠️ Termux (Android/arm64) নোট:
// Turbopack প্ল্যাটফর্মভেদে নেটিভ বাইনারি চায় — Android-এ পাওয়া যায় না।
// তাই dev ও build — দুটোতেই --webpack ব্যবহার করা হয়েছে (package.json দেখুন)।
//
// ⚠️ trailingSlash: true — কেন (v2.0.1 ফিক্স):
// trailingSlash:false হলে Next /admin রুটটি out/admin.html ফাইল + out/admin/
// (RSC-payload) ডিরেক্টরি — দুটোই তৈরি করে। Cloudflare Pages-এ এই দ্বৈততা +
// _redirects-এর 200-rewrite মিলে /admin-এ **অসীম 308 রিডাইরেক্ট লুপ** তৈরি করত
// (এডমিন প্যানেল খুলত না)। trailingSlash:true হলে এক্সপোর্ট হয় out/admin/index.html —
// Cloudflare নিজে থেকেই ডিরেক্টরি-ইনডেক্স সার্ভ করে, কোনো rewrite লাগে না।
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

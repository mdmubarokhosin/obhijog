// অভিযোগ — অ্যাডমিন প্যানেল (একমাত্র পৃথক রুট: /admin)
// ডোমেইনে: https://domain.pages.dev/admin
// trailingSlash:true এক্সপোর্টে out/admin/index.html হয় — Cloudflare Pages
// নিজে থেকেই ডিরেক্টরি-ইনডেক্স সার্ভ করে; কোনো _redirects rewrite লাগে না
// (rewrite দিলে pretty-URL-এর সঙ্গে সংঘর্ষে অসীম 308 লুপ হয় — v2.0.1 ফিক্স দেখুন)।

import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/admin-app";

export const metadata: Metadata = {
  title: "অ্যাডমিন প্যানেল — অভিযোগ",
  description: "অভিযোগ প্ল্যাটফর্মের অল-ইন-ওয়ান অ্যাডমিন প্যানেল।",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}

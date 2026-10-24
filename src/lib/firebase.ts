// অভিযোগ — Firebase চালুকরণ (ক্লায়েন্ট-সাইড)
//
// ⚠️ শুধুমাত্র **Firebase Realtime Database** ব্যবহৃত হয় (Firestore কোনোভাবেই নয় —
// ইউজারের স্পষ্ট নির্দেশ)। সব ডাটা রিয়েলটাইম ডাটাবেজ থেকে onValue-তে লোড হয়।
// কনফিগ প্রকাশ্য তথ্য (Firebase ওয়েব অ্যাপের প্রকৃতি); নিয়ম-নিরাপত্তা নিশ্চিত করে
// Realtime Database Security Rules (প্রজেক্টের database.rules.json দেখুন)।

import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyDIpOzHXjX4fvR8GZogpDnhWXWmJFe3EFU",
  authDomain: "obhijog.firebaseapp.com",
  projectId: "obhijog",
  storageBucket: "obhijog.firebasestorage.app",
  messagingSenderId: "974445007030",
  appId: "1:974445007030:web:160c1e795dde37d54e1617",
  measurementId: "G-2VEV8SDS3P",
};

let app: FirebaseApp | null = null;
let rtdb: Database | null = null;

/** ব্রাউজারে একবারই init — SSR-এ কিছুই করে না (সব স্ক্রিন ক্লায়েন্ট-কম্পোনেন্ট) */
export function initFirebase(): { app: FirebaseApp; db: Database } | null {
  if (typeof window === "undefined") return null;
  if (app && rtdb) return { app, db: rtdb };

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  rtdb = getDatabase(app);

  // Google Analytics (ঐচ্ছিক — ব্যর্থ হলে নীরব)
  void (async () => {
    try {
      const { getAnalytics, isSupported } = await import("firebase/analytics");
      if (await isSupported()) getAnalytics(app as FirebaseApp);
    } catch {
      // ব্লকড/অসমর্থিত — সমস্যা নয়
    }
  })();

  return { app, db: rtdb };
}

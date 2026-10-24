// অভিযোগ — সরকারি ফি স্ক্রিন: নির্ধারিত বনাম প্রকৃত খরচের রেফারেন্স

"use client";

import { AlertTriangle } from "lucide-react";
import { GOV_FEES } from "@/lib/data";

export function FeesScreen() {
  return (
    <div className="flex flex-col gap-3.5 px-4 pb-6 pt-4">
      <p className="text-[13px] leading-relaxed text-muted">
        সরকারি সেবার নির্ধারিত ফি ও বাজারে প্রকৃত যা দিতে হয় — পাশাপাশি রাখা একটি রেফারেন্স
        তালিকা। অতিরিক্ত টাকা চাওয়া হলে এই তালিকা আপনার অভিযোগের ভিত্তি হতে পারে।
      </p>

      {GOV_FEES.map((f) => (
        <div key={f.service} className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[14px] font-bold leading-snug">{f.service}</p>
          <p className="mt-0.5 text-[11px] text-muted">{f.office}</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl bg-surface-secondary p-2.5">
              <p className="text-[10px] text-muted">নির্ধারিত ফি</p>
              <p className="tnum mt-0.5 font-semibold">{f.official}</p>
            </div>
            <div className="rounded-xl bg-danger/8 p-2.5">
              <p className="text-[10px] text-danger/80">প্রকৃত যা দিতে হয়</p>
              <p className="tnum mt-0.5 font-bold text-danger">{f.actual}</p>
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-3.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <p className="text-[11px] leading-relaxed text-muted">
          <strong className="text-foreground">দাবিত্যাগ:</strong> &quot;প্রকৃত যা দিতে হয়&quot; কলামের
          পরিসর নাগরিক অভিযোগ ও প্রচলিত অভিজ্ঞতা থেকে সংকলিত — এটি সরকারি সূচি নয়। নির্ধারিত
          ফি সময়ের সাথে পরিবর্তিত হয়; চূড়ান্ত হিসাবের জন্য সংশ্লিষ্ট দপ্তরের সর্বশেষ বিজ্ঞপ্তি দেখুন।
        </p>
      </div>
    </div>
  );
}

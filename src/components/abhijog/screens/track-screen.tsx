// অভিযোগ — আমার অভিযোগ: নিজের জমা দেওয়া তালিকা + কোড দিয়ে ট্র্যাকিং

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/kit";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { findByCode, useStore } from "@/lib/store";
import { bn, bnTimeAgo } from "@/lib/bn";
import { ComplaintCard } from "../complaint-card";
import { EmptyState } from "../parts";

export function TrackScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const d = useStore();
  const [code, setCode] = useState("");

  const mine = useMemo(() => {
    if (!d) return [];
    return d.mine
      .map((id) => d.complaints.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [d]);

  const track = () => {
    if (!d || !code.trim()) return;
    const found = findByCode(d, code);
    if (found) {
      onOpen(found.id);
      setCode("");
    } else {
      toast.error("এই কোডে কোনো অভিযোগ পাওয়া যায়নি।");
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
      {/* কোড দিয়ে ট্র্যাক */}
      <section className="rounded-2xl border border-border bg-accent/5 p-4" aria-label="কোড দিয়ে ট্র্যাকিং">
        <h2 className="text-sm font-bold">কোড দিয়ে খুঁজুন</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          অভিযোগ জমা দেওয়ার পর পাওয়া কোড (যেমন r/3f9a2c) দিয়ে যেকোনো ডিভাইস থেকে অভিযোগের যাচাই-অবস্থা দেখুন।
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && track()}
            placeholder="r/xxxxxx"
            aria-label="অভিযোগের কোড"
            autoComplete="off"
            className="h-11 flex-1 rounded-xl border border-border bg-background px-3.5 font-mono text-sm outline-none placeholder:text-muted/70 focus:border-accent"
          />
          <Button onPress={track} aria-label="ট্র্যাক করুন">
            <Search className="size-4" aria-hidden />
            খুঁজুন
          </Button>
        </div>
      </section>

      {/* আমার জমা দেওয়া তালিকা */}
      <section aria-label="আমার জমা দেওয়া অভিযোগ">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-bold">আমার জমা দেওয়া</h2>
          {d && (
            <span className="tnum text-xs text-muted">{bn(mine.length)} টি</span>
          )}
        </div>

        {!d ? (
          <div className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
        ) : mine.length > 0 ? (
          <div className="flex flex-col gap-3">
            {mine.map((c) => (
              <ComplaintCard key={c.id} c={c} onPress={() => onOpen(c.id)} showStatus />
            ))}
          </div>
        ) : (
          <EmptyState
            title="এখনো কোনো অভিযোগ জমা দেননি"
            body="নিচের + বোতামে চেপে বেনামে প্রথম অভিযোগটি করুন। কোড সংরক্ষণ করে রাখবেন।"
          />
        )}
      </section>

      {/* নোট */}
      <p className="text-center text-[11px] leading-relaxed text-muted">
        অভিযোগ Firebase রিয়েলটাইম ডাটাবেজে সংরক্ষিত — তাই কোড দিয়ে যেকোনো ডিভাইস থেকে ট্র্যাক করা যায়।
        এই তালিকা শুধু এই ডিভাইসে জমা দেওয়াগুলো মনে রাখে।
      </p>
      {d && mine.length > 0 && (
        <p className="text-center text-[11px] text-muted">
          সর্বশেষ জমা: {bnTimeAgo(new Date(mine[0].createdAt))}
        </p>
      )}
    </div>
  );
}

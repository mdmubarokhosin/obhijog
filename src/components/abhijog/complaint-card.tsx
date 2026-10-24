// অভিযোগ — অভিযোগ কার্ড (অ্যাপ-স্টাইল, প্রেস ফিডব্যাকসহ)

"use client";

import { Banknote, Building2, Clock, ImageIcon, MapPin, MessageSquare, ThumbsUp } from "lucide-react";
import { Chip } from "@/components/ui/kit";
import type { Complaint } from "@/lib/store";
import { locationShort, useTaxoMaps } from "@/lib/store";
import { DISTRICT_BY_ID } from "@/lib/data";
import { bn, bnCompactMoney, bnTimeAgo } from "@/lib/bn";
import { StatusChip } from "./parts";

export function ComplaintCard({
  c,
  onPress,
  showStatus = false,
}: {
  c: Complaint;
  onPress: () => void;
  showStatus?: boolean;
}) {
  const taxo = useTaxoMaps();
  const cat = taxo.CAT.get(c.categoryId);
  const dep = taxo.DEP.get(c.departmentId);
  const locText = c.location
    ? locationShort(c.location)
    : (DISTRICT_BY_ID.get(c.districtId)?.name ?? "");
  const photoCount = c.evidence?.length ?? 0;
  const commentCount = c.commentCount ?? 0;

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full cursor-pointer rounded-2xl border border-border bg-surface p-4 text-start shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 active:scale-[0.985] active:bg-surface-secondary"
      aria-label={`অভিযোগ খুলুন: ${c.title}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {showStatus ? (
          <StatusChip status={c.status} />
        ) : c.status === "verified" ? (
          <Chip color="success" variant="soft" size="sm">যাচাইকৃত</Chip>
        ) : c.status === "resolved" ? (
          <Chip color="accent" variant="soft" size="sm">সমাধান</Chip>
        ) : null}
        <Chip color="accent" variant="soft" size="sm">
          {cat?.name ?? "অজানা"}
        </Chip>
        {c.moneyLost > 0 && (
          <Chip color="danger" variant="soft" size="sm">
            <Banknote className="size-3.5" aria-hidden />
            {bnCompactMoney(c.moneyLost)}
          </Chip>
        )}
      </div>

      <h3 className="mt-2.5 line-clamp-2 text-[15px] font-bold leading-snug text-foreground">
        {c.title}
      </h3>

      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{c.description}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <Building2 className="size-3.5" aria-hidden />
          {dep?.name ?? "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden />
          {locText || "—"}
        </span>
        {photoCount > 0 && (
          <span className="inline-flex items-center gap-1 text-accent">
            <ImageIcon className="size-3.5" aria-hidden />
            {bn(photoCount)} ছবি
          </span>
        )}
        {c.timeWasted > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {bn(c.timeWasted)} দিন
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-3 border-t border-border/70 pt-2.5 text-[12px]">
        <span className="tnum inline-flex items-center gap-1 font-semibold text-accent">
          <ThumbsUp className="size-3.5" aria-hidden />
          {bn(c.supports)} সমর্থন
        </span>
        {commentCount > 0 && (
          <span className="tnum inline-flex items-center gap-1 text-muted">
            <MessageSquare className="size-3.5" aria-hidden />
            {bn(commentCount)}
          </span>
        )}
        <span className="ms-auto font-mono text-[10px] text-muted/80">
          {c.code} · {bnTimeAgo(c.createdAt)}
        </span>
      </div>
    </button>
  );
}

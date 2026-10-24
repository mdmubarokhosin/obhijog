// অভিযোগ — প্রমাণ-ছবি আপলোডার (আবশ্যক)
// ফোনের ক্যামেরা/গ্যালারি থেকে ছবি → ক্লায়েন্ট-সাইড কমপ্রেশন (সর্বোচ্চ ১০২৪px, JPEG)
// স্টোরেজ বাঁচাতে dataURL ছোট রাখা হয়; সর্বোচ্চ ৩টি ছবি, কমপক্ষে ১টি আবশ্যক।

"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { bn } from "@/lib/bn";

export const MAX_PHOTOS = 3;

/** ছবি কমপ্রেস: দীর্ঘ পাশ ≤ 1024px, JPEG q≈0.68; ২০০KB পার হলে ধাপে ধাপে ছোট করা হয় (ছোট আপলোডের জন্য) */
async function compressImage(file: File, maxDim = 1024, quality = 0.68): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("img_load"));
      im.src = url;
    });
    const draw = (dim: number, q: number): string => {
      const scale = Math.min(1, dim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no_ctx");
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", q);
    };
    let out = draw(maxDim, quality);
    // ছোট রাখার নিরাপত্তা: dataURL ≤ ~200KB না হওয়া পর্যন্ত ছোট করি
    const CAP = 200 * 1024;
    const ladder: [number, number][] = [
      [896, 0.6],
      [768, 0.55],
      [640, 0.5],
    ];
    let i = 0;
    while (out.length > CAP && i < ladder.length) {
      out = draw(ladder[i][0], ladder[i][1]);
      i++;
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoPicker({
  photos,
  onChange,
  disabled,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const full = photos.length >= MAX_PHOTOS;

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`সর্বোচ্চ ${bn(MAX_PHOTOS)}টি ছবি যোগ করা যায়।`);
      return;
    }
    if (files.length > room) {
      toast.info(`প্রথম ${bn(room)}টি ছবি নেওয়া হলো (সর্বোচ্চ ${bn(MAX_PHOTOS)})।`);
    }
    setBusy(true);
    const added: string[] = [];
    for (const f of files.slice(0, room)) {
      if (!f.type.startsWith("image/")) {
        toast.error(`"${f.name}" ছবি নয় — শুধু ছবি ফাইল নেওয়া হয়।`);
        continue;
      }
      try {
        added.push(await compressImage(f));
      } catch {
        toast.error(`"${f.name}" প্রসেস করা যায়নি — আবার চেষ্টা করুন।`);
      }
    }
    setBusy(false);
    if (added.length > 0) {
      onChange([...photos, ...added]);
      toast.success(`${bn(added.length)}টি ছবি যোগ হয়েছে।`);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void onFiles(e.target.files)}
        aria-hidden
        tabIndex={-1}
      />

      {/* প্রিভিউ গ্রিড */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-secondary"
            >
              <img src={p} alt={`প্রমাণ-ছবি ${bn(i + 1)}`} className="size-full object-cover" />
              <button
                type="button"
                aria-label={`ছবি ${bn(i + 1)} সরান`}
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <AddTile disabled={disabled || busy} onClick={() => inputRef.current?.click()} />
          )}
        </div>
      )}

      {/* প্রথম ছবি — বড় টাইল */}
      {photos.length === 0 && (
        <AddTile large disabled={disabled || busy} onClick={() => inputRef.current?.click()} />
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        {photos.length > 0
          ? `${bn(photos.length)}/${bn(MAX_PHOTOS)} ছবি যোগ হয়েছে · আরও যোগ করতে ট্যাপ করুন`
          : "ছবি ডিভাইসেই সংকুচিত হয় (১০২৪px) — অভিযোগের সঙ্গেই প্রকাশিত হবে।"}
      </p>
    </div>
  );
}

function AddTile({
  large,
  disabled,
  onClick,
}: {
  large?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-surface-secondary/50 text-muted transition-colors active:bg-surface-secondary disabled:opacity-50 ${
        large ? "aspect-[2.4/1]" : "aspect-square"
      }`}
    >
      <ImagePlus className={large ? "size-6" : "size-5"} aria-hidden />
      <span className="text-[11px] font-semibold">
        {large ? "প্রমাণ-ছবি তুলুন (আবশ্যক)" : "ছবি যোগ"}
      </span>
      {large && (
        <span className="text-[10px] text-muted/80">ক্যামেরা বা গ্যালারি · সর্বোচ্চ {bn(MAX_PHOTOS)}টি</span>
      )}
    </button>
  );
}

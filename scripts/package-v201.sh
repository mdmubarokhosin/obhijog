#!/bin/bash
# অভিযোগ v2.0.1 — পরিষ্কার সোর্স-প্যাকেজ (Termux/GitHub/Cloudflare-প্রস্তুত)
set -e
cd /home/z/my-project
OUT="download/obhijog-v2.0.1-source.zip"
rm -f "$OUT"
# হোয়াইটলিস্ট-ভিত্তিক প্যাক — node_modules/.next/out/স্ক্রিনশট বাদ
zip -r -q "$OUT" \
  src public scripts \
  package.json package-lock.json next.config.ts tailwind.config.js postcss.config.mjs \
  tsconfig.json eslint.config.mjs database.rules.json README.md \
  -x "scripts/*.png" "scripts/*.jpg" "scripts/upload-gofile.sh"
echo "── ফাইল তালিকা ──"
unzip -l "$OUT" | tail -3

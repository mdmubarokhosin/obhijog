// বাংলা সংখ্যা ও তারিখ ফরম্যাটিং হেল্পার

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function bn(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => BN_DIGITS[parseInt(d, 10)]);
}

export function bnMoney(n: number): string {
  return "৳" + bn(n.toLocaleString("en-IN"));
}

export function bnCompactMoney(n: number): string {
  if (n >= 10000000) return "৳" + bn((n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)) + " কোটি";
  if (n >= 100000) return "৳" + bn((n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)) + " লক্ষ";
  if (n >= 1000) return "৳" + bn((n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)) + " হাজার";
  return "৳" + bn(n);
}

const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

export function bnDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${bn(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${bn(d.getFullYear())}`;
}

export function bnTimeAgo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const secs = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return "এইমাত্র";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${bn(mins)} মিনিট আগে`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${bn(hours)} ঘণ্টা আগে`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${bn(days)} দিন আগে`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${bn(months)} মাস আগে`;
  const years = Math.floor(months / 12);
  return `${bn(years)} বছর আগে`;
}

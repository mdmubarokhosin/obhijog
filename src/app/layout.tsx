import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

// ফন্ট প্রজেক্টের ভেতরেই vendor করা (next/font/local) —
// বিল্ড টাইমে নেটওয়ার্ক লাগে না; অফলাইন PWA-তেও কাজ করে।
// Noto Serif Bengali — সাইটের সব জায়গায় (ইউজারের নির্দেশ); দুটি সাবসেট (বাংলা + ল্যাটিন) —
// প্রতি-গ্লিফ ফলব্যাকে একসাথে কভার হয়।
const fontBnBengali = localFont({
  src: "../fonts/noto-serif-bengali-bengali-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-bn-bengali",
  display: "swap",
});

const fontBnLatin = localFont({
  src: "../fonts/noto-serif-bengali-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-bn-latin",
  display: "swap",
});

export const metadata: Metadata = {
  title: "অভিযোগ — নাগরিক জবাবদিহিতা অ্যাপ",
  description:
    "বাংলাদেশের সরকারি দপ্তর ও জনপ্রতিনিধিরা নাগরিকের সঙ্গে আসলে কী করে — তার একটি প্রকাশ্য, যাচাইযোগ্য হিসাব। নাম গোপন রেখে অভিযোগ করুন, অন্যদের অভিযোগ পড়ুন ও সমর্থন দিন।",
  keywords: ["অভিযোগ", "ঘুষ", "জবাবদিহিতা", "সরকারি সেবা", "দুর্নীতি", "Bangladesh", "complaint"],
  manifest: "/manifest.webmanifest",
  applicationName: "অভিযোগ",
  appleWebApp: {
    capable: true,
    title: "অভিযোগ",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "অভিযোগ — নাগরিক জবাবদিহিতা অ্যাপ",
    description: "সরকারি দপ্তর ও জনপ্রতিনিধিদের হিসাব — প্রকাশ্য ও যাচাইযোগ্য।",
    siteName: "অভিযোগ",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f14a0a" },
    { media: "(prefers-color-scheme: dark)", color: "#171310" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      suppressHydrationWarning
      className={`${fontBnBengali.variable} ${fontBnLatin.variable}`}
    >
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

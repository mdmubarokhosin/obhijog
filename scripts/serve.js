// অভিযোগ — ছোট স্ট্যাটিক সার্ভার
// `npm run build` শেষে তৈরি `out/` ফোল্ডার লোকালি (Termux-সহ যেকোনো জায়গায়) চালানোর জন্য:
//   npm run build && npm run preview   →  http://localhost:3000
// কোনো ডিপেন্ডেন্সি লাগে না — শুধু Node.js।

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(process.cwd(), "out");
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  } catch {
    urlPath = "/";
  }
  if (urlPath.includes("..")) {
    res.writeHead(400);
    return res.end("Bad request");
  }

  let filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  // ডিরেক্টরি → index.html (না থাকলে path.html)
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      if (fs.existsSync(path.join(filePath, "index.html"))) {
        filePath = path.join(filePath, "index.html");
      } else if (fs.existsSync(filePath + ".html")) {
        filePath += ".html";
      }
    }
    // এক্সটেনশনহীন রুট → .html
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + ".html")) {
      filePath += ".html";
    }
  } catch {
    // নিচে 404 হ্যান্ডলিং
  }

  if (!fs.existsSync(filePath)) {
    const notFound = path.join(ROOT, "404.html");
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { "Content-Type": MIME[".html"] });
      return fs.createReadStream(notFound).pipe(res);
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("404 — পাওয়া যায়নি");
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n  ✓ অভিযোগ প্রিভিউ চলছে:  http://localhost:${PORT}\n`);
});

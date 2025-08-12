import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const scriptSrc = isProd
  ? ["'self'"]
  : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

// ✅ Allow Google platform/identity scripts you’re using:
scriptSrc.push(
  "https://apis.google.com",     // gapi.js, gapi_iframes
  "https://accounts.google.com" // GIS client (if you use it)
);

// STT hosts unchanged...
const sttHosts = ["google-stt.fly.dev", "deepgram-stt.fly.dev", "localhost:3001", "localhost:3000"];

const connectSrc = [
  "'self'",
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://www.googleapis.com",
  "https://firestore.googleapis.com",
  "https://firebasestorage.googleapis.com",
  // Optional but harmless: allow apis.google.com if gapi makes XHRs
  "https://apis.google.com",
  ...sttHosts.flatMap((h) => [`https://${h}`, `wss://${h}`]),
];
if (!isProd) connectSrc.push("ws:", "wss:");

// ✅ Add your Firebase auth domain(s) to frame-src:
const frameSrc = [
  "'self'",
  "https://accounts.google.com",
  "https://appleid.apple.com",
  "https://moby-928af.firebaseapp.com", // your project
  // optional: if you have multiple envs
  // "https://*.firebaseapp.com",
];

const csp = `
  default-src 'self';
  base-uri 'self';
  frame-ancestors 'none';
  script-src ${scriptSrc.join(" ")};
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https://lh3.googleusercontent.com https://firebasestorage.googleapis.com;
  connect-src ${connectSrc.join(" ")};
  frame-src ${frameSrc.join(" ")};
  font-src 'self' https://fonts.gstatic.com;
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/google-server/**", "**/deepgram-server/**"],
    };
    return config;
  },

  async headers() {
    const reportOnly = process.env.CSP_REPORT_ONLY === "true";
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: reportOnly
              ? "Content-Security-Policy-Report-Only"
              : "Content-Security-Policy",
            value: csp,
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
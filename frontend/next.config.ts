import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development warnings
  reactStrictMode: true,

  // Image optimization — allow Firebase Storage and Google profile images
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },

  // Backend URL available server-side
  env: {
    BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080",
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  // We disable PWA in dev to avoid aggressive caching and SW 404s, but you can set this to false to test it locally.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
};

export default withPWA(nextConfig);

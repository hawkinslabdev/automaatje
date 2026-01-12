import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: 'standalone',
  // Empty turbopack config to acknowledge webpack config from Serwist
  // Serwist doesn't support Turbopack yet, so we'll use webpack in production
  turbopack: {},
  /* config options here */
};

export default withSerwist(nextConfig);

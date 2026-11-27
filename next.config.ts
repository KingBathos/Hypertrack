import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  turbopack: {}, // Silences Next 16 turbopack warning caused by next-pwa injecting webpack config
  allowedDevOrigins: ["192.168.1.82", "localhost"],
};

export default withPWA(nextConfig);

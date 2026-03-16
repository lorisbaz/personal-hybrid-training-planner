import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // opt-out native modules from bundling
  serverExternalPackages: ['@napi-rs/keyring'],
  reactCompiler: true,
};

export default nextConfig;

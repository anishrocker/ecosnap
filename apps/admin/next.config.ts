import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ecosnap/shared", "@ecosnap/rules-engine"],
};

export default nextConfig;

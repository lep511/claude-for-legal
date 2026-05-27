import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.devtunnels.ms"],
  reactCompiler: true,
  logging: {
    browserToTerminal: "error",
  },
};

export default nextConfig;

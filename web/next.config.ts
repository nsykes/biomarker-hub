import type { NextConfig } from "next";

// Validate environment at build time — throws if any required var is missing
// or malformed. See `lib/env.ts` for the schema.
import "./lib/env";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
    ],
  },
};

export default nextConfig;

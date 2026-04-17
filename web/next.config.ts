import type { NextConfig } from "next";

// Validate environment at build time — throws if any required var is missing
// or malformed. See `lib/env.ts` for the schema.
import "./lib/env";

const nextConfig: NextConfig = {
  turbopack: {},
};

export default nextConfig;

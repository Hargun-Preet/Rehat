import path from "path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo has a lockfile above /web on some machines; pin tracing to this app.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;

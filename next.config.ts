import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
   serverExternalPackages: [
    "@supabase/supabase-js",
  ],
};

export default nextConfig;

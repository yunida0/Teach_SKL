import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/php/:path*",
        destination:
          "http://localhost/moodle/public/tech-skl-deploy/:path*",
      },
    ];
  },
};

export default nextConfig;

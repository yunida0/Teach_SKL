import type { NextConfig } from "next";

const staticExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = staticExport ? {
  output: "export",
  images: { unoptimized: true },
} : {
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async redirects() {
    return [
      {
        source: "/flutter",
        destination: "/app",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

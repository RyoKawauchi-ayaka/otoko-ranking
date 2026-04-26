/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public URLs
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      // Supabase new storage hostname (some projects use .supabase.in)
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
    ],
  },
};

export default nextConfig;


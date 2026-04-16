/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp'],        // serve webp where supported
    minimumCacheTTL: 60 * 60 * 24,  // cache images for 24 hours
  },
  compress: true,                    // enable gzip compression (default true, make explicit)
};

export default nextConfig;

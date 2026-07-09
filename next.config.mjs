/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Mengaktifkan forbidden()/unauthorized() + forbidden.tsx (T-024).
    authInterrupts: true,
  },
};

export default nextConfig;

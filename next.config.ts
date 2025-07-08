import type {NextConfig} from 'next';

// Extract the hostname from the Supabase URL
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL 
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname 
  : '';


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
        port: '',
        pathname: '/**',
      },
      // Add the Supabase hostname if it exists
      ...(supabaseHostname ? [{
        protocol: 'https' as 'https',
        hostname: supabaseHostname,
        port: '',
        pathname: '/**',
      }] : []),
    ],
  },
  experimental: {
    // No longer need better-sqlite3
    // serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;

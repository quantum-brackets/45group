
import type {NextConfig} from 'next';
import { ListingTypes } from './src/lib/types';

// Extract the hostname from the Supabase URL
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL 
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname 
  : '';


const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: '/about',
        destination: '/#services',
        permanent: true,
      },
      {
        source: '/cuisine',
        destination: `/search?type=${ListingTypes.RESTAURANT}`,
        permanent: true,
      },
      {
        source: '/events',
        destination: `/search?type=${ListingTypes.EVENTS}`,
        permanent: true,
      },
      {
        source: '/lodges',
        destination: `/search?type=${ListingTypes.HOTEL}`,
        permanent: true,
      },
    ]
  },
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
};

export default nextConfig;

    
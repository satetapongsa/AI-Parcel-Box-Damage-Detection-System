import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  // dashboard/ is its own app inside the monorepo (also the Vercel Root Directory)
  turbopack: { root: here },
  outputFileTracingRoot: here,
};

export default nextConfig;

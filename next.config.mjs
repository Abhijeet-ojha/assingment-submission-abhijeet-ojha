import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

/** @type {import('next').NextConfig} */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  output: 'standalone',
  // Ensure Next's output tracing root is the project directory so Vercel
  // selects the correct workspace root when multiple lockfiles exist.
  outputFileTracingRoot: resolve(__dirname)
};

export default nextConfig;

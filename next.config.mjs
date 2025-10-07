import withPWA from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true }
};

export default withPWA({
  dest: 'public',
  disable: isDev,          // SW só em produção
  register: true,
  skipWaiting: true
})(baseConfig);

import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const withPWAFunc = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: !isProd
});

const nextConfig = {
  // reactCompiler desativado para evitar exigir 'babel-plugin-react-compiler'
  reactStrictMode: true,
  poweredByHeader: false
};

export default withPWAFunc(nextConfig);

module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@muzzle/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' }];
  },
};
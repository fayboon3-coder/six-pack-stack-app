// Web builds can live under a sub-path (e.g. six-pack-stack.vercel.app/app) by setting EXPO_BASE_URL.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...(config.experiments || {}), ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});

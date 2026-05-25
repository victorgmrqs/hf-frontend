export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    timeout: 10000,
  },
  app: {
    name: 'Home Finance',
  }
} as const;

export type Config = typeof config;

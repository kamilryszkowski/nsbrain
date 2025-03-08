const requiredEnvVars = [
  'DISCORD_TOKEN',
  'DEEPSEEK_API_KEY',
] as const;

function validateEnvVars() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnvVars();

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN!,
    prefix: '!',
    allowedChannels: (process.env.ALLOWED_CHANNELS || '').split(',').filter(Boolean),
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY!,
    apiUrl: 'https://api.deepseek.com/v1',
    maxTokens: 1000,
  },
  responseTimeout: 3000, // 3 seconds
} as const;

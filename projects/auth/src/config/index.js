import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

export const config = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: 'HS256',
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },
  },

  // Role Definitions
  roles: {
    admin: {
      priority: 100,
      permissions: ['*'], // All permissions
    },
    manager: {
      priority: 75,
      permissions: [
        'users.read',
        'users.write',
        'content.read',
        'content.write',
        'content.delete',
      ],
    },
    editor: {
      priority: 50,
      permissions: [
        'content.read',
        'content.write',
      ],
    },
    user: {
      priority: 25,
      permissions: [
        'content.read',
        'profile.read',
        'profile.write',
      ],
    },
    guest: {
      priority: 0,
      permissions: [
        'content.read',
      ],
    },
  },
};

export default config;
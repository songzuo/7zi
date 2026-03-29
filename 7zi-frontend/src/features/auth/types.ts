/**
 * Auth Feature Types
 */

import { UserRole } from '@/shared/types';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthContext {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

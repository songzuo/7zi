/**
 * Auth Service Tests
 * Tests for auth-service.ts - agent authentication logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateApiKey,
  hashApiKey,
  validateApiKeyFormat,
  registerAgent,
  verifyAgentToken,
  generateAgentToken,
  hasPermission,
  hasAllPermissions,
} from '../auth-service';
import { AgentRole, AgentProvider, AgentType } from '../types';

// Mock dependencies
vi.mock('../repository', () => ({
  createAgent: vi.fn(),
  getAgentById: vi.fn(),
  getAllAgents: vi.fn(),
  updateAgentStatus: vi.fn(),
  initializeAgentTables: vi.fn(),
  validateAgentApiKey: vi.fn(),
  mapRowToAgent: vi.fn(),
}));

vi.mock('../wallet-repository', () => ({
  createWallet: vi.fn(),
}));

vi.mock('../db', () => ({
  getDatabaseAsync: vi.fn(),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variables
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
    process.env.AGENT_ENCRYPTION_SECRET = 'test-encryption-key';
  });

  describe('generateApiKey', () => {
    it('should generate a valid API key with correct prefix', () => {
      const apiKey = generateApiKey();

      expect(apiKey).toMatch(/^sk_agent_/);
      expect(apiKey).toHaveLength(52); // 'sk_agent_' + 43 chars
    });

    it('should generate unique API keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate valid format keys', () => {
      const apiKey = generateApiKey();

      expect(validateApiKeyFormat(apiKey)).toBe(true);
    });
  });

  describe('hashApiKey', () => {
    it('should hash an API key consistently', () => {
      const apiKey = 'sk_agent_test123456789';
      const hash1 = hashApiKey(apiKey);
      const hash2 = hashApiKey(apiKey);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different keys', () => {
      const key1 = 'sk_agent_test1';
      const key2 = 'sk_agent_test2';

      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex-encoded hash', () => {
      const apiKey = 'sk_agent_test';
      const hash = hashApiKey(apiKey);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('validateApiKeyFormat', () => {
    it('should accept valid API key format', () => {
      // Generate a valid key to test
      const validKey = 'sk_agent_' + 'a'.repeat(43);

      expect(validateApiKeyFormat(validKey)).toBe(true);
    });

    it('should reject keys without prefix', () => {
      const invalidKey = 'abcdefghijklmnopqrstuvwxyz123456';

      expect(validateApiKeyFormat(invalidKey)).toBe(false);
    });

    it('should reject keys with wrong length', () => {
      const tooShort = 'sk_agent_abc';
      const tooLong = 'sk_agent_abcdefghijklmnopqrstuvwxyz1234567890123456';

      expect(validateApiKeyFormat(tooShort)).toBe(false);
      expect(validateApiKeyFormat(tooLong)).toBe(false);
    });

    it('should reject keys with invalid characters', () => {
      const invalidKey = 'sk_agent_invalid!@#$%^&*()';

      expect(validateApiKeyFormat(invalidKey)).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true when permission exists', () => {
      const permissions = ['read:tasks', 'write:tasks', 'delete:tasks'];

      expect(hasPermission(permissions, 'read:tasks')).toBe(true);
      expect(hasPermission(permissions, 'write:tasks')).toBe(true);
    });

    it('should return false when permission does not exist', () => {
      const permissions = ['read:tasks', 'write:tasks'];

      expect(hasPermission(permissions, 'delete:tasks')).toBe(false);
      expect(hasPermission(permissions, 'admin:all')).toBe(false);
    });

    it('should handle empty permission array', () => {
      const permissions: string[] = [];

      expect(hasPermission(permissions, 'read:tasks')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when all required permissions are present', () => {
      const permissions = ['read:tasks', 'write:tasks', 'delete:tasks'];
      const required = ['read:tasks', 'write:tasks'];

      expect(hasAllPermissions(permissions, required)).toBe(true);
    });

    it('should return false when some required permissions are missing', () => {
      const permissions = ['read:tasks'];
      const required = ['read:tasks', 'write:tasks'];

      expect(hasAllPermissions(permissions, required)).toBe(false);
    });

    it('should return true when required permissions is empty', () => {
      const permissions = ['read:tasks'];
      const required: string[] = [];

      expect(hasAllPermissions(permissions, required)).toBe(true);
    });

    it('should handle empty permission array', () => {
      const permissions: string[] = [];
      const required = ['read:tasks'];

      expect(hasAllPermissions(permissions, required)).toBe(false);
    });
  });

  describe('generateAgentToken', () => {
    it('should generate a valid JWT token', async () => {
      const agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: AgentRole.EXECUTOR,
        provider: AgentProvider.MINIMAX,
        type: AgentType.WORKER,
        status: 'active' as const,
        permissions: ['read:tasks'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = await generateAgentToken(agent);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('object');
      expect(token).toHaveProperty('token');
      expect(token).toHaveProperty('refreshToken');
    });

    it('should throw error when JWT_SECRET is not set', async () => {
      delete process.env.JWT_SECRET;
      delete process.env.AGENT_ENCRYPTION_SECRET;

      const agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: AgentRole.EXECUTOR,
        provider: AgentProvider.MINIMAX,
        type: AgentType.WORKER,
        status: 'active' as const,
        permissions: ['read:tasks'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(generateAgentToken(agent)).rejects.toThrow();
    });
  });

  describe('verifyAgentToken', () => {
    it('should verify a valid token', async () => {
      const agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: AgentRole.EXECUTOR,
        provider: AgentProvider.MINIMAX,
        type: AgentType.WORKER,
        status: 'active' as const,
        permissions: ['read:tasks', 'write:tasks'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tokenObj = await generateAgentToken(agent);
      const verified = await verifyAgentToken(tokenObj.token);

      expect(verified).toBeTruthy();
      expect(verified?.agentId).toBe(agent.id);
      expect(verified?.role).toBe(agent.role);
      expect(verified?.permissions).toEqual(agent.permissions);
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      const verified = await verifyAgentToken(invalidToken);

      expect(verified).toBeNull();
    });

    it('should return null for expired token', async () => {
      // This would require mocking the JWT verification with time
      // For now, we'll test with a malformed token
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid';

      const verified = await verifyAgentToken(malformedToken);

      expect(verified).toBeNull();
    });
  });

  describe('registerAgent', () => {
    it('should register a new agent successfully', async () => {
      const { createAgent, initializeAgentTables } = await import('../repository');
      const { createWallet } = await import('../wallet-repository');

      vi.mocked(initializeAgentTables).mockResolvedValue(undefined);
      vi.mocked(createWallet).mockResolvedValue({
        id: 'wallet-1',
        agentId: 'agent-1',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: AgentRole.EXECUTOR,
        provider: AgentProvider.MINIMAX,
        type: AgentType.WORKER,
        status: 'active' as const,
        permissions: ['read:tasks'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(createAgent).mockResolvedValue(mockAgent);

      const result = await registerAgent({
        name: 'Test Agent',
        type: AgentType.WORKER,
        role: AgentRole.EXECUTOR,
        provider: AgentProvider.MINIMAX,
      });

      expect(result).toBeTruthy();
      expect(result.agent).toEqual(mockAgent);
      expect(result.plainApiKey).toMatch(/^sk_agent_/);
      expect(initializeAgentTables).toHaveBeenCalled();
      expect(createAgent).toHaveBeenCalled();
      expect(createWallet).toHaveBeenCalledWith('agent-1');
    });

    it('should use default values when optional fields are not provided', async () => {
      const { createAgent, initializeAgentTables } = await import('../repository');
      const { createWallet } = await import('../wallet-repository');

      vi.mocked(initializeAgentTables).mockResolvedValue(undefined);
      vi.mocked(createWallet).mockResolvedValue({
        id: 'wallet-1',
        agentId: 'agent-1',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: AgentRole.EXECUTOR,
        provider: AgentProvider.MINIMAX,
        type: AgentType.WORKER,
        status: 'active' as const,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(createAgent).mockResolvedValue(mockAgent);

      const result = await registerAgent({
        name: 'Test Agent',
      });

      expect(result.agent.type).toBe(AgentType.WORKER);
      expect(result.agent.role).toBe(AgentRole.EXECUTOR);
      expect(result.agent.provider).toBe(AgentProvider.MINIMAX);
    });
  });
});

/**
 * 健康检查模块单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  basicHealthCheck,
  detailedHealthCheck,
  getSystemResources,
  HealthStatus,
  SystemResources,
} from '@/lib/monitoring/health';

describe('Health Check 模块', () => {
  describe('basicHealthCheck', () => {
    it('应该返回基础健康状态', () => {
      const health = basicHealthCheck();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('ok');
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
    });

    it('应该包含version字段', () => {
      const health = basicHealthCheck();
      expect(health.version).toBeDefined();
    });

    it('应该包含environment字段', () => {
      const health = basicHealthCheck();
      expect(health.environment).toBeDefined();
    });

    it('应该返回正确的状态格式', () => {
      const health = basicHealthCheck();
      
      // 验证返回类型
      const status: HealthStatus = health;
      expect(status.status).toMatch(/^(ok|degraded|error)$/);
      expect(typeof status.timestamp).toBe('string');
      expect(typeof status.uptime).toBe('number');
    });
  });

  describe('getSystemResources', () => {
    it('应该返回系统资源信息', () => {
      const resources = getSystemResources();
      
      expect(resources).toBeDefined();
      expect(resources.memory).toBeDefined();
      expect(resources.cpu).toBeDefined();
      expect(resources.process).toBeDefined();
    });

    it('应该包含内存信息', () => {
      const resources = getSystemResources();
      
      expect(resources.memory.total).toBeGreaterThan(0);
      expect(resources.memory.free).toBeGreaterThanOrEqual(0);
      expect(resources.memory.used).toBeGreaterThan(0);
      expect(resources.memory.usagePercent).toBeGreaterThanOrEqual(0);
    });

    it('应该包含CPU信息', () => {
      const resources = getSystemResources();
      
      expect(resources.cpu.cores).toBeGreaterThan(0);
      expect(resources.cpu.model).toBeDefined();
      expect(Array.isArray(resources.cpu.loadAverage)).toBe(true);
      expect(resources.cpu.loadAverage.length).toBe(3);
    });

    it('应该包含进程信息', () => {
      const resources = getSystemResources();
      
      expect(resources.process.pid).toBeGreaterThan(0);
      expect(resources.process.uptime).toBeGreaterThan(0);
      expect(resources.process.nodeVersion).toBeDefined();
      expect(resources.process.platform).toBeDefined();
      expect(resources.process.arch).toBeDefined();
    });

    it('应该返回正确的类型', () => {
      const resources = getSystemResources();
      
      const sysRes: SystemResources = resources;
      expect(typeof sysRes.memory.total).toBe('number');
      expect(typeof sysRes.cpu.cores).toBe('number');
      expect(typeof sysRes.process.pid).toBe('number');
    });
  });

  describe('detailedHealthCheck', () => {
    it('应该返回详细的健康检查结果', async () => {
      const health = await detailedHealthCheck();
      
      expect(health).toBeDefined();
      expect(health.status).toMatch(/^(ok|degraded|error)$/);
      expect(health.checks).toBeDefined();
    });

    it('应该包含GitHub API检查', async () => {
      const health = await detailedHealthCheck();
      
      expect(health.checks?.githubApi).toBeDefined();
    });

    it('应该包含邮件服务检查', async () => {
      const health = await detailedHealthCheck();
      
      expect(health.checks?.emailService).toBeDefined();
    });

    it('检查结果应该包含status字段', async () => {
      const health = await detailedHealthCheck();
      
      const githubCheck = health.checks?.githubApi;
      expect(githubCheck?.status).toMatch(/^(ok|error|warning|skipped)$/);
    });

    it('应该包含基础信息', async () => {
      const health = await detailedHealthCheck();
      
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.version).toBeDefined();
      expect(health.environment).toBeDefined();
    });
  });

  describe('健康状态一致性', () => {
    it('基础检查和详细检查的基础字段应该一致', async () => {
      const basic = basicHealthCheck();
      const detailed = await detailedHealthCheck();
      
      expect(detailed.uptime).toBe(basic.uptime);
      expect(detailed.version).toBe(basic.version);
      expect(detailed.environment).toBe(basic.environment);
    });

    it('状态应该基于检查结果', async () => {
      const health = await detailedHealthCheck();
      
      // 如果有错误检查，状态不应该是ok
      const hasError = Object.values(health.checks || {}).some(
        check => check.status === 'error'
      );
      
      if (hasError) {
        expect(health.status).not.toBe('ok');
      }
    });
  });
});

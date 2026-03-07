/**
 * Swagger 配置测试
 */

import { describe, it, expect, vi } from 'vitest';
import { swaggerOptions, getApiDocs } from './swagger';

// Mock next-swagger-doc
vi.mock('next-swagger-doc', () => ({
  createSwaggerSpec: vi.fn((options) => options.definition),
}));

describe('Swagger Configuration', () => {
  it('should have correct OpenAPI version', () => {
    expect(swaggerOptions.definition.openapi).toBe('3.0.0');
  });

  it('should have API info', () => {
    const { info } = swaggerOptions.definition;
    expect(info.title).toBe('AI Team Dashboard API');
    expect(info.version).toBe('1.0.0');
    expect(info.description).toBeDefined();
  });

  it('should have contact information', () => {
    const { info } = swaggerOptions.definition;
    expect(info.contact).toBeDefined();
    expect(info.contact.name).toBe('API Support');
    expect(info.contact.email).toBeDefined();
  });

  it('should have license information', () => {
    const { info } = swaggerOptions.definition;
    expect(info.license).toBeDefined();
    expect(info.license.name).toBe('MIT');
  });

  it('should have servers defined', () => {
    const { servers } = swaggerOptions.definition;
    expect(servers).toBeDefined();
    expect(servers).toBeInstanceOf(Array);
    expect(servers.length).toBeGreaterThan(0);
  });

  it('should have security schemes', () => {
    const { components } = swaggerOptions.definition;
    expect(components?.securitySchemes).toBeDefined();
    expect(components?.securitySchemes?.bearerAuth).toBeDefined();
  });

  it('should have User schema defined', () => {
    const { components } = swaggerOptions.definition;
    expect(components?.schemas?.User).toBeDefined();
    expect(components?.schemas?.User.type).toBe('object');
  });

  it('should have Task schema defined', () => {
    const { components } = swaggerOptions.definition;
    expect(components?.schemas?.Task).toBeDefined();
    expect(components?.schemas?.Task.type).toBe('object');
  });

  it('should have Tag schema defined', () => {
    const { components } = swaggerOptions.definition;
    expect(components?.schemas?.Tag).toBeDefined();
    expect(components?.schemas?.Tag.type).toBe('object');
  });

  it('should have Error schema defined', () => {
    const { components } = swaggerOptions.definition;
    expect(components?.schemas?.Error).toBeDefined();
    expect(components?.schemas?.Error.type).toBe('object');
  });

  it('should have HealthStatus schema defined', () => {
    const { components } = swaggerOptions.definition;
    expect(components?.schemas?.HealthStatus).toBeDefined();
  });

  it('should have TaskStats schema defined', () => {
    const { components } = swaggerOptions.definition;
    expect(components?.schemas?.TaskStats).toBeDefined();
  });

  it('should have tags defined', () => {
    const { tags } = swaggerOptions.definition;
    expect(tags).toBeDefined();
    expect(tags).toBeInstanceOf(Array);
    expect(tags.length).toBeGreaterThan(0);
  });

  it('should have required tags', () => {
    const { tags } = swaggerOptions.definition;
    const tagNames = tags.map((t) => t.name);
    expect(tagNames).toContain('Users');
    expect(tagNames).toContain('Tasks');
    expect(tagNames).toContain('Tags');
    expect(tagNames).toContain('Dashboard');
  });

  it('should get API docs', async () => {
    const docs = await getApiDocs();
    expect(docs).toBeDefined();
    expect(docs.openapi).toBe('3.0.0');
  });

  it('should have apiFolder configured', () => {
    expect(swaggerOptions.apiFolder).toBe('app/api');
  });
});
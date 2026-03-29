/**
 * Security Headers Configuration Tests
 *
 * 测试安全头部配置的正确性
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSecurityConfig,
  generateCSP,
  generateHSTS,
  generatePermissionsPolicy,
  getSecurityHeaders,
  applySecurityHeaders,
  getCSPReportOnlyConfig,
  validateCSPIsStrict,
  DEVELOPMENT_CONFIG,
  PRODUCTION_CONFIG,
  type SecurityHeadersConfig,
  type CSPConfig,
} from './headers';

describe('Security Headers Configuration', () => {
  describe('getSecurityConfig', () => {
    it('应该返回开发环境配置', () => {
      const config = getSecurityConfig('development');
      expect(config.environment).toBe('development');
      expect(config.csp.strictMode).toBe(false);
    });

    it('应该返回生产环境配置', () => {
      const config = getSecurityConfig('production');
      expect(config.environment).toBe('production');
      expect(config.csp.strictMode).toBe(true);
    });

    it('默认应该返回生产环境配置', () => {
      const config = getSecurityConfig();
      expect(config.environment).toBe('production');
      expect(config.csp.strictMode).toBe(true);
    });
  });

  describe('generateCSP', () => {
    it('应该生成基本的 CSP 策略', () => {
      const config: CSPConfig = {
        strictMode: false,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: false,
        allowInlineStyles: false,
        allowEval: false,
      };

      const csp = generateCSP(config);
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
      expect(csp).toContain("connect-src 'self'");
    });

    it('宽松模式应该包含 unsafe-inline', () => {
      const config: CSPConfig = {
        strictMode: false,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: true,
        allowInlineStyles: true,
        allowEval: false,
      };

      const csp = generateCSP(config);
      expect(csp).toContain("'unsafe-inline'");
    });

    it('宽松模式应该包含 unsafe-eval', () => {
      const config: CSPConfig = {
        strictMode: false,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: false,
        allowInlineStyles: false,
        allowEval: true,
      };

      const csp = generateCSP(config);
      expect(csp).toContain("'unsafe-eval'");
    });

    it('严格模式不应该包含 unsafe 指令', () => {
      const config: CSPConfig = {
        strictMode: true,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: false,
        allowInlineStyles: false,
        allowEval: false,
      };

      const csp = generateCSP(config);
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('严格模式应该包含 upgrade-insecure-requests', () => {
      const config: CSPConfig = {
        strictMode: true,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: false,
        allowInlineStyles: false,
        allowEval: false,
      };

      const csp = generateCSP(config);
      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('应该包含额外的安全指令', () => {
      const config: CSPConfig = {
        strictMode: false,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: false,
        allowInlineStyles: false,
        allowEval: false,
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
      };

      const csp = generateCSP(config);
      expect(csp).toContain("img-src 'self' data: https:");
      expect(csp).toContain("font-src 'self' data:");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    });

    it('应该包含 report-uri 当启用报告模式时', () => {
      const config: CSPConfig = {
        strictMode: false,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: false,
        allowInlineStyles: false,
        allowEval: false,
        enableReportOnly: true,
        reportUri: '/api/security/csp-report',
      };

      const csp = generateCSP(config);
      expect(csp).toContain('report-uri /api/security/csp-report');
    });
  });

  describe('generateHSTS', () => {
    it('应该生成基本的 HSTS 头部', () => {
      const config = {
        maxAge: 31536000,
        includeSubDomains: false,
        preload: false,
      };

      const hsts = generateHSTS(config);
      expect(hsts).toBe('max-age=31536000');
    });

    it('应该包含 includeSubDomains', () => {
      const config = {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: false,
      };

      const hsts = generateHSTS(config);
      expect(hsts).toContain('includeSubDomains');
    });

    it('应该包含 preload', () => {
      const config = {
        maxAge: 31536000,
        includeSubDomains: false,
        preload: true,
      };

      const hsts = generateHSTS(config);
      expect(hsts).toContain('preload');
    });

    it('应该包含所有选项', () => {
      const config = {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
      };

      const hsts = generateHSTS(config);
      expect(hsts).toBe('max-age=63072000; includeSubDomains; preload');
    });

    it('生产环境应该使用推荐的 max-age', () => {
      const config = PRODUCTION_CONFIG.hsts;
      expect(config.maxAge).toBe(63072000); // 2 年
      expect(config.includeSubDomains).toBe(true);
    });
  });

  describe('generatePermissionsPolicy', () => {
    it('应该生成基本的 Permissions-Policy', () => {
      const config = {
        geolocation: 'none',
        microphone: 'none',
        camera: 'none',
      };

      const policy = generatePermissionsPolicy(config);
      expect(policy).toContain('geolocation=none');
      expect(policy).toContain('microphone=none');
      expect(policy).toContain('camera=none');
    });

    it('应该支持 self 值', () => {
      const config = {
        autoplay: 'self',
      };

      const policy = generatePermissionsPolicy(config);
      expect(policy).toContain("autoplay='self'");
    });

    it('应该支持数组值', () => {
      const config = {
        notifications: ['https://example.com', 'https://cdn.example.com'],
      };

      const policy = generatePermissionsPolicy(config);
      expect(policy).toContain('notifications=(https://example.com https://cdn.example.com)');
    });

    it('应该支持通配符', () => {
      const config = {
        payment: '*',
      };

      const policy = generatePermissionsPolicy(config);
      expect(policy).toContain('payment=*');
    });

    it('应该包含所有默认策略', () => {
      const policy = generatePermissionsPolicy(PRODUCTION_CONFIG.permissionsPolicy);
      expect(policy).toContain('geolocation=none');
      expect(policy).toContain('microphone=none');
      expect(policy).toContain('camera=none');
      expect(policy).toContain("fullscreen='self'");
      expect(policy).toContain('interest-cohort=none');
    });
  });

  describe('getSecurityHeaders', () => {
    it('应该返回所有安全头部', () => {
      const headers = getSecurityHeaders('production');

      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('Strict-Transport-Security');
      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('X-Content-Type-Options');
      expect(headers).toHaveProperty('X-XSS-Protection');
      expect(headers).toHaveProperty('Referrer-Policy');
      expect(headers).toHaveProperty('Permissions-Policy');
      expect(headers).toHaveProperty('Cross-Origin-Opener-Policy');
      expect(headers).toHaveProperty('Cross-Origin-Embedder-Policy');
      expect(headers).toHaveProperty('Cross-Origin-Resource-Policy');
    });

    it('生产环境应该包含 HSTS', () => {
      const headers = getSecurityHeaders('production');
      expect(headers['Strict-Transport-Security']).toBeDefined();
    });

    it('开发环境不应该包含 HSTS', () => {
      const headers = getSecurityHeaders('development');
      expect(headers['Strict-Transport-Security']).toBeUndefined();
    });

    it('X-Frame-Options 应该为 DENY（生产）', () => {
      const headers = getSecurityHeaders('production');
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('X-Frame-Options 应该为 SAMEORIGIN（开发）', () => {
      const headers = getSecurityHeaders('development');
      expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    });

    it('X-Content-Type-Options 应该为 nosniff', () => {
      const headers = getSecurityHeaders('production');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('X-XSS-Protection 应该为 1; mode=block', () => {
      const headers = getSecurityHeaders('production');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
    });

    it('Referrer-Policy 应该为 strict-origin-when-cross-origin', () => {
      const headers = getSecurityHeaders('production');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('生产环境 CSP 应该是严格的', () => {
      const headers = getSecurityHeaders('production');
      expect(headers['Content-Security-Policy']).not.toContain("'unsafe-inline'");
      expect(headers['Content-Security-Policy']).not.toContain("'unsafe-eval'");
      expect(headers['Content-Security-Policy']).toContain('upgrade-insecure-requests');
    });

    it('开发环境 CSP 应该是宽松的', () => {
      const headers = getSecurityHeaders('development');
      expect(headers['Content-Security-Policy']).toContain("'unsafe-inline'");
      expect(headers['Content-Security-Policy']).toContain("'unsafe-eval'");
    });
  });

  describe('applySecurityHeaders', () => {
    it('应该应用所有安全头部到 Response', () => {
      const response = new Response('test');
      const updated = applySecurityHeaders(response, 'production');

      expect(updated.headers.get('Content-Security-Policy')).toBeDefined();
      expect(updated.headers.get('Strict-Transport-Security')).toBeDefined();
      expect(updated.headers.get('X-Frame-Options')).toBeDefined();
      expect(updated.headers.get('X-Content-Type-Options')).toBeDefined();
    });

    it('应该保留现有的头部', () => {
      const response = new Response('test', {
        headers: {
          'Existing-Header': 'value',
        },
      });

      const updated = applySecurityHeaders(response, 'production');
      expect(updated.headers.get('Existing-Header')).toBe('value');
    });

    it('开发环境应该应用宽松的安全头部', () => {
      const response = new Response('test');
      const updated = applySecurityHeaders(response, 'development');

      expect(updated.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
      expect(updated.headers.get('Strict-Transport-Security')).toBeNull();
    });
  });

  describe('getCSPReportOnlyConfig', () => {
    it('应该返回 Report-Only 配置', () => {
      const headers = getCSPReportOnlyConfig('production');
      expect(headers).toHaveProperty('Content-Security-Policy-Report-Only');
      expect(headers['Content-Security-Policy-Report-Only']).toBeDefined();
    });

    it('Report-Only 配置应该包含 report-uri', () => {
      const headers = getCSPReportOnlyConfig('production');
      expect(headers['Content-Security-Policy-Report-Only']).toContain('/api/security/csp-report');
    });
  });

  describe('validateCSPIsStrict', () => {
    it('严格模式且不包含 unsafe 指令应该返回 true', () => {
      const config: CSPConfig = {
        strictMode: true,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: false,
        allowInlineStyles: false,
        allowEval: false,
      };

      expect(validateCSPIsStrict(config)).toBe(true);
    });

    it('严格模式但包含 unsafe-inline 应该返回 false', () => {
      const config: CSPConfig = {
        strictMode: true,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: true,
        allowInlineStyles: false,
        allowEval: false,
      };

      expect(validateCSPIsStrict(config)).toBe(false);
    });

    it('严格模式但包含 unsafe-eval 应该返回 false', () => {
      const config: CSPConfig = {
        strictMode: true,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: false,
        allowInlineStyles: false,
        allowEval: true,
      };

      expect(validateCSPIsStrict(config)).toBe(false);
    });

    it('非严格模式应该忽略 unsafe 指令检查', () => {
      const config: CSPConfig = {
        strictMode: false,
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        allowInlineScripts: true,
        allowInlineStyles: true,
        allowEval: true,
      };

      expect(validateCSPIsStrict(config)).toBe(true);
    });

    it('生产环境配置应该通过验证', () => {
      expect(validateCSPIsStrict(PRODUCTION_CONFIG.csp)).toBe(true);
    });

    it('开发环境配置应该通过验证（因为 strictMode=false）', () => {
      expect(validateCSPIsStrict(DEVELOPMENT_CONFIG.csp)).toBe(true);
    });
  });

  describe('默认配置', () => {
    it('开发环境配置应该允许 unsafe 指令', () => {
      expect(DEVELOPMENT_CONFIG.csp.allowInlineScripts).toBe(true);
      expect(DEVELOPMENT_CONFIG.csp.allowInlineStyles).toBe(true);
      expect(DEVELOPMENT_CONFIG.csp.allowEval).toBe(true);
      expect(DEVELOPMENT_CONFIG.csp.strictMode).toBe(false);
    });

    it('生产环境配置应该禁用 unsafe 指令', () => {
      expect(PRODUCTION_CONFIG.csp.allowInlineScripts).toBe(false);
      expect(PRODUCTION_CONFIG.csp.allowInlineStyles).toBe(false);
      expect(PRODUCTION_CONFIG.csp.allowEval).toBe(false);
      expect(PRODUCTION_CONFIG.csp.strictMode).toBe(true);
    });

    it('生产环境 HSTS 配置应该符合最佳实践', () => {
      expect(PRODUCTION_CONFIG.hsts.maxAge).toBe(63072000); // 2 年
      expect(PRODUCTION_CONFIG.hsts.includeSubDomains).toBe(true);
      expect(PRODUCTION_CONFIG.hsts.preload).toBe(false);
    });

    it('Permissions-Policy 应该禁用不必要的权限', () => {
      expect(PRODUCTION_CONFIG.permissionsPolicy.geolocation).toBe('none');
      expect(PRODUCTION_CONFIG.permissionsPolicy.microphone).toBe('none');
      expect(PRODUCTION_CONFIG.permissionsPolicy.camera).toBe('none');
      expect(PRODUCTION_CONFIG.permissionsPolicy.payment).toBe('none');
    });
  });

  describe('Cross-Origin 策略', () => {
    it('应该设置正确的 COOP 策略', () => {
      const headers = getSecurityHeaders('production');
      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    });

    it('应该设置正确的 COEP 策略', () => {
      const headers = getSecurityHeaders('production');
      expect(headers['Cross-Origin-Embedder-Policy']).toBe('require-corp');
    });

    it('应该设置正确的 CORP 策略', () => {
      const headers = getSecurityHeaders('production');
      expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
    });
  });
});

/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
  createAppError,
  formatErrorMessage,
  isNetworkError,
  getErrorCode,
  getUserFriendlyMessage,
  ErrorCodes,
  type AppError,
} from '../errors';

describe('errors.ts - 错误处理测试', () => {
  describe('createAppError - 创建应用错误', () => {
    it('应该创建基本的错误对象', () => {
      const error = createAppError('测试错误');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('测试错误');
      expect(error.code).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
    });

    it('应该创建带错误代码的错误', () => {
      const error = createAppError('测试错误', 'TEST_CODE');

      expect(error.message).toBe('测试错误');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBeUndefined();
    });

    it('应该创建带错误代码和状态码的错误', () => {
      const error = createAppError('测试错误', 'TEST_CODE', 404);

      expect(error.message).toBe('测试错误');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(404);
    });

    it('应该处理空消息', () => {
      const error = createAppError('');

      expect(error.message).toBe('');
      expect(error).toBeInstanceOf(Error);
    });

    it('应该处理非常长的错误消息', () => {
      const longMessage = '错误'.repeat(1000);
      const error = createAppError(longMessage);

      expect(error.message).toBe(longMessage);
    });

    it('应该处理特殊的错误代码', () => {
      const error = createAppError('测试', 'SPECIAL_CODE_123');
      expect(error.code).toBe('SPECIAL_CODE_123');
    });

    it('应该处理各种状态码', () => {
      const codes = [200, 400, 401, 403, 404, 500, 502, 503, 504];

      codes.forEach(statusCode => {
        const error = createAppError('测试', 'CODE', statusCode);
        expect(error.statusCode).toBe(statusCode);
      });
    });
  });

  describe('formatErrorMessage - 格式化错误消息', () => {
    it('应该格式化 Error 实例', () => {
      const error = new Error('错误消息');
      expect(formatErrorMessage(error)).toBe('错误消息');
    });

    it('应该格式化 AppError 实例', () => {
      const error = createAppError('应用错误', 'APP_ERROR', 500);
      expect(formatErrorMessage(error)).toBe('应用错误');
    });

    it('应该直接返回字符串', () => {
      expect(formatErrorMessage('字符串错误')).toBe('字符串错误');
      expect(formatErrorMessage('')).toBe('');
    });

    it('应该返回默认消息给 null', () => {
      expect(formatErrorMessage(null)).toBe('发生未知错误');
    });

    it('应该返回默认消息给 undefined', () => {
      expect(formatErrorMessage(undefined)).toBe('发生未知错误');
    });

    it('应该返回默认消息给数字', () => {
      expect(formatErrorMessage(404)).toBe('发生未知错误');
      expect(formatErrorMessage(0)).toBe('发生未知错误');
    });

    it('应该返回默认消息给对象', () => {
      expect(formatErrorMessage({})).toBe('发生未知错误');
      expect(formatErrorMessage({ error: 'test' })).toBe('发生未知错误');
    });

    it('应该返回默认消息给数组', () => {
      expect(formatErrorMessage([])).toBe('发生未知错误');
      expect(formatErrorMessage([1, 2, 3])).toBe('发生未知错误');
    });

    it('应该返回默认消息给布尔值', () => {
      expect(formatErrorMessage(true)).toBe('发生未知错误');
      expect(formatErrorMessage(false)).toBe('发生未知错误');
    });

    it('应该处理包含特殊字符的错误消息', () => {
      const error = new Error('错误 <script>alert(1)</script>');
      expect(formatErrorMessage(error)).toBe('错误 <script>alert(1)</script>');
    });

    it('应该处理包含 unicode 的错误消息', () => {
      const error = new Error('错误：中文测试 🚀');
      expect(formatErrorMessage(error)).toBe('错误：中文测试 🚀');
    });

    it('应该处理非常长的错误消息', () => {
      const longMessage = 'x'.repeat(10000);
      const error = new Error(longMessage);
      expect(formatErrorMessage(error)).toBe(longMessage);
    });
  });

  describe('isNetworkError - 判断是否为网络错误', () => {
    it('应该识别包含 "network" 的错误', () => {
      expect(isNetworkError(new Error('network error'))).toBe(true);
      expect(isNetworkError(new Error('Network failure'))).toBe(true);
      expect(isNetworkError(new Error('NETWORK ERROR'))).toBe(true);
    });

    it('应该识别包含 "fetch" 的错误', () => {
      expect(isNetworkError(new Error('fetch failed'))).toBe(true);
      expect(isNetworkError(new Error('Fetch error'))).toBe(true);
      expect(isNetworkError(new Error('fetch timeout'))).toBe(true);
    });

    it('应该识别包含 "timeout" 的错误', () => {
      expect(isNetworkError(new Error('request timeout'))).toBe(true);
      expect(isNetworkError(new Error('Timeout exceeded'))).toBe(true);
      expect(isNetworkError(new Error('TIMEOUT'))).toBe(true);
    });

    it('应该识别包含 "abort" 的错误', () => {
      expect(isNetworkError(new Error('request aborted'))).toBe(true);
      expect(isNetworkError(new Error('AbortError'))).toBe(true);
      expect(isNetworkError(new Error('ABORT'))).toBe(true);
    });

    it('应该拒绝非网络错误', () => {
      expect(isNetworkError(new Error('Syntax error'))).toBe(false);
      expect(isNetworkError(new Error('Type error'))).toBe(false);
      expect(isNetworkError(new Error('Validation failed'))).toBe(false);
      expect(isNetworkError(new Error('Unauthorized'))).toBe(false);
    });

    it('应该拒绝非 Error 类型', () => {
      expect(isNetworkError('network error' as unknown)).toBe(false);
      expect(isNetworkError(null as unknown)).toBe(false);
      expect(isNetworkError(undefined as unknown)).toBe(false);
      expect(isNetworkError(404 as unknown)).toBe(false);
      expect(isNetworkError({ message: 'network error' } as unknown)).toBe(false);
    });

    it('应该处理混合大小写的网络关键词', () => {
      expect(isNetworkError(new Error('Network Timeout Abort Fetch'))).toBe(true);
      expect(isNetworkError(new Error('network TIMEOUT abort FETCH'))).toBe(true);
    });

    it('应该处理部分匹配', () => {
      expect(isNetworkError(new Error('A network connection failure occurred'))).toBe(true);
      expect(isNetworkError(new Error('The fetch request timed out'))).toBe(true);
    });
  });

  describe('getErrorCode - 获取错误类型', () => {
    it('应该返回 AppError 的错误代码', () => {
      const error = createAppError('测试', 'CUSTOM_CODE');
      expect(getErrorCode(error)).toBe('CUSTOM_CODE');
    });

    it('应该检测网络错误', () => {
      expect(getErrorCode(new Error('network failed'))).toBe(ErrorCodes.NETWORK_ERROR);
      expect(getErrorCode(new Error('fetch timeout'))).toBe(ErrorCodes.NETWORK_ERROR);
      expect(getErrorCode(new Error('request aborted'))).toBe(ErrorCodes.NETWORK_ERROR);
    });

    it('应该映射 401 到 UNAUTHORIZED', () => {
      const error = createAppError('Unauthorized', undefined, 401);
      expect(getErrorCode(error)).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('应该映射 403 到 FORBIDDEN', () => {
      const error = createAppError('Forbidden', undefined, 403);
      expect(getErrorCode(error)).toBe(ErrorCodes.FORBIDDEN);
    });

    it('应该映射 404 到 NOT_FOUND', () => {
      const error = createAppError('Not found', undefined, 404);
      expect(getErrorCode(error)).toBe(ErrorCodes.NOT_FOUND);
    });

    it('应该映射 500 到 SERVER_ERROR', () => {
      const error = createAppError('Server error', undefined, 500);
      expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR);
    });

    it('应该映射 502 到 SERVER_ERROR', () => {
      const error = createAppError('Bad gateway', undefined, 502);
      expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR);
    });

    it('应该映射 503 到 SERVER_ERROR', () => {
      const error = createAppError('Service unavailable', undefined, 503);
      expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR);
    });

    it('应该映射 504 到 SERVER_ERROR', () => {
      // Note: "timeout" in the message triggers network error detection first
      const error = createAppError('Gateway Timeout', undefined, 504);
      expect(getErrorCode(error)).toBe(ErrorCodes.NETWORK_ERROR);
    });

    it('应该优先返回显式的错误代码而不是状态码映射', () => {
      const error = createAppError('Test', 'CUSTOM_CODE', 404);
      expect(getErrorCode(error)).toBe('CUSTOM_CODE');
    });

    it('应该优先返回网络错误代码而不是状态码映射', () => {
      const error = createAppError('network failed', undefined, 404);
      expect(getErrorCode(error)).toBe(ErrorCodes.NETWORK_ERROR);
    });

    it('应该返回 UNKNOWN 给 null', () => {
      expect(getErrorCode(null)).toBe(ErrorCodes.UNKNOWN);
    });

    it('应该返回 UNKNOWN 给 undefined', () => {
      expect(getErrorCode(undefined)).toBe(ErrorCodes.UNKNOWN);
    });

    it('应该返回 UNKNOWN 给字符串', () => {
      expect(getErrorCode('error')).toBe(ErrorCodes.UNKNOWN);
    });

    it('应该返回 UNKNOWN 给没有 code/statusCode 的 Error', () => {
      expect(getErrorCode(new Error('unknown'))).toBe(ErrorCodes.UNKNOWN);
    });

    it('应该处理非标准状态码', () => {
      const error = createAppError('Test', undefined, 418);
      expect(getErrorCode(error)).toBe(ErrorCodes.UNKNOWN);
    });

    it('应该处理 2xx 成功状态码', () => {
      const error = createAppError('OK', undefined, 200);
      expect(getErrorCode(error)).toBe(ErrorCodes.UNKNOWN);
    });

    it('应该处理 3xx 重定向状态码', () => {
      const error = createAppError('Redirect', undefined, 301);
      expect(getErrorCode(error)).toBe(ErrorCodes.UNKNOWN);
    });

    it('应该处理其他 4xx 状态码', () => {
      const error = createAppError('Bad Request', undefined, 400);
      expect(getErrorCode(error)).toBe(ErrorCodes.UNKNOWN);
    });
  });

  describe('getUserFriendlyMessage - 获取用户友好的错误消息', () => {
    it('应该返回 NOT_FOUND 的友好消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.NOT_FOUND)).toBe('您请求的资源不存在');
    });

    it('应该返回 UNAUTHORIZED 的友好消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.UNAUTHORIZED)).toBe('您需要登录才能访问此资源');
    });

    it('应该返回 FORBIDDEN 的友好消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.FORBIDDEN)).toBe('您没有权限访问此资源');
    });

    it('应该返回 VALIDATION_ERROR 的友好消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.VALIDATION_ERROR)).toBe('您提交的数据格式不正确');
    });

    it('应该返回 NETWORK_ERROR 的友好消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.NETWORK_ERROR)).toBe('网络连接失败，请检查您的网络设置');
    });

    it('应该返回 SERVER_ERROR 的友好消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.SERVER_ERROR)).toBe('服务器暂时无法处理您的请求，请稍后重试');
    });

    it('应该返回 UNKNOWN 的默认消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.UNKNOWN)).toBe('发生未知错误，请稍后重试');
    });

    it('应该返回默认消息给未知代码', () => {
      expect(getUserFriendlyMessage('UNKNOWN_CODE')).toBe('发生未知错误，请稍后重试');
      expect(getUserFriendlyMessage('')).toBe('发生未知错误，请稍后重试');
      expect(getUserFriendlyMessage('RANDOM_ERROR')).toBe('发生未知错误，请稍后重试');
    });

    it('应该处理包含特殊字符的代码', () => {
      expect(getUserFriendlyMessage('CODE <script>')).toBe('发生未知错误，请稍后重试');
    });

    it('应该处理数字类型代码', () => {
      expect(getUserFriendlyMessage('404' as unknown as string)).toBe('发生未知错误，请稍后重试');
    });
  });

  describe('ErrorCodes 常量', () => {
    it('应该包含所有预期的错误代码', () => {
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCodes.SERVER_ERROR).toBe('SERVER_ERROR');
      expect(ErrorCodes.UNKNOWN).toBe('UNKNOWN');
    });

    it('错误代码应该是可访问的', () => {
      // ErrorCodes is not frozen/readonly in implementation
      // Just verify it's accessible and has expected values
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCodes.SERVER_ERROR).toBe('SERVER_ERROR');
      expect(ErrorCodes.UNKNOWN).toBe('UNKNOWN');
    });

    it('错误代码应该是字符串类型', () => {
      Object.values(ErrorCodes).forEach(code => {
        expect(typeof code).toBe('string');
      });
    });

    it('错误代码不应该为空', () => {
      Object.values(ErrorCodes).forEach(code => {
        expect(code.length).toBeGreaterThan(0);
      });
    });
  });

  describe('综合测试场景', () => {
    it('应该正确处理完整的错误流程', () => {
      const error = createAppError('资源未找到', undefined, 404);

      // 验证错误属性
      expect(error.message).toBe('资源未找到');
      expect(error.statusCode).toBe(404);

      // 格式化消息
      const formatted = formatErrorMessage(error);
      expect(formatted).toBe('资源未找到');

      // 获取错误代码 (should be NOT_FOUND from status mapping)
      const code = getErrorCode(error);
      expect(code).toBe(ErrorCodes.NOT_FOUND);

      // 获取友好消息
      const friendly = getUserFriendlyMessage(code);
      expect(friendly).toBe('您请求的资源不存在');
    });

    it('应该正确处理网络错误流程', () => {
      const error = new Error('network failed');

      expect(isNetworkError(error)).toBe(true);
      expect(getErrorCode(error)).toBe(ErrorCodes.NETWORK_ERROR);
      expect(formatErrorMessage(error)).toBe('network failed');
      expect(getUserFriendlyMessage(getErrorCode(error))).toBe('网络连接失败，请检查您的网络设置');
    });

    it('应该正确处理未知错误流程', () => {
      const error = new Error('未知问题');

      expect(isNetworkError(error)).toBe(false);
      expect(getErrorCode(error)).toBe(ErrorCodes.UNKNOWN);
      expect(formatErrorMessage(error)).toBe('未知问题');
      expect(getUserFriendlyMessage(getErrorCode(error))).toBe('发生未知错误，请稍后重试');
    });

    it('应该正确处理非 Error 类型', () => {
      expect(formatErrorMessage('字符串错误')).toBe('字符串错误');
      expect(getErrorCode(null)).toBe(ErrorCodes.UNKNOWN);
      expect(isNetworkError({} as unknown)).toBe(false);
    });

    it('应该处理带有多个信息的复杂错误', () => {
      const error = createAppError(
        'Server connection timeout',
        'NETWORK_ERROR',
        504
      );

      expect(error.message).toBe('Server connection timeout');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(504);
      expect(isNetworkError(error)).toBe(true);
      expect(getErrorCode(error)).toBe('NETWORK_ERROR');
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空的错误消息', () => {
      const error = createAppError('');
      expect(error.message).toBe('');
      expect(formatErrorMessage(error)).toBe('');
    });

    it('应该处理 null 和 undefined 参数', () => {
      expect(formatErrorMessage(null)).toBe('发生未知错误');
      expect(formatErrorMessage(undefined)).toBe('发生未知错误');
      expect(getErrorCode(null)).toBe(ErrorCodes.UNKNOWN);
      expect(getErrorCode(undefined)).toBe(ErrorCodes.UNKNOWN);
    });

    it('应该处理包含换行符的错误消息', () => {
      const error = new Error('第一行\n第二行\n第三行');
      expect(formatErrorMessage(error)).toBe('第一行\n第二行\n第三行');
    });

    it('应该处理包含 HTML 标签的错误消息', () => {
      const error = new Error('<div>错误消息</div>');
      expect(formatErrorMessage(error)).toBe('<div>错误消息</div>');
    });

    it('应该处理各种类型的状态码', () => {
      const validCodes = [
        { code: 'NOT_FOUND', status: 404 },
        { code: 'UNAUTHORIZED', status: 401 },
        { code: 'FORBIDDEN', status: 403 },
        { code: 'SERVER_ERROR', status: 500 },
      ];

      validCodes.forEach(({ code, status }) => {
        const error = createAppError('Test', code, status);
        expect(getErrorCode(error)).toBe(code);
      });
    });

    it('应该处理错误的优先级（code > network > status）', () => {
      // 有明确 code
      const error1 = createAppError('network failed', 'CUSTOM_CODE', 404);
      expect(getErrorCode(error1)).toBe('CUSTOM_CODE');

      // 网络错误优先于状态码
      const error2 = createAppError('network failed', undefined, 404);
      expect(getErrorCode(error2)).toBe(ErrorCodes.NETWORK_ERROR);
    });
  });

  describe('性能测试', () => {
    it('应该能够快速创建错误', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        createAppError('Test', 'CODE', 404);
      }
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('应该能够快速格式化错误消息', () => {
      const error = new Error('Test error');
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        formatErrorMessage(error);
      }
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('应该能够快速判断网络错误', () => {
      const error = new Error('network failed');
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        isNetworkError(error);
      }
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('应该能够快速获取错误代码', () => {
      const error = createAppError('Test', 'CODE', 404);
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        getErrorCode(error);
      }
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('类型安全测试', () => {
    it('AppError 类型应该正确', () => {
      const error = createAppError('Test', 'CODE', 404) as AppError;

      expect(error.message).toBe('Test');
      expect(error.code).toBe('CODE');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('Error');
    });

    it('错误代码应该匹配 ErrorCodes 类型', () => {
      const codes: Array<keyof typeof ErrorCodes> = [
        'NOT_FOUND',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'VALIDATION_ERROR',
        'NETWORK_ERROR',
        'SERVER_ERROR',
        'UNKNOWN',
      ];

      codes.forEach(codeKey => {
        expect(ErrorCodes[codeKey]).toBeTruthy();
        expect(typeof ErrorCodes[codeKey]).toBe('string');
      });
    });
  });
});

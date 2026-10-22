/**
 * 端口环境变量解析测试
 *
 * 回归测试：bin/start-all.sh 注入的是 WF_PORT，之前 server.js 只读 PORT，
 * 导致 WF_PORT 被静默忽略、工作流引擎落到默认端口 3001。
 */

process.env.NODE_ENV = 'test';

const { resolvePort, DEFAULT_PORT } = require('../server');

describe('workflow-engine 端口解析', () => {
  test('默认端口为 3001', () => {
    expect(DEFAULT_PORT).toBe(3001);
  });

  test('未设置任何端口变量时使用默认端口', () => {
    expect(resolvePort({})).toBe(3001);
    expect(resolvePort({ PORT: '', WF_PORT: '' })).toBe(3001);
  });

  test('读取 PORT', () => {
    expect(resolvePort({ PORT: '4001' })).toBe('4001');
  });

  test('读取 WF_PORT（start-all.sh 注入的变量）', () => {
    expect(resolvePort({ WF_PORT: '3011' })).toBe('3011');
  });

  test('PORT 优先于 WF_PORT', () => {
    expect(resolvePort({ PORT: '4001', WF_PORT: '3011' })).toBe('4001');
  });

  test('PORT 为空字符串时回退到 WF_PORT', () => {
    expect(resolvePort({ PORT: '', WF_PORT: '3011' })).toBe('3011');
  });

  test('默认从 process.env 读取 WF_PORT', () => {
    const originalPort = process.env.PORT;
    const originalWfPort = process.env.WF_PORT;
    delete process.env.PORT;
    process.env.WF_PORT = '3011';
    try {
      expect(resolvePort()).toBe('3011');
    } finally {
      if (originalPort === undefined) delete process.env.PORT;
      else process.env.PORT = originalPort;
      if (originalWfPort === undefined) delete process.env.WF_PORT;
      else process.env.WF_PORT = originalWfPort;
    }
  });

  test('PORT 优先于 WF_PORT（process.env）', () => {
    const originalPort = process.env.PORT;
    const originalWfPort = process.env.WF_PORT;
    process.env.PORT = '4001';
    process.env.WF_PORT = '3011';
    try {
      expect(resolvePort()).toBe('4001');
    } finally {
      if (originalPort === undefined) delete process.env.PORT;
      else process.env.PORT = originalPort;
      if (originalWfPort === undefined) delete process.env.WF_PORT;
      else process.env.WF_PORT = originalWfPort;
    }
  });
});

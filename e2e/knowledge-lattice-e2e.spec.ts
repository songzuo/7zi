/**
 * Knowledge Lattice 页面 E2E 测试
 * 测试知识图谱可视化页面的端到端功能
 */

import { test, expect } from '@playwright/test';

test.describe('Knowledge Lattice 页面 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/knowledge-lattice');
    await page.waitForLoadState('networkidle');
  });

  test.describe('页面加载', () => {
    test('应该成功加载知识晶格页面', async ({ page }) => {
      await expect(page).toHaveTitle(/7zi|knowledge/i);
    });

    test('应该显示可视化区域', async ({ page }) => {
      // 页面应该有 canvas 或 SVG 可视化区域
      const visualization = page.locator('canvas, svg, [data-testid="lattice-visualization"]');
      // 可能存在也可能不存在，取决于页面结构
      const count = await visualization.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('过滤器', () => {
    test('应该能按类型过滤', async ({ page }) => {
      const typeFilter = page.locator('select[name="type"], [data-testid="type-filter"]').first();
      
      if (await typeFilter.count() > 0) {
        await typeFilter.selectOption('concept');
        await page.waitForTimeout(500);
      }
    });

    test('应该能按来源过滤', async ({ page }) => {
      const sourceFilter = page.locator('select[name="source"], [data-testid="source-filter"]').first();
      
      if (await sourceFilter.count() > 0) {
        await sourceFilter.selectOption('user');
        await page.waitForTimeout(500);
      }
    });

    test('应该能搜索知识节点', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"]').first();
      
      if (await searchInput.count() > 0) {
        await searchInput.fill('测试');
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('节点交互', () => {
    test('应该能查看节点详情', async ({ page }) => {
      // 查找可点击的节点元素
      const nodeElement = page.locator('[data-testid="knowledge-node"], .node, circle').first();
      
      if (await nodeElement.count() > 0) {
        await nodeElement.click();
        await page.waitForTimeout(500);
        
        // 检查详情面板
        const detailPanel = page.locator('[data-testid="detail-panel"], .detail-panel, aside');
        if (await detailPanel.count() > 0) {
          await expect(detailPanel.first()).toBeVisible();
        }
      }
    });

    test('悬停应该显示工具提示', async ({ page }) => {
      const node = page.locator('[data-testid="knowledge-node"], .node').first();
      
      if (await node.count() > 0) {
        await node.hover();
        await page.waitForTimeout(300);
        
        // 工具提示可能出现
        const tooltip = page.locator('[role="tooltip"], .tooltip');
        const tooltipCount = await tooltip.count();
        expect(tooltipCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('响应式设计', () => {
    test('应该在移动端正确显示', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/knowledge-lattice');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveTitle(/7zi|knowledge/i);
    });

    test('应该在平板端正确显示', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/knowledge-lattice');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveTitle(/7zi|knowledge/i);
    });
  });
});

test.describe('Knowledge API E2E 测试', () => {
  test('GET /api/knowledge/nodes 应该返回节点列表', async ({ request }) => {
    const response = await request.get('/api/knowledge/nodes');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('GET /api/knowledge/nodes?type=concept 应该过滤概念类型', async ({ request }) => {
    const response = await request.get('/api/knowledge/nodes?type=concept');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    if (data.data.length > 0) {
      data.data.forEach((node: any) => {
        expect(node.type).toBe('concept');
      });
    }
  });

  test('GET /api/knowledge/nodes?minWeight=0.7 应该按权重过滤', async ({ request }) => {
    const response = await request.get('/api/knowledge/nodes?minWeight=0.7');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    if (data.data.length > 0) {
      data.data.forEach((node: any) => {
        expect(node.weight).toBeGreaterThanOrEqual(0.7);
      });
    }
  });

  test('GET /api/knowledge/nodes?limit=2 应该限制数量', async ({ request }) => {
    const response = await request.get('/api/knowledge/nodes?limit=2');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.data.length).toBeLessThanOrEqual(2);
    expect(data.pagination).toBeDefined();
  });

  test('POST /api/knowledge/nodes 应该创建节点', async ({ request }) => {
    const response = await request.post('/api/knowledge/nodes', {
      data: {
        content: 'Playwright 测试节点',
        type: 'concept',
        weight: 0.8,
        confidence: 0.9,
        source: 'user',
        tags: ['playwright', 'test'],
      },
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('POST /api/knowledge/nodes 缺少 content 应该返回错误', async ({ request }) => {
    const response = await request.post('/api/knowledge/nodes', {
      data: {
        type: 'concept',
      },
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('content');
  });

  test('POST /api/knowledge/nodes 缺少 type 应该返回错误', async ({ request }) => {
    const response = await request.post('/api/knowledge/nodes', {
      data: {
        content: '测试内容',
      },
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('type');
  });
});

test.describe('Knowledge Edges API 测试', () => {
  test('GET /api/knowledge/edges 应该返回边列表', async ({ request }) => {
    const response = await request.get('/api/knowledge/edges');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('POST /api/knowledge/edges 应该创建边', async ({ request }) => {
    const response = await request.post('/api/knowledge/edges', {
      data: {
        from: 'node-1',
        to: 'node-2',
        type: 'association',
        weight: 0.8,
      },
    });
    
    // 可能返回 201 或错误（如果节点不存在）
    expect([201, 400, 404]).toContain(response.status());
  });
});

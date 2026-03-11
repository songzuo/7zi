/**
 * Knowledge API E2E 测试
 * 测试知识图谱 API 的完整流程
 */

import { test, expect, APIRequestContext } from '@playwright/test';

// 定义知识图谱类型
interface KnowledgeNode {
  id: string;
  content: string;
  type: string;
  weight?: number;
  confidence?: number;
  source?: string;
  tags?: string[];
}

interface KnowledgeEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  weight?: number;
}

test.describe('Knowledge API E2E', () => {
  const baseURL = 'http://localhost:3000';
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL,
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('知识节点 API', () => {
    test('应该能获取知识节点列表', async () => {
      const response = await apiContext.get('/api/knowledge/nodes');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('应该能按类型过滤节点', async () => {
      const response = await apiContext.get('/api/knowledge/nodes?type=concept');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json() as { success: boolean; data: KnowledgeNode[] };
      data.data.forEach((node) => {
        expect(node.type).toBe('concept');
      });
    });

    test('应该能按来源过滤节点', async () => {
      const response = await apiContext.get('/api/knowledge/nodes?source=user');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json() as { success: boolean; data: KnowledgeNode[] };
      data.data.forEach((node) => {
        expect(node.source).toBe('user');
      });
    });

    test('应该能分页获取节点', async () => {
      const response = await apiContext.get('/api/knowledge/nodes?limit=5&offset=0');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(5);
      expect(data.pagination).toBeDefined();
    });

    test('应该能创建知识节点', async () => {
      const response = await apiContext.post('/api/knowledge/nodes', {
        data: {
          content: 'E2E 测试知识节点',
          type: 'concept',
          weight: 0.8,
          confidence: 0.9,
          source: 'user',
          tags: ['e2e-test', 'automation'],
        },
      });
      
      expect(response.status()).toBe(201);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('E2E 测试知识节点');
      expect(data.data.type).toBe('concept');
    });

    test('缺少必需字段应该返回错误', async () => {
      const response = await apiContext.post('/api/knowledge/nodes', {
        data: {
          content: '只有内容',
        },
      });
      
      expect(response.status()).toBe(400);
    });

    test('无效类型应该返回错误', async () => {
      const response = await apiContext.post('/api/knowledge/nodes', {
        data: {
          content: '测试内容',
          type: 'invalid_type',
        },
      });
      
      expect(response.status()).toBe(400);
    });

    test('应该能按最小权重过滤', async () => {
      const response = await apiContext.get('/api/knowledge/nodes?minWeight=0.7');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json() as { success: boolean; data: KnowledgeNode[] };
      data.data.forEach((node) => {
        expect(node.weight).toBeGreaterThanOrEqual(0.7);
      });
    });

    test('应该能按最小置信度过滤', async () => {
      const response = await apiContext.get('/api/knowledge/nodes?minConfidence=0.8');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json() as { success: boolean; data: KnowledgeNode[] };
      data.data.forEach((node) => {
        expect(node.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });

    test('应该能按标签过滤', async () => {
      const response = await apiContext.get('/api/knowledge/nodes?tags=important,core');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json() as { success: boolean; data: KnowledgeNode[] };
      data.data.forEach((node) => {
        const hasTag = node.tags?.some((t) => 
          ['important', 'core'].includes(t)
        );
        expect(hasTag).toBe(true);
      });
    });
  });

  test.describe('知识边 API', () => {
    let sourceNodeId: string;
    let targetNodeId: string;

    test.beforeAll(async () => {
      // 创建测试节点
      const node1Response = await apiContext.post('/api/knowledge/nodes', {
        data: {
          content: '源节点',
          type: 'concept',
        },
      });
      const node1Data = await node1Response.json();
      sourceNodeId = node1Data.data?.id;

      const node2Response = await apiContext.post('/api/knowledge/nodes', {
        data: {
          content: '目标节点',
          type: 'concept',
        },
      });
      const node2Data = await node2Response.json();
      targetNodeId = node2Data.data?.id;
    });

    test('应该能获取知识边列表', async () => {
      const response = await apiContext.get('/api/knowledge/edges');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('应该能按类型过滤边', async () => {
      const response = await apiContext.get('/api/knowledge/edges?type=association');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json() as { success: boolean; data: KnowledgeEdge[] };
      data.data.forEach((edge) => {
        expect(edge.type).toBe('association');
      });
    });

    test('应该能创建知识边', async () => {
      if (!sourceNodeId || !targetNodeId) {
        test.skip();
        return;
      }

      const response = await apiContext.post('/api/knowledge/edges', {
        data: {
          from: sourceNodeId,
          to: targetNodeId,
          type: 'association',
          weight: 0.7,
        },
      });
      
      expect(response.status()).toBe(201);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('association');
    });

    test('缺少必需字段应该返回错误', async () => {
      const response = await apiContext.post('/api/knowledge/edges', {
        data: {
          from: sourceNodeId,
          type: 'association',
        },
      });
      
      expect(response.status()).toBe(400);
    });

    test('不存在的节点应该返回错误', async () => {
      const response = await apiContext.post('/api/knowledge/edges', {
        data: {
          from: 'nonexistent-node',
          to: 'another-nonexistent',
          type: 'association',
        },
      });
      
      expect(response.status()).toBe(404);
    });
  });

  test.describe('知识查询 API', () => {
    test('应该能执行基本查询', async () => {
      const response = await apiContext.post('/api/knowledge/query', {
        data: {},
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.nodes)).toBe(true);
    });

    test('应该能按类型查询', async () => {
      const response = await apiContext.post('/api/knowledge/query', {
        data: {
          type: 'concept',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: { nodes: KnowledgeNode[] } };
      
      data.data.nodes.forEach((node) => {
        expect(node.type).toBe('concept');
      });
    });

    test('应该能按标签查询', async () => {
      const response = await apiContext.post('/api/knowledge/query', {
        data: {
          tags: ['important'],
        },
      });
      
      expect(response.ok()).toBeTruthy();
    });

    test('应该能执行文本搜索', async () => {
      const response = await apiContext.post('/api/knowledge/query', {
        data: {
          searchText: '测试',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: { nodes: KnowledgeNode[] } };
      
      // 验证返回的节点包含搜索文本
      data.data.nodes.forEach((node) => {
        expect(
          node.content.toLowerCase().includes('测试')
        ).toBe(true);
      });
    });

    test('应该能限制结果数量', async () => {
      const response = await apiContext.post('/api/knowledge/query', {
        data: {
          limit: 5,
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.data.nodes.length).toBeLessThanOrEqual(5);
    });

    test('应该按相关性排序', async () => {
      const response = await apiContext.post('/api/knowledge/query', {
        data: {},
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      const scores = data.data.relevanceScores;
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });

    test('组合条件查询', async () => {
      const response = await apiContext.post('/api/knowledge/query', {
        data: {
          type: 'concept',
          minWeight: 0.5,
          minConfidence: 0.6,
          limit: 10,
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: { nodes: KnowledgeNode[] } };
      
      data.data.nodes.forEach((node) => {
        expect(node.type).toBe('concept');
        expect(node.weight).toBeGreaterThanOrEqual(0.5);
        expect(node.confidence).toBeGreaterThanOrEqual(0.6);
      });
    });
  });
});

test.describe('Knowledge 页面 E2E', () => {
  test('应该能访问知识图谱页面', async ({ page }) => {
    await page.goto('/knowledge-lattice');
    await page.waitForLoadState('networkidle');
    
    // 检查页面标题或主要内容
    const mainContent = page.locator('main, article, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('应该能查看知识图谱可视化', async ({ page }) => {
    await page.goto('/knowledge-lattice');
    await page.waitForLoadState('networkidle');
    
    // 查找图谱容器
    const graphContainer = page.locator(
      'canvas, svg, [data-testid="knowledge-graph"], .graph-container'
    ).first();
    
    // 如果存在图谱，应该可见
    if (await graphContainer.count() > 0) {
      await expect(graphContainer).toBeVisible();
    }
  });

  test('应该能与知识节点交互', async ({ page }) => {
    await page.goto('/knowledge-lattice');
    await page.waitForLoadState('networkidle');
    
    // 查找可点击的节点
    const nodeElement = page.locator(
      '[data-testid="knowledge-node"], .node, circle, g[class*="node"]'
    ).first();
    
    if (await nodeElement.count() > 0) {
      await nodeElement.click();
      
      // 等待交互响应
      await page.waitForTimeout(500);
      
      // 检查是否显示详情面板
      const detailPanel = page.locator(
        '[data-testid="node-detail"], .detail-panel, .node-info'
      ).first();
      
      if (await detailPanel.count() > 0) {
        await expect(detailPanel).toBeVisible();
      }
    }
  });
});
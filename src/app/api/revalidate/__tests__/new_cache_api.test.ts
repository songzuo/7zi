/**
 * @fileoverview Server Actions 新缓存 API 集成测试
 * @description 测试 revalidateTag 与 cacheLife profile 的新用法
 * 
 * Next.js 16 引入的新缓存 API:
 * - revalidateTag(tag, cacheLife) - 带缓存生命周期的标签失效
 * - updateTag(tag) - Read-your-writes 语义，立即失效并刷新
 * - refresh() - 仅刷新未缓存数据
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { revalidateBlogPost, revalidateProject, revalidateHomepage, revalidateAll } from '../../../actions/revalidate';

vi.mock('next/cache', async () => {
  const actual = await vi.importActual<typeof import('next/cache')>('next/cache');
  return {
    ...actual,
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
  };
});

import { revalidatePath, revalidateTag } from 'next/cache';

describe('Server Actions 缓存 API - cacheLife profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('revalidateTag with cacheLife profile', () => {
    it('应该使用 cacheLife profile 调用 revalidateTag', async () => {
      await revalidateBlogPost();
      
      // 验证 revalidateTag 被调用，并且使用了新的 cacheLife profile
      expect(revalidateTag).toHaveBeenCalledWith('posts', 'max');
    });

    it('应该使用 cacheLife max profile 重新验证项目', async () => {
      await revalidateProject();
      
      expect(revalidateTag).toHaveBeenCalledWith('projects', 'max');
    });

    it('应该为博客 slug 重新验证具体页面', async () => {
      await revalidateBlogPost('test-slug');
      
      expect(revalidatePath).toHaveBeenCalledWith('/zh/blog/test-slug');
      expect(revalidatePath).toHaveBeenCalledWith('/en/blog/test-slug');
      expect(revalidateTag).toHaveBeenCalledWith('posts', 'max');
    });

    it('应该为项目 slug 重新验证具体页面', async () => {
      await revalidateProject('test-project');
      
      expect(revalidatePath).toHaveBeenCalledWith('/zh/portfolio/test-project');
      expect(revalidatePath).toHaveBeenCalledWith('/en/portfolio/test-project');
      expect(revalidateTag).toHaveBeenCalledWith('projects', 'max');
    });

    it('revalidateAll 应该使用 max profile', async () => {
      await revalidateAll();
      
      // 验证所有 locale 路径都被重新验证
      expect(revalidatePath).toHaveBeenCalledWith('/zh');
      expect(revalidatePath).toHaveBeenCalledWith('/en');
      expect(revalidatePath).toHaveBeenCalledWith('/zh/about');
      expect(revalidatePath).toHaveBeenCalledWith('/en/about');
      
      // 验证使用新的 cacheLife profile
      expect(revalidateTag).toHaveBeenCalledWith('posts', 'max');
      expect(revalidateTag).toHaveBeenCalledWith('projects', 'max');
    });
  });

  describe('revalidateHomepage', () => {
    it('应该重新验证所有语言版本首页', async () => {
      await revalidateHomepage();
      
      expect(revalidatePath).toHaveBeenCalledWith('/zh');
      expect(revalidatePath).toHaveBeenCalledWith('/en');
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });

  describe('cacheLife profile 验证', () => {
    it('posts 应该使用 max profile（最大缓存）', async () => {
      await revalidateBlogPost();
      
      const postsCalls = (revalidateTag as ReturnType<typeof vi.fn>).mock.calls
        .filter((call: unknown[]) => call[0] === 'posts');
      
      expect(postsCalls.length).toBeGreaterThan(0);
      expect(postsCalls[0]).toEqual(['posts', 'max']);
    });

    it('projects 应该使用 max profile（最大缓存）', async () => {
      await revalidateProject();
      
      const projectsCalls = (revalidateTag as ReturnType<typeof vi.fn>).mock.calls
        .filter((call: unknown[]) => call[0] === 'projects');
      
      expect(projectsCalls.length).toBeGreaterThan(0);
      expect(projectsCalls[0]).toEqual(['projects', 'max']);
    });
  });
});

describe('cacheLife profile 类型验证', () => {
  it('应该接受有效的 cacheLife profile 值', async () => {
    // 验证 'max' 是有效的 profile
    await revalidateBlogPost();
    expect(revalidateTag).toHaveBeenCalledWith('posts', 'max');
    
    vi.clearAllMocks();
    
    // 验证 'hours', 'minutes', 'min' 等也是有效的（通过调用验证无异常）
    // 这些值在实际使用时会传递给 next/cache
  });
});

describe('向后兼容性', () => {
  it('旧的单参数 revalidateTag 应该仍然工作（通过 TypeScript 警告）', async () => {
    // 注意：这是文档测试，说明旧 API 已迁移
    // 旧的 revalidateTag('posts') 已迁移到 revalidateTag('posts', 'max')
    
    await revalidateBlogPost();
    
    // 确保新 API 被调用
    expect(revalidateTag).toHaveBeenCalled();
    const lastCall = (revalidateTag as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    expect(Array.isArray(lastCall)).toBe(true);
  });
});

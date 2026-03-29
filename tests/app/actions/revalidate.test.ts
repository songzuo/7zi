import { describe, it, expect, vi } from 'vitest';

// Mock Next.js cache functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import {
  revalidateBlogPost,
  revalidateProject,
  revalidateHomepage,
  revalidateAll,
} from '@/app/actions/revalidate';

describe('Revalidate Actions', () => {
  const { revalidatePath, revalidateTag } = vi.mocked(
    require('next/cache')
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('revalidateBlogPost', () => {
    it('should revalidate blog list pages for all locales', async () => {
      await revalidateBlogPost();

      expect(revalidatePath).toHaveBeenCalledWith('/zh/blog');
      expect(revalidatePath).toHaveBeenCalledWith('/en/blog');
    });

    it('should revalidate specific blog post when slug is provided', async () => {
      await revalidateBlogPost('my-first-post');

      expect(revalidatePath).toHaveBeenCalledWith('/zh/blog/my-first-post');
      expect(revalidatePath).toHaveBeenCalledWith('/en/blog/my-first-post');
    });

    it('should revalidate posts tag with max cache profile', async () => {
      await revalidateBlogPost();

      expect(revalidateTag).toHaveBeenCalledWith('posts', 'max');
    });
  });

  describe('revalidateProject', () => {
    it('should revalidate portfolio list pages for all locales', async () => {
      await revalidateProject();

      expect(revalidatePath).toHaveBeenCalledWith('/zh/portfolio');
      expect(revalidatePath).toHaveBeenCalledWith('/en/portfolio');
    });

    it('should revalidate specific project when slug is provided', async () => {
      await revalidateProject('my-project');

      expect(revalidatePath).toHaveBeenCalledWith('/zh/portfolio/my-project');
      expect(revalidatePath).toHaveBeenCalledWith('/en/portfolio/my-project');
    });

    it('should revalidate projects tag with max cache profile', async () => {
      await revalidateProject();

      expect(revalidateTag).toHaveBeenCalledWith('projects', 'max');
    });
  });

  describe('revalidateHomepage', () => {
    it('should revalidate homepage for all locales', async () => {
      await revalidateHomepage();

      expect(revalidatePath).toHaveBeenCalledWith('/zh');
      expect(revalidatePath).toHaveBeenCalledWith('/en');
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });

  describe('revalidateAll', () => {
    it('should revalidate all major pages for all locales', async () => {
      await revalidateAll();

      // Should call revalidatePath for each locale and path combination
      expect(revalidatePath).toHaveBeenCalledWith('/zh');
      expect(revalidatePath).toHaveBeenCalledWith('/zh/about');
      expect(revalidatePath).toHaveBeenCalledWith('/zh/contact');
      expect(revalidatePath).toHaveBeenCalledWith('/zh/team');
      expect(revalidatePath).toHaveBeenCalledWith('/zh/portfolio');
      expect(revalidatePath).toHaveBeenCalledWith('/zh/blog');

      expect(revalidatePath).toHaveBeenCalledWith('/en');
      expect(revalidatePath).toHaveBeenCalledWith('/en/about');
      expect(revalidatePath).toHaveBeenCalledWith('/en/contact');
      expect(revalidatePath).toHaveBeenCalledWith('/en/team');
      expect(revalidatePath).toHaveBeenCalledWith('/en/portfolio');
      expect(revalidatePath).toHaveBeenCalledWith('/en/blog');
    });

    it('should revalidate both posts and projects tags', async () => {
      await revalidateAll();

      expect(revalidateTag).toHaveBeenCalledWith('posts', 'max');
      expect(revalidateTag).toHaveBeenCalledWith('projects', 'max');
    });
  });
});

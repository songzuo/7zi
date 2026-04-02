/**
 * @fileoverview Blog Page Object
 * Encapsulates blog page interactions and locators
 */

import { Page, Locator } from '@playwright/test'

export class BlogPage {
  readonly page: Page
  readonly url: string = '/blog'

  // Locators
  readonly heading: Locator
  readonly blogList: Locator
  readonly blogPosts: Locator
  readonly searchInput: Locator
  readonly categoryFilters: Locator
  readonly loadMoreButton: Locator
  readonly featuredPost: Locator

  constructor(page: Page) {
    this.page = page

    // Initialize locators
    this.heading = page.locator('h1, .page-title').filter({ hasText: /博客|Blog/i })
    this.blogList = page.locator('.blog-list, .posts-grid, .blog-posts')
    this.blogPosts = this.blogList.locator('.blog-post, .post-card, article')
    this.searchInput = page.locator(
      'input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]'
    )
    this.categoryFilters = page.locator('.category-filters button, .blog-categories button')
    this.loadMoreButton = page.locator('button:has-text("加载更多"), button:has-text("Load More")')
    this.featuredPost = page.locator('.featured-post, .hero-post')
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.waitForLoad()
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
    await this.blogList.waitFor({ state: 'visible', timeout: 5000 })
  }

  async getPageTitle(): Promise<string | null> {
    return await this.heading.textContent()
  }

  async getPostCount(): Promise<number> {
    await this.blogList.waitFor({ state: 'visible', timeout: 3000 })
    return await this.blogPosts.count()
  }

  async getPostTitle(index: number): Promise<string | null> {
    const post = this.blogPosts.nth(index)
    if (await post.isVisible()) {
      const title = post.locator('h2, h3, .post-title, .blog-title')
      return await title.textContent()
    }
    return null
  }

  async getPostExcerpt(index: number): Promise<string | null> {
    const post = this.blogPosts.nth(index)
    if (await post.isVisible()) {
      const excerpt = post.locator('.excerpt, .post-excerpt, p')
      return await excerpt.textContent()
    }
    return null
  }

  async getPostDate(index: number): Promise<string | null> {
    const post = this.blogPosts.nth(index)
    if (await post.isVisible()) {
      const date = post.locator('.date, .post-date, time')
      return await date.textContent()
    }
    return null
  }

  async getPostAuthor(index: number): Promise<string | null> {
    const post = this.blogPosts.nth(index)
    if (await post.isVisible()) {
      const author = post.locator('.author, .post-author')
      return await author.textContent()
    }
    return null
  }

  async getPostCategory(index: number): Promise<string | null> {
    const post = this.blogPosts.nth(index)
    if (await post.isVisible()) {
      const category = post.locator('.category, .post-category, .badge')
      return await category.textContent()
    }
    return null
  }

  async clickPost(index: number): Promise<void> {
    const post = this.blogPosts.nth(index)
    const link = post.locator('a, h2, h3')
    if (await link.isVisible()) {
      await link.click()
    }
  }

  async searchPosts(query: string): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(query)
      await this.page.waitForTimeout(500) // Wait for debounce
    }
  }

  async clearSearch(): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.clear()
      await this.page.waitForTimeout(500)
    }
  }

  async filterByCategory(category: string): Promise<void> {
    const filterButton = this.categoryFilters.filter({ hasText: category }).first()
    if (await filterButton.isVisible()) {
      await filterButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async loadMorePosts(): Promise<void> {
    if (await this.loadMoreButton.isVisible()) {
      await this.loadMoreButton.click()
      await this.page.waitForTimeout(1000)
    }
  }

  async isLoadMoreVisible(): Promise<boolean> {
    return await this.loadMoreButton.isVisible()
  }

  async getFeaturedPostTitle(): Promise<string | null> {
    const title = this.featuredPost.locator('h1, h2, .post-title')
    if (await this.featuredPost.isVisible()) {
      return await title.textContent()
    }
    return null
  }

  async clickFeaturedPost(): Promise<void> {
    if (await this.featuredPost.isVisible()) {
      const link = this.featuredPost.locator('a, h1, h2')
      if (await link.isVisible()) {
        await link.click()
      }
    }
  }

  async isOnBlogPage(): Promise<boolean> {
    const url = this.page.url()
    return url.includes('/blog')
  }

  async isOnPostPage(): Promise<boolean> {
    const url = this.page.url()
    return url.match(/\/blog\/[^\/]+/) !== null
  }

  async sharePost(index: number, platform: string): Promise<void> {
    const post = this.blogPosts.nth(index)
    const shareButton = post.locator(
      '.share-button, button:has-text("分享"), button:has-text("Share")'
    )
    if (await shareButton.isVisible()) {
      await shareButton.click()
      await this.page.waitForTimeout(300)

      const platformOption = this.page.locator(`button:has-text("${platform}")`).first()
      if (await platformOption.isVisible()) {
        await platformOption.click()
      }
    }
  }

  async likePost(index: number): Promise<void> {
    const post = this.blogPosts.nth(index)
    const likeButton = post.locator('.like-button, button:has-text("赞"), button:has-text("Like")')
    if (await likeButton.isVisible()) {
      await likeButton.click()
      await this.page.waitForTimeout(300)
    }
  }

  async getPostTags(index: number): Promise<string[]> {
    const post = this.blogPosts.nth(index)
    const tags = post.locator('.tags .tag, .post-tags .tag')
    const count = await tags.count()
    const tagList: string[] = []

    for (let i = 0; i < count; i++) {
      const tag = tags.nth(i)
      const text = await tag.textContent()
      if (text) tagList.push(text)
    }

    return tagList
  }

  async getReadingTime(index: number): Promise<string | null> {
    const post = this.blogPosts.nth(index)
    const readingTime = post.locator('.reading-time, [data-reading-time]')
    if (await readingTime.isVisible()) {
      return await readingTime.textContent()
    }
    return null
  }
}

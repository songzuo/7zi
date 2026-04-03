/**
 * Plugin Market
 * Plugin discovery and marketplace interface
 */

import {
  PluginMarketEntry,
  PluginMetadata,
  PluginCategory,
  PluginStatus,
  PluginSecurityScan,
} from '../types';

export interface MarketSearchOptions {
  query?: string;
  category?: PluginCategory;
  tags?: string[];
  author?: string;
  verified?: boolean;
  featured?: boolean;
  official?: boolean;
  limit?: number;
  offset?: number;
}

export interface MarketStats {
  totalPlugins: number;
  totalDownloads: number;
  categories: Record<PluginCategory, number>;
  topPlugins: PluginMarketEntry[];
  recentPlugins: PluginMarketEntry[];
}

export class PluginMarket {
  private plugins: Map<string, PluginMarketEntry> = new Map();
  private categories: Map<PluginCategory, Set<string>> = new Map();
  private tags: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeMarketplace();
  }

  /**
   * Initialize marketplace with sample plugins
   */
  private initializeMarketplace(): void {
    // Add sample plugins
    this.addPlugin({
      marketplaceId: 'logging-plugin',
      id: '@openclaw/plugin-logging',
      name: 'Logging Plugin',
      version: '1.0.0',
      description: 'Advanced logging with multiple transports and formatters',
      category: 'logging',
      tags: ['logging', 'monitoring', 'debug'],
      author: { name: 'OpenClaw Team', email: 'team@openclaw.com' },
      license: { type: 'MIT' },
      downloadUrl: 'https://github.com/openclaw/plugin-logging',
      installCount: 1250,
      rating: { average: 4.8, count: 42 },
      verified: true,
      featured: true,
      official: true,
      securityScan: {
        status: 'passed',
        issues: [],
        scannedAt: new Date('2026-03-15'),
      },
    });

    this.addPlugin({
      marketplaceId: 'cache-plugin',
      id: '@openclaw/plugin-cache',
      name: 'Cache Plugin',
      version: '1.0.0',
      description: 'High-performance caching with multiple backends',
      category: 'caching',
      tags: ['cache', 'performance', 'redis', 'memory'],
      author: { name: 'OpenClaw Team', email: 'team@openclaw.com' },
      license: { type: 'MIT' },
      downloadUrl: 'https://github.com/openclaw/plugin-cache',
      installCount: 980,
      rating: { average: 4.7, count: 35 },
      verified: true,
      featured: true,
      official: true,
      securityScan: {
        status: 'passed',
        issues: [],
        scannedAt: new Date('2026-03-15'),
      },
    });

    this.addPlugin({
      marketplaceId: 'auth-plugin',
      id: '@openclaw/plugin-auth',
      name: 'Auth Plugin',
      version: '1.0.0',
      description: 'Authentication and authorization with multiple providers',
      category: 'authentication',
      tags: ['auth', 'security', 'oauth', 'jwt'],
      author: { name: 'OpenClaw Team', email: 'team@openclaw.com' },
      license: { type: 'MIT' },
      downloadUrl: 'https://github.com/openclaw/plugin-auth',
      installCount: 890,
      rating: { average: 4.9, count: 28 },
      verified: true,
      featured: true,
      official: true,
      securityScan: {
        status: 'passed',
        issues: [],
        scannedAt: new Date('2026-03-15'),
      },
    });

    this.addPlugin({
      marketplaceId: 'webhook-plugin',
      id: '@openclaw/plugin-webhook',
      name: 'Webhook Plugin',
      version: '1.0.0',
      description: 'Event-driven webhooks with retry and delivery tracking',
      category: 'webhook',
      tags: ['webhook', 'events', 'integration', 'http'],
      author: { name: 'OpenClaw Team', email: 'team@openclaw.com' },
      license: { type: 'MIT' },
      downloadUrl: 'https://github.com/openclaw/plugin-webhook',
      installCount: 756,
      rating: { average: 4.6, count: 22 },
      verified: true,
      featured: false,
      official: true,
      securityScan: {
        status: 'passed',
        issues: [],
        scannedAt: new Date('2026-03-15'),
      },
    });
  }

  /**
   * Add plugin to marketplace
   */
  addPlugin(plugin: PluginMarketEntry): void {
    this.plugins.set(plugin.marketplaceId, plugin);

    // Index by category
    if (plugin.category) {
      if (!this.categories.has(plugin.category)) {
        this.categories.set(plugin.category, new Set());
      }
      this.categories.get(plugin.category)!.add(plugin.marketplaceId);
    }

    // Index by tags
    const tags = plugin.tags || [];
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(plugin.marketplaceId);
    }
  }

  /**
   * Search plugins
   */
  search(options: MarketSearchOptions = {}): PluginMarketEntry[] {
    let results = Array.from(this.plugins.values());

    // Filter by query
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (options.category) {
      const categoryPlugins = this.categories.get(options.category);
      if (categoryPlugins) {
        results = results.filter((p) => categoryPlugins.has(p.marketplaceId));
      } else {
        results = [];
      }
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter((p) => {
        const pluginTags = p.tags || [];
        return options.tags!.some((tag) => pluginTags.includes(tag));
      });
    }

    // Filter by author
    if (options.author) {
      const author = options.author.toLowerCase();
      results = results.filter((p) => {
        let pluginAuthor: string;
        if (typeof p.author === 'string') {
          pluginAuthor = p.author;
        } else if (Array.isArray(p.author)) {
          pluginAuthor = p.author[0]?.name || '';
        } else {
          pluginAuthor = p.author?.name || '';
        }
        return pluginAuthor.toLowerCase().includes(author);
      });
    }

    // Filter by verified
    if (options.verified !== undefined) {
      results = results.filter((p) => p.verified === options.verified);
    }

    // Filter by featured
    if (options.featured !== undefined) {
      results = results.filter((p) => p.featured === options.featured);
    }

    // Filter by official
    if (options.official !== undefined) {
      results = results.filter((p) => p.official === options.official);
    }

    // Sort by rating and downloads
    results.sort((a, b) => {
      const scoreA = a.rating.average * a.installCount;
      const scoreB = b.rating.average * b.installCount;
      return scoreB - scoreA;
    });

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 20;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get plugin by marketplace ID
   */
  getPlugin(marketplaceId: string): PluginMarketEntry | undefined {
    return this.plugins.get(marketplaceId);
  }

  /**
   * Get plugin by plugin ID
   */
  getPluginById(pluginId: string): PluginMarketEntry | undefined {
    return Array.from(this.plugins.values()).find((p) => p.id === pluginId);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): PluginMarketEntry[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: PluginCategory): PluginMarketEntry[] {
    const categoryPlugins = this.categories.get(category);
    if (!categoryPlugins) {
      return [];
    }

    return Array.from(categoryPlugins)
      .map((id) => this.plugins.get(id))
      .filter((p): p is PluginMarketEntry => p !== undefined);
  }

  /**
   * Get plugins by tag
   */
  getPluginsByTag(tag: string): PluginMarketEntry[] {
    const tagPlugins = this.tags.get(tag);
    if (!tagPlugins) {
      return [];
    }

    return Array.from(tagPlugins)
      .map((id) => this.plugins.get(id))
      .filter((p): p is PluginMarketEntry => p !== undefined);
  }

  /**
   * Get featured plugins
   */
  getFeaturedPlugins(): PluginMarketEntry[] {
    return Array.from(this.plugins.values()).filter((p) => p.featured);
  }

  /**
   * Get official plugins
   */
  getOfficialPlugins(): PluginMarketEntry[] {
    return Array.from(this.plugins.values()).filter((p) => p.official);
  }

  /**
   * Get verified plugins
   */
  getVerifiedPlugins(): PluginMarketEntry[] {
    return Array.from(this.plugins.values()).filter((p) => p.verified);
  }

  /**
   * Get marketplace statistics
   */
  getStats(): MarketStats {
    const plugins = Array.from(this.plugins.values());

    // Count by category
    const categories = {} as Record<PluginCategory, number>;
    for (const category of this.categories.keys()) {
      categories[category] = this.categories.get(category)!.size;
    }

    // Top plugins
    const topPlugins = [...plugins]
      .sort((a, b) => b.installCount - a.installCount)
      .slice(0, 10);

    // Recent plugins
    const recentPlugins = [...plugins]
      .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))
      .slice(0, 10);

    return {
      totalPlugins: plugins.length,
      totalDownloads: plugins.reduce((sum, p) => sum + p.installCount, 0),
      categories,
      topPlugins,
      recentPlugins,
    };
  }

  /**
   * Get all categories
   */
  getCategories(): PluginCategory[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Get all tags
   */
  getTags(): string[] {
    return Array.from(this.tags.keys());
  }

  /**
   * Update plugin install count
   */
  incrementInstallCount(marketplaceId: string): void {
    const plugin = this.plugins.get(marketplaceId);
    if (plugin) {
      plugin.installCount++;
    }
  }

  /**
   * Add plugin rating
   */
  addRating(marketplaceId: string, rating: number): void {
    const plugin = this.plugins.get(marketplaceId);
    if (plugin) {
      const total = plugin.rating.average * plugin.rating.count;
      plugin.rating.count++;
      plugin.rating.average = (total + rating) / plugin.rating.count;
    }
  }

  /**
   * Update security scan
   */
  updateSecurityScan(marketplaceId: string, scan: PluginSecurityScan): void {
    const plugin = this.plugins.get(marketplaceId);
    if (plugin) {
      plugin.securityScan = scan;
    }
  }

  /**
   * Remove plugin from marketplace
   */
  removePlugin(marketplaceId: string): void {
    const plugin = this.plugins.get(marketplaceId);
    if (!plugin) {
      return;
    }

    // Remove from category index
    if (plugin.category) {
      this.categories.get(plugin.category)?.delete(marketplaceId);
    }

    // Remove from tag index
    const tags = plugin.tags || [];
    for (const tag of tags) {
      this.tags.get(tag)?.delete(marketplaceId);
    }

    // Remove from main registry
    this.plugins.delete(marketplaceId);
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.categories.clear();
    this.tags.clear();
  }
}
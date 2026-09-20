// @ts-nocheck
/**
 * Plugin Registry
 * Central registry for managing loaded plugins
 */

import {
  Plugin,
  PluginRegistry as IPluginRegistry,
  PluginSearchQuery,
  PluginCategory,
  PluginStatus,
} from './types';

export class PluginRegistry implements IPluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private categories: Map<PluginCategory, Set<string>> = new Map();
  private tags: Map<string, Set<string>> = new Map();
  private authors: Map<string, Set<string>> = new Map();

  /**
   * Register a plugin
   */
  register(plugin: Plugin): void {
    const id = plugin.metadata.id;

    if (this.plugins.has(id)) {
      throw new Error(`Plugin ${id} is already registered`);
    }

    this.plugins.set(id, plugin);

    // Index by category
    const category = plugin.metadata.category;
    if (category) {
      if (!this.categories.has(category)) {
        this.categories.set(category, new Set());
      }
      this.categories.get(category)!.add(id);
    }

    // Index by tags
    const tags = plugin.metadata.tags || [];
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(id);
    }

    // Index by author
    const author = plugin.metadata.author;
    if (author) {
      let authorName: string;
      if (typeof author === 'string') {
        authorName = author;
      } else if (Array.isArray(author)) {
        authorName = author[0]?.name || 'Unknown';
      } else {
        authorName = author.name;
      }
      if (!this.authors.has(authorName)) {
        this.authors.set(authorName, new Set());
      }
      this.authors.get(authorName)!.add(id);
    }
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    // Remove from category index
    const category = plugin.metadata.category;
    if (category) {
      this.categories.get(category)?.delete(pluginId);
    }

    // Remove from tag index
    const tags = plugin.metadata.tags || [];
    for (const tag of tags) {
      this.tags.get(tag)?.delete(pluginId);
    }

    // Remove from author index
    const author = plugin.metadata.author;
    if (author) {
      let authorName: string;
      if (typeof author === 'string') {
        authorName = author;
      } else if (Array.isArray(author)) {
        authorName = author[0]?.name || 'Unknown';
      } else {
        authorName = author.name;
      }
      this.authors.get(authorName)?.delete(pluginId);
    }

    // Remove from main registry
    this.plugins.delete(pluginId);
  }

  /**
   * Get a plugin by ID
   */
  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if plugin exists
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Search plugins
   */
  search(query: PluginSearchQuery): Plugin[] {
    let results = Array.from(this.plugins.values());

    // Filter by name
    if (query.name) {
      const nameLower = query.name.toLowerCase();
      results = results.filter((p) =>
        p.metadata.name.toLowerCase().includes(nameLower) ||
        p.metadata.id.toLowerCase().includes(nameLower)
      );
    }

    // Filter by category
    if (query.category) {
      const categoryPlugins = this.categories.get(query.category);
      if (categoryPlugins) {
        results = results.filter((p) => categoryPlugins.has(p.metadata.id));
      } else {
        results = [];
      }
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((p) => {
        const pluginTags = p.metadata.tags || [];
        return query.tags!.some((tag) => pluginTags.includes(tag));
      });
    }

    // Filter by status
    if (query.status) {
      results = results.filter((p) => p.metadata.status === query.status);
    }

    // Filter by author
    if (query.author) {
      const authorPlugins = this.authors.get(query.author);
      if (authorPlugins) {
        results = results.filter((p) => authorPlugins.has(p.metadata.id));
      } else {
        results = [];
      }
    }

    // Filter by keywords
    if (query.keywords && query.keywords.length > 0) {
      const keywordsLower = query.keywords.map((k) => k.toLowerCase());
      results = results.filter((p) => {
        const text = [
          p.metadata.name,
          p.metadata.description,
          ...(p.metadata.tags || []),
          ...(p.metadata.keywords || []),
        ]
          .join(' ')
          .toLowerCase();

        return keywordsLower.some((kw) => text.includes(kw));
      });
    }

    return results;
  }

  /**
   * Get plugins by category
   */
  getByCategory(category: PluginCategory): Plugin[] {
    const categoryPlugins = this.categories.get(category);
    if (!categoryPlugins) {
      return [];
    }

    return Array.from(categoryPlugins)
      .map((id) => this.plugins.get(id))
      .filter((p): p is Plugin => p !== undefined);
  }

  /**
   * Get plugins by tag
   */
  getByTag(tag: string): Plugin[] {
    const tagPlugins = this.tags.get(tag);
    if (!tagPlugins) {
      return [];
    }

    return Array.from(tagPlugins)
      .map((id) => this.plugins.get(id))
      .filter((p): p is Plugin => p !== undefined);
  }

  /**
   * Get plugins by author
   */
  getByAuthor(author: string): Plugin[] {
    const authorPlugins = this.authors.get(author);
    if (!authorPlugins) {
      return [];
    }

    return Array.from(authorPlugins)
      .map((id) => this.plugins.get(id))
      .filter((p): p is Plugin => p !== undefined);
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
   * Get all authors
   */
  getAuthors(): string[] {
    return Array.from(this.authors.keys());
  }

  /**
   * Get plugin count
   */
  count(): number {
    return this.plugins.size;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.categories.clear();
    this.tags.clear();
    this.authors.clear();
  }
}
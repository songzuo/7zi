/**
 * MCP Prompts Management
 * 
 * Provides prompt template library, parameterization, and market interface:
 * - Predefined prompt template library
 * - Template parameterization and validation
 * - Template market interface
 * - Template versioning
 * - Template categories and tags
 * 
 * @module mcp/prompts
 */

import { z } from 'zod';

/**
 * Prompt category
 */
export type PromptCategory = 
  | 'coding'
  | 'writing'
  | 'analysis'
  | 'data'
  | 'security'
  | 'system'
  | 'testing'
  | 'documentation'
  | 'custom';

/**
 * Prompt status
 */
export type PromptStatus = 'active' | 'deprecated' | 'experimental' | 'disabled';

/**
 * Prompt parameter definition
 */
export interface PromptParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Description */
  description: string;
  /** Whether parameter is required */
  required: boolean;
  /** Default value */
  default?: unknown;
  /** Allowed values (for enums) */
  enum?: string[];
  /** Validation pattern */
  pattern?: string;
  /** Minimum value */
  minimum?: number;
  /** Maximum value */
  maximum?: number;
  /** Example value */
  example?: unknown;
}

/**
 * Prompt template metadata
 */
export interface PromptMetadata {
  /** Unique prompt identifier */
  id: string;
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Prompt category */
  category: PromptCategory;
  /** Keywords for search */
  tags: string[];
  /** Author */
  author?: string;
  /** Version */
  version: string;
  /** Status */
  status: PromptStatus;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Required capabilities (e.g., 'file:read', 'system:execute') */
  requiredCapabilities: string[];
  /** Estimated token cost */
  estimatedTokens?: number;
  /** Language (e.g., 'en', 'zh') */
  language?: string;
  /** Custom metadata */
  custom: Record<string, unknown>;
}

/**
 * Prompt template
 */
export interface PromptTemplate {
  /** Template metadata */
  metadata: PromptMetadata;
  /** Template content with placeholders */
  content: string;
  /** Parameter definitions */
  parameters: PromptParameter[];
  /** Example usage */
  examples: Array<{
    description: string;
    parameters: Record<string, unknown>;
    output: string;
  }>;
  /** Related prompts */
  relatedPrompts?: string[];
}

/**
 * Compiled prompt
 */
export interface CompiledPrompt {
  /** Compiled content */
  content: string;
  /** Used parameters */
  parameters: Record<string, unknown>;
  /** Metadata */
  metadata: PromptMetadata;
  /** Compilation timestamp */
  compiledAt: Date;
}

/**
 * Template marketplace listing
 */
export interface MarketplaceTemplate {
  /** Template ID */
  id: string;
  /** Template title */
  title: string;
  /** Description */
  description: string;
  /** Author */
  author: string;
  /** Version */
  version: string;
  /** Downloads count */
  downloads: number;
  /** Rating (0-5) */
  rating: number;
  /** Rating count */
  ratingCount: number;
  /** Tags */
  tags: string[];
  /** Price (free = 0) */
  price: number;
  /** License */
  license: string;
  /** Preview URL */
  previewUrl?: string;
  /** Homepage URL */
  homepageUrl?: string;
  /** Repository URL */
  repositoryUrl?: string;
  /** Published timestamp */
  publishedAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Marketplace search filter
 */
export interface MarketplaceFilter {
  /** Search query */
  query?: string;
  /** Category filter */
  category?: PromptCategory;
  /** Tag filter */
  tags?: string[];
  /** Minimum rating */
  minRating?: number;
  /** Price filter */
  priceRange?: { min: number; max: number };
  /** License filter */
  license?: string;
  /** Author filter */
  author?: string;
  /** Sort order */
  sort?: 'name' | 'downloads' | 'rating' | 'updated' | 'newest';
  /** Sort direction */
  order?: 'asc' | 'desc';
}

/**
 * MCP Prompts Manager
 * 
 * Manages prompt templates with library, parameterization, and marketplace.
 */
export class MCPPromptsManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private categories: Map<PromptCategory, Set<string>> = new Map();
  private marketplaceCache: Map<string, MarketplaceTemplate[]> = new Map();

  /**
   * Register a prompt template
   */
  register(template: PromptTemplate): void {
    const id = template.metadata.id;

    if (this.templates.has(id)) {
      throw new MCPPromptsError(`Template "${id}" is already registered`, 'TEMPLATE_EXISTS');
    }

    // Validate template
    this.validateTemplate(template);

    // Store template
    this.templates.set(id, template);

    // Update category index
    this.addToCategory(template.metadata.category, id);
  }

  /**
   * Unregister a prompt template
   */
  unregister(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    // Remove from category
    this.removeFromCategory(template.metadata.category, id);

    // Remove template
    this.templates.delete(id);

    return true;
  }

  /**
   * Get a prompt template by ID
   */
  get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Check if template exists
   */
  has(id: string): boolean {
    return this.templates.has(id);
  }

  /**
   * Get all templates
   */
  getAll(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getByCategory(category: PromptCategory): PromptTemplate[] {
    const ids = this.categories.get(category);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.templates.get(id))
      .filter((t): t is PromptTemplate => t !== undefined);
  }

  /**
   * Get templates by tags
   */
  getByTags(tags: string[]): PromptTemplate[] {
    return this.getAll().filter(template =>
      tags.some(tag => template.metadata.tags.includes(tag))
    );
  }

  /**
   * Search templates by query
   */
  search(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();

    return this.getAll().filter(template => {
      const metadata = template.metadata;
      return (
        metadata.id.toLowerCase().includes(lowerQuery) ||
        metadata.title.toLowerCase().includes(lowerQuery) ||
        metadata.description.toLowerCase().includes(lowerQuery) ||
        metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        template.content.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Compile a prompt template with parameters
   */
  compile(id: string, parameters: Record<string, unknown> = {}): CompiledPrompt {
    const template = this.templates.get(id);
    if (!template) {
      throw new MCPPromptsError(`Template "${id}" not found`, 'TEMPLATE_NOT_FOUND');
    }

    // Validate parameters
    this.validateParameters(template.parameters, parameters);

    // Check missing required parameters
    const missing = template.parameters
      .filter(p => p.required && !(p.name in parameters))
      .map(p => p.name);

    if (missing.length > 0) {
      throw new MCPPromptsError(
        `Missing required parameters: ${missing.join(', ')}`,
        'MISSING_PARAMETERS'
      );
    }

    // Apply defaults
    const resolved = { ...parameters };
    for (const param of template.parameters) {
      if (!(param.name in resolved) && param.default !== undefined) {
        resolved[param.name] = param.default;
      }
    }

    // Replace placeholders
    let content = template.content;
    for (const [key, value] of Object.entries(resolved)) {
      const placeholder = `{{${key}}}`;
      const placeholderAlt = `{${key}}`;
      content = content
        .replace(new RegExp(this.escapeRegex(placeholderAlt), 'g'), String(value))
        .replace(new RegExp(this.escapeRegex(placeholder), 'g'), String(value));
    }

    return {
      content,
      parameters: resolved,
      metadata: template.metadata,
      compiledAt: new Date(),
    };
  }

  /**
   * Validate parameters against schema
   */
  validateParameters(parameters: PromptParameter[], values: Record<string, unknown>): void {
    for (const param of parameters) {
      const value = values[param.name];

      if (value === undefined || value === null) {
        if (param.required) {
          throw new MCPPromptsError(
            `Required parameter "${param.name}" is missing`,
            'MISSING_PARAMETERS'
          );
        }
        continue;
      }

      // Type validation
      switch (param.type) {
        case 'string':
          if (typeof value !== 'string') {
            throw new MCPPromptsError(
              `Parameter "${param.name}" must be a string`,
              'INVALID_PARAMETER_TYPE'
            );
          }
          if (param.pattern && !new RegExp(param.pattern).test(value)) {
            throw new MCPPromptsError(
              `Parameter "${param.name}" does not match pattern`,
              'INVALID_PARAMETER_VALUE'
            );
          }
          if (param.enum && !param.enum.includes(value)) {
            throw new MCPPromptsError(
              `Parameter "${param.name}" must be one of: ${param.enum.join(', ')}`,
              'INVALID_PARAMETER_VALUE'
            );
          }
          break;

        case 'number':
          if (typeof value !== 'number') {
            throw new MCPPromptsError(
              `Parameter "${param.name}" must be a number`,
              'INVALID_PARAMETER_TYPE'
            );
          }
          if (param.minimum !== undefined && value < param.minimum) {
            throw new MCPPromptsError(
              `Parameter "${param.name}" must be >= ${param.minimum}`,
              'INVALID_PARAMETER_VALUE'
            );
          }
          if (param.maximum !== undefined && value > param.maximum) {
            throw new MCPPromptsError(
              `Parameter "${param.name}" must be <= ${param.maximum}`,
              'INVALID_PARAMETER_VALUE'
            );
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new MCPPromptsError(
              `Parameter "${param.name}" must be a boolean`,
              'INVALID_PARAMETER_TYPE'
            );
          }
          break;

        case 'array':
          if (!Array.isArray(value)) {
            throw new MCPPromptsError(
              `Parameter "${param.name}" must be an array`,
              'INVALID_PARAMETER_TYPE'
            );
          }
          break;

        case 'object':
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new MCPPromptsError(
              `Parameter "${param.name}" must be an object`,
              'INVALID_PARAMETER_TYPE'
            );
          }
          break;
      }
    }
  }

  /**
   * Export templates for marketplace
   */
  exportForMarketplace(): MarketplaceTemplate[] {
    return this.getAll().map(template => ({
      id: template.metadata.id,
      title: template.metadata.title,
      description: template.metadata.description,
      author: template.metadata.author || 'Unknown',
      version: template.metadata.version,
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      tags: template.metadata.tags,
      price: 0,
      license: template.metadata.custom.license as string || 'MIT',
      publishedAt: template.metadata.createdAt,
      updatedAt: template.metadata.updatedAt,
    }));
  }

  /**
   * Import template from marketplace
   */
  async importFromMarketplace(id: string, client: MarketplaceClient): Promise<void> {
    const template = await client.getTemplate(id);
    this.register(template);
  }

  /**
   * Get marketplace templates (with optional filter)
   */
  async getMarketplaceTemplates(
    filter: MarketplaceFilter = {},
    client?: MarketplaceClient
  ): Promise<MarketplaceTemplate[]> {
    const cacheKey = JSON.stringify(filter);

    if (this.marketplaceCache.has(cacheKey)) {
      return this.marketplaceCache.get(cacheKey)!;
    }

    // Use provided client or default
    const marketClient = client || new DefaultMarketplaceClient();
    const templates = await marketClient.search(filter);

    this.marketplaceCache.set(cacheKey, templates);

    return templates;
  }

  /**
   * Clear marketplace cache
   */
  clearMarketplaceCache(): void {
    this.marketplaceCache.clear();
  }

  /**
   * Get all categories
   */
  getCategories(): PromptCategory[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalTemplates: number;
    activeTemplates: number;
    deprecatedTemplates: number;
    experimentalTemplates: number;
    categories: number;
  } {
    const templates = this.getAll();
    return {
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.metadata.status === 'active').length,
      deprecatedTemplates: templates.filter(t => t.metadata.status === 'deprecated').length,
      experimentalTemplates: templates.filter(t => t.metadata.status === 'experimental').length,
      categories: this.categories.size,
    };
  }

  /**
   * Validate template definition
   */
  private validateTemplate(template: PromptTemplate): void {
    if (!template.metadata.id) {
      throw new MCPPromptsError('Template ID is required', 'INVALID_TEMPLATE');
    }

    if (!template.metadata.title) {
      throw new MCPPromptsError(`Template "${template.metadata.id}" must have a title`, 'INVALID_TEMPLATE');
    }

    if (!template.content) {
      throw new MCPPromptsError(`Template "${template.metadata.id}" must have content`, 'INVALID_TEMPLATE');
    }

    // Validate parameter definitions
    for (const param of template.parameters) {
      if (!param.name || !param.type) {
        throw new MCPPromptsError(
          `Template "${template.metadata.id}" has invalid parameter definition`,
          'INVALID_TEMPLATE'
        );
      }
    }

    // Check that all placeholders have parameters
    const placeholders = template.content.match(/\{+[\w.]+\}+/g) || [];
    const paramNames = new Set(template.parameters.map(p => p.name));

    for (const placeholder of placeholders) {
      const name = placeholder.replace(/[{}]+/g, '');
      if (!paramNames.has(name)) {
        console.warn(`Template "${template.metadata.id}" uses placeholder "${name}" without parameter definition`);
      }
    }
  }

  /**
   * Add template to category index
   */
  private addToCategory(category: PromptCategory, id: string): void {
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category)!.add(id);
  }

  /**
   * Remove template from category index
   */
  private removeFromCategory(category: PromptCategory, id: string): void {
    const categoryTemplates = this.categories.get(category);
    if (categoryTemplates) {
      categoryTemplates.delete(id);
      if (categoryTemplates.size === 0) {
        this.categories.delete(category);
      }
    }
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Marketplace client interface
 */
export interface MarketplaceClient {
  search(filter: MarketplaceFilter): Promise<MarketplaceTemplate[]>;
  getTemplate(id: string): Promise<PromptTemplate>;
  publish(template: PromptTemplate): Promise<string>;
  rate(id: string, rating: number): Promise<void>;
  download(id: string): Promise<PromptTemplate>;
}

/**
 * Default marketplace client (placeholder)
 */
export class DefaultMarketplaceClient implements MarketplaceClient {
  async search(filter: MarketplaceFilter = {}): Promise<MarketplaceTemplate[]> {
    // Placeholder implementation - should be replaced with actual marketplace API
    return [];
  }

  async getTemplate(id: string): Promise<PromptTemplate> {
    throw new Error('Marketplace not configured');
  }

  async publish(template: PromptTemplate): Promise<string> {
    throw new Error('Marketplace not configured');
  }

  async rate(id: string, rating: number): Promise<void> {
    throw new Error('Marketplace not configured');
  }

  async download(id: string): Promise<PromptTemplate> {
    throw new Error('Marketplace not configured');
  }
}

/**
 * MCP Prompts Error
 */
export class MCPPromptsError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'MCPPromptsError';
  }
}

/**
 * Global prompts manager instance
 */
export const mcpPromptsManager = new MCPPromptsManager();

/**
 * Initialize default prompt templates
 */
export function initializeDefaultPrompts(): void {
  // Code review template
  mcpPromptsManager.register({
    metadata: {
      id: 'code-review',
      title: 'Code Review',
      description: 'Review code for bugs, security issues, and best practices',
      category: 'coding',
      tags: ['code', 'review', 'security', 'quality'],
      author: '7zi',
      version: '1.0.0',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      requiredCapabilities: [],
      estimatedTokens: 500,
      language: 'en',
      custom: {},
    },
    content: `Please review the following code:

\`\`\`{{language}}
{{code}}
\`\`\`

Focus on:
1. Bug potential
2. Security vulnerabilities
3. Code style and best practices
4. Performance considerations
5. Suggestions for improvement

{{#if additionalContext}}
Additional context:
{{additionalContext}}
{{/if}}`,
    parameters: [
      {
        name: 'code',
        type: 'string',
        description: 'Code to review',
        required: true,
      },
      {
        name: 'language',
        type: 'string',
        description: 'Programming language',
        required: true,
        enum: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++'],
        default: 'typescript',
      },
      {
        name: 'additionalContext',
        type: 'string',
        description: 'Additional context about the code',
        required: false,
      },
    ],
    examples: [
      {
        description: 'Review a TypeScript function',
        parameters: {
          code: 'function add(a: number, b: number): number { return a + b; }',
          language: 'typescript',
        },
        output: 'The code is correct and follows TypeScript best practices...',
      },
    ],
  });

  // Data analysis template
  mcpPromptsManager.register({
    metadata: {
      id: 'data-analysis',
      title: 'Data Analysis',
      description: 'Analyze data and provide insights',
      category: 'data',
      tags: ['data', 'analysis', 'statistics', 'insights'],
      author: '7zi',
      version: '1.0.0',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      requiredCapabilities: [],
      estimatedTokens: 800,
      language: 'en',
      custom: {},
    },
    content: `Please analyze the following data:

{{#if jsonData}}
Data:
\`\`\`json
{{jsonData}}
\`\`\`
{{/if}}

{{#if csvData}}
CSV Data:
\`\`\`csv
{{csvData}}
\`\`\`
{{/if}}

{{#if description}}
Description: {{description}}
{{/if}}

Please provide:
1. Summary statistics
2. Key patterns and trends
3. Outliers and anomalies
4. Insights and recommendations
{{#if specificQuestions}}
5. Answers to: {{specificQuestions}}
{{/if}}`,
    parameters: [
      {
        name: 'jsonData',
        type: 'string',
        description: 'JSON data to analyze',
        required: false,
      },
      {
        name: 'csvData',
        type: 'string',
        description: 'CSV data to analyze',
        required: false,
      },
      {
        name: 'description',
        type: 'string',
        description: 'Description of the data',
        required: false,
      },
      {
        name: 'specificQuestions',
        type: 'string',
        description: 'Specific questions to answer',
        required: false,
      },
    ],
    examples: [],
  });

  // Security audit template
  mcpPromptsManager.register({
    metadata: {
      id: 'security-audit',
      title: 'Security Audit',
      description: 'Perform a security audit of code or configuration',
      category: 'security',
      tags: ['security', 'audit', 'vulnerability', 'hardening'],
      author: '7zi',
      version: '1.0.0',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      requiredCapabilities: [],
      estimatedTokens: 600,
      language: 'en',
      custom: {},
    },
    content: `Please perform a security audit of the following:

{{#if code}}
Code:
\`\`\`{{language}}
{{code}}
\`\`\`
{{/if}}

{{#if config}}
Configuration:
\`\`\`
{{config}}
\`\`\`
{{/if}}

Focus on:
1. Injection vulnerabilities (SQL, XSS, command injection)
2. Authentication and authorization issues
3. Data validation and sanitization
4. Cryptographic weaknesses
5. Information disclosure
6. Denial of service risks
7. Compliance with security best practices

{{#if additionalContext}}
Additional context:
{{additionalContext}}
{{/if}}`,
    parameters: [
      {
        name: 'code',
        type: 'string',
        description: 'Code to audit',
        required: false,
      },
      {
        name: 'language',
        type: 'string',
        description: 'Programming language',
        required: false,
        enum: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php'],
      },
      {
        name: 'config',
        type: 'string',
        description: 'Configuration to audit',
        required: false,
      },
      {
        name: 'additionalContext',
        type: 'string',
        description: 'Additional context',
        required: false,
      },
    ],
    examples: [],
  });
}

// Initialize default prompts
initializeDefaultPrompts();

export default MCPPromptsManager;

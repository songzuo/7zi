/**
 * 环境管理器
 * @module config-center/environment-manager
 * @version 1.10.0
 */

import {
  ConfigEnvironment,
  ConfigItem,
  ConfigGroup,
  ConfigTemplate,
} from './types';

/**
 * 环境配置
 */
export interface EnvironmentConfig {
  /** 环境名称 */
  name: string;
  /** 环境标识 */
  key: ConfigEnvironment;
  /** 环境描述 */
  description?: string;
  /** 父环境 (用于继承) */
  parentEnvironment?: ConfigEnvironment;
  /** 环境优先级 */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 环境管理器
 * 
 * 提供环境管理、配置继承、环境切换等功能
 */
export class EnvironmentManager {
  private environments: Map<ConfigEnvironment, EnvironmentConfig> = new Map();
  private groups: Map<string, ConfigGroup> = new Map();
  private templates: Map<string, ConfigTemplate> = new Map();

  constructor() {
    this.initializeDefaultEnvironments();
  }

  /**
   * 初始化默认环境
   */
  private initializeDefaultEnvironments(): void {
    const defaultEnvs: EnvironmentConfig[] = [
      {
        name: 'Development',
        key: 'development',
        description: 'Development environment for local testing',
        priority: 1,
        enabled: true,
      },
      {
        name: 'Staging',
        key: 'staging',
        description: 'Staging environment for pre-production testing',
        parentEnvironment: 'development',
        priority: 2,
        enabled: true,
      },
      {
        name: 'Production',
        key: 'production',
        description: 'Production environment for live users',
        parentEnvironment: 'staging',
        priority: 3,
        enabled: true,
      },
      {
        name: 'Test',
        key: 'test',
        description: 'Test environment for automated testing',
        priority: 0,
        enabled: true,
      },
    ];

    for (const env of defaultEnvs) {
      this.environments.set(env.key, env);
    }
  }

  /**
   * 获取环境列表
   */
  getEnvironments(): EnvironmentConfig[] {
    return Array.from(this.environments.values())
      .filter(env => env.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取环境配置
   */
  getEnvironment(key: ConfigEnvironment): EnvironmentConfig | undefined {
    return this.environments.get(key);
  }

  /**
   * 添加自定义环境
   */
  addEnvironment(config: EnvironmentConfig): void {
    if (this.environments.has(config.key)) {
      throw new Error(`Environment ${config.key} already exists`);
    }

    this.environments.set(config.key, config);
  }

  /**
   * 更新环境配置
   */
  updateEnvironment(
    key: ConfigEnvironment,
    updates: Partial<EnvironmentConfig>
  ): EnvironmentConfig {
    const existing = this.environments.get(key);
    if (!existing) {
      throw new Error(`Environment ${key} not found`);
    }

    const updated: EnvironmentConfig = {
      ...existing,
      ...updates,
      key, // 不能修改 key
    };

    this.environments.set(key, updated);
    return updated;
  }

  /**
   * 删除环境
   */
  deleteEnvironment(key: ConfigEnvironment): void {
    if (['development', 'staging', 'production', 'test'].includes(key)) {
      throw new Error(`Cannot delete default environment ${key}`);
    }

    this.environments.delete(key);
  }

  /**
   * 获取环境继承链
   */
  getInheritanceChain(environment: ConfigEnvironment): ConfigEnvironment[] {
    const chain: ConfigEnvironment[] = [environment];
    let current = this.environments.get(environment);

    while (current?.parentEnvironment) {
      chain.push(current.parentEnvironment);
      current = this.environments.get(current.parentEnvironment);
    }

    return chain;
  }

  /**
   * 合并环境配置 (继承)
   */
  mergeConfigsByEnvironment(
    configs: Map<ConfigEnvironment, ConfigItem[]>
  ): ConfigItem[] {
    const merged = new Map<string, ConfigItem>();

    // 按优先级从低到高处理
    const envOrder = this.getEnvironments()
      .sort((a, b) => a.priority - b.priority)
      .map(env => env.key);

    for (const env of envOrder) {
      const envConfigs = configs.get(env);
      if (envConfigs) {
        for (const config of envConfigs) {
          // 后面的环境覆盖前面的
          merged.set(config.key, config);
        }
      }
    }

    return Array.from(merged.values());
  }

  /**
   * 创建配置分组
   */
  createGroup(group: Omit<ConfigGroup, 'id' | 'createdAt' | 'updatedAt'>): ConfigGroup {
    const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newGroup: ConfigGroup = {
      ...group,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.groups.set(id, newGroup);
    return newGroup;
  }

  /**
   * 获取分组列表
   */
  getGroups(): ConfigGroup[] {
    return Array.from(this.groups.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * 获取分组
   */
  getGroup(id: string): ConfigGroup | undefined {
    return this.groups.get(id);
  }

  /**
   * 更新分组
   */
  updateGroup(id: string, updates: Partial<ConfigGroup>): ConfigGroup {
    const existing = this.groups.get(id);
    if (!existing) {
      throw new Error(`Group ${id} not found`);
    }

    const updated: ConfigGroup = {
      ...existing,
      ...updates,
      id, // 不能修改 id
      updatedAt: new Date(),
    };

    this.groups.set(id, updated);
    return updated;
  }

  /**
   * 删除分组
   */
  deleteGroup(id: string): void {
    this.groups.delete(id);
  }

  /**
   * 获取分组树结构
   */
  getGroupTree(): Map<string | undefined, ConfigGroup[]> {
    const tree = new Map<string | undefined, ConfigGroup[]>();

    for (const group of this.groups.values()) {
      const parentKey = group.parentId || undefined;
      
      if (!tree.has(parentKey)) {
        tree.set(parentKey, []);
      }
      
      tree.get(parentKey)!.push(group);
    }

    return tree;
  }

  /**
   * 创建配置模板
   */
  createTemplate(
    template: Omit<ConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): ConfigTemplate {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newTemplate: ConfigTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  /**
   * 获取模板列表
   */
  getTemplates(): ConfigTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 获取模板
   */
  getTemplate(id: string): ConfigTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * 更新模板
   */
  updateTemplate(id: string, updates: Partial<ConfigTemplate>): ConfigTemplate {
    const existing = this.templates.get(id);
    if (!existing) {
      throw new Error(`Template ${id} not found`);
    }

    const updated: ConfigTemplate = {
      ...existing,
      ...updates,
      id, // 不能修改 id
      updatedAt: new Date(),
    };

    this.templates.set(id, updated);
    return updated;
  }

  /**
   * 删除模板
   */
  deleteTemplate(id: string): void {
    this.templates.delete(id);
  }

  /**
   * 从模板应用配置
   */
  async applyTemplate(
    templateId: string,
    environment: ConfigEnvironment,
    overrides?: Record<string, unknown>
  ): Promise<ConfigItem[]> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const configs: ConfigItem[] = [];
    const now = new Date();

    for (const configTemplate of template.configs) {
      const config: ConfigItem = {
        ...configTemplate,
        id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        environment,
        value: overrides?.[configTemplate.key] ?? configTemplate.value,
        createdAt: now,
        updatedAt: now,
        createdBy: template.createdBy,
        updatedBy: template.createdBy,
        version: 1,
      };

      configs.push(config);
    }

    return configs;
  }

  /**
   * 合并继承的模板
   */
  mergeTemplateInheritance(templateId: string): ConfigTemplate['configs'] {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const mergedConfigs = new Map<string, ConfigTemplate['configs'][0]>();

    // 处理继承链
    if (template.inherits && template.inherits.length > 0) {
      for (const inheritedId of template.inherits) {
        const inheritedConfigs = this.mergeTemplateInheritance(inheritedId);
        
        for (const config of inheritedConfigs) {
          mergedConfigs.set(config.key, config);
        }
      }
    }

    // 当前模板的配置覆盖继承的配置
    for (const config of template.configs) {
      mergedConfigs.set(config.key, config);
    }

    return Array.from(mergedConfigs.values());
  }

  /**
   * 验证环境切换
   */
  validateEnvironmentSwitch(
    from: ConfigEnvironment,
    to: ConfigEnvironment
  ): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查目标环境是否存在
    if (!this.environments.has(to)) {
      errors.push(`Target environment ${to} does not exist`);
    }

    // 检查目标环境是否启用
    const targetEnv = this.environments.get(to);
    if (targetEnv && !targetEnv.enabled) {
      errors.push(`Target environment ${to} is disabled`);
    }

    // 检查是否为降级操作
    const fromEnv = this.environments.get(from);
    if (fromEnv && targetEnv && fromEnv.priority > targetEnv.priority) {
      warnings.push(
        `Switching from higher priority environment ${from} to ${to}. ` +
        `This may cause configuration conflicts.`
      );
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * 导出环境配置
   */
  exportEnvironment(environment: ConfigEnvironment): {
    environment: EnvironmentConfig;
    groups: ConfigGroup[];
    templates: ConfigTemplate[];
  } {
    const envConfig = this.environments.get(environment);
    if (!envConfig) {
      throw new Error(`Environment ${environment} not found`);
    }

    return {
      environment: envConfig,
      groups: this.getGroups(),
      templates: this.getTemplates(),
    };
  }

  /**
   * 导入环境配置
   */
  importEnvironment(config: {
    environment: EnvironmentConfig;
    groups?: ConfigGroup[];
    templates?: ConfigTemplate[];
  }): void {
    // 导入环境
    this.environments.set(config.environment.key, config.environment);

    // 导入分组
    if (config.groups) {
      for (const group of config.groups) {
        this.groups.set(group.id, group);
      }
    }

    // 导入模板
    if (config.templates) {
      for (const template of config.templates) {
        this.templates.set(template.id, template);
      }
    }
  }

  /**
   * 获取环境统计信息
   */
  getEnvironmentStats(): Record<ConfigEnvironment, {
    name: string;
    enabled: boolean;
    hasParent: boolean;
    priority: number;
  }> {
    const stats: Record<string, {
      name: string;
      enabled: boolean;
      hasParent: boolean;
      priority: number;
    }> = {};

    for (const [key, config] of this.environments) {
      stats[key] = {
        name: config.name,
        enabled: config.enabled,
        hasParent: !!config.parentEnvironment,
        priority: config.priority,
      };
    }

    return stats as Record<ConfigEnvironment, {
      name: string;
      enabled: boolean;
      hasParent: boolean;
      priority: number;
    }>;
  }
}

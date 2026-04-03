/**
 * Multi-Tenant Migration Script
 * 迁移到多租户架构
 */

import { db } from '../lib/db'
import { logger } from '../lib/logger'

interface MigrationConfig {
  dryRun: boolean
  defaultTenantName: string
  defaultTenantSlug: string
  batchSize: number
}

const defaultConfig: MigrationConfig = {
  dryRun: true,
  defaultTenantName: 'Default Tenant',
  defaultTenantSlug: 'default',
  batchSize: 100,
}

/**
 * 迁移管理器
 */
class MultiTenantMigration {
  private config: MigrationConfig

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * 执行迁移
   */
  async migrate(): Promise<void> {
    console.log('Starting multi-tenant migration...')
    console.log(`Dry run: ${this.config.dryRun}`)

    try {
      // 1. 备份数据库
      await this.backupDatabase()

      // 2. 检查数据库结构
      await this.checkDatabaseStructure()

      // 3. 创建默认租户
      const defaultTenantId = await this.createDefaultTenant()

      // 4. 为现有表添加 tenant_id 列
      await this.addTenantIdColumns()

      // 5. 迁移现有数据
      await this.migrateExistingData(defaultTenantId)

      // 6. 创建索引
      await this.createIndexes()

      // 7. 验证迁移
      await this.validateMigration()

      console.log('\n✅ Migration completed successfully!')
    } catch (error) {
      console.error('\n❌ Migration failed:', error)
      throw error
    }
  }

  /**
   * 备份数据库
   */
  private async backupDatabase(): Promise<void> {
    console.log('\n📦 Step 1: Backing up database...')

    if (this.config.dryRun) {
      console.log('  [DRY RUN] Would backup database')
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `/tmp/7zi-backup-${timestamp}.sqlite`

    await db.exec(`VACUUM INTO ?`, [backupPath])

    console.log(`  ✅ Backup created: ${backupPath}`)
  }

  /**
   * 检查数据库结构
   */
  private async checkDatabaseStructure(): Promise<void> {
    console.log('\n🔍 Step 2: Checking database structure...')

    // 检查必需的表
    const requiredTables = ['users', 'agents', 'workflows', 'conversations']

    for (const table of requiredTables) {
      const result = await db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
        [table]
      )

      if (!result || result.count === 0) {
        console.log(`  ⚠️  Table "${table}" not found, skipping...`)
      } else {
        console.log(`  ✅ Table "${table}" exists`)
      }
    }
  }

  /**
   * 创建默认租户
   */
  private async createDefaultTenant(): Promise<string> {
    console.log('\n🏢 Step 3: Creating default tenant...')

    const tenantId = `tenant_default_${Date.now()}`

    if (this.config.dryRun) {
      console.log(`  [DRY RUN] Would create tenant: ${tenantId}`)
      return tenantId
    }

    // 检查是否已存在
    const existing = await db.get<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [this.config.defaultTenantSlug]
    )

    if (existing) {
      console.log(`  ✅ Default tenant already exists: ${existing.id}`)
      return existing.id
    }

    // 创建租户
    await db.exec(`
      INSERT INTO tenants (id, name, slug, plan, status, isolation_mode)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      tenantId,
      this.config.defaultTenantName,
      this.config.defaultTenantSlug,
      'professional',
      'active',
      'shared',
    ])

    console.log(`  ✅ Created default tenant: ${tenantId}`)
    return tenantId
  }

  /**
   * 为现有表添加 tenant_id 列
   */
  private async addTenantIdColumns(): Promise<void> {
    console.log('\n🔧 Step 4: Adding tenant_id columns...')

    const tables = ['users', 'agents', 'workflows', 'conversations', 'messages', 'executions']

    for (const table of tables) {
      try {
        // 检查表是否存在
        const tableExists = await db.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
          [table]
        )

        if (!tableExists || tableExists.count === 0) {
          console.log(`  ⚠️  Table "${table}" not found, skipping...`)
          continue
        }

        // 检查是否已有 tenant_id 列
        const columns = await db.queryRows<{ name: string }>(
          `PRAGMA table_info(${table})`
        )

        const hasTenantId = columns.some(col => col.name === 'tenant_id')

        if (hasTenantId) {
          console.log(`  ✅ Table "${table}" already has tenant_id column`)
          continue
        }

        if (this.config.dryRun) {
          console.log(`  [DRY RUN] Would add tenant_id to ${table}`)
          continue
        }

        // 添加 tenant_id 列
        await db.exec(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT DEFAULT 'default'`)
        console.log(`  ✅ Added tenant_id to ${table}`)
      } catch (error) {
        console.error(`  ❌ Error processing table ${table}:`, error)
      }
    }
  }

  /**
   * 迁移现有数据
   */
  private async migrateExistingData(defaultTenantId: string): Promise<void> {
    console.log('\n📝 Step 5: Migrating existing data...')

    const tables = ['users', 'agents', 'workflows', 'conversations']

    for (const table of tables) {
      try {
        // 检查表是否存在
        const tableExists = await db.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
          [table]
        )

        if (!tableExists || tableExists.count === 0) {
          continue
        }

        // 获取需要更新的记录数
        const count = await db.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${table} WHERE tenant_id IS NULL OR tenant_id = 'default'`
        )

        if (!count || count.count === 0) {
          console.log(`  ✅ Table "${table}": no records to migrate`)
          continue
        }

        console.log(`  📊 Table "${table}": ${count.count} records to migrate`)

        if (this.config.dryRun) {
          console.log(`  [DRY RUN] Would update ${count.count} records in ${table}`)
          continue
        }

        // 批量更新
        const batches = Math.ceil(count.count / this.config.batchSize)

        for (let i = 0; i < batches; i++) {
          await db.exec(
            `UPDATE ${table} SET tenant_id = ? WHERE rowid IN (
              SELECT rowid FROM ${table} WHERE tenant_id IS NULL OR tenant_id = 'default'
              LIMIT ?
            )`,
            [defaultTenantId, this.config.batchSize]
          )

          console.log(`  ✅ Batch ${i + 1}/${batches} updated in ${table}`)
        }
      } catch (error) {
        console.error(`  ❌ Error migrating table ${table}:`, error)
      }
    }

    // 将所有用户添加为默认租户成员
    if (!this.config.dryRun) {
      console.log('\n  👥 Adding users as tenant members...')

      const users = await db.queryRows<{ id: string }>('SELECT id FROM users')

      for (const user of users) {
        try {
          await db.exec(`
            INSERT OR IGNORE INTO tenant_members (id, tenant_id, user_id, role, status)
            VALUES (?, ?, ?, ?, ?)
          `, [`member_${user.id}`, defaultTenantId, user.id, 'member', 'active'])
        } catch (error) {
          console.error(`    ❌ Error adding user ${user.id}:`, error)
        }
      }

      console.log(`  ✅ Added ${users.length} users as tenant members`)
    }
  }

  /**
   * 创建索引
   */
  private async createIndexes(): Promise<void> {
    console.log('\n📇 Step 6: Creating indexes...')

    const tables = ['users', 'agents', 'workflows', 'conversations']

    for (const table of tables) {
      const indexName = `idx_${table}_tenant`

      if (this.config.dryRun) {
        console.log(`  [DRY RUN] Would create index ${indexName}`)
        continue
      }

      try {
        await db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(tenant_id)`)
        console.log(`  ✅ Created index ${indexName}`)
      } catch (error) {
        console.error(`  ❌ Error creating index for ${table}:`, error)
      }
    }
  }

  /**
   * 验证迁移
   */
  private async validateMigration(): Promise<void> {
    console.log('\n✔️  Step 7: Validating migration...')

    const tables = ['users', 'agents', 'workflows', 'conversations']

    for (const table of tables) {
      try {
        // 检查是否有 tenant_id 为空的记录
        const nullCount = await db.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${table} WHERE tenant_id IS NULL`,
          []
        )

        if (nullCount && nullCount.count > 0) {
          console.error(`  ❌ Table "${table}" has ${nullCount.count} records without tenant_id`)
        } else {
          console.log(`  ✅ Table "${table}": all records have tenant_id`)
        }
      } catch (error) {
        console.error(`  ⚠️  Could not validate table ${table}:`, error)
      }
    }

    // 验证默认租户
    const tenant = await db.get<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [this.config.defaultTenantSlug]
    )

    if (tenant) {
      console.log(`  ✅ Default tenant exists: ${tenant.id}`)
    } else {
      console.error('  ❌ Default tenant not found')
    }
  }

  /**
   * 回滚迁移
   */
  async rollback(): Promise<void> {
    console.log('Rolling back multi-tenant migration...')

    if (this.config.dryRun) {
      console.log('[DRY RUN] Would rollback migration')
      return
    }

    // 删除 tenant_id 列（SQLite 不支持 DROP COLUMN，需要重建表）
    console.log('⚠️  Rollback requires manual intervention')
    console.log('Please restore from backup or recreate tables without tenant_id column')
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('-n')
  const rollback = args.includes('--rollback')

  const migration = new MultiTenantMigration({ dryRun })

  if (rollback) {
    await migration.rollback()
  } else {
    await migration.migrate()
  }
}

// 运行迁移
if (require.main === module) {
  main().catch(console.error)
}

export { MultiTenantMigration }

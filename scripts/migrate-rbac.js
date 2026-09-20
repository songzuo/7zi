#!/usr/bin/env node

/**
 * RBAC Migration Script
 * Run this script to apply RBAC database migration
 */

const { migrate } = require('./src/lib/permissions/migrations.ts')

console.log('🚀 Starting RBAC migration...\n')

migrate()
  .then(() => {
    console.log('\n✅ RBAC migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Verify roles are seeded in the database')
    console.log('2. Update existing users to use multi-role system')
    console.log('3. Apply RBAC middleware to API routes')
    console.log('4. Update frontend to use PermissionProvider')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ RBAC migration failed:', error)
    console.error('\nTroubleshooting:')
    console.error('- Check database connection')
    console.error('- Verify write permissions')
    console.error('- Review error messages above')
    process.exit(1)
  })

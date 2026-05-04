#!/usr/bin/env node
/**
 * 测试分组运行脚本
 * 根据复杂度和类型分组运行测试，提高整体速度
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// 读取复杂度分析结果
const analysisPath = path.join(process.cwd(), 'test-complexity-analysis.json')
const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'))

const groups = analysis.groups

// 定义测试分组（精简为 2 个配置）
const testGroups = [
  {
    name: 'fast',
    description: '快速测试（低复杂度）',
    files: groups.low.map(f => f.file).join(' '),
    config: 'vitest.config.ts', // 使用主配置
    timeout: '5m',
  },
  {
    name: 'normal',
    description: '常规测试（中等复杂度）',
    files: groups.medium.map(f => f.file).join(' '),
    config: 'vitest.config.ts', // 使用主配置
    timeout: '15m',
  },
  {
    name: 'slow',
    description: '慢速测试（高复杂度）',
    files: groups.high.map(f => f.file).join(' '),
    config: 'vitest.config.ts', // 使用主配置
    timeout: '30m',
  },
  {
    name: 'optimized',
    description: '优化配置（并行执行）',
    files: groups.all.map(f => f.file).join(' '),
    config: 'vitest.config.optimized.ts',
    timeout: '20m',
  },
]

// 命令行参数
const command = process.argv[2] || 'all'
const groupArg = process.argv[3]

function runGroup(group) {
  console.log(`\n🚀 运行 ${group.description}`)
  console.log(`   文件数: ${group.files ? group.files.split(' ').length : 0}`)
  console.log(`   配置: ${group.config}`)

  try {
    const vitestArgs = ['run', '--config', group.config]

    if (group.files && group.files.trim()) {
      vitestArgs.push('--', group.files)
    }

    const command = `npx vitest ${vitestArgs.join(' ')}`
    console.log(`\n执行: ${command}\n`)

    execSync(command, {
      stdio: 'inherit',
      timeout: group.timeout === '5m' ? 300000 : group.timeout === '15m' ? 900000 : 1800000,
    })

    console.log(`✅ ${group.description} 完成\n`)
  } catch (error) {
    console.error(`❌ ${group.description} 失败:`, error.message)
    process.exit(1)
  }
}

function runAllGroups() {
  console.log('🎯 运行所有测试组\n')

  for (const group of testGroups) {
    runGroup(group)
  }

  console.log('✨ 所有测试组运行完成\n')
}

function runSpecificGroup(groupName) {
  const group = testGroups.find(g => g.name === groupName)
  if (!group) {
    console.error(`❌ 未找到测试组: ${groupName}`)
    console.log(`可用组: ${testGroups.map(g => g.name).join(', ')}`)
    process.exit(1)
  }

  runGroup(group)
}

// 主逻辑
switch (command) {
  case 'fast':
  case 'normal':
  case 'slow':
    runSpecificGroup(command)
    break
  case 'all':
    runAllGroups()
    break
  case 'list':
    console.log('📋 可用测试组:\n')
    testGroups.forEach(g => {
      const count = g.files ? g.files.split(' ').length : 0
      console.log(`  ${g.name.padEnd(10)} - ${g.description} (${count} files)`)
    })
    console.log('\n用法: node scripts/run-test-groups.js [fast|normal|slow|all]')
    break
  default:
    console.log('用法: node scripts/run-test-groups.js [fast|normal|slow|all|list]')
    console.log('       node scripts/run-test-groups.js run [fast|normal|slow]')
    process.exit(1)
}

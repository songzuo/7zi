#!/usr/bin/env node

/**
 * 看板系统完整性验证脚本
 */

const fs = require('fs');
const path = require('path');

const checks = {
  files: [
    'app/kanban/TeamKanbanClient.tsx',
    'app/kanban/page.tsx',
    'components/TeamKanban.tsx',
    'components/KanbanColumn.tsx',
    'components/KanbanTaskCard.tsx',
    'components/TaskModal.tsx',
    'hooks/useKanbanStore.ts',
    'lib/types/kanban.ts',
  ],
  features: {
    'TeamKanbanClient.tsx': ['ClientComponent标记', 'TeamKanban导入'],
    'KanbanColumn.tsx': ['拖放事件', 'WIP限制', '任务列表渲染'],
    'KanbanTaskCard.tsx': ['拖拽属性', '优先级显示', '截止日期显示'],
    'TaskModal.tsx': ['表单验证', '创建/编辑任务', '删除功能'],
    'useKanbanStore.ts': ['Zustand store', '持久化', 'CRUD操作'],
    'TeamKanban.tsx': ['拖拽逻辑', '任务统计', '模态框集成'],
  },
};

console.log('🔍 看板系统完整性验证\n');

let totalChecks = 0;
let passedChecks = 0;

// 检查文件存在
console.log('📁 文件检查：');
for (const file of checks.files) {
  totalChecks++;
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
    passedChecks++;
  } else {
    console.log(`  ❌ ${file} - 文件不存在`);
  }
}

// 检查功能实现
console.log('\n⚙️  功能检查：');
for (const [file, features] of Object.entries(checks.features)) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf-8');

  console.log(`  ${file}:`);
  for (const feature of features) {
    totalChecks++;
    // 简化的功能检测
    let hasFeature = false;

    if (feature === 'ClientComponent标记') {
      hasFeature = content.includes("'use client'");
    } else if (feature === '拖放事件') {
      hasFeature = /onDrag(Start|End|Over|Leave|Drop)/.test(content);
    } else if (feature === 'WIP限制') {
      hasFeature = content.includes('limit');
    } else if (feature === '拖拽属性') {
      hasFeature = content.includes('draggable');
    } else if (feature === '优先级显示') {
      hasFeature = content.includes('priority') || content.includes('PRIORITY_CONFIG');
    } else if (feature === 'Zustand store') {
      hasFeature = content.includes('create<KanbanState>');
    } else if (feature === '持久化') {
      hasFeature = content.includes('persist') || content.includes('localStorage');
    } else if (feature === 'CRUD操作') {
      hasFeature = /addTask|updateTask|deleteTask|moveTask/.test(content);
    } else {
      hasFeature = content.includes(feature);
    }

    if (hasFeature) {
      console.log(`    ✅ ${feature}`);
      passedChecks++;
    } else {
      console.log(`    ❌ ${feature} - 未找到`);
    }
  }
}

// 检查导入导出一致性
console.log('\n🔗 导入导出检查：');
const imports = {
  'components/TeamKanban.tsx': [
    '../hooks/useKanbanStore',
    '../lib/types/kanban',
    './KanbanTaskCard',
    './KanbanColumn',
    './TaskModal',
  ],
};

for (const [file, requiredImports] of Object.entries(imports)) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf-8');

  console.log(`  ${file}:`);
  for (const imp of requiredImports) {
    totalChecks++;
    if (content.includes(imp)) {
      console.log(`    ✅ ${imp}`);
      passedChecks++;
    } else {
      console.log(`    ❌ ${imp} - 缺少导入`);
    }
  }
}

// 总结
console.log('\n📊 检查总结：');
console.log(`  总检查项: ${totalChecks}`);
console.log(`  通过: ${passedChecks}`);
console.log(`  失败: ${totalChecks - passedChecks}`);
console.log(`  完成率: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (passedChecks === totalChecks) {
  console.log('\n✨ 所有检查通过！看板系统完整。');
  process.exit(0);
} else {
  console.log('\n⚠️  部分检查失败，请查看上述详情。');
  process.exit(1);
}
#!/usr/bin/env node

/**
 * 修复未使用变量的脚本
 */

const fs = require('fs');

const eslintOutput = fs.readFileSync('eslint_output.txt', 'utf8');

// 简单统计
const unusedAssigned = (eslintOutput.match(/is assigned a value but never used/g) || []).length;
const unusedDefined = (eslintOutput.match(/is defined but never used/g) || []).length;
const unusedCatch = (eslintOutput.match(/'[^']*' is defined but never used.*catch/g) || []).length;

console.log('📊 ESLint 错误统计:');
console.log(`   总行数: ${eslintOutput.split('\n').length}`);
console.log(`   未使用的赋值变量: ${unusedAssigned}`);
console.log(`   未使用的定义: ${unusedDefined}`);
console.log(`\n💡 建议修复策略:`);
console.log('   1. 使用 eslint --fix 自动修复能修复的问题');
console.log('   2. 手动删除未使用的变量');
console.log('   3. 给 catch 错误参数加下划线前缀 (_err)');

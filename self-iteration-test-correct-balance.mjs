#!/usr/bin/env node
/**
 * Polymarket 自我迭代 - 测试正确余额参数
 */

import { ClobClient } from '/home/admin/clawd/polymarket-trading/node_modules/@polymarket/clob-client/dist/index.js';
import { Wallet } from '/home/admin/clawd/polymarket-trading/node_modules/ethers/lib/index.js';
import fs from 'fs';

// 手动加载环境变量
const envPath = '/home/admin/clawd/polymarket-trading/.env';
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#') && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

// 设置环境变量
Object.keys(envVars).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = envVars[key];
  }
});

// 初始化 client（Hybrid 模式）
const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;
const privateKey = process.env.POLY_PRIVATE_KEY;

if (!privateKey) {
  throw new Error('POLY_PRIVATE_KEY 未设置');
}

if (!privateKey.startsWith('0x')) {
  privateKey = '0x' + privateKey;
}

const signer = new Wallet(privateKey);
const creds = {
  key: process.env.CLOB_API_KEY,
  secret: process.env.CLOB_API_SECRET,
  passphrase: process.env.CLOB_API_PASSPHRASE,
};
const funder = '0x21C45407e6F62AF00738ba6D8655F53A19651f04';

const client = new ClobClient(
  HOST,
  CHAIN_ID,
  signer,
  creds,
  1,
  funder
);

console.log('='.repeat(70));
console.log('学习尝试 #2：测试正确余额参数');
console.log('='.repeat(70));

async function testCorrectBalanceParams() {
  console.log('\n✅ 关键发现！');
  console.log('getBalanceAllowance 需要 asset_type 参数');
  console.log('正确的用法: await client.getBalanceAllowance({ asset_type: \'COLLATERAL\' })');
  console.log('或: await client.getBalanceAllowance({ asset_type: \'CONDITIONAL\' })');

  console.log('\n' + '='.repeat(70));
  console.log('测试 A：COLLATERAL');
  console.log('='.repeat(70));

  try {
    console.log('\n代码: await client.getBalanceAllowance({ asset_type: \'COLLATERAL\' })');
    const collateralBalance = await client.getBalanceAllowance({ asset_type: 'COLLATERAL' });
    console.log('✅ COLLATERAL 余额查询成功！');
    console.log('返回值:', JSON.stringify(collateralBalance, null, 2));
    return { success: true, type: 'COLLATERAL', result: collateralBalance };
  } catch (e) {
    console.log('❌ COLLATERAL 余额查询失败:', e.message);
    return { success: false, type: 'COLLATERAL', error: e.message };
  }

  console.log('\n' + '='.repeat(70));
  console.log('测试 B：CONDITIONAL');
  console.log('='.repeat(70));

  try {
    console.log('\n代码: await client.getBalanceAllowance({ asset_type: \'CONDITIONAL\' })');
    const conditionalBalance = await client.getBalanceAllowance({ asset_type: 'CONDITIONAL' });
    console.log('✅ CONDITIONAL 余额查询成功！');
    console.log('返回值:', JSON.stringify(conditionalBalance, null, 2));
    return { success: true, type: 'CONDITIONAL', result: conditionalBalance };
  } catch (e) {
    console.log('❌ CONDITIONAL 余额查询失败:', e.message);
    return { success: false, type: 'CONDITIONAL', error: e.message };
  }
}

async function testUpdateAllowance() {
  console.log('\n' + '='.repeat(70));
  console.log('测试 C：updateBalanceAllowance（正确参数）');
  console.log('='.repeat(70));

  try {
    console.log('\n代码: await client.updateBalanceAllowance({ amount: \'99.58\' })');
    await client.updateBalanceAllowance({ amount: '99.58' });
    console.log('✅ updateBalanceAllowance 成功！');
    
    // 然后查询余额
    console.log('\n查询更新后的余额...');
    const collateralBalance = await client.getBalanceAllowance({ asset_type: 'COLLATERAL' });
    console.log('COLLATERAL 余额:', JSON.stringify(collateralBalance, null, 2));
    
    return { success: true, result: collateralBalance };
  } catch (e) {
    console.log('❌ updateBalanceAllowance 失败:', e.message);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🧬 Polymarket 自我迭代 - 测试正确余额参数\n');

  const results = {
    testA: null,
    testB: null,
    testC: null,
  };

  // 测试 A：COLLATERAL
  results.testA = await testCorrectBalanceParams();
  
  // 如果测试 A 失败，测试 B：CONDITIONAL
  if (!results.testA.success) {
    results.testB = await testCorrectBalanceParams();
  }

  // 输出总结
  console.log('\n\n' + '='.repeat(70));
  console.log('学习尝试 #2 总结');
  console.log('='.repeat(70));

  console.log('\n测试 A：COLLATERAL');
  if (results.testA.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testA.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testA.error);
  }

  if (results.testB) {
    console.log('\n测试 B：CONDITIONAL');
    if (results.testB.success) {
      console.log('结果: 成功');
      console.log('返回值:', JSON.stringify(results.testB.result, null, 2));
    } else {
      console.log('结果: 失败');
      console.log('错误:', results.testB.error);
    }
  }

  // 检查是否至少一个成功
  const balanceQuerySuccess = results.testA.success || (results.testB && results.testB.success);

  // 如果都失败，尝试 updateBalanceAllowance
  if (!balanceQuerySuccess) {
    console.log('\n' + '='.repeat(70));
    console.log('学习尝试 #3：updateBalanceAllowance');
    console.log('='.repeat(70));

    results.testC = await testUpdateAllowance();

    console.log('\n测试 C：updateBalanceAllowance');
    if (results.testC.success) {
      console.log('结果: 成功');
      console.log('返回值:', JSON.stringify(results.testC.result, null, 2));
    } else {
      console.log('结果: 失败');
      console.log('错误:', results.testC.error);
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('最终结果');
  console.log('='.repeat(70));

  if (balanceQuerySuccess) {
    console.log('\n✅ 余额查询成功！');
    console.log('正确参数: asset_type: \'COLLATERAL\' 或 asset_type: \'CONDITIONAL\'');
    console.log('\n标记为: "自我迭代成功 - 余额查询修复"');
  } else if (results.testC && results.testC.success) {
    console.log('\n✅ updateBalanceAllowance 成功！');
    console.log('余额查询可能需要在 update 之后才能工作');
    console.log('\n标记为: "自我迭代部分成功 - updateAllowance 工作"');
  } else {
    console.log('\n❌ 所有余额查询都失败');
    console.log('错误原因: 可能需要不同的方法或 API 版本');
    console.log('\n标记为: "自我迭代失败 - 需要进一步分析"');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 学习尝试完成');
  console.log('='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

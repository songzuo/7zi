#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 余额接口测试
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

async function testA() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试A：getBalanceAllowance({ asset: \'USDC\' })');
  console.log('━'.repeat(70));

  const privateKey = envVars.POLY_PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith('0x')) {
    if (!privateKey) {
      throw new Error('POLY_PRIVATE_KEY 未设置');
    }
    privateKey = '0x' + privateKey;
  }

  const wallet = new Wallet(privateKey);

  const userApiCreds = {
    key: envVars.CLOB_API_KEY,
    secret: envVars.CLOB_API_SECRET,
    passphrase: envVars.CLOB_API_PASSPHRASE,
  };

  const builderConfig = {
    key: envVars.POLY_BUILDER_API_KEY,
    secret: envVars.POLY_BUILDER_SECRET,
    passphrase: envVars.POLY_BUILDER_PASSPHRASE,
  };

  const client = new ClobClient(
    'https://clob.polymarket.com',
    137,
    wallet,
    userApiCreds,
    1,
    envVars.FUNDER_ADDRESS,
    undefined,
    false,
    builderConfig
  );

  console.log('\n调用: await client.getBalanceAllowance({ asset: \'USDC\' })');

  try {
    const balance = await client.getBalanceAllowance({ asset: 'USDC' });
    console.log('测试A 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试A 失败:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function testB() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试B：getBalanceAllowance() - 不带参数');
  console.log('━'.repeat(70));

  const privateKey = envVars.POLY_PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith('0x')) {
    if (!privateKey) {
      throw new Error('POLY_PRIVATE_KEY 未设置');
    }
    privateKey = '0x' + privateKey;
  }

  const wallet = new Wallet(privateKey);

  const userApiCreds = {
    key: envVars.CLOB_API_KEY,
    secret: envVars.CLOB_API_SECRET,
    passphrase: envVars.CLOB_API_PASSPHRASE,
  };

  const builderConfig = {
    key: envVars.POLY_BUILDER_API_KEY,
    secret: envVars.POLY_BUILDER_SECRET,
    passphrase: envVars.POLY_BUILDER_PASSPHRASE,
  };

  const client = new ClobClient(
    'https://clob.polymarket.com',
    137,
    wallet,
    userApiCreds,
    1,
    envVars.FUNDER_ADDRESS,
    undefined,
    false,
    builderConfig
  );

  console.log('\n调用: await client.getBalanceAllowance()');

  try {
    const balance = await client.getBalanceAllowance();
    console.log('测试B 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试B 失败:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function testC() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试C：getBalanceAllowance({ asset: \'usdc\' })');
  console.log('━'.repeat(70));

  const privateKey = envVars.POLY_PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith('0x')) {
    if (!privateKey) {
      throw new Error('POLY_PRIVATE_KEY 未设置');
    }
    privateKey = '0x' + privateKey;
  }

  const wallet = new Wallet(privateKey);

  const userApiCreds = {
    key: envVars.CLOB_API_KEY,
    secret: envVars.CLOB_API_SECRET,
    passphrase: envVars.CLOB_API_PASSPHRASE,
  };

  const builderConfig = {
    key: envVars.POLY_BUILDER_API_KEY,
    secret: envVars.POLY_BUILDER_SECRET,
    passphrase: envVars.POLY_BUILDER_PASSPHRASE,
  };

  const client = new ClobClient(
    'https://clob.polymarket.com',
    137,
    wallet,
    userApiCreds,
    1,
    envVars.FUNDER_ADDRESS,
    undefined,
    false,
    builderConfig
  );

  console.log('\n调用: await client.getBalanceAllowance({ asset: \'usdc\' })');

  try {
    const balance = await client.getBalanceAllowance({ asset: 'usdc' });
    console.log('测试C 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试C 失败:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 余额接口测试\n');

  const results = {
    testA: null,
    testB: null,
    testC: null,
  };

  // 测试A
  results.testA = await testA();

  // 测试B
  results.testB = await testB();

  // 测试C
  results.testC = await testC();

  // 输出总结
  console.log('\n' + '━'.repeat(70));
  console.log('测试总结');
  console.log('━'.repeat(70));

  console.log('\n测试A：getBalanceAllowance({ asset: \'USDC\' })');
  if (results.testA.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testA.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testA.error);
  }

  console.log('\n测试B：getBalanceAllowance() - 不带参数');
  if (results.testB.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testB.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testB.error);
  }

  console.log('\n测试C：getBalanceAllowance({ asset: \'usdc\' })');
  if (results.testC.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testC.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testC.error);
  }

  // 检查是否有接近 99.58 的数字
  const allResults = [results.testA, results.testB, results.testC];
  let foundBalance = null;

  for (const result of allResults) {
    if (result.success && result.result) {
      const str = JSON.stringify(result.result);
      const match = str.match(/(\d+\.?\d*)/);

      if (match) {
        const num = parseFloat(match[1]);
        if (num > 10 && num < 200 && Math.abs(num - 99.58) < 50) {
          foundBalance = num;
          break;
        }
      }

      // 检查 balanceAllowances 数组
      if (result.result.balanceAllowances) {
        for (const allowance of result.result.balanceAllowances) {
          const available = parseFloat(allowance.balance.available);
          if (available > 10 && available < 200 && Math.abs(available - 99.58) < 50) {
            foundBalance = available;
            break;
          }
        }
      }
    }
  }

  console.log('\n' + '━'.repeat(70));
  console.log('最终结果');
  console.log('━'.repeat(70));

  if (foundBalance !== null) {
    console.log('\n✅ 找到接近 99.58 的余额');
    console.log(`余额值: ${foundBalance.toFixed(2)}`);
    console.log('\n标记为: "余额查询成功"');
  } else {
    console.log('\n❌ 未找到接近 99.58 的余额');
    console.log('\n标记为: "余额查询失败"');
  }

  console.log('\n' + '━'.repeat(70));
  console.log('✅ 测试完成');
  console.log('━'.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

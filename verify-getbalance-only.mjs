#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 仅验证 client.getBalance()
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

async function verifyGetBalance() {
  console.log('━'.repeat(70));
  console.log('验证步骤：调用 client.getBalance()');
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

  console.log('\n尝试调用 client.getBalance()...');

  try {
    if (typeof client.getBalance === 'function') {
      const result = await client.getBalance();
      
      console.log('\n✅ 收到响应！');
      console.log('\n原始返回结果（JSON 文本）：');
      console.log(JSON.stringify(result, null, 2));
      
      return { success: true, result };
    } else {
      console.log('\n❌ client.getBalance 不是函数');
      console.log('\n可用的方法：');
      console.log('  - getBalanceAllowance(params)');
      console.log('  - getOpenOrders(params)');
      console.log('  - getMarkets(params)');
      console.log('  - getTrades(params)');
      
      return { success: false, error: 'Method not found' };
    }
  } catch (error) {
    console.log('\n❌ 调用失败');
    console.log('\nAPI 原始错误：');
    console.log(error.message);
    console.log(error.stack);

    if (error.response) {
      console.log('\nHTTP 状态码:', error.response.status);
      console.log('\nHTTP 响应：');
      console.log(JSON.stringify(error.response.data, null, 2));
    }

    return { success: false, error };
  }
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - client.getBalance()\n');

  const result = await verifyGetBalance();

  console.log('\n\n' + '━'.repeat(70));
  console.log('验证结果：client.getBalance()');
  console.log('━'.repeat(70));

  if (result.success) {
    console.log('\n✅ 成功！');
    console.log('原始返回结果已输出');

    if (result.result && result.result.balances) {
      console.log('\n找到资产列表：');
      console.log(`  总数: ${result.result.balances.length}`);

      result.result.balances.forEach((balance, index) => {
        console.log(`\n  资产 #${index + 1}:`);
        console.log(`    资产: ${balance.assetId}`);
        console.log(`    可用: ${balance.balance.available}`);
        console.log(`    锁定: ${balance.balance.locked}`);
      });
    }
  } else {
    console.log('\n❌ 失败！');
    console.log('API 原始错误已输出');
    console.log('\n💡 结论: User CLOB 凭证无法通过 getBalance() 读取托管余额');
  }

  console.log('\n' + '━'.repeat(70));
  console.log('✅ 验证完成');
  console.log('━'.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ 严重错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

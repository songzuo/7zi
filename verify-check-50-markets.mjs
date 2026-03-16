#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 检查前 50 个市场
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
console.log('检查前 50 个市场（find accepting_orders: true）');
console.log('='.repeat(70));

async function checkFirstMarkets() {
  console.log('\n第一步：获取所有市场');

  try {
    const marketsResult = await client.getMarkets();

    let marketsArray = [];
    if (Array.isArray(marketsResult)) {
      marketsArray = marketsResult;
    } else if (marketsResult.data && Array.isArray(marketsResult.data)) {
      marketsArray = marketsResult.data;
    }

    console.log(`获取到 ${marketsArray.length} 个市场`);

    // 检查前 50 个市场
    console.log('\n检查前 50 个市场：');

    let validMarketFound = false;
    let validMarket = null;
    let validToken = null;

    for (let i = 0; i < Math.min(50, marketsArray.length); i++) {
      const market = marketsArray[i];

      console.log(`\n市场 #${i + 1}:`);
      console.log(`  标题: ${market.question}`);
      console.log(`  accepting_orders: ${market.accepting_orders}`);
      console.log(`  closed: ${market.closed}`);

      if (!market.tokens || market.tokens.length === 0) {
        console.log(`  无有效代币`);
        continue;
      }

      const token = market.tokens[0];
      const price = token.price;

      console.log(`  Token ID: ${token.token_id}`);
      console.log(`  价格: ${(price * 100).toFixed(2)}%`);

      // 检查价格是否在允许范围内（0.01 - 0.99）
      if (price < 0.01 || price > 0.99) {
        console.log(`  价格超出允许范围（0.01 - 0.99）`);
        continue;
      }

      console.log(`  ✅ 价格有效！`);

      // 检查 accepting_orders 是否为 true 且市场未关闭
      if (market.accepting_orders === true && market.closed === false) {
        console.log(`  ✅ 接受订单且市场开放！`);

        validMarketFound = true;
        validMarket = market;
        validToken = token;
        break;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('检查结果');
    console.log('='.repeat(70));

    if (validMarketFound) {
      console.log('\n✅ 找到有效市场！');
      console.log(`\n市场信息:`);
      console.log(`  标题: ${validMarket.question}`);
      console.log(`  Volume: $${(validMarket.volume / 1000).toFixed(2)}K`);
      console.log(`  accepting_orders: ${validMarket.accepting_orders}`);
      console.log(`  closed: ${validMarket.closed}`);
      console.log(`\nToken 信息:`);
      console.log(`  Token ID: ${validToken.token_id}`);
      console.log(`  价格: ${(validToken.price * 100).toFixed(2)}%`);

      // 计算订单参数
      const amount = 1; // 1 USDC
      const size = amount / validToken.price;

      console.log(`\n订单参数:`);
      console.log(`  Amount: $${amount} USDC`);
      console.log(`  数量: ${size.toFixed(6)} 股`);

      return { success: true, market: validMarket, token: validToken, amount, size };
    } else {
      console.log('\n❌ 前 50 个市场中没有找到有效市场');
      console.log('\n建议:');
      console.log('  1. 检查更多市场（前 100 个）');
      console.log('  2. 降低价格限制（允许 0.00 - 1.00）');
      console.log('  3. 查看其他市场数据源');
      console.log('  4. 当前时间可能不是交易高峰期');

      return { success: false, error: 'No valid market found in first 50' };
    }

  } catch (e) {
    console.log('\n❌ 获取市场失败');
    console.log('错误:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 检查前 50 个市场\n');

  const result = await checkFirstMarkets();

  console.log('\n\n' + '='.repeat(70));
  console.log('最终结果');
  console.log('='.repeat(70));

  if (result.success) {
    console.log('\n✅ 找到有效市场，可以继续测试交易');
    console.log('\n市场信息已输出');
  } else {
    console.log('\n❌ 未找到有效市场');
    console.log('\n建议:');
    console.log('  1. 当前时间可能不是交易高峰期');
    console.log('  2. 检查更多市场或等待更长时间');
    console.log('  3. 使用其他市场数据源或查看 Polymarket 网站');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 检查完成');
  console.log('='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

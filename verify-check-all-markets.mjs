#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 检查所有市场
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
console.log('检查所有市场（find accepting_orders: true && closed: false）');
console.log('='.repeat(70));

async function checkAllMarkets() {
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

    // 检查所有市场
    console.log('\n检查所有市场（查找活跃市场）...');

    let activeMarketCount = 0;
    let activeMarkets = [];

    for (let i = 0; i < marketsArray.length; i++) {
      const market = marketsArray[i];

      // 检查是否接受订单且未关闭
      if (market.accepting_orders === true && market.closed === false) {
        activeMarketCount++;

        if (activeMarketCount <= 5) {
          console.log(`\n活跃市场 #${activeMarketCount}:`);
          console.log(`  标题: ${market.question}`);
          console.log(`  Volume: $${(market.volume / 1000).toFixed(2)}K`);
          console.log(`  accepting_orders: ${market.accepting_orders}`);
          console.log(`  closed: ${market.closed}`);
          
          if (market.tokens && market.tokens.length > 0) {
            const token = market.tokens[0];
            console.log(`  Token ID: ${token.token_id}`);
            console.log(`  价格: ${(token.price * 100).toFixed(2)}%`);
          }
        }

        activeMarkets.push(market);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('检查结果');
    console.log('='.repeat(70));

    console.log(`\n找到 ${activeMarketCount} 个活跃市场（accepting_orders: true && closed: false）`);

    if (activeMarketCount > 0) {
      console.log('\n前 5 个活跃市场（如果存在）：');
      activeMarkets.slice(0, 5).forEach((market, index) => {
        console.log(`\n活跃市场 #${index + 1}:`);
        console.log(`  标题: ${market.question}`);
        console.log(`  Volume: $${(market.volume / 1000).toFixed(2)}K`);
        console.log(`  accepting_orders: ${market.accepting_orders}`);
        console.log(`  closed: ${market.closed}`);
        
        if (market.tokens && market.tokens.length > 0) {
          const token = market.tokens[0];
          console.log(`  Token ID: ${token.token_id}`);
          console.log(`  价格: ${(token.price * 100).toFixed(2)}%`);
        }
      });

      return { success: true, activeMarketCount, activeMarkets };
    } else {
      console.log('\n❌ 没有找到活跃市场');
      console.log('\n可能原因：');
      console.log('  1. 当前时间不是交易高峰期');
      console.log('  2. 所有市场都已关闭');
      console.log('  3. 市场数据延迟');
      return { success: false, error: 'No active markets found' };
    }

  } catch (e) {
    console.log('\n❌ 获取市场失败');
    console.log('错误:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 检查所有市场\n');

  const result = await checkAllMarkets();

  console.log('\n' + '='.repeat(70));
  console.log('最终结果');
  console.log('='.repeat(70));

  if (result.success) {
    console.log('\n✅ 找到活跃市场');
    console.log(`\n活跃市场数量: ${result.activeMarketCount}`);
    console.log('\n可以继续测试交易功能');
  } else {
    console.log('\n❌ 未找到活跃市场');
    console.log('错误:', result.error);
    console.log('\n建议:');
    console.log('  1. 等待交易高峰期');
    console.log('  2. 查看 Polymarket 网站确认活跃市场');
    console.log('  3. 检查 API 数据是否完整');
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

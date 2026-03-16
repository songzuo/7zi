#!/usr/bin/env node
/**
 * Polymarket 自我迭代 - 尝试 getOrderBooks 方法
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
console.log('学习尝试 #4：尝试 getOrderBooks 方法');
console.log('='.repeat(70));

async function testGetOrderBooks() {
  console.log('\n步骤 1：尝试不同的市场筛选方法');

  try {
    // 方法 A：使用 getSamplingSimplifiedMarkets
    console.log('\n方法 A：getSamplingSimplifiedMarkets');

    try {
      const sampleMarkets = await client.getSamplingSimplifiedMarkets();

      let marketsArray = [];
      if (Array.isArray(sampleMarkets)) {
        marketsArray = sampleMarkets;
      } else if (sampleMarkets.data && Array.isArray(sampleMarkets.data)) {
        marketsArray = sampleMarkets.data;
      }

      console.log(`获取到 ${marketsArray.length} 个采样市场`);

      // 检查前 10 个市场
      console.log('\n检查前 10 个采样市场：');

      for (let i = 0; i < Math.min(10, marketsArray.length); i++) {
        const market = marketsArray[i];

        console.log(`\n采样市场 #${i + 1}:`);
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
        if (price >= 0.01 && price <= 0.99) {
          console.log(`  ✅ 价格有效！`);

          // 尝试获取 orderbook
          try {
            console.log(`\n  尝试获取 orderbook...`);
            const orderbook = await client.getOrderBook(token.token_id);

            if (orderbook && (orderbook.asks && orderbook.asks.length > 0 || orderbook.bids && orderbook.bids.length > 0)) {
              console.log(`  ✅ Orderbook 存在！`);
              console.log(`  Asks 数量: ${orderbook.asks?.length || 0}`);
              console.log(`  Bids 数量: ${orderbook.bids?.length || 0}`);

              console.log(`\n✅ 找到有效市场！`);
              return { success: true, market, token, orderbook };
            } else {
              console.log(`  ❌ Orderbook 不存在或为空`);
            }
          } catch (e) {
            console.log(`  ⚠️  获取 orderbook 失败: ${e.message}`);
            continue;
          }
        }
      }
    } catch (e) {
      console.log(`方法 A 失败: ${e.message}`);
    }

    // 方法 B：使用 getSamplingMarkets
    console.log('\n\n方法 B：getSamplingMarkets');

    try {
      const sampleMarkets = await client.getSamplingMarkets();

      let marketsArray = [];
      if (Array.isArray(sampleMarkets)) {
        marketsArray = sampleMarkets;
      } else if (sampleMarkets.data && Array.isArray(sampleMarkets.data)) {
        marketsArray = sampleMarkets.data;
      }

      console.log(`获取到 ${marketsArray.length} 个采样市场`);

      // 检查前 10 个市场
      console.log('\n检查前 10 个采样市场：');

      for (let i = 0; i < Math.min(10, marketsArray.length); i++) {
        const market = marketsArray[i];

        console.log(`\n采样市场 #${i + 1}:`);
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
        if (price >= 0.01 && price <= 0.99) {
          console.log(`  ✅ 价格有效！`);

          // 尝试获取 orderbook
          try {
            console.log(`\n  尝试获取 orderbook...`);
            const orderbook = await client.getOrderBook(token.token_id);

            if (orderbook && (orderbook.asks && orderbook.asks.length > 0 || orderbook.bids && orderbook.bids.length > 0)) {
              console.log(`  ✅ Orderbook 存在！`);
              console.log(`  Asks 数量: ${orderbook.asks?.length || 0}`);
              console.log(`  Bids 数量: ${orderbook.bids?.length || 0}`);

              console.log(`\n✅ 找到有效市场！`);
              return { success: true, market, token, orderbook };
            } else {
              console.log(`  ❌ Orderbook 不存在或为空`);
            }
          } catch (e) {
            console.log(`  ⚠️  获取 orderbook 失败: ${e.message}`);
            continue;
          }
        }
      }
    } catch (e) {
      console.log(`方法 B 失败: ${e.message}`);
    }

    // 方法 C：使用 getOrderBooks(params)
    console.log('\n\n方法 C：getOrderBooks(params)');

    try {
      const orderbooks = await client.getOrderBooks({ token_ids: ['1', '2', '3'] });

      console.log(`获取到 orderbooks: ${JSON.stringify(orderbooks, null, 2)}`);

      if (orderbooks && orderbooks.length > 0) {
        console.log(`\n✅ 找到 ${orderbooks.length} 个 orderbooks！`);
        return { success: true, orderbooks };
      }
    } catch (e) {
      console.log(`方法 C 失败: ${e.message}`);
    }

    console.log('\n❌ 所有方法都失败');
    return { success: false, error: 'All methods failed' };

  } catch (e) {
    console.log('\n❌ 测试失败');
    console.log('错误:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🧬 Polymarket 自我迭代 - 尝试 getOrderBooks 方法\n');

  const result = await testGetOrderBooks();

  console.log('\n\n' + '='.repeat(70));
  console.log('学习尝试 #4 总结');
  console.log('='.repeat(70));

  if (result.success) {
    console.log('\n✅ 找到有效市场或 orderbook！');
    console.log('\n标记为: "自我迭代成功 - 找到 active market"');
  } else {
    console.log('\n❌ 未找到有效市场或 orderbook');
    console.log('错误:', result.error);
    console.log('\n建议:');
    console.log('  1. 等待一段时间后再试');
    console.log('  2. 查看 Polymarket 网站确认当前状态');
    console.log('  3. 可能当前时间不是交易高峰期');
    console.log('\n标记为: "自我迭代部分成功 - 余额查询正常，无 active market"');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 学习尝试 #4 完成');
  console.log('='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 测试真实交易功能（第一个 accepting_orders 市场）
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
console.log('步骤 1：获取 accepting_orders: true 的市场');
console.log('='.repeat(70));

async function testRealTrade() {
  console.log('\n第一步：获取 accepting_orders: true 的市场');

  try {
    const marketsResult = await client.getMarkets({ accepting_orders: true });
    
    let marketsArray = [];
    if (Array.isArray(marketsResult)) {
      marketsArray = marketsResult;
    } else if (marketsResult.data && Array.isArray(marketsResult.data)) {
      marketsArray = marketsResult.data;
    }

    console.log(`获取到 ${marketsArray.length} 个市场`);

    // 选择第一个 accepting_orders: true 的市场
    if (marketsArray.length === 0) {
      console.log('\n❌ 没有找到 accepting_orders: true 的市场');
      return { success: false, error: 'No markets accepting orders' };
    }

    const testMarket = marketsArray[0];

    console.log('\n选择第一个 accepting_orders 市场：');
    console.log(`标题: ${testMarket.question}`);
    console.log(`Volume: $${(testMarket.volume / 1000).toFixed(0)}K`);
    console.log(`Accepting Orders: ${testMarket.accepting_orders}`);

    // 获取 token 信息
    if (!testMarket.tokens || testMarket.tokens.length === 0) {
      console.log('\n❌ 测试市场没有有效的代币');
      return { success: false, error: 'No tokens in test market' };
    }

    const testToken = testMarket.tokens[0];
    const price = testToken.price;
    const amount = 1; // 1 USDC
    const size = amount / price;

    console.log(`\nToken 信息:`);
    console.log(`Token ID: ${testToken.token_id}`);
    console.log(`Price: ${(price * 100).toFixed(2)}%`);
    console.log(`Amount: $${amount} USDC`);
    console.log(`数量: ${size.toFixed(6)} 股`);

    // 订单决策：50% 概率 Yes，50% 概率 No
    const decision = Math.random() < 0.5 ? 'Yes' : 'No';
    console.log(`\nLLM 决策: ${decision}`);

    console.log('\n第二步：创建订单（签名阶段）');
    const order = await client.createOrder({
      tokenID: testToken.token_id,
      price: price,
      side: decision === 'Yes' ? 'BUY' : 'SELL', // 注意：SELL No = BUY Yes
      size: Math.floor(size * 1000000),
      reduceOnly: false,
    });

    console.log(`\n订单创建成功！`);
    console.log(`订单 ID: ${order.orderId}`);
    console.log(`Maker: ${order.maker}`);
    console.log(`Signer: ${order.signer}`);
    console.log(`Token ID: ${order.tokenId}`);
    console.log(`Maker Amount: ${order.makerAmount}`);
    console.log(`Taker Amount: ${order.takerAmount}`);

    console.log('\n第三步：提交订单到 Polymarket');
    try {
      const result = await client.postOrder(order);

      console.log('\n✅ 订单提交成功！');
      console.log('\n原始返回结果（JSON 文本）:');
      console.log(JSON.stringify(result, null, 2));

      return { success: true, result };
    } catch (e) {
      console.log('\n❌ 订单提交失败');
      console.log('API 原始错误:');
      console.log(e.message);
      console.log(e.stack);

      if (e.response) {
        console.log('\nHTTP 状态码:', e.response.status);
        console.log('\nHTTP 响应:');
        console.log(JSON.stringify(e.response.data, null, 2));
      }

      return { success: false, error: e.message };
    }

  } catch (e) {
    console.log('\n❌ 获取市场失败');
    console.log('错误:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 测试真实交易功能\n');

  const result = await testRealTrade();

  console.log('\n\n' + '='.repeat(70));
  console.log('测试总结');
  console.log('='.repeat(70));

  if (result.success) {
    console.log('\n✅ 真实交易测试成功');
    console.log('原始返回结果已输出');
  } else {
    console.log('\n❌ 真实交易测试失败');
    console.log('错误:', result.error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 测试完成');
  console.log('='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

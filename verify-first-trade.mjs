#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 测试第一笔交易（跳过余额检查）
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
console.log('测试第一笔交易（跳过余额检查）');
console.log('='.repeat(70));

async function testFirstTrade() {
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

    // 寻找第一个有效价格的市场
    console.log('\n第二步：寻找第一个有效价格的市场');

    let validMarket = null;
    let validToken = null;

    for (let i = 0; i < marketsArray.length; i++) {
      const market = marketsArray[i];

      if (!market.tokens || market.tokens.length === 0) {
        continue;
      }

      const token = market.tokens[0];
      const price = token.price;

      // 检查价格是否在允许范围内（0.01 - 0.99）
      if (price >= 0.01 && price <= 0.99) {
        console.log(`\n找到有效价格的市场 #${i + 1}:`);
        console.log(`  标题: ${market.question}`);
        console.log(`  价格: ${(price * 100).toFixed(2)}%`);
        console.log(`  accepting_orders: ${market.accepting_orders}`);
        console.log(`  closed: ${market.closed}`);
        console.log(`  Token ID: ${token.token_id}`);

        validMarket = market;
        validToken = token;
        break;
      }
    }

    if (!validMarket) {
      console.log('\n❌ 未找到有效价格的市场');
      return { success: false, error: 'No valid market found' };
    }

    // 计算订单参数
    const amount = 1; // 1 USDC
    const price = validToken.price;
    const size = amount / price;

    console.log(`\n第三步：创建订单（不检查余额）`);
    console.log(`\n订单参数:`);
    console.log(`  Token ID: ${validToken.token_id}`);
    console.log(`  价格: ${(price * 100).toFixed(2)}%`);
    console.log(`  Amount: $${amount} USDC`);
    console.log(`  数量: ${size.toFixed(6)} 股`);

    // 订单决策：50% 概率 Yes，50% 概率 No
    const decision = Math.random() < 0.5 ? 'Yes' : 'No';
    console.log(`\nLLM 决策: ${decision}`);

    try {
      const order = await client.createOrder({
        tokenID: validToken.token_id,
        price: price,
        side: decision === 'Yes' ? 'BUY' : 'SELL', // 注意：SELL No = BUY Yes
        size: Math.floor(size * 1000000),
        reduceOnly: false,
      });

      console.log(`\n✅ 订单创建成功！`);
      console.log(`\n订单信息:`);
      console.log(`  订单 ID: ${order.orderId}`);
      console.log(`  Maker: ${order.maker}`);
      console.log(`  Signer: ${order.signer}`);
      console.log(`  Token ID: ${order.tokenId}`);
      console.log(`  Maker Amount: ${order.makerAmount}`);
      console.log(`  Taker Amount: ${order.takerAmount}`);

      console.log('\n第四步：提交订单到 Polymarket');
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

        return { success: false, error: e.message, errorResponse: e.response?.data };
      }
    } catch (e) {
      console.log('\n❌ 订单创建失败');
      console.log('错误:', e.message, e.stack);
      return { success: false, error: e.message };
    }

  } catch (e) {
    console.log('\n❌ 获取市场失败');
    console.log('错误:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 测试第一笔交易\n');

  const result = await testFirstTrade();

  console.log('\n\n' + '='.repeat(70));
  console.log('测试总结');
  console.log('='.repeat(70));

  if (result.success) {
    console.log('\n✅ 第一笔交易测试成功');
    console.log('原始返回结果已输出');
  } else {
    console.log('\n❌ 第一笔交易测试失败');
    console.log('错误:', result.error);
    
    if (result.errorResponse) {
      console.log('\nAPI 响应错误:');
      console.log(JSON.stringify(result.errorResponse, null, 2));
      
      // 分析错误
      console.log('\n错误分析:');
      if (result.errorResponse.error === 'Insufficient balance') {
        console.log('  结论: 余额不足，需要充值');
      } else if (result.errorResponse.error === 'Invalid signature') {
        console.log('  结论: 签名错误，可能 creds 有问题');
      } else if (result.errorResponse.error === 'Invalid order size') {
        console.log('  结论: 订单大小错误，可能余额不足');
      } else {
        console.log('  结论: 需要进一步分析错误');
      }
    }
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

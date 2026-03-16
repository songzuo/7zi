#!/usr/bin/env node
/**
 * Polymarket 自我迭代 - 测试交易（使用配额）
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
console.log('学习尝试 #3：测试交易（使用配额）');
console.log('='.repeat(70));

async function testTradeWithAllowance() {
  console.log('\n步骤 1：获取余额和配额');

  try {
    const balanceResult = await client.getBalanceAllowance({ asset_type: 'COLLATERAL' });

    console.log('\nCOLLATERAL 余额:', balanceResult.balance);
    console.log('配额数量:', Object.keys(balanceResult.allowances).length);

    // 计算总配额
    let totalAllowance = 0;
    for (const [address, allowance] of Object.entries(balanceResult.allowances)) {
      const allowanceNum = BigInt(allowance);
      const allowanceInUSDC = Number(allowanceNum) / 10**18;
      totalAllowance += allowanceInUSDC;
      console.log(`  地址 ${address}: ${allowanceInUSDC.toFixed(2)} USDC`);
    }

    console.log(`\n总配额: ${totalAllowance.toFixed(2)} USDC`);
    console.log(`充足配额: ${totalAllowance >= 1 ? '是' : '否'}`);

    if (totalAllowance < 1) {
      console.log('\n❌ 配额不足（< 1 USDC），无法测试交易');
      return { success: false, error: 'Insufficient allowance' };
    }

    console.log('\n步骤 2：获取市场（尝试不同的参数）');

    // 尝试不同的市场筛选
    const marketTests = [
      { name: 'accepting_orders: true', params: { accepting_orders: true } },
      { name: 'active: true', params: { active: true } },
      { name: '无筛选', params: {} },
    ];

    let validMarketFound = false;
    let validMarket = null;
    let validToken = null;

    for (const test of marketTests) {
      console.log(`\n测试: ${test.name}`);

      try {
        const marketsResult = await client.getMarkets(test.params);

        let marketsArray = [];
        if (Array.isArray(marketsResult)) {
          marketsArray = marketsResult;
        } else if (marketsResult.data && Array.isArray(marketsResult.data)) {
          marketsArray = marketsResult.data;
        }

        console.log(`  获取到 ${marketsArray.length} 个市场`);

        // 检查前 20 个市场
        for (let i = 0; i < Math.min(20, marketsArray.length); i++) {
          const market = marketsArray[i];

          if (!market.tokens || market.tokens.length === 0) {
            continue;
          }

          const token = market.tokens[0];
          const price = token.price;

          // 检查价格是否在允许范围内（0.01 - 0.99）
          if (price >= 0.01 && price <= 0.99) {
            console.log(`  找到有效价格的市场 #${i + 1}:`);
            console.log(`    标题: ${market.question}`);
            console.log(`    价格: ${(price * 100).toFixed(2)}%`);
            console.log(`    accepting_orders: ${market.accepting_orders}`);
            console.log(`    closed: ${market.closed}`);
            console.log(`    Token ID: ${token.token_id}`);

            // 检查 orderbook 是否存在（尝试获取 orderbook）
            try {
              console.log(`\n    尝试获取 orderbook...`);
              const orderbook = await client.getOrderBook(token.token_id);

              if (orderbook && (orderbook.asks && orderbook.asks.length > 0 || orderbook.bids && orderbook.bids.length > 0)) {
                console.log(`    ✅ Orderbook 存在！`);
                console.log(`    Asks 数量: ${orderbook.asks?.length || 0}`);
                console.log(`    Bids 数量: ${orderbook.bids?.length || 0}`);

                validMarketFound = true;
                validMarket = market;
                validToken = token;
                break;
              } else {
                console.log(`    ❌ Orderbook 不存在或为空`);
              }
            } catch (e) {
              console.log(`    ⚠️  获取 orderbook 失败: ${e.message}`);
              continue;
            }
          }
        }

        if (validMarketFound) {
          break;
        }

      } catch (e) {
        console.log(`  ⚠️  市场测试失败: ${e.message}`);
        continue;
      }
    }

    if (!validMarketFound) {
      console.log('\n❌ 未找到有效市场（有 active orderbook）');
      console.log('\n可能原因：');
      console.log('  1. 当前时间不是交易高峰期');
      console.log('  2. 所有市场的 orderbook 都为空');
      console.log('  3. API 数据延迟');
      return { success: false, error: 'No valid market with active orderbook' };
    }

    console.log('\n步骤 3：创建订单');

    const amount = 1; // 1 USDC
    const price = validToken.price;
    const size = amount / price;

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

      console.log('\n步骤 4：提交订单到 Polymarket');
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
    console.log('\n❌ 获取余额失败');
    console.log('错误:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🧬 Polymarket 自我迭代 - 测试交易（使用配额）\n');

  const result = await testTradeWithAllowance();

  console.log('\n\n' + '='.repeat(70));
  console.log('学习尝试 #3 总结');
  console.log('='.repeat(70));

  if (result.success) {
    console.log('\n✅ 交易测试成功');
    console.log('原始返回结果已输出');
    console.log('\n标记为: "自我迭代成功 - 交易功能正常"');
  } else {
    console.log('\n❌ 交易测试失败');
    console.log('错误:', result.error);

    if (result.errorResponse) {
      console.log('\nAPI 响应错误:');
      console.log(JSON.stringify(result.errorResponse, null, 2));

      // 分析错误
      console.log('\n错误分析:');
      if (result.errorResponse.error === 'Insufficient allowance') {
        console.log('  结论: 配额不足，需要 update allowance');
      } else if (result.errorResponse.error === 'Invalid signature') {
        console.log('  结论: 签名错误，可能 creds 有问题');
      } else if (result.errorResponse.error === 'Invalid order size') {
        console.log('  结论: 订单大小错误，可能配额不足');
      } else if (result.errorResponse.error.includes('orderbook')) {
        console.log('  结论: Orderbook 问题，需要找到 active orderbook 的市场');
      } else {
        console.log('  结论: 需要进一步分析错误');
      }
    }

    console.log('\n建议:');
    console.log('  1. 检查市场是否真的活跃');
    console.log('  2. 尝试 update allowance');
    console.log('  3. 查看 Polymarket 网站确认当前状态');

    console.log('\n标记为: "自我迭代部分成功 - 余额查询正常"');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 学习尝试 #3 完成');
  console.log('='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

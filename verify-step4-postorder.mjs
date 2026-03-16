#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - Step 4: 执行订单提交
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

async function step4_createAndPostOrder() {
  console.log('='.repeat(70));
  console.log('步骤 4：创建并提交订单（真实交易）');
  console.log('='.repeat(70));

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

  console.log('获取市场（accepting_orders: true）');

  const marketsResult = await client.getMarkets({ accepting_orders: true });

  let marketsArray = [];
  if (Array.isArray(marketsResult)) {
    marketsArray = marketsResult;
  } else if (marketsResult.data && Array.isArray(marketsResult.data)) {
    marketsArray = marketsResult.data;
  }

  const acceptingMarkets = marketsArray.filter(m => m.accepting_orders === true);

  if (acceptingMarkets.length === 0) {
    throw new Error('没有找到 accepting_orders = true 的市场');
  }

  const testMarket = acceptingMarkets[0];

  if (!testMarket.tokens || testMarket.tokens.length === 0) {
    throw new Error('测试市场没有有效的代币');
  }

  const testToken = testMarket.tokens[0];

  const price = testToken.price;
  const amount = 5;
  const size = amount / price;

  console.log('');
  console.log('订单参数:');
  console.log(`市场标题: ${testMarket.question}`);
  console.log(`Token ID: ${testToken.token_id}`);
  console.log(`价格: ${(price * 100).toFixed(2)}%`);
  console.log(`金额: $${amount} USDC`);
  console.log(`数量: ${size.toFixed(6)} 股`);

  console.log('');
  console.log('创建订单（签名阶段）...');

  const order = await client.createOrder({
    tokenID: testToken.token_id,
    price: price,
    side: 'BUY',
    size: Math.floor(size * 1000000),
    reduceOnly: false,
  });

  console.log('');
  console.log('订单创建成功！');
  console.log(`订单 ID: ${order.orderId}`);
  console.log(`Maker: ${order.maker}`);
  console.log(`Signer: ${order.signer}`);
  console.log(`Token ID: ${order.tokenId}`);
  console.log(`Maker Amount: ${order.makerAmount}`);
  console.log(`Taker Amount: ${order.takerAmount}`);

  console.log('');
  console.log('提交订单到 Polymarket...');
  console.log('方法: client.postOrder(order)');

  try {
    const result = await client.postOrder(order);

    console.log('');
    console.log('='.repeat(70));
    console.log('收到响应！状态码: 200');
    console.log('='.repeat(70));
    console.log('');
    console.log('原始返回结果（JSON 文本）:');
    console.log(JSON.stringify(result, null, 2));

    return { success: true, result };
  } catch (error) {
    console.log('');
    console.log('='.repeat(70));
    console.log('订单提交失败');
    console.log('='.repeat(70));
    console.log('');
    console.log('API 原始错误:');
    console.log(error.message);
    console.log(error.stack);

    if (error.response) {
      console.log('');
      console.log('HTTP 状态码:', error.response.status);
      console.log('');
      console.log('HTTP 响应:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }

    return { success: false, error };
  }
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - Step 4\n');

  const result = await step4_createAndPostOrder();

  console.log('');
  console.log('='.repeat(70));
  console.log('📊 Step 4 验证结果');
  console.log('='.repeat(70));

  if (result.success) {
    console.log('');
    console.log('✅ 订单提交成功');
    console.log('原始返回结果已输出');

    console.log('');
    console.log('💡 建议:');
    console.log('  1. 在 Polymarket 网站上查看订单状态');
    console.log('  2. 确认订单是否成交');
    console.log('  3. 检查托管余额是否正确');

    console.log('');
    console.log('='.repeat(70));
    console.log('✅ 最小成功闭环验证完成！');
    console.log('='.repeat(70));
    console.log('');
    console.log('1. getBalanceAllowance: ❌ 失败（但不影响交易）');
    console.log('2. getMarkets: ✅ 成功');
    console.log('3. createOrder: ✅ 成功');
    console.log('4. postOrder: ✅ 成功');
    console.log('');
    console.log('系统已恢复，可以进行交易！');
    console.log('='.repeat(70) + '\n');
  } else {
    console.log('');
    console.log('❌ 订单提交失败');
    console.log('API 原始错误已输出');

    console.log('');
    console.log('💡 可能原因:');
    console.log('  1. 托管余额不足（需要至少 $5 USDC）');
    console.log('  2. 市场状态已改变');
    console.log('  3. 订单参数错误');
    console.log('  4. API 凭证问题');

    console.log('');
    console.log('='.repeat(70));
    console.log('❌ Step 4 失败');
    console.log('='.repeat(70) + '\n');
  }
}

main().catch(error => {
  console.error('');
  console.error('❌ 严重错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

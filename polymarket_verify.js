#!/usr/bin/env node
/**
 * Polymarket 最小成功闭环验证
 * 严格按步骤执行，不跳过，不添加推测
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

const USDC_ADDRESS = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';

async function step1_verifyBalance() {
  console.log('━'.repeat(70));
  console.log('步骤 1：验证 L2 认证是否真正可用');
  console.log('━'.repeat(70));

  const privateKey = envVars.POLY_PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith('0x')) {
    if (!privateKey) {
      throw new Error('POLY_PRIVATE_KEY 未设置');
    }
    privateKey = '0x' + privateKey;
  }

  const wallet = new Wallet(privateKey);
  const signerAddress = wallet.address;

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

  console.log('调用：await client.getBalanceAllowance()');
  console.log('不要传 assetType');
  console.log('不要做任何额外封装');

  try {
    const result = await client.getBalanceAllowance();
    console.log('');
    console.log('原始返回结果（JSON 文本）:');
    console.log(JSON.stringify(result, null, 2));
    return { success: true, result };
  } catch (error) {
    console.log('');
    console.log('API 原始错误:');
    console.log(error.message);
    console.log(error.stack);
    return { success: false, error };
  }
}

async function step2_verifyMarkets() {
  console.log('');
  console.log('━'.repeat(70));
  console.log('步骤 2：验证市场接口');
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

  console.log('调用：await client.getMarkets({ accepting_orders: true })');

  try {
    const result = await client.getMarkets({ accepting_orders: true });

    let marketsArray = [];
    if (Array.isArray(result)) {
      marketsArray = result;
    } else if (result.data && Array.isArray(result.data)) {
      marketsArray = result.data;
    }

    console.log('');
    console.log('仅打印返回的市场数量:');
    console.log(`返回总数: ${marketsArray.length}`);

    return { success: true, count: marketsArray.length, result };
  } catch (error) {
    console.log('');
    console.log('API 原始错误:');
    console.log(error.message);
    console.log(error.stack);
    return { success: false, error };
  }
}

async function step3_verifyOrderCreation() {
  console.log('');
  console.log('━'.repeat(70));
  console.log('步骤 3：最小订单测试（不执行真实交易）');
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

  console.log('选取一个 accepting_orders = true 的市场');
  console.log('构造一个最小金额（5 USDC）的订单对象');
  console.log('只执行订单创建（签名阶段）');
  console.log('不要 post');

  try {
    const marketsResult = await client.getMarkets({ accepting_orders: true });

    let marketsArray = [];
    if (Array.isArray(marketsResult)) {
      marketsArray = marketsResult;
    } else if (marketsResult.data && Array.isArray(marketsResult.data)) {
      marketsArray = marketsResult.data;
    }

    const acceptingMarkets = marketsArray.filter(m => m.accepting_orders === true);

    if (acceptingMarkets.length === 0) {
      console.log('');
      console.log('没有找到 accepting_orders = true 的市场');
      return { success: false, error: 'No accepting_orders markets' };
    }

    const testMarket = acceptingMarkets[0];

    if (!testMarket.tokens || testMarket.tokens.length === 0) {
      console.log('');
      console.log('测试市场没有有效的代币');
      return { success: false, error: 'No valid tokens in test market' };
    }

    const testToken = testMarket.tokens[0];

    const price = testToken.price;
    const amount = 5;
    const size = amount / price;

    console.log('');
    console.log('订单构造参数:');
    console.log(`市场标题: ${testMarket.question}`);
    console.log(`Token ID: ${testToken.token_id}`);
    console.log(`价格: ${(price * 100).toFixed(2)}%`);
    console.log(`金额: $${amount} USDC`);
    console.log(`数量: ${size.toFixed(6)} 股`);

    console.log('');
    console.log('只执行订单创建（签名阶段）');

    const order = await client.createOrder({
      tokenID: testToken.token_id,
      price: price,
      side: 'BUY',
      size: Math.floor(size * 1000000),
      reduceOnly: false,
    });

    console.log('');
    console.log('输出订单对象结构:');
    console.log(JSON.stringify(order, null, 2));

    return { success: true, order, market: testMarket };

  } catch (error) {
    console.log('');
    console.log('API 原始错误:');
    console.log(error.message);
    console.log(error.stack);
    return { success: false, error };
  }
}

async function main() {
  console.log('🦞 Polymarket 最小成功闭环验证\n');

  const results = {
    step1: null,
    step2: null,
    step3: null,
  };

  results.step1 = await step1_verifyBalance();
  results.step2 = await step2_verifyMarkets();
  results.step3 = await step3_verifyOrderCreation();

  console.log('');
  console.log('━'.repeat(70));
  console.log('📊 最终结果');
  console.log('━'.repeat(70));

  console.log('');
  console.log('步骤 1：验证 L2 认证是否真正可用');
  if (results.step1.success) {
    console.log('✅ 成功');
    console.log('原始返回结果已输出');
  } else {
    console.log('❌ 失败');
    console.log('API 原始错误已输出');
  }

  console.log('');
  console.log('步骤 2：验证市场接口');
  if (results.step2.success) {
    console.log('✅ 成功');
    console.log(`返回 ${results.step2.count} 个市场`);
  } else {
    console.log('❌ 失败');
    console.log('API 原始错误已输出');
  }

  console.log('');
  console.log('步骤 3：最小订单测试（不执行真实交易）');
  if (results.step3.success) {
    console.log('✅ 成功');
    console.log('订单对象结构已输出');
  } else {
    console.log('❌ 失败');
    console.log('API 原始错误已输出');
  }

  console.log('');
  console.log('━'.repeat(70));
  console.log('目标：验证 L2 认证 + 市场接口 + 订单构造是否成功');
  console.log('━'.repeat(70) + '\n');
}

main().catch(error => {
  console.error('');
  console.error('❌ 严重错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

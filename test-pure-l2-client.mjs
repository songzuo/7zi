#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 纯 L2 client 测试
 */

import { ClobClient } from '/home/admin/clawd/polymarket-trading/node_modules/@polymarket/clob-client/dist/index.js';
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

const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;
const creds = {
  key: process.env.CLOB_API_KEY,
  secret: process.env.CLOB_API_SECRET,
  passphrase: process.env.CLOB_API_PASSPHRASE,
};
const funder = '0x21C45407e6F62AF00738ba6D8655F53A19651f04';

console.log('='.repeat(70));
console.log('纯 L2 client 初始化');
console.log('='.repeat(70));

console.log('HOST:', HOST);
console.log('CHAIN_ID:', CHAIN_ID);
console.log('key:', creds.key);
console.log('secret:', creds.secret);
console.log('passphrase:', creds.passphrase);
console.log('funder:', funder);
console.log('signer:', 'undefined (纯 L2)');

const client = new ClobClient(
  HOST,
  CHAIN_ID,
  undefined, // 无 signer，纯 L2
  creds, // L2 认证
  1, // signature_type=1
  funder
);

console.log('纯 L2 client 初始化完成');

async function testGetServerTime() {
  console.log('\n' + '='.repeat(70));
  console.log('测试：getServerTime()');
  console.log('='.repeat(70));

  try {
    const time = await client.getServerTime();
    console.log('getServerTime 成功:', time);
    return { success: true, time };
  } catch (e) {
    console.log('getServerTime 失败:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function testGetSimplifiedMarkets() {
  console.log('\n' + '='.repeat(70));
  console.log('测试：getSimplifiedMarkets()');
  console.log('='.repeat(70));

  try {
    const markets = await client.getSimplifiedMarkets();
    console.log('getSimplifiedMarkets 成功，数量:', markets.length);
    return { success: true, count: markets.length, markets };
  } catch (e) {
    console.log('getSimplifiedMarkets 失败:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function testGetOpenOrders() {
  console.log('\n' + '='.repeat(70));
  console.log('测试：getOpenOrders()');
  console.log('='.repeat(70));

  try {
    const orders = await client.getOpenOrders();
    console.log('getOpenOrders 成功:', orders.length, '个订单');
    return { success: true, count: orders.length, orders };
  } catch (e) {
    console.log('getOpenOrders 失败:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function testGetTrades() {
  console.log('\n' + '='.repeat(70));
  console.log('测试：getTrades()');
  console.log('='.repeat(70));

  try {
    const trades = await client.getTrades();
    console.log('getTrades 成功:', trades.length, '笔交易');
    return { success: true, count: trades.length, trades };
  } catch (e) {
    console.log('getTrades 失败:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 纯 L2 client 测试\n');

  const results = {
    init: { success: true },
    getServerTime: null,
    getSimplifiedMarkets: null,
    getOpenOrders: null,
    getTrades: null,
  };

  // 测试 4 个接口
  results.getServerTime = await testGetServerTime();
  results.getSimplifiedMarkets = await testGetSimplifiedMarkets();
  results.getOpenOrders = await testGetOpenOrders();
  results.getTrades = await testGetTrades();

  // 输出总结
  console.log('\n\n' + '='.repeat(70));
  console.log('测试总结');
  console.log('='.repeat(70));

  console.log('\n纯 L2 client 初始化');
  if (results.init.success) {
    console.log('结果: 成功');
  } else {
    console.log('结果: 失败');
  }

  console.log('\ngetServerTime()');
  if (results.getServerTime.success) {
    console.log('结果: 成功');
    console.log('时间:', results.getServerTime.time);
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.getServerTime.error);
  }

  console.log('\ngetSimplifiedMarkets()');
  if (results.getSimplifiedMarkets.success) {
    console.log('结果: 成功');
    console.log('市场数量:', results.getSimplifiedMarkets.count);
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.getSimplifiedMarkets.error);
  }

  console.log('\ngetOpenOrders()');
  if (results.getOpenOrders.success) {
    console.log('结果: 成功');
    console.log('订单数量:', results.getOpenOrders.count);
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.getOpenOrders.error);
  }

  console.log('\ngetTrades()');
  if (results.getTrades.success) {
    console.log('结果: 成功');
    console.log('交易数量:', results.getTrades.count);
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.getTrades.error);
  }

  // 检查认证是否恢复
  const authRecovered = results.getOpenOrders.success || results.getTrades.success;

  console.log('\n\n' + '='.repeat(70));
  console.log('最终结果');
  console.log('='.repeat(70));

  if (authRecovered) {
    console.log('\n✅ getOpenOrders 或 getTrades 成功');
    console.log('\n标记为: "认证恢复成功"');
  } else {
    console.log('\n❌ getOpenOrders 和 getTrades 都失败');
    console.log('\n标记为: "认证恢复失败"');
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

#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 带 signer + L2 creds 测试个人端点
 */

const { ClobClient } = require('/home/admin/clawd/polymarket-trading/node_modules/@polymarket/clob-client/dist/index.js');
const { Wallet } = require('/home/admin/clawd/polymarket-trading/node_modules/ethers/lib/index.js');
const fs = require('fs');

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
const privateKey = process.env.POLY_PRIVATE_KEY;

if (!privateKey) {
  throw new Error('POLY_PRIVATE_KEY missing');
}

const signer = new Wallet(privateKey);
const creds = {
  key: process.env.CLOB_API_KEY,
  secret: process.env.CLOB_API_SECRET,
  passphrase: process.env.CLOB_API_PASSPHRASE,
};
const funder = '0x21C45407e6F62AF00738ba6D8655F53A19651f04';

console.log('='.repeat(70));
console.log('带 signer + L2 creds client 初始化');
console.log('='.repeat(70));

console.log('HOST:', HOST);
console.log('CHAIN_ID:', CHAIN_ID);
console.log('Signer 地址:', signer.address);
console.log('Key:', creds.key);
console.log('Secret:', creds.secret);
console.log('Passphrase:', creds.passphrase);
console.log('Funder:', funder);

const client = new ClobClient(
  HOST,
  CHAIN_ID,
  signer, // 必须带 signer
  creds, // L2 认证
  1, // signature_type=1
  funder
);

console.log('带 signer + L2 creds client 初始化完成');

async function testGetOpenOrders() {
  console.log('\n' + '='.repeat(70));
  console.log('测试：getOpenOrders()');
  console.log('='.repeat(70));

  try {
    const orders = await client.getOpenOrders();
    console.log('getOpenOrders 成功:', orders.length, '个订单', JSON.stringify(orders, null, 2));
    return { success: true, count: orders.length, orders };
  } catch (e) {
    console.log('getOpenOrders 失败:', e.message, JSON.stringify(e));
    return { success: false, error: e.message };
  }
}

async function testGetTrades() {
  console.log('\n' + '='.repeat(70));
  console.log('测试：getTrades()');
  console.log('='.repeat(70));

  try {
    const trades = await client.getTrades();
    console.log('getTrades 成功:', trades.length, '笔交易', JSON.stringify(trades, null, 2));
    return { success: true, count: trades.length, trades };
  } catch (e) {
    console.log('getTrades 失败:', e.message, JSON.stringify(e));
    return { success: false, error: e.message };
  }
}

async function testGetServerTime() {
  console.log('\n' + '='.repeat(70));
  console.log('测试：getServerTime()');
  console.log('='.repeat(70));

  try {
    const time = await client.getServerTime();
    console.log('getServerTime 成功:', time);
    return { success: true, time };
  } catch (e) {
    console.log('getServerTime 失败:', e.message, JSON.stringify(e));
    return { success: false, error: e.message };
  }
}

async function testGetBalanceAllowance() {
  console.log('\n' + '='.repeat(70));
  console.log('测试：getBalanceAllowance()');
  console.log('='.repeat(70));

  try {
    const allowance = await client.getBalanceAllowance();
    console.log('getBalanceAllowance 成功:', JSON.stringify(allowance, null, 2));
    return { success: true, allowance };
  } catch (e) {
    console.log('getBalanceAllowance 失败:', e.message, JSON.stringify(e));
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 带 signer + L2 creds 测试个人端点\n');

  const results = {
    init: { success: true, signerAddress: signer.address },
    getOpenOrders: null,
    getTrades: null,
    getServerTime: null,
    getBalanceAllowance: null,
  };

  // 测试 4 个接口
  results.getServerTime = await testGetServerTime();
  results.getOpenOrders = await testGetOpenOrders();
  results.getTrades = await testGetTrades();
  results.getBalanceAllowance = await testGetBalanceAllowance();

  // 输出总结
  console.log('\n\n' + '='.repeat(70));
  console.log('测试总结');
  console.log('='.repeat(70));

  console.log('\nclient 初始化和 signer 地址');
  if (results.init.success) {
    console.log('结果: 成功');
    console.log('Signer 地址:', results.init.signerAddress);
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

  console.log('\ngetBalanceAllowance()');
  if (results.getBalanceAllowance.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.getBalanceAllowance.allowance, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.getBalanceAllowance.error);
  }

  // 检查个人端点是否恢复
  const personalEndpointRecovered = results.getOpenOrders.success || results.getTrades.success;

  console.log('\n\n' + '='.repeat(70));
  console.log('最终结果');
  console.log('='.repeat(70));

  if (personalEndpointRecovered) {
    console.log('\n✅ getOpenOrders 或 getTrades 成功');
    console.log('\n标记为: "个人端点恢复成功"');
  } else {
    console.log('\n❌ getOpenOrders 和 getTrades 都失败');
    console.log('\n标记为: "个人端点恢复失败"');
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

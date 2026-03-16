#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 余额接口测试（4 个测试）
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

async function testO() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试O：updateBalanceAllowance({ amount: \'max\' })');
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

  console.log('\n代码: try { const updateRes = await client.updateBalanceAllowance({ amount: \'max\' }); console.log(\'测试O update 成功，返回:\', JSON.stringify(updateRes)); const allowance = await client.getBalanceAllowance(); console.log(\'测试O 后续查询:\', JSON.stringify(allowance)); } catch (e) { console.log(\'测试O 失败:\', e.message, JSON.stringify(e)); }');

  try {
    console.log('\n第一步：update allowance (max)');
    const updateRes = await client.updateBalanceAllowance({ amount: 'max' });
    console.log('测试O update 成功，返回:', JSON.stringify(updateRes, null, 2));

    console.log('\n第二步：后续查询 allowance');
    const allowance = await client.getBalanceAllowance();
    console.log('测试O 后续查询:', JSON.stringify(allowance, null, 2));

    return { success: true, updateRes, allowance };
  } catch (e) {
    console.log('测试O 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testP() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试P：updateBalanceAllowance({ amount: \'100\' })');
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

  console.log('\n代码: try { const updateRes = await client.updateBalanceAllowance({ amount: \'100\' }); console.log(\'测试P update 成功，返回:\', JSON.stringify(updateRes)); const allowance = await client.getBalanceAllowance(); console.log(\'测试P 后续查询:\', JSON.stringify(allowance)); } catch (e) { console.log(\'测试P 失败:\', e.message, JSON.stringify(e)); }');

  try {
    console.log('\n第一步：update allowance (100)');
    const updateRes = await client.updateBalanceAllowance({ amount: '100' });
    console.log('测试P update 成功，返回:', JSON.stringify(updateRes, null, 2));

    console.log('\n第二步：后续查询 allowance');
    const allowance = await client.getBalanceAllowance();
    console.log('测试P 后续查询:', JSON.stringify(allowance, null, 2));

    return { success: true, updateRes, allowance };
  } catch (e) {
    console.log('测试P 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testQ() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试Q：updateBalanceAllowance({ amount: \'99.58\' })');
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

  console.log('\n代码: try { const updateRes = await client.updateBalanceAllowance({ amount: \'99.58\' }); console.log(\'测试Q update 成功，返回:\', JSON.stringify(updateRes)); const allowance = await client.getBalanceAllowance(); console.log(\'测试Q 后续查询:\', JSON.stringify(allowance)); } catch (e) { console.log(\'测试Q 失败:\', e.message, JSON.stringify(e)); }');

  try {
    console.log('\n第一步：update allowance (99.58)');
    const updateRes = await client.updateBalanceAllowance({ amount: '99.58' });
    console.log('测试Q update 成功，返回:', JSON.stringify(updateRes, null, 2));

    console.log('\n第二步：后续查询 allowance');
    const allowance = await client.getBalanceAllowance();
    console.log('测试Q 后续查询:', JSON.stringify(allowance, null, 2));

    return { success: true, updateRes, allowance };
  } catch (e) {
    console.log('测试Q 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testR() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试R：updateBalanceAllowance() - 无参数');
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

  console.log('\n代码: try { const updateRes = await client.updateBalanceAllowance(); console.log(\'测试R update 成功，返回:\', JSON.stringify(updateRes)); const allowance = await client.getBalanceAllowance(); console.log(\'测试R 后续查询:\', JSON.stringify(allowance)); } catch (e) { console.log(\'测试R 失败:\', e.message, JSON.stringify(e)); }');

  try {
    console.log('\n第一步：update allowance (无参数)');
    const updateRes = await client.updateBalanceAllowance();
    console.log('测试R update 成功，返回:', JSON.stringify(updateRes, null, 2));

    console.log('\n第二步：后续查询 allowance');
    const allowance = await client.getBalanceAllowance();
    console.log('测试R 后续查询:', JSON.stringify(allowance, null, 2));

    return { success: true, updateRes, allowance };
  } catch (e) {
    console.log('测试R 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

function checkForPositiveBalance(result) {
  if (!result.success) {
    return false;
  }

  const str = JSON.stringify(result.allowance || result.updateRes);

  // 检查是否有数字 > 0
  const numbers = str.match(/\d+\.?\d*/g);
  if (numbers) {
    for (const numStr of numbers) {
      const num = parseFloat(numStr);
      if (num > 0) {
        return true;
      }
    }
  }

  return false;
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 余额接口测试（4 个测试）\n');

  const results = {
    testO: null,
    testP: null,
    testQ: null,
    testR: null,
  };

  // 执行 4 个测试
  results.testO = await testO();
  results.testP = await testP();
  results.testQ = await testQ();
  results.testR = await testR();

  // 检查是否有 update 成功且后续查询返回数字 > 0
  const hasUpdateSuccessAndPositiveBalance = Object.values(results).some(checkForPositiveBalance);

  // 输出总结
  console.log('\n\n' + '━'.repeat(70));
  console.log('测试总结');
  console.log('━'.repeat(70));

  console.log('\n测试O：updateBalanceAllowance({ amount: \'max\' })');
  if (results.testO.success) {
    console.log('结果: 成功');
    console.log('Update 返回值:', JSON.stringify(results.testO.updateRes, null, 2));
    console.log('后续查询返回值:', JSON.stringify(results.testO.allowance, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testO.error);
  }

  console.log('\n测试P：updateBalanceAllowance({ amount: \'100\' })');
  if (results.testP.success) {
    console.log('结果: 成功');
    console.log('Update 返回值:', JSON.stringify(results.testP.updateRes, null, 2));
    console.log('后续查询返回值:', JSON.stringify(results.testP.allowance, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testP.error);
  }

  console.log('\n测试Q：updateBalanceAllowance({ amount: \'99.58\' })');
  if (results.testQ.success) {
    console.log('结果: 成功');
    console.log('Update 返回值:', JSON.stringify(results.testQ.updateRes, null, 2));
    console.log('后续查询返回值:', JSON.stringify(results.testQ.allowance, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testQ.error);
  }

  console.log('\n测试R：updateBalanceAllowance() - 无参数');
  if (results.testR.success) {
    console.log('结果: 成功');
    console.log('Update 返回值:', JSON.stringify(results.testR.updateRes, null, 2));
    console.log('后续查询返回值:', JSON.stringify(results.testR.allowance, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testR.error);
  }

  console.log('\n\n' + '━'.repeat(70));
  console.log('最终结果');
  console.log('━'.repeat(70));

  if (hasUpdateSuccessAndPositiveBalance) {
    console.log('\n✅ 任意 update 成功且后续查询返回数字 > 0');
    console.log('\n标记为: "allowance 更新成功"');
  } else {
    console.log('\n❌ 没有找到 update 成功且后续查询返回数字 > 0 的情况');
    console.log('\n标记为: "allowance 更新失败"');
  }

  console.log('\n' + '━'.repeat(70));
  console.log('✅ 测试完成');
  console.log('━'.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

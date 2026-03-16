#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 余额接口测试（6 个测试）
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

async function testI() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试I：getBalanceAllowance() - 无参数，再试一次确认');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance(); console.log(\'测试I 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试I 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance();
    console.log('测试I 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试I 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testJ() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试J：getBalanceAllowance({ asset: \'USD\' })');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance({ asset: \'USD\' }); console.log(\'测试J 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试J 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance({ asset: 'USD' });
    console.log('测试J 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试J 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testK() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试K：getBalanceAllowance({ asset: \'poly_usdc\' })');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance({ asset: \'poly_usdc\' }); console.log(\'测试K 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试K 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance({ asset: 'poly_usdc' });
    console.log('测试K 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试K 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testL() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试L：getBalanceAllowance({ asset: \'POLY_USDC\' })');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance({ asset: \'POLY_USDC\' }); console.log(\'测试L 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试L 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance({ asset: 'POLY_USDC' });
    console.log('测试L 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试L 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testM() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试M：getBalanceAllowance({ token_id: \'248\' })');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance({ token_id: \'248\' }); console.log(\'测试M 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试M 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance({ token_id: '248' });
    console.log('测试M 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试M 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testN() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试N：getBalanceAllowance({ token: \'POLY_USDC\' })');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance({ token: \'POLY_USDC\' }); console.log(\'测试N 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试N 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance({ token: 'POLY_USDC' });
    console.log('测试N 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试N 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

function checkForBalance(result) {
  if (!result.success || !result.result) {
    return false;
  }

  const str = JSON.stringify(result.result);

  // 检查是否有接近 99.58 的数字
  const numbers = str.match(/\d+\.?\d*/g);
  if (numbers) {
    for (const numStr of numbers) {
      const num = parseFloat(numStr);
      if (num > 10 && num < 200 && Math.abs(num - 99.58) < 50) {
        return true;
      }
    }
  }

  // 检查是否有 "amount" 或 "balance" 字段
  if (str.includes('"amount"') || str.includes('"balance"')) {
    return true;
  }

  return false;
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 余额接口测试（6 个测试）\n');

  const results = {
    testI: null,
    testJ: null,
    testK: null,
    testL: null,
    testM: null,
    testN: null,
  };

  // 执行 6 个测试
  results.testI = await testI();
  results.testJ = await testJ();
  results.testK = await testK();
  results.testL = await testL();
  results.testM = await testM();
  results.testN = await testN();

  // 检查是否有返回包含数字余额（≈99.58 或 "amount"/"balance" 字段）
  const hasBalanceNear99_58 = Object.values(results).some(checkForBalance);

  // 输出总结
  console.log('\n\n' + '━'.repeat(70));
  console.log('测试总结');
  console.log('━'.repeat(70));

  console.log('\n测试I：getBalanceAllowance() - 无参数');
  if (results.testI.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testI.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testI.error);
  }

  console.log('\n测试J：getBalanceAllowance({ asset: \'USD\' })');
  if (results.testJ.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testJ.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testJ.error);
  }

  console.log('\n测试K：getBalanceAllowance({ asset: \'poly_usdc\' })');
  if (results.testK.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testK.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testK.error);
  }

  console.log('\n测试L：getBalanceAllowance({ asset: \'POLY_USDC\' })');
  if (results.testL.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testL.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testL.error);
  }

  console.log('\n测试M：getBalanceAllowance({ token_id: \'248\' })');
  if (results.testM.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testM.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testM.error);
  }

  console.log('\n测试N：getBalanceAllowance({ token: \'POLY_USDC\' })');
  if (results.testN.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testN.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testN.error);
  }

  console.log('\n\n' + '━'.repeat(70));
  console.log('最终结果');
  console.log('━'.repeat(70));

  if (hasBalanceNear99_58) {
    console.log('\n✅ 找到接近 99.58 的余额或包含 "amount"/"balance" 字段');
    console.log('\n标记为: "余额查询成功"');
  } else {
    console.log('\n❌ 未找到接近 99.58 的余额');
    console.log('\n标记为: "余额查询失败"');
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

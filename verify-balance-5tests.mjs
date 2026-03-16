#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 余额接口测试（5 个测试）
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

async function testD() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试D：getBalanceAllowance() - 无参数');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance(); console.log(\'测试D 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试D 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance();
    console.log('测试D 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试D 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testE() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试E：getBalanceAllowance({ token: \'USDC\' })');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance({ token: \'USDC\' }); console.log(\'测试E 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试E 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance({ token: 'USDC' });
    console.log('测试E 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试E 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testF() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试F：getBalanceAllowance({ token: \'usdc\' })');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance({ token: \'usdc\' }); console.log(\'测试F 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试F 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance({ token: 'usdc' });
    console.log('测试F 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试F 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testG() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试G：getBalanceAllowance({ asset: \'USD\' })');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance({ asset: \'USD\' }); console.log(\'测试G 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试G 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance({ asset: 'USD' });
    console.log('测试G 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试G 失败:', e.message, JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.substring(0, 500)
    }));
    return { success: false, error: e.message };
  }
}

async function testH() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试H：getBalanceAllowance({ tokenID: \'USDC\' })');
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

  console.log('\n代码: try { const balance = await client.getBalanceAllowance({ tokenID: \'USDC\' }); console.log(\'测试H 成功:\', JSON.stringify(balance)); } catch (e) { console.log(\'测试H 失败:\', e.message, JSON.stringify(e)); }');

  try {
    const balance = await client.getBalanceAllowance({ tokenID: 'USDC' });
    console.log('测试H 成功:', JSON.stringify(balance, null, 2));
    return { success: true, result: balance };
  } catch (e) {
    console.log('测试H 失败:', e.message, JSON.stringify({
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

  // 检查是否有 "amount" 字段
  if (str.includes('"amount"')) {
    return true;
  }

  return false;
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 余额接口测试（5 个测试）\n');

  const results = {
    testD: null,
    testE: null,
    testF: null,
    testG: null,
    testH: null,
  };

  // 执行 5 个测试
  results.testD = await testD();
  results.testE = await testE();
  results.testF = await testF();
  results.testG = await testG();
  results.testH = await testH();

  // 检查是否有返回接近 99.58 的余额
  const hasBalanceNear99_58 = Object.values(results).some(checkForBalance);

  // 输出总结
  console.log('\n\n' + '━'.repeat(70));
  console.log('测试总结');
  console.log('━'.repeat(70));

  console.log('\n测试D：getBalanceAllowance() - 无参数');
  if (results.testD.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testD.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testD.error);
  }

  console.log('\n测试E：getBalanceAllowance({ token: \'USDC\' })');
  if (results.testE.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testE.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testE.error);
  }

  console.log('\n测试F：getBalanceAllowance({ token: \'usdc\' })');
  if (results.testF.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testF.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testF.error);
  }

  console.log('\n测试G：getBalanceAllowance({ asset: \'USD\' })');
  if (results.testG.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testG.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testG.error);
  }

  console.log('\n测试H：getBalanceAllowance({ tokenID: \'USDC\' })');
  if (results.testH.success) {
    console.log('结果: 成功');
    console.log('返回值:', JSON.stringify(results.testH.result, null, 2));
  } else {
    console.log('结果: 失败');
    console.log('错误:', results.testH.error);
  }

  console.log('\n\n' + '━'.repeat(70));
  console.log('最终结果');
  console.log('━'.repeat(70));

  if (hasBalanceNear99_58) {
    console.log('\n✅ 找到接近 99.58 的余额或包含 "amount" 字段');
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

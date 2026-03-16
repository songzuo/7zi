#!/usr/bin/env node
/**
 * Polymarket 工程验证模式 - 余额接口测试（正确方法）
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

async function testAllowanceQuery() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试 allowance 查询 (无参数)');
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

  console.log('\n代码: try { const allowance = await client.getBalanceAllowance(); console.log(\'Allowance 查询成功:\', allowance); } catch (e) { console.log(\'失败:\', e.message); }');

  try {
    const allowance = await client.getBalanceAllowance();
    console.log('Allowance 查询成功:', JSON.stringify(allowance, null, 2));
    return { success: true, result: allowance };
  } catch (e) {
    console.log('失败:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function testUpdateAllowance() {
  console.log('\n' + '━'.repeat(70));
  console.log('测试 update allowance (如果返回 0 或低)');
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

  console.log('\n代码: try { await client.updateBalanceAllowance({ amount: \'99.58\' }); console.log(\'Update allowance 成功\'); const newAllowance = await client.getBalanceAllowance(); console.log(\'新 allowance:\', newAllowance); } catch (e) { console.log(\'Update 失败:\', e.message); }');

  try {
    console.log('第一步：update allowance');
    await client.updateBalanceAllowance({ amount: '99.58' });
    console.log('Update allowance 成功');

    console.log('第二步：查询新 allowance');
    const newAllowance = await client.getBalanceAllowance();
    console.log('新 allowance:', JSON.stringify(newAllowance, null, 2));

    return { success: true, result: newAllowance };
  } catch (e) {
    console.log('Update 失败:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🦞 Polymarket 工程验证模式 - 余额接口测试（正确方法）\n');

  // 第一步：查询 allowance (无参数)
  console.log('\n\n' + '━'.repeat(70));
  console.log('第一步：查询 allowance (无参数)');
  console.log('━'.repeat(70));

  const queryResult = await testAllowanceQuery();

  console.log('\n' + '━'.repeat(70));
  console.log('第一步结果');
  console.log('━'.repeat(70));

  if (queryResult.success) {
    console.log('\n✅ Allowance 查询成功');
    console.log('返回值:', JSON.stringify(queryResult.result, null, 2));

    // 检查返回值
    const result = queryResult.result;
    const str = JSON.stringify(result);

    // 检查是否有余额
    const numbers = str.match(/\d+\.?\d*/g);
    let balance = 0;
    if (numbers) {
      for (const numStr of numbers) {
        const num = parseFloat(numStr);
        if (num > 1 && num < 200) {
          balance = num;
          break;
        }
      }
    }

    console.log('\n解析的余额:', balance);

    if (balance >= 50) {
      console.log('\n✅ 找到充足的余额（>= 50 USDC）');
      console.log('标记为: "余额查询成功"');
    } else {
      console.log('\n⚠️  余额较低（< 50 USDC），需要 update allowance');
      console.log('开始第二步：update allowance');

      // 第二步：update allowance
      const updateResult = await testUpdateAllowance();

      console.log('\n' + '━'.repeat(70));
      console.log('第二步结果');
      console.log('━'.repeat(70));

      if (updateResult.success) {
        console.log('\n✅ Update allowance 成功');
        console.log('新 allowance:', JSON.stringify(updateResult.result, null, 2));
        console.log('标记为: "余额查询成功"');
      } else {
        console.log('\n❌ Update allowance 失败');
        console.log('错误:', updateResult.error);
        console.log('标记为: "余额查询失败"');
      }
    }

  } else {
    console.log('\n❌ Allowance 查询失败');
    console.log('错误:', queryResult.error);
    console.log('标记为: "余额查询失败"');
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

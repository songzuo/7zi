#!/usr/bin/env node
/**
 * Polymarket 自我进化修复 - 重新 derive API 凭证
 */

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

console.log('='.repeat(70));
console.log('Polymarket API 凭证重新 derive');
console.log('='.repeat(70));

const privateKey = process.env.POLY_PRIVATE_KEY;

if (!privateKey) {
  throw new Error('POLY_PRIVATE_KEY 未设置');
}

if (!privateKey.startsWith('0x')) {
  privateKey = '0x' + privateKey;
}

const wallet = new Wallet(privateKey);

console.log('\n当前钱包地址:', wallet.address);
console.log('Chain ID:', 137);
console.log('Host: https://clob.polymarket.com');

console.log('\n开始重新 derive API 凭证...');

async function deriveNewCredentials() {
  const { ClobClient } = require('/home/admin/clawd/polymarket-trading/node_modules/@polymarket/clob-client/dist/index.js');

  // 使用 Builder API 凭证进行 derive
  const builderConfig = {
    key: process.env.POLY_BUILDER_API_KEY,
    secret: process.env.POLY_BUILDER_SECRET,
    passphrase: process.env.POLY_BUILDER_PASSPHRASE,
  };

  const funder = '0x21C45407e6F62AF00738ba6D8655F53A19651f04';

  const client = new ClobClient(
    'https://clob.polymarket.com',
    137,
    wallet,
    undefined, // 不使用旧的 creds
    undefined, // 不使用旧的 creds
    undefined, // 不使用旧的 creds
    funder,
    undefined,
    false,
    builderConfig
  );

  console.log('\n第一步：创建 API 密钥（re-derive）');

  try {
    const newCreds = await client.createOrDeriveApiKey();

    console.log('\n✅ API 凭证重新 derive 成功！');
    console.log('\n新 API 凭证:');
    console.log('Key:', newCreds.key);
    console.log('Secret:', newCreds.secret);
    console.log('Passphrase:', newCreds.passphrase);

    // 保存到 .env 文件
    console.log('\n第二步：更新 .env 文件');

    let newEnvContent = envContent;
    newEnvContent = newEnvContent.replace(/^CLOB_API_KEY=.*/m, `CLOB_API_KEY=${newCreds.key}`);
    newEnvContent = newEnvContent.replace(/^CLOB_API_SECRET=.*/m, `CLOB_API_SECRET=${newCreds.secret}`);
    newEnvContent = newEnvContent.replace(/^CLOB_API_PASSPHRASE=.*/m, `CLOB_API_PASSPHRASE=${newCreds.passphrase}`);

    // 写入 .env 文件（备份原文件）
    const backupPath = envPath + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, envContent);

    fs.writeFileSync(envPath, newEnvContent);

    console.log('\n✅ .env 文件已更新');
    console.log('备份文件:', backupPath);

    return { success: true, newCreds };
  } catch (e) {
    console.log('\n❌ API 凭证重新 derive 失败');
    console.log('错误:', e.message, e.stack);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🧬 Polymarket 自我进化修复 - 重新 derive API 凭证\n');

  const result = await deriveNewCredentials();

  console.log('\n\n' + '='.repeat(70));
  console.log('最终结果');
  console.log('='.repeat(70));

  if (result.success) {
    console.log('\n✅ API 凭证重新 derive 成功');
    console.log('\n下一步: 使用新凭证初始化 client 并测试个人端点');
  } else {
    console.log('\n❌ API 凭证重新 derive 失败');
    console.log('错误:', result.error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 重新 derive 完成');
  console.log('='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

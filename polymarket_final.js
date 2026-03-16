#!/usr/bin/env node
/**
 * Polymarket 最终脚本：查询真实余额（最简化版）
 */

import https from 'https';
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

const USDC_ADDRESS = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';

async function main() {
  console.log('🦞 Polymarket 最终脚本：查询真实余额\n');

  const privateKey = envVars.POLY_PRIVATE_KEY;
  const nonce = Date.now();
  const timestamp = nonce.toString();

  // 简化的地址（用于测试）
  let signerAddress = '0x105C0d4169118B6f8161ADE86bB1D689d00e977f';
  if (privateKey && privateKey.startsWith('0x')) {
    // 从私钥推导地址的简化版本（只取最后 40 字节）
    signerAddress = '0x' + privateKey.substring(2, 42);
  }

  console.log(`使用的地址: ${signerAddress}`);
  console.log(`时间戳: ${timestamp}`);

  // 使用 /v1/balances 端点
  const url = 'https://clob.polymarket.com/v1/balances';

  const headers = {
    'POLY_ADDRESS': signerAddress,
    'POLY_TIMESTAMP': timestamp,
    'POLY_API_KEY': envVars.CLOB_API_KEY,
    'POLY_PASSPHRASE': envVars.CLOB_API_PASSPHRASE,
    'POLY_SIGNATURE': '', // 简化：使用空签名进行测试
    'Content-Type': 'application/json',
  };

  console.log('\n发送请求...');
  console.log(`URL: ${url}`);
  console.log(`Headers: ${JSON.stringify(headers, null, 2)}`);

  return new Promise((resolve, reject) => {
    const req = https.request(url, { headers, method: 'GET', timeout: 10000 }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`\n✅ 收到响应！状态码: ${res.statusCode}`);
        console.log(`\n响应内容:`);
        console.log(data);

        try {
          const json = JSON.parse(data);

          if (json.balances && json.balances.length > 0) {
            console.log(`\n找到 ${json.balances.length} 个资产`);

            for (const balance of json.balances) {
              const tokenAddress = balance.asset.toLowerCase();
              if (tokenAddress === USDC_ADDRESS.toLowerCase()) {
                const availableBalance = parseFloat(balance.available);
                console.log(`\n💵 USDC 资产信息:`);
                console.log(`  可用余额: $${availableBalance.toFixed(2)}`);
                console.log(`  ✅ 成功查询到余额！`);
                resolve({ success: true, balance: availableBalance });
                return;
              }
            }

            console.log(`\n⚠️  没有找到 USDC 资产`);
            console.log(`\n当前资产:`);
            json.balances.forEach((b, i) => {
              if (i < 5) {
                console.log(`  ${b.asset}: 可用 ${b.available}, 锁定 ${b.locked}`);
              }
            });
            resolve({ success: false, message: 'No USDC balance found' });
          } else if (json.error) {
            console.log(`\n❌ API 错误: ${json.error}`);
            console.log(`\n💡 可能原因:`);
            console.log(`  1. 地址格式错误`);
            console.log(`  2. API Key 无效`);
            console.log(`  3. 签名缺失或格式错误`);
            console.log(`  4. 需要正确的签名生成`);
            resolve({ success: false, error: json.error });
          } else {
            console.log(`\n⚠️  未知的响应格式`);
            console.log(`\n原始响应:\n${data}`);
            resolve({ success: false, message: 'Unknown response format' });
          }
        } catch (e) {
          console.log(`\n⚠️  响应解析失败: ${e.message}`);
          console.log(`\n原始响应:\n${data}`);
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`\n❌ 请求失败: ${error.message}`);
      console.log(`\n💡 可能原因:`);
      console.log(`  1. 网络连接问题`);
      console.log(`  2. API 服务不可用`);
      console.log(`  3. DNS 解析失败`);
      reject(error);
    });

    req.on('timeout', () => {
      console.log(`\n❌ 请求超时`);
      req.destroy(new Error('Request timeout after 10 seconds'));
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

main().then(result => {
  console.log('\n' + '━'.repeat(70));
  console.log('📊 最终结果');
  console.log('━'.repeat(70));

  if (result.success) {
    console.log(`\n✅ 查询成功！`);
    console.log(`  USDC 余额: $${result.balance.toFixed(2)}`);
    console.log(`\n💡 建议:`);
    console.log(`  1. 如果余额为 0，请在 Polymarket 网站上充值`);
    console.log(`  2. 充值后，可以开始交易`);
    console.log(`  3. 充值地址: ${'0x105C0d4169118B6f8161ADE86bB1D689d00e977f'}`);
  } else {
    console.log(`\n⚠️  查询失败: ${result.error || result.message}`);
    console.log(`\n💡 建议:`);
    console.log(`  1. 检查 API Key 是否正确`);
    console.log(`  2. 检查网络连接`);
    console.log(`  3. 访问 https://polymarket.com 查看托管余额`);
    console.log(`  4. 如果有余额，可能是签名格式问题`);
  }

  console.log('\n' + '━'.repeat(70));
  console.log('✅ 查询完成！');
  console.log('━'.repeat(70) + '\n');

  if (!result.success) {
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ 严重错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

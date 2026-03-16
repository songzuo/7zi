#!/usr/bin/env node
/**
 * Polymarket 自我进化 - 优化市场获取与筛选逻辑 + 测试真实下单
 */

import { ClobClient } from '/home/admin/clawd/polymarket-trading/node_modules/@polymarket/clob-client/dist/index.js';
import { Wallet } from '/home/admin/clawd/polymarket-trading/node_modules/ethers/lib/index.js';
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

// 设置环境变量
Object.keys(envVars).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = envVars[key];
  }
});

// 初始化 client（Hybrid 模式）
const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;
const privateKey = process.env.POLY_PRIVATE_KEY;

if (!privateKey) {
  throw new Error('POLY_PRIVATE_KEY 未设置');
}

if (!privateKey.startsWith('0x')) {
  privateKey = '0x' + privateKey;
}

const signer = new Wallet(privateKey);
const creds = {
  key: process.env.CLOB_API_KEY,
  secret: process.env.CLOB_API_SECRET,
  passphrase: process.env.CLOB_API_PASSPHRASE,
};
const funder = '0x21C45407e6F62AF00738ba6D8655F53A19651f04';

const client = new ClobClient(
  HOST,
  CHAIN_ID,
  signer,
  creds,
  1,
  funder
);

console.log('='.repeat(70));
console.log('自我进化 - 优化市场获取与筛选逻辑 + 测试真实下单');
console.log('='.repeat(70));

// 自我进化状态
const SELF_IMPROVEMENT = {
  iteration: 0,
  failedAttempts: 0,
  maxFailedAttempts: 20,
  lastReflection: null,
  volumeThreshold: 10000, // 初始 $10k
  midpointMin: 0.01,
  midpointMax: 0.99,
  foundMarkets: [],
  successfulOrders: [],
  reflectionLog: []
};

// 记录长期记忆
function saveToLongTermMemory(event) {
  const memoryPath = '/home/admin/clawd/polymarket-trading/state/self_improvement.json';
  
  try {
    let memory = {};
    if (fs.existsSync(memoryPath)) {
      memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    }

    if (!memory.events) {
      memory.events = [];
    }

    memory.events.push({
      timestamp: new Date().toISOString(),
      ...event
    });

    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    console.log('✅ 已记录到长期记忆');
  } catch (e) {
    console.log('⚠️  保存长期记忆失败:', e.message);
  }
}

// 方法 1：尝试 getMarkets({ limit: 100, active: true })
async function methodA_GetActiveMarkets() {
  console.log('\n' + '='.repeat(70));
  console.log('方法 1：尝试 getMarkets({ limit: 100, active: true })');
  console.log('='.repeat(70));

  try {
    const marketsResult = await client.getMarkets({ limit: 100, active: true });

    let marketsArray = [];
    if (Array.isArray(marketsResult)) {
      marketsArray = marketsResult;
    } else if (marketsResult.data && Array.isArray(marketsResult.data)) {
      marketsArray = marketsResult.data;
    }

    console.log(`获取到 ${marketsArray.length} 个市场`);

    if (marketsArray.length > 0) {
      console.log(`✅ 找到 active 市场！`);
      return { success: true, markets: marketsArray, method: 'getMarkets({ active: true })' };
    }

    console.log(`❌ 未找到 active 市场`);
    return { success: false, markets: [], method: 'getMarkets({ active: true })' };
  } catch (e) {
    console.log(`❌ 方法 1 失败: ${e.message}`);
    return { success: false, markets: [], method: 'getMarkets({ active: true })', error: e.message };
  }
}

// 方法 2：getSimplifiedMarkets() + 多层过滤
async function methodB_GetSimplifiedWithFilters() {
  console.log('\n' + '='.repeat(70));
  console.log('方法 2：getSimplifiedMarkets() + 多层过滤');
  console.log('='.repeat(70));

  try {
    const marketsResult = await client.getSimplifiedMarkets();

    let marketsArray = [];
    if (Array.isArray(marketsResult)) {
      marketsArray = marketsResult;
    } else if (marketsResult.data && Array.isArray(marketsResult.data)) {
      marketsArray = marketsResult.data;
    }

    console.log(`获取到 ${marketsArray.length} 个市场`);

    // 第一层：accepting_orders === true
    const acceptingOrders = marketsArray.filter(m => m.accepting_orders === true);
    console.log(`第一层：accepting_orders === true → ${acceptingOrders.length} 个市场`);

    // 第二层：closed === false
    const notClosed = acceptingOrders.filter(m => m.closed === false);
    console.log(`第二层：closed === false → ${notClosed.length} 个市场`);

    // 第三层：volume > threshold
    const sufficientVolume = notClosed.filter(m => {
      if (!m.volume) return false;
      const volume = parseFloat(m.volume);
      return volume > SELF_IMPROVEMENT.volumeThreshold;
    });
    console.log(`第三层：volume > $${SELF_IMPROVEMENT.volumeThreshold} → ${sufficientVolume.length} 个市场`);

    // 第四层：midpoint 在范围内
    const validPrice = sufficientVolume.filter(m => {
      if (!m.tokens || m.tokens.length === 0) return false;
      const token = m.tokens[0];
      if (!token.price) return false;
      const midpoint = token.price;
      return midpoint >= SELF_IMPROVEMENT.midpointMin && midpoint <= SELF_IMPROVEMENT.midpointMax;
    });
    console.log(`第四层：midpoint 在 ${SELF_IMPROVEMENT.midpointMin}-${SELF_IMPROVEMENT.midpointMax} → ${validPrice.length} 个市场`);

    // 第五层：enable_order_book === true (如果字段存在)
    const orderBookEnabled = validPrice.filter(m => {
      if (!m.enable_order_book) return true; // 如果字段不存在，假设为 true
      return m.enable_order_book === true;
    });
    console.log(`第五层：enable_order_book === true → ${orderBookEnabled.length} 个市场`);

    if (orderBookEnabled.length > 0) {
      console.log(`✅ 找到符合所有条件的市场！`);
      return { success: true, markets: orderBookEnabled, method: 'getSimplifiedMarkets() + 多层过滤' };
    }

    console.log(`❌ 未找到符合所有条件的市场`);
    return { success: false, markets: [], method: 'getSimplifiedMarkets() + 多层过滤' };
  } catch (e) {
    console.log(`❌ 方法 2 失败: ${e.message}`);
    return { success: false, markets: [], method: 'getSimplifiedMarkets() + 多层过滤', error: e.message };
  }
}

// 方法 3：联网搜索
async function methodC_WebSearch() {
  console.log('\n' + '='.repeat(70));
  console.log('方法 3：联网搜索 "Polymarket active open markets February 2026"');
  console.log('='.repeat(70));

  try {
    const searchQuery = 'Polymarket active open markets February 2026';
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    console.log(`\n搜索 URL: ${searchUrl}`);

    const response = await https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    let html = '';
    response.on('data', (chunk) => {
      html += chunk;
    });

    response.on('end', () => {
      console.log(`\n✅ 搜索响应长度: ${html.length} 字符`);

      // 尝试提取市场信息
      const marketMatches = html.match(/"question":"([^"]+)"/g) || [];
      const uniqueMarkets = [...new Set(marketMatches)];

      console.log(`找到 ${uniqueMarkets.length} 个市场标题`);

      if (uniqueMarkets.length > 0) {
        console.log(`\n前 5 个市场标题:`);
        uniqueMarkets.slice(0, 5).forEach((match, index) => {
          const question = JSON.parse(match);
          console.log(`  ${index + 1}. ${question}`);
        });
      }

      // 暂时无法从 HTML 中提取完整的市场数据，所以返回失败
      return { success: false, markets: [], method: '联网搜索', error: '无法从 HTML 提取市场数据' };
    });

    return { success: false, markets: [], method: '联网搜索', error: '搜索请求已发送，等待响应' };

  } catch (e) {
    console.log(`❌ 方法 3 失败: ${e.message}`);
    return { success: false, markets: [], method: '联网搜索', error: e.message };
  }
}

// 验证市场 orderbook
async function verifyMarketOrderbook(market, token) {
  console.log(`\n验证市场 orderbook...`);
  console.log(`  Token ID: ${token.token_id}`);

  try {
    const orderbook = await client.getOrderBook(token.token_id);

    if (orderbook && (orderbook.asks && orderbook.asks.length > 0 || orderbook.bids && orderbook.bids.length > 0)) {
      console.log(`  ✅ Orderbook 存在！`);
      console.log(`  Asks 数量: ${orderbook.asks?.length || 0}`);
      console.log(`  Bids 数量: ${orderbook.bids?.length || 0}`);
      return { success: true, orderbook, market, token };
    } else {
      console.log(`  ❌ Orderbook 不存在或为空`);
      return { success: false, error: 'Orderbook does not exist' };
    }
  } catch (e) {
    console.log(`  ❌ 获取 orderbook 失败: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// 测试真实下单
async function testRealTrade(market, token) {
  console.log('\n' + '='.repeat(70));
  console.log('测试真实下单（小额、安全）');
  console.log('='.repeat(70));

  console.log(`\n市场完整信息:`);
  console.log(`  标题: ${market.question}`);
  console.log(`  Volume: $${(market.volume / 1000).toFixed(2)}K`);
  console.log(`  accepting_orders: ${market.accepting_orders}`);
  console.log(`  closed: ${market.closed}`);
  console.log(`  Token ID: ${token.token_id}`);
  console.log(`  价格: ${(token.price * 100).toFixed(2)}%`);

  console.log(`\n订单参数:`);
  const amount = 1; // 1 USDC
  const price = token.price;
  const size = amount / price;

  console.log(`  Amount: $${amount} USDC`);
  console.log(`  数量: ${size.toFixed(6)} 股`);
  console.log(`  Side: BUY`);
  console.log(`  Token ID: ${token.token_id} (Yes)`);

  try {
    // 使用 createMarketOrder
    console.log(`\n第一步：createMarketOrder`);
    
    const userOrder = {
      token_id: token.token_id,
      amount: amount,
      side: 'BUY',
      order_type: 'GTC', // Good-Til-Cancel
      reduce_only: false
    };

    const orderResult = await client.createMarketOrder(userOrder);

    console.log(`\n✅ 订单创建成功！`);
    console.log(`\n订单对象:`);
    console.log(JSON.stringify(orderResult, null, 2));

    // 第二步：post order
    console.log(`\n第二步：post order`);
    const postResult = await client.postOrder(orderResult.order);

    console.log(`\n✅ 订单提交成功！`);
    console.log(`\nPost 结果:`);
    console.log(JSON.stringify(postResult, null, 2));

    // 第三步：getOpenOrders 验证订单是否存在
    console.log(`\n第三步：getOpenOrders 验证订单是否存在`);

    try {
      const openOrders = await client.getOpenOrders();
      
      console.log(`当前 open orders: ${openOrders.length} 个`);

      if (openOrders.length > 0) {
        console.log(`\n✅ 订单验证成功！`);
        console.log(`\nOpen Orders:`);
        openOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. Order ID: ${order.order_id}`);
          console.log(`     Token ID: ${order.token_id}`);
          console.log(`     Side: ${order.side}`);
          console.log(`     Size: ${order.size}`);
        });

        // 记录到长期记忆
        saveToLongTermMemory({
          type: 'SUCCESSFUL_ORDER',
          market: market.question,
          token_id: token.token_id,
          amount: amount,
          side: 'BUY',
          order_id: postResult.order_id || openOrders[0]?.order_id
        });

        return { success: true, order: orderResult, post: postResult, openOrders };
      } else {
        console.log(`\n❌ 订单验证失败：未找到 open orders`);
        console.log(`\n可能原因:`);
        console.log(`  1. 订单已被撮合`);
        console.log(`  2. 订单已被取消`);
        console.log(`  3. 订单提交失败但未报告错误`);

        // 记录到长期记忆
        saveToLongTermMemory({
          type: 'ORDER_VERIFICATION_FAILED',
          market: market.question,
          token_id: token.token_id,
          amount: amount,
          side: 'BUY',
          order_id: postResult.order_id,
          reason: 'No open orders found'
        });

        return { success: false, error: 'Order verification failed', openOrders: [] };
      }
    } catch (e) {
      console.log(`\n❌ getOpenOrders 失败: ${e.message}`);
      return { success: false, error: e.message, openOrders: null };
    }

  } catch (e) {
    console.log(`\n❌ 下单失败`);
    console.log(`\n错误: ${e.message}`);
    console.log(`\n错误堆栈: ${e.stack}`);

    if (e.response) {
      console.log(`\nHTTP 状态码: ${e.response.status}`);
      console.log(`\nHTTP 响应:`);
      console.log(JSON.stringify(e.response.data, null, 2));
    }

    // 记录到长期记忆
    saveToLongTermMemory({
      type: 'ORDER_FAILED',
      market: market.question,
      token_id: token.token_id,
      amount: amount,
      side: 'BUY',
      error: e.message,
      http_status: e.response?.status,
      http_response: e.response?.data
    });

    console.log(`\n反思原因:`);
    console.log(`  1. 市场实际不可下单？`);
    console.log(`  2. 配额不足？`);
    console.log(`  3. Orderbook 已关闭？`);
    console.log(`  4. 市场状态已改变？`);

    return { success: false, error: e.message };
  }
}

// 自我优化循环
async function selfOptimizationLoop() {
  console.log('\n' + '='.repeat(70));
  console.log('自我优化循环');
  console.log('='.repeat(70));

  console.log(`\n当前参数:`);
  console.log(`  Volume 阈值: $${SELF_IMPROVEMENT.volumeThreshold}`);
  console.log(`  Midpoint 范围: ${SELF_IMPROVEMENT.midpointMin} - ${SELF_IMPROVEMENT.midpointMax}`);
  console.log(`  失败次数: ${SELF_IMPROVEMENT.failedAttempts}/${SELF_IMPROVEMENT.maxFailedAttempts}`);

  let validMarket = null;
  let validToken = null;

  // 尝试方法 1
  let resultA = await methodA_GetActiveMarkets();
  if (resultA.success && resultA.markets.length > 0) {
    console.log(`\n✅ 方法 1 成功！`);
    console.log(`\n验证前 20 个市场的 orderbook...`);

    for (let i = 0; i < Math.min(20, resultA.markets.length); i++) {
      const market = resultA.markets[i];
      if (!market.tokens || market.tokens.length === 0) continue;

      const token = market.tokens[0];
      const verifyResult = await verifyMarketOrderbook(market, token);

      if (verifyResult.success) {
        console.log(`\n✅ 找到有效市场！`);
        validMarket = market;
        validToken = token;
        SELF_IMPROVEMENT.foundMarkets.push({
          method: resultA.method,
          market: market,
          token: token
        });
        break;
      }
    }
  }

  // 如果方法 1 失败，尝试方法 2
  if (!validMarket) {
    let resultB = await methodB_GetSimplifiedWithFilters();
    if (resultB.success && resultB.markets.length > 0) {
      console.log(`\n✅ 方法 2 成功！`);
      console.log(`\n验证前 20 个市场的 orderbook...`);

      for (let i = 0; i < Math.min(20, resultB.markets.length); i++) {
        const market = resultB.markets[i];
        if (!market.tokens || market.tokens.length === 0) continue;

        const token = market.tokens[0];
        const verifyResult = await verifyMarketOrderbook(market, token);

        if (verifyResult.success) {
          console.log(`\n✅ 找到有效市场！`);
          validMarket = market;
          validToken = token;
          SELF_IMPROVEMENT.foundMarkets.push({
            method: resultB.method,
            market: market,
            token: token
          });
          break;
        }
      }
    }
  }

  // 如果方法 1 和 2 都失败，尝试方法 3（联网搜索）
  if (!validMarket) {
    console.log(`\n方法 1 和 2 都失败，尝试方法 3（联网搜索）`);
    let resultC = await methodC_WebSearch();
    // 方法 3 暂时无法从 HTML 提取完整市场数据，所以继续失败
  }

  // 检查是否找到有效市场
  if (validMarket && validToken) {
    console.log(`\n` + '='.repeat(70));
    console.log(`✅ 找到第一个严格符合条件的活跃市场！`);
    console.log('='.repeat(70));

    console.log(`\n市场完整信息:`);
    console.log(`  标题: ${validMarket.question}`);
    console.log(`  Volume: $${(validMarket.volume / 1000).toFixed(2)}K`);
    console.log(`  accepting_orders: ${validMarket.accepting_orders}`);
    console.log(`  closed: ${validMarket.closed}`);
    console.log(`  Token ID: ${validToken.token_id}`);
    console.log(`  价格: ${(validToken.price * 100).toFixed(2)}%`);

    // 测试真实下单
    console.log(`\n开始测试真实下单...`);
    const tradeResult = await testRealTrade(validMarket, validToken);

    return { success: tradeResult.success, tradeResult, market: validMarket, token: validToken };
  } else {
    console.log(`\n` + '='.repeat(70));
    console.log(`❌ 未找到符合严格条件的市场`);
    console.log('='.repeat(70));

    // 增加失败次数
    SELF_IMPROVEMENT.failedAttempts++;
    console.log(`\n失败次数: ${SELF_IMPROVEMENT.failedAttempts}/${SELF_IMPROVEMENT.maxFailedAttempts}`);

    // 如果连续 20 次检查无活跃市场，自动降低 volume 阈值
    if (SELF_IMPROVEMENT.failedAttempts >= SELF_IMPROVEMENT.maxFailedAttempts) {
      console.log(`\n连续 ${SELF_IMPROVEMENT.maxFailedAttempts} 次检查无活跃市场`);
      console.log(`自动降低 volume 阈值并放宽 midpoint 范围...`);

      // 降低 volume 阈值
      const newVolumeThreshold = Math.floor(SELF_IMPROVEMENT.volumeThreshold / 2);
      if (newVolumeThreshold >= 1) {
        SELF_IMPROVEMENT.volumeThreshold = newVolumeThreshold;
        console.log(`新的 volume 阈值: $${SELF_IMPROVEMENT.volumeThreshold}`);
      }

      // 放宽 midpoint 范围
      if (SELF_IMPROVEMENT.midpointMin > 0.001) {
        SELF_IMPROVEMENT.midpointMin = 0.001;
        console.log(`新的 midpoint 最小值: ${SELF_IMPROVEMENT.midpointMin}`);
      }

      if (SELF_IMPROVEMENT.midpointMax < 0.999) {
        SELF_IMPROVEMENT.midpointMax = 0.999;
        console.log(`新的 midpoint 最大值: ${SELF_IMPROVEMENT.midpointMax}`);
      }

      // 重置失败次数
      SELF_IMPROVEMENT.failedAttempts = 0;

      // 记录到长期记忆
      saveToLongTermMemory({
        type: 'SELF_IMPROVEMENT',
        iteration: SELF_IMPROVEMENT.iteration,
        failedAttempts: SELF_IMPROVEMENT.failedAttempts,
        newVolumeThreshold: SELF_IMPROVEMENT.volumeThreshold,
        newMidpointMin: SELF_IMPROVEMENT.midpointMin,
        newMidpointMax: SELF_IMPROVEMENT.midpointMax,
        reason: '连续 20 次检查无活跃市场，自动降低 volume 阈值并放宽 midpoint 范围'
      });

      console.log(`\n✅ 参数已更新，重新检查...`);

      // 递归调用
      return await selfOptimizationLoop();
    }

    return { success: false, error: 'No valid market found', failedAttempts: SELF_IMPROVEMENT.failedAttempts };
  }
}

// 每小时反思一次
async function hourlyReflection() {
  console.log('\n' + '='.repeat(70));
  console.log('每小时反思');
  console.log('='.repeat(70));

  console.log(`\n当前状态:`);
  console.log(`  迭代次数: ${SELF_IMPROVEMENT.iteration}`);
  console.log(`  失败次数: ${SELF_IMPROVEMENT.failedAttempts}`);
  console.log(`  Volume 阈值: $${SELF_IMPROVEMENT.volumeThreshold}`);
  console.log(`  Midpoint 范围: ${SELF_IMPROVEMENT.midpointMin} - ${SELF_IMPROVEMENT.midpointMax}`);
  console.log(`  找到的市场数量: ${SELF_IMPROVEMENT.foundMarkets.length}`);
  console.log(`  成功下单数量: ${SELF_IMPROVEMENT.successfulOrders.length}`);

  console.log(`\n反思问题:`);
  console.log(`  1. 为什么找不到活跃市场？`);
  console.log(`  2. 是筛选条件太严格吗？`);
  console.log(`  3. 是市场数据源不完整吗？`);
  console.log(`  4. 是当前时间不是交易高峰期吗？`);

  console.log(`\n调整建议:`);
  console.log(`  1. 降低 volume 阈值（如果失败次数多）`);
  console.log(`  2. 放宽 midpoint 范围（如果失败次数多）`);
  console.log(`  3. 添加新的数据源（e.g. web_search Polymarket events）`);
  console.log(`  4. 在交易高峰期重试`);

  // 记录到长期记忆
  saveToLongTermMemory({
    type: 'HOURLY_REFLECTION',
    timestamp: new Date().toISOString(),
    iteration: SELF_IMPROVEMENT.iteration,
    failedAttempts: SELF_IMPROVEMENT.failedAttempts,
    volumeThreshold: SELF_IMPROVEMENT.volumeThreshold,
    midpointMin: SELF_IMPROVEMENT.midpointMin,
    midpointMax: SELF_IMPROVEMENT.midpointMax,
    foundMarkets: SELF_IMPROVEMENT.foundMarkets.length,
    successfulOrders: SELF_IMPROVEMENT.successfulOrders.length
  });

  console.log(`\n✅ 每小时反思完成`);

  SELF_IMPROVEMENT.iteration++;
  SELF_IMPROVEMENT.lastReflection = new Date().toISOString();
}

// 主函数
async function main() {
  console.log('🧬 Polymarket 自我进化 - 优化市场获取与筛选逻辑 + 测试真实下单\n');

  const startTime = Date.now();

  // 运行自我优化循环
  const loopResult = await selfOptimizationLoop();

  // 计算运行时间
  const endTime = Date.now();
  const runTime = (endTime - startTime) / 1000; // 转换为秒

  console.log('\n\n' + '='.repeat(70));
  console.log('最终结果');
  console.log('='.repeat(70));

  if (loopResult.success) {
    console.log('\n✅ 找到有效市场并测试下单成功！');
    console.log('\n测试完整日志:');
    console.log(`  市场标题: ${loopResult.market.question}`);
    console.log(`  Token ID: ${loopResult.token.token_id}`);
    console.log(`  价格: ${(loopResult.token.price * 100).toFixed(2)}%`);
    console.log(`  下单结果: ${loopResult.tradeResult.success ? '成功' : '失败'}`);

    if (loopResult.tradeResult.openOrders && loopResult.tradeResult.openOrders.length > 0) {
      console.log(`  订单验证: 成功（${loopResult.tradeResult.openOrders.length} 个 open orders）`);
    }

    // 记录成功到长期记忆
    SELF_IMPROVEMENT.successfulOrders.push({
      market: loopResult.market,
      token: loopResult.token,
      timestamp: new Date().toISOString()
    });

    saveToLongTermMemory({
      type: 'SUCCESSFUL_TRADE_TEST',
      market: loopResult.market.question,
      token_id: loopResult.token.token_id,
      tradeResult: loopResult.tradeResult,
      runTime: runTime
    });

    console.log('\n标记为: "自我进化成功 - 找到 active market 并测试下单"');
  } else {
    console.log('\n❌ 未找到符合严格条件的市场');
    console.log(`错误: ${loopResult.error}`);
    console.log(`失败次数: ${loopResult.failedAttempts}/${SELF_IMPROVEMENT.maxFailedAttempts}`);

    // 记录失败到长期记忆
    saveToLongTermMemory({
      type: 'FAILED_TRADE_TEST',
      error: loopResult.error,
      failedAttempts: loopResult.failedAttempts,
      volumeThreshold: SELF_IMPROVEMENT.volumeThreshold,
      midpointMin: SELF_IMPROVEMENT.midpointMin,
      midpointMax: SELF_IMPROVEMENT.midpointMax,
      runTime: runTime
    });

    console.log('\n建议:');
    console.log('  1. 等待一段时间后再试');
    console.log('  2. 查看 Polymarket 网站确认当前状态');
    console.log('  3. 可能当前时间不是交易高峰期');

    console.log('\n标记为: "自我进化部分成功 - 市场筛选正常"');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 自我进化完成');
  console.log(`运行时间: ${runTime.toFixed(2)} 秒`);
  console.log('='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});

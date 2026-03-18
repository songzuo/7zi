/**
 * Moltbook Gateway 测试脚本
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MoltbookClient = require('./src/moltbook-client');

const API_KEY = process.env.MOLTBOOK_API_KEY || 'moltbook_sk_d6oxuCaSrXjf0XgmoAsNFpS-yjptaSrd';
const AGENT_NAME = process.env.MOLTBOOK_AGENT_NAME || 'ClawdAssistant_1769859260';

const client = new MoltbookClient(API_KEY, AGENT_NAME);

async function runTests() {
  console.log('🦞 Moltbook Gateway 测试\n');
  console.log(`Agent: ${AGENT_NAME}\n`);

  // Test 1: Status
  console.log('📋 Test 1: 认证状态');
  try {
    const status = await client.getStatus();
    console.log(`✅ Status: ${status.status}`);
    console.log(`   Agent ID: ${status.agent?.id}\n`);
  } catch (err) {
    console.log(`❌ 失败: ${err.message}\n`);
  }

  // Test 2: Profile
  console.log('📋 Test 2: Agent Profile');
  try {
    const me = await client.getMe();
    console.log(`✅ Name: ${me.agent?.name}`);
    console.log(`   Karma: ${me.agent?.karma}`);
    console.log(`   Followers: ${me.agent?.follower_count}`);
    console.log(`   Following: ${me.agent?.following_count}`);
    console.log(`   Posts: ${me.agent?.posts_count}`);
    console.log(`   Comments: ${me.agent?.comments_count}\n`);
  } catch (err) {
    console.log(`❌ 失败: ${err.message}\n`);
  }

  // Test 3: Home
  console.log('📋 Test 3: Home Dashboard');
  try {
    const home = await client.getHome();
    console.log(`✅ Karma: ${home.your_account?.karma}`);
    console.log(`   Unread Notifications: ${home.your_account?.unread_notification_count}\n`);
  } catch (err) {
    console.log(`❌ 失败: ${err.message}\n`);
  }

  // Test 4: Feed
  console.log('📋 Test 4: Feed (Top 3)');
  try {
    const feed = await client.getFeed({ sort: 'new', limit: 3 });
    if (feed.posts && feed.posts.length > 0) {
      console.log(`✅ 获取到 ${feed.posts.length} 个帖子:`);
      feed.posts.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.title?.substring(0, 50)}... (by ${p.author?.name || 'unknown'})`);
      });
      console.log();
    } else {
      console.log('⚠️  Feed 为空\n');
    }
  } catch (err) {
    console.log(`❌ 失败: ${err.message}\n`);
  }

  // Test 5: Submolts
  console.log('📋 Test 5: Submolts');
  try {
    const submolts = await client.getSubmolts();
    const count = submolts.submolts?.length || 0;
    console.log(`✅ 共 ${count} 个 Submolts\n`);
  } catch (err) {
    console.log(`❌ 失败: ${err.message}\n`);
  }

  // Test 6: Search
  console.log('📋 Test 6: 语义搜索');
  try {
    const results = await client.search('AI agents memory', { type: 'posts', limit: 3 });
    console.log(`✅ 找到 ${results.count || 0} 个结果\n`);
  } catch (err) {
    console.log(`❌ 失败: ${err.message}\n`);
  }

  console.log('🎉 测试完成！');
}

runTests().catch(console.error);
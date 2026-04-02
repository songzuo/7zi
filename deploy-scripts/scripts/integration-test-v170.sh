#!/bin/bash
# ============================================
# v1.7.0 集成测试脚本
# ============================================
# 功能: 运行 v1.7.0 集成测试
# 用法: ./integration-test-v170.sh [--full] [--coverage]
# ============================================

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_FULL_TESTS=false
COVERAGE=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --full|-f)
            RUN_FULL_TESTS=true
            shift
            ;;
        --coverage|-c)
            COVERAGE=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=========================================="
echo -e "v1.7.0 集成测试"
echo -e "完整测试: $RUN_FULL_TESTS"
echo -e "代码覆盖率: $COVERAGE"
echo -e "==========================================${NC}"
echo ""

# 测试结果
declare -i TOTAL_TESTS=0
declare -i PASSED_TESTS=0
declare -i FAILED_TESTS=0

run_test_suite() {
    local suite_name="$1"
    local suite_cmd="$2"
    
    echo -e "${BLUE}运行测试套件: $suite_name${NC}"
    
    if eval "$suite_cmd"; then
        echo -e "${GREEN}✓ $suite_name 通过${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ $suite_name 失败${NC}"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    echo ""
}

# ============================================
# 1. Multi-Agent 协作测试
# ============================================
echo -e "${CYAN}=== Multi-Agent 协作测试 ===${NC}"

run_test_suite "Agent 注册测试" "
    curl -X POST http://localhost:3000/api/agents/register \
        -H 'Content-Type: application/json' \
        -d '{
            \"id\": \"test-agent-001\",
            \"name\": \"Test Agent\",
            \"type\": \"research\",
            \"capabilities\": [\"search\", \"analyze\"],
            \"version\": \"1.7.0\"
        }' \
        | jq -e '.success == true'
"

run_test_suite "Agent 状态查询测试" "
    curl -X GET http://localhost:3000/api/agents/test-agent-001 \
        | jq -e '.id == \"test-agent-001\"'
"

run_test_suite "Agent 心跳测试" "
    curl -X POST http://localhost:3000/api/agents/heartbeat \
        -H 'Content-Type: application/json' \
        -d '{
            \"agentId\": \"test-agent-001\",
            \"status\": \"active\",
            \"timestamp\": \"$(date -Iseconds)\"
        }' \
        | jq -e '.success == true'
"

run_test_suite "任务委派测试" "
    curl -X POST http://localhost:3000/api/agents/delegate \
        -H 'Content-Type: application/json' \
        -d '{
            \"taskId\": \"task-001\",
            \"type\": \"research\",
            \"priority\": \"high\",
            \"agentType\": \"research\",
            \"timeout\": 30000
        }' \
        | jq -e '.delegated == true'
"

run_test_suite "任务队列查询测试" "
    curl -X GET http://localhost:3000/api/agents/queue \
        | jq -e 'type == \"array\"'
"

# ============================================
# 2. 性能监控测试
# ============================================
echo -e "${CYAN}=== 性能监控测试 ===${NC}"

run_test_suite "Web Vitals 测试" "
    curl -X GET http://localhost:3000/api/performance/vitals \
        | jq -e '.lcp > 0 and .fid > 0 and .cls >= 0'
"

run_test_suite "Agent 统计测试" "
    curl -X GET http://localhost:3000/api/agents/stats \
        | jq -e '.total >= 0 and .active >= 0'
"

run_test_suite "缓存命中率测试" "
    curl -X GET http://localhost:3000/api/cache/stats \
        | jq -e '.hitRate >= 0 and .hitRate <= 1'
"

# ============================================
# 3. 告警系统测试
# ============================================
echo -e "${CYAN}=== 告警系统测试 ===${NC}"

run_test_suite "告警配置测试" "
    curl -X GET http://localhost:3000/api/alerts/config \
        | jq -e '.emailEnabled != null or .slackEnabled != null'
"

run_test_suite "告警历史测试" "
    curl -X GET http://localhost:3000/api/alerts/history \
        | jq -e 'type == \"array\"'
"

# ============================================
# 4. 负载测试 (可选)
# ============================================
if [[ "$RUN_FULL_TESTS" == "true" ]]; then
    echo -e "${CYAN}=== 负载测试 ===${NC}"
    
    run_test_suite "并发请求测试" "
        for i in {1..100}; do
            curl -s http://localhost:3000/api/health > /dev/null &
        done
        wait
        echo \"100 个并发请求完成\"
    "
    
    run_test_suite "Agent 批量注册测试" "
        for i in {1..20}; do
            curl -s -X POST http://localhost:3000/api/agents/register \
                -H 'Content-Type: application/json' \
                -d \"{
                    \\\"id\\\": \\\"load-test-agent-\$i\\\",
                    \\\"name\\\": \\\"Load Test Agent \$i\\\",
                    \\\"type\\\": \\\"test\\\",
                    \\\"capabilities\\\": [\\\"test\\\"],
                    \\\"version\\\": \\\"1.7.0\\\"
                }\" > /dev/null &
        done
        wait
        echo \"20 个 Agent 批量注册完成\"
    "
fi

# ============================================
# 5. 数据库持久化测试
# ============================================
echo -e "${CYAN}=== 数据库持久化测试 ===${NC}"

run_test_suite "Redis 数据存储测试" "
    docker exec 7zi-redis-v170 redis-cli -a '${REDIS_PASSWORD:-7zi-redis-password}' \
        SET 'test:key:001' 'test-value' > /dev/null
    docker exec 7zi-redis-v170 redis-cli -a '${REDIS_PASSWORD:-7zi-redis-password}' \
        GET 'test:key:001' | grep -q 'test-value'
"

run_test_suite "Agent 状态持久化测试" "
    # 注册 Agent
    curl -s -X POST http://localhost:3000/api/agents/register \
        -H 'Content-Type: application/json' \
        -d '{
            \"id\": \"persist-test-agent\",
            \"name\": \"Persistence Test Agent\",
            \"type\": \"test\",
            \"capabilities\": [\"test\"],
            \"version\": \"1.7.0\"
        }' > /dev/null
    
    # 等待 Redis 持久化
    sleep 2
    
    # 检查 Redis 中是否存在
    docker exec 7zi-redis-v170 redis-cli -a '${REDIS_PASSWORD:-7zi-redis-password}' \
        EXISTS 'agent:persist-test-agent' | grep -q '1'
"

# ============================================
# 6. 故障恢复测试
# ============================================
if [[ "$RUN_FULL_TESTS" == "true" ]]; then
    echo -e "${CYAN}=== 故障恢复测试 ===${NC}"
    
    # 保存当前 Agent 状态
    TEST_AGENT_ID="recovery-test-agent"
    curl -s -X POST http://localhost:3000/api/agents/register \
        -H 'Content-Type: application/json' \
        -d '{
            "id": "'$TEST_AGENT_ID'",
            "name": "Recovery Test Agent",
            "type": "test",
            "capabilities": ["test"],
            "version": "1.7.0"
        }' > /dev/null
    
    run_test_suite "Agent 超时恢复测试" "
        # 等待超时 (30 秒)
        sleep 35
        
        # Agent 应该被标记为离线
        STATUS=\$(curl -s http://localhost:3000/api/agents/$TEST_AGENT_ID | jq -r '.status')
        echo \"Agent 状态: \$STATUS\"
        [[ \"\$STATUS\" == \"offline\" ]] || [[ \"\$STATUS\" == \"disconnected\" ]]
    "
    
    run_test_suite "Agent 重新连接测试" "
        # 重新发送心跳
        curl -s -X POST http://localhost:3000/api/agents/heartbeat \
            -H 'Content-Type: application/json' \
            -d '{
                \"agentId\": \"'$TEST_AGENT_ID'\",
                \"status\": \"active\",
                \"timestamp\": \"$(date -Iseconds)\"
            }' > /dev/null
        
        sleep 2
        
        # Agent 应该恢复在线
        STATUS=\$(curl -s http://localhost:3000/api/agents/$TEST_AGENT_ID | jq -r '.status')
        echo \"Agent 状态: \$STATUS\"
        [[ \"\$STATUS\" == \"online\" ]] || [[ \"\$STATUS\" == \"active\" ]]
    "
fi

# ============================================
# 7. 完整代码覆盖率测试
# ============================================
if [[ "$COVERAGE" == "true" ]]; then
    echo -e "${CYAN}=== 代码覆盖率测试 ===${NC}"
    
    cd /root/.openclaw/workspace
    
    if command -v pnpm &> /dev/null; then
        echo "运行单元测试并生成覆盖率报告..."
        pnpm test:coverage || {
            echo "覆盖率测试失败，继续..."
            ((FAILED_TESTS++))
        }
    fi
    
    cd "$SCRIPT_DIR"
fi

# ============================================
# 8. 清理测试数据
# ============================================
echo -e "${CYAN}=== 清理测试数据 ===${NC}"

echo "清理测试 Agent..."
for agent_id in test-agent-001 persist-test-agent recovery-test-agent $(seq -f "load-test-agent-%g" 1 20); do
    curl -s -X DELETE "http://localhost:3000/api/agents/$agent_id" > /dev/null || true
done

echo "清理 Redis 测试数据..."
docker exec 7zi-redis-v170 redis-cli -a '${REDIS_PASSWORD:-7zi-redis-password}' \
    DEL 'test:key:001' > /dev/null 2>&1 || true

echo -e "${GREEN}清理完成${NC}"
echo ""

# ============================================
# 汇总
# ============================================
echo -e "${CYAN}=========================================="
echo -e "集成测试汇总"
echo -e "==========================================${NC}"
echo -e "总测试套件: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo ""

# 生成测试报告
REPORT_FILE="/tmp/integration-test-v170-$(date +%Y%m%d_%H%M%S).json"
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "version": "v1.7.0",
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "passRate": $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
  },
  "config": {
    "fullTests": $RUN_FULL_TESTS,
    "coverage": $COVERAGE
  }
}
EOF

echo -e "${BLUE}报告已保存: $REPORT_FILE${NC}"
echo ""

# 退出码
if [[ "$FAILED_TESTS" -gt 0 ]]; then
    echo -e "${RED}集成测试失败!${NC}"
    exit 1
else
    echo -e "${GREEN}集成测试全部通过! ✓${NC}"
    exit 0
fi

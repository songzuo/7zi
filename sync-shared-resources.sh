#!/bin/bash

# 共享资源客户端脚本
# 从主服务器同步资源到本地

SERVER_HOST="192.168.0.106"
SERVER_PORT=18082
WORKSPACE="/root/.openclaw/workspace"

# 确保目录存在
mkdir -p "$WORKSPACE"
mkdir -p "$WORKSPACE/dna-memory"
mkdir -p "$WORKSPACE/skills"

sync_resources() {
    echo "Syncing resources from $SERVER_HOST:$SERVER_PORT..."
    curl -s "http://$SERVER_HOST:$SERVER_PORT/resources" -o "$WORKSPACE/compute-resources-db.json"
    echo "✅ Resources synced"
}

sync_dna_memory() {
    echo "Syncing DNA Memory from $SERVER_HOST:$SERVER_PORT..."
    curl -s "http://$SERVER_HOST:$SERVER_PORT/dna-memory" -o "$WORKSPACE/dna-memory/synced.json"
    echo "✅ DNA Memory synced"
}

sync_skills() {
    echo "Syncing skills from $SERVER_HOST:$SERVER_PORT..."

    # 获取技能列表
    skills=$(curl -s "http://$SERVER_HOST:$SERVER_PORT/skills")

    # 为每个技能创建本地目录和文件
    echo "$skills" | jq -r '.[] | .name' | while read skill_name; do
        skill_dir="$WORKSPACE/skills/$skill_name"
        mkdir -p "$skill_dir"

        # 获取技能内容
        skill_content=$(echo "$skills" | jq -r ".[] | select(.name==\"$skill_name\") | .content")
        echo "$skill_content" > "$skill_dir/SKILL.md"

        echo "  ✅ Synced: $skill_name"
    done
}

sync_config() {
    echo "Syncing OpenClaw config from $SERVER_HOST:$SERVER_PORT..."
    curl -s "http://$SERVER_HOST:$SERVER_PORT/config" -o "/root/.openclaw/openclaw-shared.json"
    echo "✅ Config synced to openclaw-shared.json"
}

sync_all() {
    sync_resources
    sync_dna_memory
    sync_skills
    sync_config
    echo ""
    echo "🎉 All resources synced!"
}

test_connection() {
    echo "Testing connection to $SERVER_HOST:$SERVER_PORT..."
    response=$(curl -s "http://$SERVER_HOST:$SERVER_PORT/health" -w "\n%{http_code}")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ]; then
        echo "✅ Connection successful"
        echo "$body" | jq .
    else
        echo "❌ Connection failed (HTTP $http_code)"
        return 1
    fi
}

case "$1" in
    resources)
        sync_resources
        ;;
    dna-memory)
        sync_dna_memory
        ;;
    skills)
        sync_skills
        ;;
    config)
        sync_config
        ;;
    all)
        sync_all
        ;;
    test)
        test_connection
        ;;
    *)
        echo "Usage: $0 {resources|dna-memory|skills|config|all|test}"
        echo ""
        echo "Commands:"
        echo "  resources   - Sync API resources"
        echo "  dna-memory  - Sync DNA Memory"
        echo "  skills      - Sync skills"
        echo "  config      - Sync OpenClaw config"
        echo "  all         - Sync everything"
        echo "  test        - Test connection to server"
        exit 1
        ;;
esac

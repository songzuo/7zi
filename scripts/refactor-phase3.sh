#!/bin/bash
#===============================================================================
# Phase 3: 统一重叠模块
# 工作量: 1 周
# 目标: 合并 collab/collaboration、rate-limit/rate-limiting-gateway 等重叠模块
#===============================================================================

set -e

LIB_DIR="/root/.openclaw/workspace/src/lib"
BACKUP_DIR="/root/.openclaw/workspace/backups/phase3-$(date +%Y%m%d-%H%M%S)"
DRY_RUN=${DRY_RUN:-false}

echo "============================================"
echo "Phase 3: 统一重叠模块"
echo "DRY_RUN: $DRY_RUN"
echo "============================================"

#-------------------------------------------------------------------------------
# 3.1: collab/ vs collaboration/
#-------------------------------------------------------------------------------
echo ""
echo "[3.1] collab/ vs collaboration/"
echo "================================"

COLLAB_A="$LIB_DIR/collab"
COLLAB_B="$LIB_DIR/collaboration"

echo "分析两个模块..."

if [ -d "$COLLAB_A" ] && [ -d "$COLLAB_B" ]; then
    echo ""
    echo "  发现两个目录同时存在:"
    echo ""
    echo "  === collab/ ==="
    find "$COLLAB_A" -name "*.ts" -type f 2>/dev/null | head -20
    echo ""
    echo "  === collaboration/ ==="
    find "$COLLAB_B" -name "*.ts" -type f 2>/dev/null | head -20
    
    echo ""
    echo "  建议合并策略:"
    echo "  1. 保留 collaboration/ 作为主模块 (名称更完整)"
    echo "  2. 将 collab/ 中的独有功能迁移到 collaboration/"
    echo "  3. 更新所有 import 路径"
    echo "  4. 删除 collab/"
    echo ""
    
    # 分析各自导出
    echo "  导出的主要类/函数:"
    if [ -f "$COLLAB_A/core/index.ts" ]; then
        echo "    collab/core: $(grep -c '^export' "$COLLAB_A/core/index.ts") 个导出"
    fi
    if [ -f "$COLLAB_B/collab/core.ts" ]; then
        echo "    collaboration/collab: $(grep -c '^export' "$COLLAB_B/collab/core.ts") 个导出"
    fi
elif [ -d "$COLLAB_A" ]; then
    echo "  仅存在 collab/"
    echo "  内容:"
    find "$COLLAB_A" -name "*.ts" -type f 2>/dev/null | head -10
elif [ -d "$COLLAB_B" ]; then
    echo "  仅存在 collaboration/"
    echo "  内容:"
    find "$COLLAB_B" -name "*.ts" -type f 2>/dev/null | head -10
else
    echo "  两个目录都不存在"
fi

#-------------------------------------------------------------------------------
# 3.2: rate-limit/ vs rate-limiting-gateway/
#-------------------------------------------------------------------------------
echo ""
echo "[3.2] rate-limit/ vs rate-limiting-gateway/"
echo "=========================================="

RL_A="$LIB_DIR/rate-limit"
RL_B="$LIB_DIR/rate-limiting-gateway"

if [ -d "$RL_A" ] && [ -d "$RL_B" ]; then
    echo ""
    echo "  发现两个目录同时存在:"
    echo ""
    echo "  === rate-limit/ ==="
    find "$RL_A" -name "*.ts" -type f 2>/dev/null | head -20
    echo ""
    echo "  === rate-limiting-gateway/ ==="
    find "$RL_B" -name "*.ts" -type f 2>/dev/null | head -20
    
    echo ""
    echo "  建议合并策略:"
    echo "  1. 保留 rate-limiting-gateway/ (功能更完整)"
    echo "  2. 评估是否需要 rate-limit/ 作为轻量替代"
    echo "  3. 统一 API 接口"
    echo "  4. 考虑: 将 rate-limit 重命名为 rate-limiting-memory"
    echo ""
elif [ -d "$RL_A" ]; then
    echo "  仅存在 rate-limit/"
    find "$RL_A" -name "*.ts" -type f 2>/dev/null | head -10
elif [ -d "$RL_B" ]; then
    echo "  仅存在 rate-limiting-gateway/"
    find "$RL_B" -name "*.ts" -type f 2>/dev/null | head -10
fi

#-------------------------------------------------------------------------------
# 3.3: error/ vs errors/
#-------------------------------------------------------------------------------
echo ""
echo "[3.3] error/ vs errors/"
echo "======================"

ERR_A="$LIB_DIR/error"
ERR_B="$LIB_DIR/errors"

if [ -d "$ERR_A" ] && [ -d "$ERR_B" ]; then
    echo ""
    echo "  发现两个目录同时存在:"
    echo ""
    echo "  === error/ ==="
    find "$ERR_A" -name "*.ts" -type f 2>/dev/null | head -20
    echo ""
    echo "  === errors/ ==="
    find "$ERR_B" -name "*.ts" -type f 2>/dev/null | head -20
    
    echo ""
    echo "  建议合并策略:"
    echo "  1. 保留 error/ (更短，更常见)"
    echo "  2. 将 errors/ 的内容合并到 error/"
    echo "  3. 删除 errors/"
    echo ""
elif [ -d "$ERR_A" ]; then
    echo "  仅存在 error/"
    find "$ERR_A" -name "*.ts" -type f 2>/dev/null | head -10
elif [ -d "$ERR_B" ]; then
    echo "  仅存在 errors/"
    find "$ERR_B" -name "*.ts" -type f 2>/dev/null | head -10
fi

#-------------------------------------------------------------------------------
# 3.4: utils/ 重复文件合并
#-------------------------------------------------------------------------------
echo ""
echo "[3.4] utils/ 重复文件合并"
echo "========================="

UTILS_DIR="$LIB_DIR/utils"

if [ -f "$LIB_DIR/utils.ts" ] && [ -d "$UTILS_DIR" ]; then
    echo "  发现 utils.ts 和 utils/ 目录并存"
    echo ""
    echo "  utils.ts 内容预览:"
    head -30 "$LIB_DIR/utils.ts" | grep -E "^export"
    echo ""
    echo "  utils/index.ts 内容预览:"
    head -30 "$LIB_DIR/utils/index.ts" 2>/dev/null | grep -E "^export"
    echo ""
    echo "  建议: 合并到 utils/index.ts，删除根目录的 utils.ts"
fi

#-------------------------------------------------------------------------------
# 3.5: plugins/ vs tools/ 边界审查
#-------------------------------------------------------------------------------
echo ""
echo "[3.5] plugins/ vs tools/ 边界审查"
echo "=================================="

PLUGINS_DIR="$LIB_DIR/plugins"
TOOLS_DIR="$LIB_DIR/tools"

if [ -d "$PLUGINS_DIR" ]; then
    echo ""
    echo "  plugins/ 内容 (前15个文件):"
    find "$PLUGINS_DIR" -name "*.ts" -type f 2>/dev/null | head -15
fi

if [ -d "$TOOLS_DIR" ]; then
    echo ""
    echo "  tools/ 内容 (前15个文件):"
    find "$TOOLS_DIR" -name "*.ts" -type f 2>/dev/null | head -15
fi

if [ -d "$PLUGINS_DIR" ] && [ -d "$TOOLS_DIR" ]; then
    echo ""
    echo "  建议: 明确区分"
    echo "  - plugins/: 扩展点、钩子、生命周期管理"
    echo "  - tools/: 独立工具函数、CLI 工具"
fi

#-------------------------------------------------------------------------------
# 3.6: monitoring/ 多版本 anomaly-detector 统一
#-------------------------------------------------------------------------------
echo ""
echo "[3.6] monitoring/ anomaly-detector 版本统一"
echo "============================================="

MON_DIR="$LIB_DIR/monitoring"
AD_FILES=$(find "$MON_DIR" -name "*anomaly-detector*" -type f 2>/dev/null || echo "")

if [ -n "$AD_FILES" ]; then
    echo "  发现的 anomaly-detector 版本:"
    echo "$AD_FILES" | while read -f; do
        if [ -f "$f" ]; then
            lines=$(wc -l < "$f")
            echo "    $f: $lines 行"
        fi
    done
    
    echo ""
    echo "  建议统一架构:"
    cat << 'UNIFIED_ARCH'
      monitoring/anomaly-detector/
      ├── index.ts              # 统一导出
      ├── detector.ts           # 主检测器 (推荐保留的版本)
      ├── detectors/            # 可插拔检测算法
      │   ├── zscore.ts
      │   ├── isolation-forest.ts
      │   └── ...
      └── config.ts             # 配置管理
UNIFIED_ARCH
fi

#-------------------------------------------------------------------------------
# 3.7: mcp/ message-queue/ log-aggregator 评估
#-------------------------------------------------------------------------------
echo ""
echo "[3.7] 独立功能模块评估"
echo "====================="

INDEPENDENT_MODULES=("mcp" "message-queue" "log-aggregator" "react-compiler")

for mod in "${INDEPENDENT_MODULES[@]}"; do
    MOD_DIR="$LIB_DIR/$mod"
    if [ -d "$MOD_DIR" ]; then
        file_count=$(find "$MOD_DIR" -name "*.ts" -type f 2>/dev/null | wc -l)
        total_lines=$(find "$MOD_DIR" -name "*.ts" -type f -exec cat {} \; 2>/dev/null | wc -l)
        echo ""
        echo "  $mod/: $file_count 文件, ~$total_lines 行"
        echo "  评估: 是否属于核心业务? $([ $total_lines -gt 500 ] && echo "建议审查" || echo "可考虑提取为独立包")"
    fi
done

#-------------------------------------------------------------------------------
# 3.8: websocket 架构审查 (已部分重构)
#-------------------------------------------------------------------------------
echo ""
echo "[3.8] websocket/ 架构审查"
echo "========================"

WS_DIR="$LIB_DIR/websocket"
if [ -d "$WS_DIR" ]; then
    echo "  websocket/ 结构:"
    find "$WS_DIR" -name "*.ts" -type f 2>/dev/null | head -20
    
    echo ""
    echo "  建议: 确认已重构部分是否稳定，可能需要完整审查"
fi

#-------------------------------------------------------------------------------
# 3.9: 依赖关系分析 (生成 import 关系图)
#-------------------------------------------------------------------------------
echo ""
echo "[3.9] 关键模块依赖关系"
echo "====================="

echo ""
echo "  collab/ 被以下模块引用:"
grep -r "from ['\".]*collab" "$LIB_DIR" 2>/dev/null | grep -v "collab/" | cut -d: -f1 | sort -u | head -10

echo ""
echo "  rate-limit/ 被以下模块引用:"
grep -r "from ['\".]*rate-limit" "$LIB_DIR" 2>/dev/null | grep -v "rate-limit/" | cut -d: -f1 | sort -u | head -10

echo ""
echo "  error/ 被以下模块引用:"
grep -r "from ['\".]*error" "$LIB_DIR" 2>/dev/null | grep -v "error/" | cut -d: -f1 | sort -u | head -10

#-------------------------------------------------------------------------------
# 执行清单
#-------------------------------------------------------------------------------
echo ""
echo "============================================"
echo "Phase 3 执行检查清单"
echo "============================================"
echo ""
echo "每次合并前，请完成以下检查:"
echo ""
echo "  □ 1. 确认两个模块的导出内容"
echo "  □ 2. 识别重复的类/函数"
echo "  □ 3. 选择保留的主模块 (名称更清晰的)"
echo "  □ 4. 列出所有依赖这两个模块的文件"
echo "  □ 5. 更新 import 路径"
echo "  □ 6. 删除废弃模块"
echo "  □ 7. 运行 TypeScript 编译检查"
echo "  □ 8. 运行相关测试"
echo ""
echo "推荐执行顺序:"
echo "  1. error/ + errors/ (最简单，都是 error 类)"
echo "  2. utils.ts + utils/ (都是工具函数)"
echo "  3. rate-limit/ + rate-limiting-gateway/ (接口需对齐)"
echo "  4. collab/ + collaboration/ (最复杂，涉及实时协作逻辑)"
echo ""
echo "风险点:"
echo "  - collab/collaboration 可能被外部 consumer 依赖"
echo "  - rate-limit 模块可能有不同的性能要求"
echo "  - 需要确保合并后 API 向后兼容"
echo ""
[ "$DRY_RUN" = "true" ] && echo "提示: DRY_RUN=true，未执行任何修改"

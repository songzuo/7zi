#!/bin/bash
#===============================================================================
# Phase 1: 清理明显重复和 Dead Code
# 工作量: 1-2 天
# 目标: 删除废弃代码、合并重复模块、清理无用导出
#===============================================================================

set -e

LIB_DIR="/root/.openclaw/workspace/src/lib"
BACKUP_DIR="/root/.openclaw/workspace/backups/phase1-$(date +%Y%m%d-%H%M%S)"
DRY_RUN=${DRY_RUN:-false}

echo "============================================"
echo "Phase 1: 清理 Dead Code 和重复模块"
echo "DRY_RUN: $DRY_RUN"
echo "BACKUP_DIR: $BACKUP_DIR"
echo "============================================"

# 创建备份目录
if [ "$DRY_RUN" != "true" ]; then
    mkdir -p "$BACKUP_DIR"
fi

#-------------------------------------------------------------------------------
# 1.1 删除或归档废弃文件 (@deprecated / legacy)
#-------------------------------------------------------------------------------
echo ""
echo "[1.1] 标记废弃文件..."

DEPRECATED_FILES=(
    "$LIB_DIR/db/pagination.ts"
    "$LIB_DIR/db/connection-pool.ts"
    "$LIB_DIR/sentry.ts"
    "$LIB_DIR/error/core/error-factory.ts"
    "$LIB_DIR/crypto/index.ts"
    "$LIB_DIR/utils.ts"
    "$LIB_DIR/utils/index.ts"
    "$LIB_DIR/utils/async.ts"
)

for file in "${DEPRECATED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  FOUND: $file"
        if [ "$DRY_RUN" != "true" ]; then
            # 移动到备份目录而非直接删除
            cp "$file" "$BACKUP_DIR/"
            echo "  -> 已备份到 $BACKUP_DIR/$(basename $file)"
            # 如果确认无引用，可改为: rm "$file"
        fi
    fi
done

#-------------------------------------------------------------------------------
# 1.2 合并重复工具函数 (utils.ts 合并到 utils/)
#-------------------------------------------------------------------------------
echo ""
echo "[1.2] 合并重复 utils..."

UTILS_MAIN="$LIB_DIR/utils.ts"
UTILS_DIR="$LIB_DIR/utils"
UTILS_INDEX="$LIB_DIR/utils/index.ts"

if [ -f "$UTILS_MAIN" ] && [ -f "$UTILS_INDEX" ]; then
    echo "  检测到重复: utils.ts 和 utils/index.ts"
    echo "  建议操作: 审查两个文件，保留 utils/index.ts，将 utils.ts 的独有函数迁移后删除"
    if [ "$DRY_RUN" != "true" ]; then
        # 简单备份
        cp "$UTILS_MAIN" "$BACKUP_DIR/utils.ts.bak"
        cp "$UTILS_INDEX" "$BACKUP_DIR/utils-index.ts.bak"
        echo "  -> 已备份"
    fi
fi

#-------------------------------------------------------------------------------
# 1.3 合并重复 error 模块 (error/ 和 errors/)
#-------------------------------------------------------------------------------
echo ""
echo "[1.3] 合并重复 error 模块..."

ERROR_DIR="$LIB_DIR/error"
ERRORS_DIR="$LIB_DIR/errors"

if [ -d "$ERROR_DIR" ] && [ -d "$ERRORS_DIR" ]; then
    echo "  检测到重复: error/ 和 errors/ 同时存在"
    echo "  建议操作: 将 errors/ 合并到 error/，删除 errors/"
    echo "  涉及文件:"
    ls -la "$ERRORS_DIR" 2>/dev/null || echo "    (目录可能为空)"
fi

#-------------------------------------------------------------------------------
# 1.4 清理空的或仅做重导出的 index 文件
#-------------------------------------------------------------------------------
echo ""
echo "[1.4] 清理纯重导出 index 文件..."

find "$LIB_DIR" -name "index.ts" -type f | while read -r idx; do
    lines=$(wc -l < "$idx")
    if [ "$lines" -le 5 ]; then
        content=$(cat "$idx")
        if echo "$content" | grep -q "export.*from"; then
            echo "  纯重导出: $idx ($lines lines)"
            # 检查是否有其他文件直接从这里 import
            imports=$(grep -r "from ['\"]\.\.*$idx['\"]" "$LIB_DIR" 2>/dev/null | wc -l || echo "0")
            if [ "$imports" -eq 0 ]; then
                echo "    -> 无引用，可安全删除 (DRY_RUN: $DRY_RUN)"
                [ "$DRY_RUN" != "true" ] && rm "$idx"
            fi
        fi
    fi
done

#-------------------------------------------------------------------------------
# 1.5 识别未被引用的文件 (简单检查)
#-------------------------------------------------------------------------------
echo ""
echo "[1.5] 识别可能的孤立文件..."

# 检查每个 .ts 文件是否被其他文件 import（排除 test 文件）
find "$LIB_DIR" -name "*.ts" -not -path "*__tests__*" -not -name "*.test.ts" -not -name "*.spec.ts" | while read -r file; do
    filename=$(basename "$file" .ts)
    # 排除 index 文件（它们本身就是出口文件）
    if [ "$filename" = "index" ]; then
        continue
    fi
    # 简单 grep 检查是否有 import 这个文件
    count=$(grep -r "['\"]\.\.*/$filename['\"]" "$LIB_DIR" 2>/dev/null | grep -v "$file" | wc -l || echo "0")
    if [ "$count" -eq 0 ]; then
        echo "  可能孤立: $file"
    fi
done

#-------------------------------------------------------------------------------
# 1.6 删除 monitoring/optimized-anomaly-detector.ts
#    (已被 enhanced 版本覆盖)
#-------------------------------------------------------------------------------
echo ""
echo "[1.6] 删除 optimized-anomaly-detector.ts..."

OPTIMIZED="$LIB_DIR/monitoring/optimized-anomaly-detector.ts"
if [ -f "$OPTIMIZED" ]; then
    echo "  发现: $OPTIMIZED (1557 行)"
    echo "  原因: 功能已被 enhanced-anomaly-detector.ts 覆盖"
    if [ "$DRY_RUN" != "true" ]; then
        cp "$OPTIMIZED" "$BACKUP_DIR/optimized-anomaly-detector.ts.bak"
        # rm "$OPTIMIZED"  # 取消注释以实际删除
        echo "  -> 已备份，待确认后删除"
    fi
fi

#-------------------------------------------------------------------------------
# 1.7 检查重复的 anomaly-detector 版本
#-------------------------------------------------------------------------------
echo ""
echo "[1.7] 检查 monitoring/ 下的 anomaly-detector 版本..."

AD_FILES=$(find "$LIB_DIR/monitoring" -name "*anomaly-detector*" -type f 2>/dev/null || echo "")
if [ -n "$AD_FILES" ]; then
    echo "  发现的 anomaly-detector 文件:"
    echo "$AD_FILES" | while read -r f; do
        lines=$(wc -l < "$f" 2>/dev/null || echo "0")
        echo "    $(basename $f): $lines 行"
    done
fi

#-------------------------------------------------------------------------------
# 完成
#-------------------------------------------------------------------------------
echo ""
echo "============================================"
echo "Phase 1 扫描完成"
echo "============================================"
echo "备份位置: $BACKUP_DIR"
echo ""
echo "建议人工审查:"
echo "  1. 确认废弃文件是否真的无人引用"
echo "  2. 决定 error/ vs errors/ 合并策略"
echo "  3. 验证 optimized-anomaly-detector.ts 可删除"
echo ""
[ "$DRY_RUN" = "true" ] && echo "提示: DRY_RUN=true，未执行任何修改"

#!/bin/bash
#===============================================================================
# Phase 2: 拆分巨型单文件
# 工作量: 3-5 天
# 目标: 将 >1000 行的巨型文件拆分为职责清晰的模块
#===============================================================================

set -e

LIB_DIR="/root/.openclaw/workspace/src/lib"
BACKUP_DIR="/root/.openclaw/workspace/backups/phase2-$(date +%Y%m%d-%H%M%S)"
DRY_RUN=${DRY_RUN:-false}

echo "============================================"
echo "Phase 2: 拆分巨型单文件"
echo "DRY_RUN: $DRY_RUN"
echo "============================================"

#-------------------------------------------------------------------------------
# 目标文件清单 (Top 10 技术债务中的核心文件)
#-------------------------------------------------------------------------------

declare -A GIANT_FILES=(
    ["monitoring/optimized-anomaly-detector.ts"]="1557"
    ["monitoring/enhanced-anomaly-detector.ts"]="1401"
    ["db/query-builder.ts"]="1300"
    ["agents/MultiAgentOrchestrator.ts"]="1192"
    ["realtime/notification-service.ts"]="1064"
    ["monitoring/root-cause/bottleneck-detector.ts"]="1395"
    ["performance/root-cause-analysis/analyzer.ts"]="1246"
    ["performance/alerting/alerter.ts"]="1217"
)

echo ""
echo "目标巨型文件:"
for file in "${!GIANT_FILES[@]}"; do
    echo "  $file: ${GIANT_FILES[$file]} 行"
done

#-------------------------------------------------------------------------------
# 2.1: monitoring/optimized-anomaly-detector.ts
# 策略: 合并到 enhanced 版本（如果尚未执行 Phase 1）
#-------------------------------------------------------------------------------
echo ""
echo "[2.1] monitoring/optimized-anomaly-detector.ts"
echo "      策略: 合并到 enhanced-anomaly-detector.ts，删除本文件"

OPT_FILE="$LIB_DIR/monitoring/optimized-anomaly-detector.ts"
ENH_FILE="$LIB_DIR/monitoring/enhanced-anomaly-detector.ts"

if [ -f "$OPT_FILE" ]; then
    echo "  EXISTS: $OPT_FILE (1557 lines)"
    echo "  ACTION: 确认 enhanced 版本覆盖后，删除本文件"
    echo "  SCRIPT: 手动执行合并，参考下方 diff 检查重复函数"
    
    # 简单检查两个文件的函数签名重叠
    if [ -f "$ENH_FILE" ]; then
        echo "  与 enhanced 版本对比:"
        opt_funcs=$(grep -E "^export (class|function|const) \w+" "$OPT_FILE" 2>/dev/null | head -20)
        enh_funcs=$(grep -E "^export (class|function|const) \w+" "$ENH_FILE" 2>/dev/null | head -20)
        echo "    optimized 导出: $(echo "$opt_funcs" | wc -l) 个"
        echo "    enhanced 导出: $(echo "$enh_funcs" | wc -l) 个"
    fi
else
    echo "  ALREADY REMOVED (Phase 1 可能已处理)"
fi

#-------------------------------------------------------------------------------
# 2.2: monitoring/enhanced-anomaly-detector.ts (1401 行)
# 拆分策略: 按检测算法拆分为多个子模块
#-------------------------------------------------------------------------------
echo ""
echo "[2.2] monitoring/enhanced-anomaly-detector.ts"
echo "      当前: 1401 行"
echo "      策略: 拆分为以下子模块:"

cat << 'SPLIT_PLAN'
      monitoring/anomaly-detector/
      ├── index.ts              # 主入口，重新导出
      ├── core.ts               # 核心接口和类型定义
      ├── statistical/
      │   ├── zscore.ts         # Z-Score 检测
      │   ├── iqr.ts             # IQR 四分位距检测
      │   └── mad.ts             # MAD 中位数绝对偏差检测
      ├── ml/
      │   ├── isolation-forest.ts  # 隔离森林算法
      │   └── moving-average.ts     # 移动平均预测
      └── engine.ts             # 检测引擎编排

      预估拆分后最大文件: ~300 行
SPLIT_PLAN

# 检查文件结构（读取前100行了解组织方式）
if [ -f "$ENH_FILE" ]; then
    echo "      文件结构预览 (前50行):"
    head -50 "$ENH_FILE" | grep -E "^(export |class |function |interface |type )" | head -10
fi

#-------------------------------------------------------------------------------
# 2.3: db/query-builder.ts (1300 行)
# 拆分策略: 按 SQL 子句类型拆分
#-------------------------------------------------------------------------------
echo ""
echo "[2.3] db/query-builder.ts"
echo "      当前: 1300 行"
echo "      策略: 拆分为以下子模块:"

cat << 'SPLIT_PLAN'
      db/query-builder/
      ├── index.ts              # 主入口
      ├── base.ts               # 基础 builder 抽象
      ├── select.ts             # SELECT 子句构建
      ├── where.ts              # WHERE 条件构建  
      ├── join.ts               # JOIN 子句构建
      ├── order-by.ts           # ORDER BY 子句
      ├── limit.ts              # LIMIT/OFFSET
      └── transaction.ts         # 事务管理

      预估拆分后最大文件: ~250 行
SPLIT_PLAN

QB_FILE="$LIB_DIR/db/query-builder.ts"
if [ -f "$QB_FILE" ]; then
    echo "      导出的类/函数:"
    grep -E "^export (class|function|interface|type)" "$QB_FILE" 2>/dev/null | head -15
fi

#-------------------------------------------------------------------------------
# 2.4: agents/MultiAgentOrchestrator.ts (1192 行)
# 拆分策略: 按职责分离
#-------------------------------------------------------------------------------
echo ""
echo "[2.4] agents/MultiAgentOrchestrator.ts"
echo "      当前: ~1192 行 (32KB)"
echo "      策略:"

cat << 'SPLIT_PLAN'
      agents/MultiAgentOrchestrator/
      ├── index.ts              # 主入口
      ├── orchestrator.ts       # 核心编排逻辑 (保留 ~400行)
      ├── agent-registry.ts     # Agent 注册表
      ├── message-router.ts     # 消息路由
      ├── task-scheduler.ts     # 任务调度
      └── state-manager.ts      # 状态管理

      预估拆分后最大文件: ~400 行
SPLIT_PLAN

ORCH_FILE="$LIB_DIR/agents/MultiAgentOrchestrator.ts"
if [ -f "$ORCH_FILE" ]; then
    echo "      导出的类:"
    grep -E "^export class" "$ORCH_FILE" 2>/dev/null | head -10
    echo "      文件大小: $(wc -c < "$ORCH_FILE") bytes"
fi

#-------------------------------------------------------------------------------
# 2.5: realtime/notification-service.ts (1064 行)
# 拆分策略: 按通知渠道拆分
#-------------------------------------------------------------------------------
echo ""
echo "[2.5] realtime/notification-service.ts"
echo "      当前: ~1064 行"
echo "      策略:"

cat << 'SPLIT_PLAN'
      realtime/notification-service/
      ├── index.ts
      ├── base.ts               # 通知接口和基类
      ├── channels/
      │   ├── email.ts          # 邮件通知
      │   ├── sms.ts            # 短信通知
      │   ├── push.ts           # 推送通知
      │   └── webhook.ts        # Webhook
      └── queue.ts              # 通知队列管理

      预估拆分后最大文件: ~300 行
SPLIT_PLAN

#-------------------------------------------------------------------------------
# 2.6: monitoring/root-cause/bottleneck-detector.ts (1395 行)
# 拆分策略: 按分析维度拆分
#-------------------------------------------------------------------------------
echo ""
echo "[2.6] monitoring/root-cause/bottleneck-detector.ts"
echo "      当前: 1395 行"
echo "      策略:"

cat << 'SPLIT_PLAN'
      monitoring/root-cause/
      ├── index.ts
      ├── bottleneck/
      │   ├── detector.ts       # 入口
      │   ├── cpu-analyzer.ts   # CPU 瓶颈分析
      │   ├── memory-analyzer.ts # 内存瓶颈分析
      │   ├── io-analyzer.ts    # IO 瓶颈分析
      │   └── network-analyzer.ts
      └── correlation.ts        # 跨维度关联分析

      预估拆分后最大文件: ~350 行
SPLIT_PLAN

#-------------------------------------------------------------------------------
# 2.7: performance/root-cause-analysis/analyzer.ts (1246 行)
#-------------------------------------------------------------------------------
echo ""
echo "[2.7] performance/root-cause-analysis/analyzer.ts"
echo "      当前: 1246 行"
echo "      策略: 拆分为分析器 + 规则引擎"

#-------------------------------------------------------------------------------
# 2.8: performance/alerting/alerter.ts (1217 行)
#-------------------------------------------------------------------------------
echo ""
echo "[2.8] performance/alerting/alerter.ts"
echo "      当前: 1217 行"
echo "      策略: 拆分为告警通道 + 告警规则引擎"

#-------------------------------------------------------------------------------
# 拆分执行辅助函数
#-------------------------------------------------------------------------------
echo ""
echo "============================================"
echo "拆分执行辅助命令"
echo "============================================"

cat << 'HELPER_COMMANDS'

# 统计文件行数分布
find src/lib -name "*.ts" -not -path "*__tests__*" | xargs wc -l | sort -rn | head -20

# 分析文件结构（查看类/函数定义位置）
grep -n "^export class\|^export function\|^export const" src/lib/monitoring/enhanced-anomaly-detector.ts

# 计算代码行数阈值内文件数量
find src/lib -name "*.ts" -not -path "*__tests__*" -exec wc -l {} \; | awk '$1 > 500 {print}'

# 查看某文件的导入依赖
grep -E "^import" src/lib/agents/MultiAgentOrchestrator.ts

HELPER_COMMANDS

#-------------------------------------------------------------------------------
# 自动拆分检查清单
#-------------------------------------------------------------------------------
echo ""
echo "============================================"
echo "Phase 2 执行检查清单"
echo "============================================"
echo ""
echo "每次拆分文件前，请完成以下检查:"
echo ""
echo "  □ 1. 确认文件所有导出项"
echo "  □ 2. 分析每个类/函数职责"
echo "  □ 3. 识别共享依赖 (types, utilities)"
echo "  □ 4. 创建新目录结构"
echo "  □ 5. 移动代码到对应子模块"
echo "  □ 6. 更新 import 路径"
echo "  □ 7. 更新 index.ts 重导出"
echo "  □ 8. 运行 TypeScript 编译检查"
echo "  □ 9. 运行相关测试"
echo "  □ 10. 更新依赖该文件的代码"
echo ""
echo "推荐拆分顺序 (从最简单开始):"
echo "  1. db/query-builder.ts (结构清晰，依赖少)"
echo "  2. realtime/notification-service.ts (渠道清晰)"
echo "  3. monitoring/enhanced-anomaly-detector.ts (算法明确)"
echo "  4. agents/MultiAgentOrchestrator.ts (依赖复杂，最后处理)"
echo ""
[ "$DRY_RUN" = "true" ] && echo "提示: DRY_RUN=true，未执行任何修改"

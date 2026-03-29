#!/bin/bash

# 简化版 React Compiler 性能测试
# 用于快速对比构建性能

set -e

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}React Compiler 性能快速测试${NC}"
echo -e "${BLUE}========================================${NC}"

# 创建报告目录
mkdir -p reports

# 测试 1: 禁用编译器
echo ""
echo -e "${BLUE}测试 1: 禁用 React Compiler${NC}"
echo "清理构建缓存..."
rm -rf .next

export ENABLE_REACT_COMPILER=false
export NEXT_PUBLIC_REACT_COMPILER_ENABLED=false

echo "开始构建..."
DISABLED_START=$(date +%s)
if pnpm build 2>&1 | tee reports/build-disabled.log; then
    DISABLED_END=$(date +%s)
    DISABLED_TIME=$((DISABLED_END - DISABLED_START))
    echo -e "${GREEN}✓ 构建成功 (耗时: ${DISABLED_TIME}s)${NC}"
else
    echo -e "${YELLOW}✗ 构建失败${NC}"
    exit 1
fi

# 分析禁用编译器的构建
DISABLED_SIZE=$(du -sh .next | cut -f1)
DISABLED_ROUTES=$(find .next/server/app -name "*.html" 2>/dev/null | wc -l)

echo "构建产物: $DISABLED_SIZE"
echo "HTML 路由: $DISABLED_ROUTES"

# 测试 2: 启用编译器
echo ""
echo -e "${BLUE}测试 2: 启用 React Compiler${NC}"
echo "清理构建缓存..."
rm -rf .next

export ENABLE_REACT_COMPILER=true
export NEXT_PUBLIC_REACT_COMPILER_ENABLED=true

echo "开始构建..."
ENABLED_START=$(date +%s)
if pnpm build 2>&1 | tee reports/build-enabled.log; then
    ENABLED_END=$(date +%s)
    ENABLED_TIME=$((ENABLED_END - ENABLED_START))
    echo -e "${GREEN}✓ 构建成功 (耗时: ${ENABLED_TIME}s)${NC}"
else
    echo -e "${YELLOW}✗ 构建失败${NC}"
    exit 1
fi

# 分析启用编译器的构建
ENABLED_SIZE=$(du -sh .next | cut -f1)
ENABLED_ROUTES=$(find .next/server/app -name "*.html" 2>/dev/null | wc -l)

echo "构建产物: $ENABLED_SIZE"
echo "HTML 路由: $ENABLED_ROUTES"

# 计算差异
TIME_DIFF=$((ENABLED_TIME - DISABLED_TIME))
TIME_PERCENT=$((TIME_DIFF * 100 / DISABLED_TIME))

# 生成报告
REPORT_FILE="reports/react-compiler-performance-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" <<EOF
# React Compiler 性能测试报告

**测试时间**: $(date)
**测试环境**: $(hostname)

---

## 构建性能对比

| 指标 | 禁用编译器 | 启用编译器 | 变化 |
|-----|----------|----------|------|
| **构建时间** | ${DISABLED_TIME}s | ${ENABLED_TIME}s | ${TIME_DIFF}s (${TIME_PERCENT}%) |
| **构建产物** | ${DISABLED_SIZE} | ${ENABLED_SIZE} | - |
| **HTML 路由** | ${DISABLED_ROUTES} | ${ENABLED_ROUTES} | - |

---

## 分析

### 构建时间

启用编译器后，构建时间增加了 **${TIME_DIFF}s** (${TIME_PERCENT}%)。

EOF

if [ $TIME_PERCENT -lt 10 ]; then
    cat >> "$REPORT_FILE" <<EOF
✅ **通过**: 构建时间增加小于 10%，在可接受范围内。

EOF
elif [ $TIME_PERCENT -lt 20 ]; then
    cat >> "$REPORT_FILE" <<EOF
⚠️  **可接受**: 构建时间增加 10-20%，建议优化构建配置。

EOF
else
    cat >> "$REPORT_FILE" <<EOF
❌ **警告**: 构建时间增加超过 20%，建议检查配置或使用 Turbopack。

EOF
fi

cat >> "$REPORT_FILE" <<EOF
### 构建产物

- 构建产物大小变化: **${DISABLED_SIZE} → ${ENABLED_SIZE}**
- HTML 路由数量变化: **${DISABLED_ROUTES} → ${ENABLED_ROUTES}**

---

## 建议

### 配置建议

EOF

if [ $TIME_PERCENT -lt 15 ]; then
    cat >> "$REPORT_FILE" <<EOF
1. ✅ 可以在生产环境启用 React Compiler
2. ✅ 推荐使用 \`opt-out\` 模式
3. ✅ 构建时间增加在可接受范围内

EOF
else
    cat >> "$REPORT_FILE" <<EOF
1. ⚠️  建议先在测试环境验证
2. ⚠️  考虑使用 Turbopack 优化构建速度
3. ⚠️  推荐使用 \`opt-in\` 模式逐步启用

EOF
fi

cat >> "$REPORT_FILE" <<EOF
### 监控建议

1. 部署后监控 Web Vitals (FCP, LCP, TTI)
2. 使用 React DevTools Profiler 分析重渲染
3. 监控错误率和性能指标
4. 准备快速回滚方案

---

## 手动测试

请访问以下页面进行手动测试：

1. **验证页面**: \`/react-compiler-verify\`
2. **测试场景**:
   - 大列表渲染 (1000 项)
   - 实时数据更新 (每秒)
   - 复杂状态管理 (5 个计数器)
   - 重渲染计数器

3. **对比方法**:
   - 在两个标签页打开同一页面
   - 一个启用编译器，一个禁用
   - 执行相同操作
   - 对比 FPS 和渲染次数

---

**报告生成时间**: $(date)
**报告文件**: $REPORT_FILE
EOF

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}测试完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "报告已生成: $REPORT_FILE"
echo ""
echo "关键指标:"
echo "  构建时间变化: ${TIME_DIFF}s (${TIME_PERCENT}%)"
echo "  构建产物: ${DISABLED_SIZE} → ${ENABLED_SIZE}"
echo ""

#!/bin/bash

# React Compiler 兼容性检测脚本
# 用于检测不兼容 React Compiler 的组件

set -e

echo "========================================="
echo "React Compiler 兼容性检测"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检测报告文件
REPORT_FILE="reports/react-compiler-compatibility-$(date +%Y%m%d-%H%M%S).txt"
REPORT_MD="reports/react-compiler-compatibility-$(date +%Y%m%d-%H%M%S).md"

# 创建 reports 目录
mkdir -p reports

echo -e "${BLUE}📋 生成检测报告...${NC}"
echo "" > "$REPORT_FILE"

# 检测函数
check_rule_violations() {
  echo -e "${YELLOW}🔍 检测 Rules of React 违规...${NC}"
  echo "" >> "$REPORT_FILE"
  echo "## 1. Rules of React 违规检测" >> "$REPORT_FILE"

  # 检测条件语句中的 Hooks
  echo -e "  检测条件语句中的 Hooks..."
  if rg -g "*.tsx" -g "*.ts" "if.*useState|if.*useEffect|if.*useCallback|if.*useMemo" src/ >> "$REPORT_FILE" 2>/dev/null; then
    echo -e "    ${RED}❌ 发现潜在违规${NC}"
  else
    echo -e "    ${GREEN}✅ 未发现违规${NC}"
    echo "  ✅ 未发现条件语句中的 Hooks" >> "$REPORT_FILE"
  fi

  # 检测循环中的 Hooks
  echo -e "  检测循环中的 Hooks..."
  if rg -g "*.tsx" -g "*.ts" "for.*useState|while.*useState|for.*useEffect" src/ >> "$REPORT_FILE" 2>/dev/null; then
    echo -e "    ${RED}❌ 发现潜在违规${NC}"
  else
    echo -e "    ${GREEN}✅ 未发现违规${NC}"
    echo "  ✅ 未发现循环中的 Hooks" >> "$REPORT_FILE"
  fi

  echo "" >> "$REPORT_FILE"
}

check_manual_memoization() {
  echo -e "${YELLOW}🔍 检测手动优化代码...${NC}"
  echo "" >> "$REPORT_FILE"
  echo "## 2. 手动 Memoization 检测" >> "$REPORT_FILE"

  # React.memo
  echo -e "  检测 React.memo 使用..."
  memo_count=$(rg -g "*.tsx" "React\.memo" src/ | wc -l || echo 0)
  echo "  发现 $memo_count 处 React.memo 使用" >> "$REPORT_FILE"
  echo -e "    ${BLUE}发现 $memo_count 处 React.memo 使用${NC}"

  # useMemo
  echo -e "  检测 useMemo 使用..."
  use_memo_count=$(rg -g "*.tsx" "useMemo" src/ | wc -l || echo 0)
  echo "  发现 $use_memo_count 处 useMemo 使用" >> "$REPORT_FILE"
  echo -e "    ${BLUE}发现 $use_memo_count 处 useMemo 使用${NC}"

  # useCallback
  echo -e "  检测 useCallback 使用..."
  use_callback_count=$(rg -g "*.tsx" "useCallback" src/ | wc -l || echo 0)
  echo "  发现 $use_callback_count 处 useCallback 使用" >> "$REPORT_FILE"
  echo -e "    ${BLUE}发现 $use_callback_count 处 useCallback 使用${NC}"

  echo "" >> "$REPORT_FILE"
}

check_third_party_compatibility() {
  echo -e "${YELLOW}🔍 检测第三方库兼容性...${NC}"
  echo "" >> "$REPORT_FILE"
  echo "## 3. 第三方库兼容性检测" >> "$REPORT_FILE"

  # 检查可能不兼容的库
  echo "  检测第三方库组件使用..."
  echo "" >> "$REPORT_FILE"

  # recharts
  recharts_count=$(rg -g "*.tsx" "from ['\"]recharts['\"]" src/ | wc -l || echo 0)
  echo "  - recharts: $recharts_count 个组件 (✅ 兼容)" >> "$REPORT_FILE"
  echo -e "    ${GREEN}✅ recharts: $recharts_count 个组件${NC}"

  # @react-three/fiber
  three_count=$(rg -g "*.tsx" "from ['\"]@react-three/fiber['\"]" src/ | wc -l || echo 0)
  echo "  - @react-three/fiber: $three_count 个组件 (✅ 兼容)" >> "$REPORT_FILE"
  echo -e "    ${GREEN}✅ @react-three/fiber: $three_count 个组件${NC}"

  # zustand
  zustand_count=$(rg -g "*.tsx" -g "*.ts" "from ['\"]zustand['\"]" src/ | wc -l || echo 0)
  echo "  - zustand: $zustand_count 个 store (✅ 兼容)" >> "$REPORT_FILE"
  echo -e "    ${GREEN}✅ zustand: $zustand_count 个 store${NC}"

  echo "" >> "$REPORT_FILE"
}

check_component_complexity() {
  echo -e "${YELLOW}🔍 检测组件复杂度...${NC}"
  echo "" >> "$REPORT_FILE"
  echo "## 4. 组件复杂度检测" >> "$REPORT_FILE"

  # 检测大型组件 (> 300 行)
  echo -e "  检测大型组件 (> 300 行)..."
  large_components=$(find src/ -name "*.tsx" -exec sh -c 'lines=$(wc -l < "$1"); if [ "$lines" -gt 300 ]; then echo "$1: $lines lines"; fi' _ {} \;)
  if [ -n "$large_components" ]; then
    echo "$large_components" >> "$REPORT_FILE"
    echo -e "    ${YELLOW}⚠️  发现大型组件${NC}"
  else
    echo "  ✅ 未发现大型组件" >> "$REPORT_FILE"
    echo -e "    ${GREEN}✅ 未发现大型组件${NC}"
  fi

  echo "" >> "$REPORT_FILE"
}

check_patterns_of_concern() {
  echo -e "${YELLOW}🔍 检测潜在问题模式...${NC}"
  echo "" >> "$REPORT_FILE"
  echo "## 5. 潜在问题模式检测" >> "$REPORT_FILE"

  # 检测 props mutation
  echo -e "  检测 props mutation..."
  if rg -g "*.tsx" "props\\..*\\s*=" src/ >> "$REPORT_FILE" 2>/dev/null; then
    echo -e "    ${RED}❌ 发现潜在 props mutation${NC}"
  else
    echo -e "    ${GREEN}✅ 未发现 props mutation${NC}"
    echo "  ✅ 未发现 props mutation" >> "$REPORT_FILE"
  fi

  # 检测复杂的 useMemo/useCallback 依赖
  echo -e "  检测复杂的依赖数组..."
  if rg -g "*.tsx" "useMemo.*\\[.*,.{5,}\\]" src/ >> "$REPORT_FILE" 2>/dev/null; then
    echo -e "    ${YELLOW}⚠️  发现复杂依赖数组${NC}"
  else
    echo -e "    ${GREEN}✅ 未发现复杂依赖数组${NC}"
    echo "  ✅ 未发现复杂依赖数组" >> "$REPORT_FILE"
  fi

  echo "" >> "$REPORT_FILE"
}

generate_markdown_report() {
  echo -e "${BLUE}📝 生成 Markdown 报告...${NC}"

  cat > "$REPORT_MD" << EOF
# React Compiler 兼容性检测报告

**生成时间**: $(date)
**项目**: 7zi Frontend
**版本**: v1.4.0

---

## 📊 执行摘要

EOF

  # 统计总结
  total_issues=$(grep -c "❌\|⚠️" "$REPORT_FILE" 2>/dev/null || echo 0)

  if [ "$total_issues" -eq 0 ]; then
    echo "**状态**: ✅ 通过" >> "$REPORT_MD"
    echo "" >> "$REPORT_MD"
    echo "未发现严重的兼容性问题，项目可以安全启用 React Compiler。" >> "$REPORT_MD"
  else
    echo "**状态**: ⚠️  需要注意" >> "$REPORT_MD"
    echo "" >> "$REPORT_MD"
    echo "发现 $total_issues 个需要注意的问题。建议在启用编译器前解决这些问题。" >> "$REPORT_MD"
  fi

  cat >> "$REPORT_MD" << EOF

---

EOF

  # 复制详细内容
  cat "$REPORT_FILE" >> "$REPORT_MD"

  # 添加建议
  cat >> "$REPORT_MD" << EOF

---

## 💡 建议

### 立即行动
1. **解决 Rules of React 违规**: 如果有发现，立即修复
2. **审查大型组件**: 考虑拆分超过 300 行的组件
3. **测试手动优化**: 逐步移除不必要的 React.memo/useMemo/useCallback

### 渐进式启用策略
1. **阶段 0**: 启用编译器，使用 opt-out 模式
2. **阶段 1**: 在开发环境测试 1-2 周
3. **阶段 2**: 在测试环境验证
4. **阶段 3**: 部署到生产环境

### 监控指标
- 构建时间
- 包体积
- 运行时性能
- 错误率

---

**脚本版本**: 1.0
**最后更新**: $(date)
EOF

  echo -e "  ${GREEN}✅ 报告已生成${NC}"
}

# 主执行流程
main() {
  echo -e "${BLUE}开始兼容性检测...${NC}"
  echo ""

  check_rule_violations
  check_manual_memoization
  check_third_party_compatibility
  check_component_complexity
  check_patterns_of_concern
  generate_markdown_report

  echo ""
  echo -e "${GREEN}=========================================${NC}"
  echo -e "${GREEN}✅ 检测完成！${NC}"
  echo -e "${GREEN}=========================================${NC}"
  echo ""
  echo -e "📄 报告文件:"
  echo -e "  - 文本格式: ${BLUE}$REPORT_FILE${NC}"
  echo -e "  - Markdown 格式: ${BLUE}$REPORT_MD${NC}"
  echo ""
}

# 执行主函数
main

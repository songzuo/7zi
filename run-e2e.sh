#!/bin/bash

# E2E 测试运行脚本
# 用法: ./run-e2e.sh [选项]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认选项
BROWSER="chromium"
HEADLESS=true
UI=false
DEBUG=false
TEST_FILE=""
TEST_PATTERN=""
UPDATE_SNAPSHOTS=false
REPORT=false

# 帮助信息
function show_help() {
  echo "7zi E2E 测试运行脚本"
  echo ""
  echo "用法: ./run-e2e.sh [选项]"
  echo ""
  echo "选项:"
  echo "  -b, --browser BROWSER    浏览器 (chromium, firefox, webkit, all) [默认: chromium]"
  echo "  -h, --headed            有头模式运行"
  echo "  -u, --ui                 UI 模式运行"
  echo "  -d, --debug              调试模式"
  echo "  -f, --file FILE          运行特定测试文件"
  echo "  -g, --grep PATTERN       运行匹配模式的测试"
  echo "  -s, --update-snapshots   更新截图基线"
  echo "  -r, --report             显示测试报告"
  echo "  --help                   显示此帮助信息"
  echo ""
  echo "示例:"
  echo "  ./run-e2e.sh                           # 运行所有测试"
  echo "  ./run-e2e.sh -b firefox                # 使用 Firefox 运行"
  echo "  ./run-e2e.sh -f login-flow-pom.spec.ts # 运行特定文件"
  echo "  ./run-e2e.sh -g \"should login\"         # 运行匹配的测试"
  echo "  ./run-e2e.sh -u                        # UI 模式"
  echo "  ./run-e2e.sh -s                        # 更新截图"
  echo "  ./run-e2e.sh -r                        # 显示报告"
}

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    -b|--browser)
      BROWSER="$2"
      shift 2
      ;;
    -h|--headed)
      HEADLESS=false
      shift
      ;;
    -u|--ui)
      UI=true
      shift
      ;;
    -d|--debug)
      DEBUG=true
      shift
      ;;
    -f|--file)
      TEST_FILE="$2"
      shift 2
      ;;
    -g|--grep)
      TEST_PATTERN="$2"
      shift 2
      ;;
    -s|--update-snapshots)
      UPDATE_SNAPSHOTS=true
      shift
      ;;
    -r|--report)
      REPORT=true
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo -e "${RED}未知选项: $1${NC}"
      show_help
      exit 1
      ;;
  esac
done

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
  echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
  exit 1
fi

# 显示测试报告
if [ "$REPORT" = true ]; then
  echo -e "${GREEN}📊 打开测试报告...${NC}"
  npx playwright show-report
  exit 0
fi

# 构建测试命令
TEST_CMD="npx playwright test"

# 添加浏览器选项
if [ "$BROWSER" != "all" ]; then
  TEST_CMD="$TEST_CMD --project=$BROWSER"
fi

# 添加有头模式
if [ "$HEADLESS" = false ]; then
  TEST_CMD="$TEST_CMD --headed"
fi

# 添加 UI 模式
if [ "$UI" = true ]; then
  TEST_CMD="$TEST_CMD --ui"
fi

# 添加调试模式
if [ "$DEBUG" = true ]; then
  TEST_CMD="$TEST_CMD --debug"
fi

# 添加测试文件
if [ -n "$TEST_FILE" ]; then
  TEST_CMD="$TEST_CMD e2e/$TEST_FILE"
fi

# 添加测试模式
if [ -n "$TEST_PATTERN" ]; then
  TEST_CMD="$TEST_CMD -g \"$TEST_PATTERN\""
fi

# 添加更新截图
if [ "$UPDATE_SNAPSHOTS" = true ]; then
  TEST_CMD="$TEST_CMD --update-snapshots"
fi

# 显示命令
echo -e "${YELLOW}运行命令:${NC} $TEST_CMD"
echo ""

# 运行测试
if [ "$UI" = true ] || [ "$DEBUG" = true ]; then
  # UI 或调试模式不使用时间显示
  eval $TEST_CMD
else
  # 普通模式显示时间
  START_TIME=$(date +%s)
  eval $TEST_CMD
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  
  echo ""
  echo -e "${GREEN}✅ 测试完成，耗时: ${DURATION}秒${NC}"
fi

# 退出码
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo -e "${RED}❌ 测试失败，退出码: $EXIT_CODE${NC}"
  
  # 如果有测试失败，显示如何查看报告
  echo ""
  echo -e "${YELLOW}💡 提示: 运行 './run-e2e.sh -r' 查看详细报告${NC}"
  exit $EXIT_CODE
fi

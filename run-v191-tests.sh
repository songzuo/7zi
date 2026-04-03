#!/bin/bash
#
# v1.9.1 E2E 测试运行脚本
# 用法: ./run-v191-tests.sh [options]
#
# 选项:
#   --all         运行所有测试（默认）
#   --unit        只运行单元测试
#   --e2e         只运行 E2E 测试
#   --stress      只运行压力测试
#   --workflow    只运行工作流测试
#   --task        只运行任务创建测试
#   --agent       只运行多代理测试
#   --frontend    只运行前端集成测试
#   --report      生成测试报告
#   --help        显示帮助信息
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助
show_help() {
    cat << EOF
v1.9.1 E2E 测试运行脚本

用法: $0 [options]

选项:
    --all         运行所有测试（默认）
    --unit        只运行单元测试
    --e2e         只运行 E2E 测试
    --stress      只运行压力测试
    --workflow    只运行工作流测试
    --task        只运行任务创建测试
    --agent       只运行多代理测试
    --frontend    只运行前端集成测试
    --report      生成测试报告
    --help        显示帮助信息

示例:
    $0                    # 运行所有测试
    $0 --unit             # 只运行单元测试
    $0 --e2e --report     # 运行 E2E 测试并生成报告
EOF
    exit 0
}

# 解析参数
TEST_TYPE="all"
GENERATE_REPORT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            TEST_TYPE="all"
            shift
            ;;
        --unit)
            TEST_TYPE="unit"
            shift
            ;;
        --e2e)
            TEST_TYPE="e2e"
            shift
            ;;
        --stress)
            TEST_TYPE="stress"
            shift
            ;;
        --workflow)
            TEST_TYPE="workflow"
            shift
            ;;
        --task)
            TEST_TYPE="task"
            shift
            ;;
        --agent)
            TEST_TYPE="agent"
            shift
            ;;
        --frontend)
            TEST_TYPE="frontend"
            shift
            ;;
        --report)
            GENERATE_REPORT=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            ;;
    esac
done

# 开始时间
START_TIME=$(date +%s)

print_info "开始 v1.9.1 测试..."
print_info "测试类型: $TEST_TYPE"

# 创建测试结果目录
mkdir -p test-results/reports

# 运行单元测试
run_unit_tests() {
    print_info "运行单元测试..."
    npm run test:coverage
    
    if [ $? -eq 0 ]; then
        print_success "单元测试完成!"
    else
        print_error "单元测试失败!"
        return 1
    fi
}

# 运行 E2E 测试
run_e2e_tests() {
    print_info "运行 E2E 测试..."
    npx playwright test --config=playwright.v191.config.ts
    
    if [ $? -eq 0 ]; then
        print_success "E2E 测试完成!"
    else
        print_error "E2E 测试失败!"
        return 1
    fi
}

# 运行压力测试
run_stress_tests() {
    print_info "运行 API 压力测试..."
    npx playwright test --config=playwright.v191.config.ts --project=stress-test
    
    if [ $? -eq 0 ]; then
        print_success "压力测试完成!"
    else
        print_error "压力测试失败!"
        return 1
    fi
}

# 运行工作流测试
run_workflow_tests() {
    print_info "运行工作流测试..."
    npx playwright test --config=playwright.v191.config.ts e2e/v191-workflow.spec.ts
    
    if [ $? -eq 0 ]; then
        print_success "工作流测试完成!"
    else
        print_error "工作流测试失败!"
        return 1
    fi
}

# 运行任务创建测试
run_task_tests() {
    print_info "运行任务创建测试..."
    npx playwright test --config=playwright.v191.config.ts e2e/v191-task-creation.spec.ts
    
    if [ $? -eq 0 ]; then
        print_success "任务创建测试完成!"
    else
        print_error "任务创建测试失败!"
        return 1
    fi
}

# 运行多代理测试
run_agent_tests() {
    print_info "运行多代理测试..."
    npx playwright test --config=playwright.v191.config.ts e2e/v191-multi-agent.spec.ts
    
    if [ $? -eq 0 ]; then
        print_success "多代理测试完成!"
    else
        print_error "多代理测试失败!"
        return 1
    fi
}

# 运行前端集成测试
run_frontend_tests() {
    print_info "运行前端集成测试..."
    npx playwright test --config=playwright.v191.config.ts e2e/v191-frontend-integration.spec.ts
    
    if [ $? -eq 0 ]; then
        print_success "前端集成测试完成!"
    else
        print_error "前端集成测试失败!"
        return 1
    fi
}

# 生成报告
generate_report() {
    print_info "生成测试报告..."
    node scripts/generate-test-report.js
    
    if [ $? -eq 0 ]; then
        print_success "报告生成完成!"
        echo ""
        echo "报告位置:"
        echo "  - HTML: test-results/reports/v191-report.html"
        echo "  - Markdown: test-results/reports/v191-report.md"
        echo "  - JSON: test-results/reports/v191-report.json"
    else
        print_warning "报告生成失败，但测试可能已成功完成"
    fi
}

# 执行测试
FAILED=false

case $TEST_TYPE in
    all)
        run_unit_tests || FAILED=true
        run_e2e_tests || FAILED=true
        ;;
    unit)
        run_unit_tests || FAILED=true
        ;;
    e2e)
        run_e2e_tests || FAILED=true
        ;;
    stress)
        run_stress_tests || FAILED=true
        ;;
    workflow)
        run_workflow_tests || FAILED=true
        ;;
    task)
        run_task_tests || FAILED=true
        ;;
    agent)
        run_agent_tests || FAILED=true
        ;;
    frontend)
        run_frontend_tests || FAILED=true
        ;;
esac

# 生成报告
if [ "$GENERATE_REPORT" = true ]; then
    generate_report
fi

# 计算耗时
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "======================================"
echo "测试完成!"
echo "耗时: ${DURATION}秒"
echo "======================================"

if [ "$FAILED" = true ]; then
    print_error "部分测试失败!"
    exit 1
else
    print_success "所有测试通过!"
    exit 0
fi

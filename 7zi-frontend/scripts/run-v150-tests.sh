#!/bin/bash

# v1.5.0 Test Runner Script
# 运行完整的 v1.5.0 测试套件

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 安装依赖
install_deps() {
    log_info "安装依赖..."
    pnpm install --frozen-lockfile
    log_success "依赖安装完成"
}

# 运行单元测试
run_unit_tests() {
    log_info "运行单元测试..."
    if pnpm test:run; then
        log_success "单元测试通过"
    else
        log_error "单元测试失败"
        exit 1
    fi
}

# 运行集成测试
run_integration_tests() {
    log_info "运行集成测试..."
    if pnpm test:run tests/integration/; then
        log_success "集成测试通过"
    else
        log_error "集成测试失败"
        exit 1
    fi
}

# 运行 E2E 测试
run_e2e_tests() {
    log_info "运行 E2E 测试..."
    if pnpm test:e2e; then
        log_success "E2E 测试通过"
    else
        log_error "E2E 测试失败"
        exit 1
    fi
}

# 运行 API 集成测试
run_api_tests() {
    log_info "运行 API 集成测试..."
    if pnpm test:api; then
        log_success "API 集成测试通过"
    else
        log_error "API 集成测试失败"
        exit 1
    fi
}

# 运行 WebSocket 测试
run_websocket_tests() {
    log_info "运行 WebSocket 测试..."
    if pnpm test:run tests/websocket/; then
        log_success "WebSocket 测试通过"
    else
        log_error "WebSocket 测试失败"
        exit 1
    fi
}

# 生成覆盖率报告
generate_coverage() {
    log_info "生成覆盖率报告..."
    if pnpm test:coverage; then
        log_success "覆盖率报告生成完成"
        log_info "查看报告: open coverage/index.html"
    else
        log_warning "覆盖率报告生成失败"
    fi
}

# 打印摘要
print_summary() {
    echo ""
    echo "=========================================="
    echo "  v1.5.0 测试套件摘要"
    echo "=========================================="
    echo ""
    echo "📦 测试类型:"
    echo "  • 单元测试: Vitest"
    echo "  • 集成测试: Vitest + MSW"
    echo "  • E2E 测试: Playwright"
    echo "  • API 测试: Vitest + Supertest"
    echo ""
    echo "📊 测试覆盖:"
    echo "  • Multi-Agent 协作"
    echo "  • WebSocket 房间系统"
    echo "  • 工作流编排器"
    echo "  • MCP Server 协议"
    echo ""
    echo "📁 测试文件:"
    echo "  • tests/e2e/"
    echo "  • tests/integration/"
    echo "  • tests/api/"
    echo "  • tests/websocket/"
    echo ""
    echo "=========================================="
}

# 主函数
main() {
    local start_time=$(date +%s)
    
    echo ""
    echo "=========================================="
    echo "  7zi v1.5.0 测试套件"
    echo "=========================================="
    echo ""
    
    # 解析参数
    local TEST_TYPE="${1:-all}"
    
    case $TEST_TYPE in
        "unit")
            log_info "运行单元测试"
            run_unit_tests
            ;;
        "integration")
            log_info "运行集成测试"
            run_integration_tests
            ;;
        "e2e")
            log_info "运行 E2E 测试"
            run_e2e_tests
            ;;
        "api")
            log_info "运行 API 测试"
            run_api_tests
            ;;
        "websocket")
            log_info "运行 WebSocket 测试"
            run_websocket_tests
            ;;
        "coverage")
            log_info "生成覆盖率报告"
            generate_coverage
            ;;
        "all")
            log_info "运行所有测试"
            check_dependencies
            install_deps
            run_unit_tests
            run_integration_tests
            run_api_tests
            run_websocket_tests
            run_e2e_tests
            generate_coverage
            ;;
        *)
            log_error "未知测试类型: $TEST_TYPE"
            echo ""
            echo "用法: $0 [unit|integration|e2e|api|websocket|coverage|all]"
            exit 1
            ;;
    esac
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    log_success "所有测试完成! 耗时: ${duration} 秒"
    print_summary
}

# 运行主函数
main "$@"

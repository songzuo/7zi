#!/bin/bash

# React Compiler 性能测试脚本
# 用途: 对比启用/禁用 React Compiler 的性能差异

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 报告目录
REPORT_DIR="$PROJECT_ROOT/reports"
mkdir -p "$REPORT_DIR"

# 时间戳
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# 日志文件
LOG_FILE="$REPORT_DIR/react-compiler-performance-$TIMESTAMP.log"

# 结果文件
RESULTS_FILE="$REPORT_DIR/react-compiler-performance-$TIMESTAMP.json"

# 函数: 打印带颜色和日志的消息
log() {
    local level=$1
    shift
    local message="$@"
    local color

    case $level in
        INFO)
            color="$BLUE"
            ;;
        SUCCESS)
            color="$GREEN"
            ;;
        WARNING)
            color="$YELLOW"
            ;;
        ERROR)
            color="$RED"
            ;;
        *)
            color="$NC"
            ;;
    esac

    echo -e "${color}[$level]${NC} $message" | tee -a "$LOG_FILE"
}

# 函数: 清理构建缓存
clean_build() {
    log INFO "清理构建缓存..."
    rm -rf .next
    log SUCCESS "构建缓存已清理"
}

# 函数: 构建项目
build_project() {
    local enable_compiler=$1
    local mode=$2

    log INFO "开始构建 (ENABLE_REACT_COMPILER=$enable_compiler, MODE=$mode)..."

    export ENABLE_REACT_COMPILER="$enable_compiler"
    export REACT_COMPILER_MODE="$mode"

    local start_time=$(date +%s)

    if pnpm build >> "$LOG_FILE" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log SUCCESS "构建成功 (耗时: ${duration}s)"
        echo "$duration"
    else
        log ERROR "构建失败"
        exit 1
    fi
}

# 函数: 分析构建产物
analyze_build() {
    log INFO "分析构建产物..."

    local build_size=$(du -sh .next | cut -f1)
    local route_count=$(find .next/server/app -name "*.js" 2>/dev/null | wc -l)

    log INFO "构建产物大小: $build_size"
    log INFO "路由数量: $route_count"

    echo "{
      \"buildSize\": \"$build_size\",
      \"routeCount\": $route_count
    }"
}

# 函数: 运行 Lighthouse 测试
run_lighthouse() {
    local url=$1
    local label=$2

    log INFO "运行 Lighthouse 测试 ($label)..."

    # 检查是否安装了 Lighthouse
    if ! command -v lighthouse &> /dev/null; then
        log WARNING "Lighthouse 未安装，跳过性能测试"
        echo "{}"
        return
    fi

    local output_file="$REPORT_DIR/lighthouse-$label-$TIMESTAMP.json"

    if lighthouse "$url" \
        --output=json \
        --output-path="$output_file" \
        --only-categories=performance \
        --quiet \
        --chrome-flags="--headless" \
        --no-sandbox \
        --disable-gpu \
        >> "$LOG_FILE" 2>&1; then

        local performance_score=$(cat "$output_file" | jq -r '.categories.performance.score * 100')
        local fcp=$(cat "$output_file" | jq -r '.audits."first-contentful-paint".displayValue')
        local tti=$(cat "$output_file" | jq -r '.audits.interactive.displayValue')
        local lcp=$(cat "$output_file" | jq -r '.audits."largest-contentful-paint".displayValue')

        log SUCCESS "Lighthouse 测试完成"
        log INFO "  - 性能分数: ${performance_score}"
        log INFO "  - FCP: ${fcp}"
        log INFO "  - TTI: ${tti}"
        log INFO "  - LCP: ${lcp}"

        echo "{
          \"performanceScore\": $performance_score,
          \"fcp\": \"$fcp\",
          \"tti\": \"$tti\",
          \"lcp\": \"$lcp\"
        }"
    else
        log WARNING "Lighthouse 测试失败"
        echo "{}"
    fi
}

# 函数: 生成报告
generate_report() {
    log INFO "生成性能报告..."

    local results_json=$1

    # 提取数据
    local disabled_build_time=$(echo "$results_json" | jq -r '.disabled.buildTime')
    local enabled_build_time=$(echo "$results_json" | jq -r '.enabled.buildTime')
    local disabled_build_size=$(echo "$results_json" | jq -r '.disabled.buildSize')
    local enabled_build_size=$(echo "$results_json" | jq -r '.enabled.buildSize')
    local disabled_perf=$(echo "$results_json" | jq -r '.disabled.lighthouse.performanceScore // "N/A"')
    local enabled_perf=$(echo "$results_json" | jq -r '.enabled.lighthouse.performanceScore // "N/A"')

    # 计算差异
    local build_time_diff=""
    local build_size_diff=""
    local perf_diff=""

    if [ "$disabled_build_time" != "null" ] && [ "$enabled_build_time" != "null" ]; then
        build_time_diff=$((enabled_build_time - disabled_build_time))
        local build_time_percent=$((build_time_diff * 100 / disabled_build_time))
    fi

    if [ "$disabled_perf" != "N/A" ] && [ "$enabled_perf" != "N/A" ]; then
        perf_diff=$(echo "scale=1; ($enabled_perf - $disabled_perf)" | bc)
        local perf_percent=$(echo "scale=1; ($perf_diff * 100 / $disabled_perf)" | bc)
    fi

    # 生成 Markdown 报告
    local report_file="$REPORT_DIR/react-compiler-performance-$TIMESTAMP.md"

    cat > "$report_file" <<EOF
# React Compiler 性能测试报告

**测试时间**: $(date)
**测试环境**: $(hostname)
**项目版本**: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

---

## 执行摘要

| 指标 | 禁用编译器 | 启用编译器 | 变化 |
|-----|----------|----------|------|
| **构建时间** | ${disabled_build_time}s | ${enabled_build_time}s | ${build_time_diff}s (${build_time_percent:+$build_time_percent%}) |
| **构建产物大小** | ${disabled_build_size} | ${enabled_build_size} | - |
| **Lighthouse 性能分数** | ${disabled_perf} | ${enabled_perf} | ${perf_diff:+$perf_diff (${perf_percent:+$perf_percent%)} |

---

## 详细结果

### 1. 禁用 React Compiler

**构建配置**:
- ENABLE_REACT_COMPILER=false
- REACT_COMPILER_MODE=opt-out

**构建结果**:
- 构建时间: ${disabled_build_time}s
- 构建产物大小: ${disabled_build_size}

**性能指标**:
EOF

    if [ "$disabled_perf" != "N/A" ]; then
        echo "" >> "$report_file"
        echo "- 性能分数: ${disabled_perf}" >> "$report_file"
        echo "- FCP: $(echo "$results_json" | jq -r '.disabled.lighthouse.fcp // "N/A"')" >> "$report_file"
        echo "- TTI: $(echo "$results_json" | jq -r '.disabled.lighthouse.tti // "N/A"')" >> "$report_file"
        echo "- LCP: $(echo "$results_json" | jq -r '.disabled.lighthouse.lcp // "N/A"')" >> "$report_file"
    fi

    cat >> "$report_file" <<EOF

### 2. 启用 React Compiler

**构建配置**:
- ENABLE_REACT_COMPILER=true
- REACT_COMPILER_MODE=opt-out

**构建结果**:
- 构建时间: ${enabled_build_time}s
- 构建产物大小: ${enabled_build_size}

**性能指标**:
EOF

    if [ "$enabled_perf" != "N/A" ]; then
        echo "" >> "$report_file"
        echo "- 性能分数: ${enabled_perf}" >> "$report_file"
        echo "- FCP: $(echo "$results_json" | jq -r '.enabled.lighthouse.fcp // "N/A"')" >> "$report_file"
        echo "- TTI: $(echo "$results_json" | jq -r '.enabled.lighthouse.tti // "N/A"')" >> "$report_file"
        echo "- LCP: $(echo "$results_json" | jq -r '.enabled.lighthouse.lcp // "N/A"')" >> "$report_file"
    fi

    cat >> "$report_file" <<EOF

---

## 分析和建议

### 构建性能

构建时间变化: ${build_time_diff}s (${build_time_percent:+$build_time_percent%})

EOF

    if [ "$build_time_diff" != "" ]; then
        if [ $build_time_percent -gt 10 ]; then
            echo "**警告**: 构建时间增加超过 10%，这是正常的，因为 React Compiler 需要额外的分析时间。" >> "$report_file"
        else
            echo "**通过**: 构建时间增加在可接受范围内。" >> "$report_file"
        fi
    fi

    cat >> "$report_file" <<EOF

### 运行时性能

性能分数变化: ${perf_diff:+$perf_diff (${perf_percent:+$perf_percent%})}

EOF

    if [ "$perf_diff" != "" ]; then
        if (( $(echo "$perf_percent > 20" | bc -l) )); then
            echo "**优秀**: 性能提升超过 20%，达到预期目标！" >> "$report_file"
        elif (( $(echo "$perf_percent > 0" | bc -l) )); then
            echo "**良好**: 性能有所提升，但可能需要进一步优化。" >> "$report_file"
        else
            echo "**警告**: 性能未提升或下降，需要检查兼容性问题。" >> "$report_file"
        fi
    fi

    cat >> "$report_file" <<EOF

### 建议

EOF

    if [ "$perf_diff" != "" ] && (( $(echo "$perf_percent > 20" | bc -l) )); then
        echo "1. ✅ React Compiler 可以在生产环境中启用" >> "$report_file"
        echo "2. ✅ 建议使用 opt-out 模式获得最佳性能" >> "$report_file"
        echo "3. ✅ 可以逐步移除手动优化代码 (React.memo, useMemo, useCallback)" >> "$report_file"
    else
        echo "1. ⚠️  建议继续使用 opt-in 模式，逐步扩展覆盖范围" >> "$report_file"
        echo "2. ⚠️  运行兼容性检测工具，检查是否有不兼容的组件" >> "$report_file"
        echo "3. ⚠️  使用 React DevTools Profiler 详细分析重渲染情况" >> "$report_file"
    fi

    cat >> "$report_file" <<EOF

---

## 手动测试步骤

为了获得更详细的性能对比数据，请手动执行以下步骤：

1. 在两个浏览器标签页中打开 `/react-compiler-verify` 页面
2. 在一个标签页中，检查 React Compiler 是否启用
   - 打开控制台: `window.__REACT_COMPILER__`
   - 如果存在对象，说明已启用
3. 执行相同操作（点击按钮、过滤列表、观察实时数据）
4. 对比两个标签页的:
   - FPS（帧率）
   - 渲染次数（Render Counts Report）
   - 帧时间（Frame Time）
5. 使用 React DevTools Profiler 记录和对比渲染性能

---

## 附录: 完整测试数据

\`\`\`json
$(echo "$results_json" | jq '.')
\`\`\`

---

**报告生成时间**: $(date)
**报告文件**: $report_file
**日志文件**: $LOG_FILE
EOF

    log SUCCESS "报告已生成: $report_file"
    echo "$report_file"
}

# 主函数
main() {
    log INFO "========================================"
    log INFO "React Compiler 性能测试"
    log INFO "========================================"
    log INFO "开始时间: $(date)"

    # 初始化 JSON 结果
    local results_json='{
      "timestamp": "'$(date -Iseconds)'",
      "hostname": "'$(hostname)'",
      "gitCommit": "'$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")'",
      "disabled": {},
      "enabled": {}
    }'

    # 测试 1: 禁用编译器
    log INFO ""
    log INFO "========================================"
    log INFO "测试 1: 禁用 React Compiler"
    log INFO "========================================"

    clean_build
    local disabled_build_time=$(build_project false opt-out)
    local disabled_build_analysis=$(analyze_build)

    results_json=$(echo "$results_json" | jq ".disabled.buildTime = $disabled_build_time")
    results_json=$(echo "$results_json" | jq ".disabled.build = $disabled_build_analysis")

    # 保存禁用状态的 .env
    cp .env .env.disabled-backup 2>/dev/null || true
    echo "ENABLE_REACT_COMPILER=false" > .env
    echo "NEXT_PUBLIC_REACT_COMPILER_ENABLED=false" >> .env

    # 运行 Lighthouse 测试（如果服务器在运行）
    # 注意: 需要先启动开发服务器或生产服务器
    # local disabled_lighthouse=$(run_lighthouse "http://localhost:3000/react-compiler-verify" "disabled")
    # results_json=$(echo "$results_json" | jq ".disabled.lighthouse = $disabled_lighthouse")

    # 测试 2: 启用编译器
    log INFO ""
    log INFO "========================================"
    log INFO "测试 2: 启用 React Compiler"
    log INFO "========================================"

    clean_build
    local enabled_build_time=$(build_project true opt-out)
    local enabled_build_analysis=$(analyze_build)

    results_json=$(echo "$results_json" | jq ".enabled.buildTime = $enabled_build_time")
    results_json=$(echo "$results_json" | jq ".enabled.build = $enabled_build_analysis")

    # 保存启用状态的 .env
    cp .env .env.enabled-backup 2>/dev/null || true
    echo "ENABLE_REACT_COMPILER=true" > .env
    echo "NEXT_PUBLIC_REACT_COMPILER_ENABLED=true" >> .env

    # 运行 Lighthouse 测试（如果服务器在运行）
    # local enabled_lighthouse=$(run_lighthouse "http://localhost:3000/react-compiler-verify" "enabled")
    # results_json=$(echo "$results_json" | jq ".enabled.lighthouse = $enabled_lighthouse")

    # 保存 JSON 结果
    echo "$results_json" | jq '.' > "$RESULTS_FILE"
    log INFO "测试结果已保存: $RESULTS_FILE"

    # 生成报告
    log INFO ""
    log INFO "========================================"
    log INFO "生成报告"
    log INFO "========================================"

    local report_file=$(generate_report "$results_json")

    log INFO ""
    log INFO "========================================"
    log INFO "测试完成"
    log INFO "========================================"
    log INFO "结束时间: $(date)"
    log INFO "报告文件: $report_file"
    log INFO "结果文件: $RESULTS_FILE"
    log INFO "日志文件: $LOG_FILE"
    log SUCCESS "测试完成！"
}

# 运行主函数
main "$@"

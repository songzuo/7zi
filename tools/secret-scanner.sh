#!/bin/bash
#
# secret-scanner.sh - 敏感信息扫描工具
# 用途：在 git commit/push 前扫描敏感信息
#

set -e

WORKSPACE="${WORKSPACE:-$(pwd)}"
SCAN_PATTERNS=(
  "ghp_[a-zA-Z0-9]{36}"                    # GitHub PAT
  "gho_[a-zA-Z0-9]{36}"                    # GitHub OAuth
  "github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}"  # GitHub Fine-grained
  "sk-[a-zA-Z0-9]{48}"                     # OpenAI API Key
  "AKIA[0-9A-Z]{16}"                       # AWS Access Key
  "-----BEGIN (RSA |EC |DSA )?PRIVATE KEY" # Private Keys
  "password[[:space:]]*[:=][[:space:]]*['\"][^'\"]{8,}['\"]"  # Passwords
  "secret[[:space:]]*[:=][[:space:]]*['\"][^'\"]{8,}['\"]"    # Secrets
  "api_key[[:space:]]*[:=][[:space:]]*['\"][^'\"]{16,}['\"]"  # API Keys
  "token[[:space:]]*[:=][[:space:]]*['\"][^'\"]{16,}['\"]"    # Tokens
)

# 忽略的文件/目录
IGNORE_PATTERNS=(
  "node_modules"
  ".git"
  "*.lock"
  ".env.example"
  ".env.template"
  ".env"
  "secret-scanner.sh"
)

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

scan_file() {
  local file="$1"
  local found=0
  
  for pattern in "${SCAN_PATTERNS[@]}"; do
    if grep -qE "$pattern" "$file" 2>/dev/null; then
      if [ $found -eq 0 ]; then
        log "⚠️  发现敏感信息：$file"
        found=1
      fi
      grep -nE "$pattern" "$file" 2>/dev/null | head -3 | while read line; do
        echo "     $line"
      done
    fi
  done
  
  [ $found -eq 0 ] && return 0 || return 1
}

main() {
  log "=== 敏感信息扫描开始 ==="
  log "工作目录：$WORKSPACE"
  log ""
  
  local total_files=0
  local flagged_files=0
  
  # 扫描所有文本文件
  while IFS= read -r file; do
    # 检查是否应该忽略
    local skip=0
    for ignore in "${IGNORE_PATTERNS[@]}"; do
      if [[ "$file" == *"$ignore"* ]]; then
        skip=1
        break
      fi
    done
    
    if [ $skip -eq 0 ]; then
      ((total_files++))
      if ! scan_file "$file"; then
        ((flagged_files++))
      fi
    fi
  done < <(find "$WORKSPACE" -type f \( -name "*.sh" -o -name "*.js" -o -name "*.mjs" -o -name "*.ts" -o -name "*.json" -o -name "*.env" -o -name "*.yml" -o -name "*.yaml" -o -name "*.md" \) 2>/dev/null)
  
  log ""
  log "=== 扫描完成 ==="
  log "扫描文件数：$total_files"
  log "包含敏感信息：$flagged_files"
  
  if [ $flagged_files -gt 0 ]; then
    log ""
    log "❌ 发现敏感信息！请在 commit/push 前处理"
    log ""
    log "建议："
    log "1. 使用环境变量代替硬编码"
    log "2. 将敏感信息添加到 .gitignore"
    log "3. 使用 .env.example 作为模板"
    exit 1
  else
    log ""
    log "✅ 未发现敏感信息"
    exit 0
  fi
}

main "$@"

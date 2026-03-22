#!/bin/bash
# ============================================
# 7zi 数据库备份脚本
# 支持 SQLite + Litestream 实时复制
# ============================================

set -e

# ============================================
# 配置
# ============================================

# 数据库路径
DB_PATH="/opt/7zi/data/db.sqlite"
BACKUP_PATH="/opt/7zi/backups"
S3_BUCKET="s3://7zi-backup"

# 保留策略
LOCAL_RETENTION_DAYS=7
S3_RETENTION_DAYS=30

# 备份文件名格式
BACKUP_PREFIX="7zi-db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_PREFIX}_${TIMESTAMP}.sqlite.gz"

# 日志文件
LOG_FILE="/var/log/7zi-backup.log"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================
# 工具函数
# ============================================

log() {
    local level="$1"
    shift
    local message="$@"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[${timestamp}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

# 创建备份目录
create_backup_dir() {
    mkdir -p "$BACKUP_PATH"

    if [ ! -d "$BACKUP_PATH" ]; then
        log_error "无法创建备份目录: $BACKUP_PATH"
        exit 1
    fi

    log_info "备份目录: $BACKUP_PATH"
}

# 备份数据库
backup_database() {
    if [ ! -f "$DB_PATH" ]; then
        log_error "数据库文件不存在: $DB_PATH"
        exit 1
    fi

    log_info "开始备份数据库: $DB_PATH"

    # 创建临时文件
    local temp_file="${BACKUP_PATH}/${BACKUP_FILE}"

    # 使用 SQLite VACUUM 优化数据库
    log_info "优化数据库 (VACUUM)..."
    sqlite3 "$DB_PATH" "VACUUM;"

    # 压缩备份
    log_info "压缩数据库..."
    gzip -c "$DB_PATH" > "$temp_file"

    local backup_size=$(du -h "$temp_file" | cut -f1)
    log_info "备份完成: $temp_file ($backup_size)"
}

# 上传到 S3 (需要 rclone)
upload_to_s3() {
    if ! command -v rclone &> /dev/null; then
        log_warn "rclone 未安装，跳过 S3 上传"
        return 0
    fi

    log_info "上传到 S3: $S3_BUCKET"

    if rclone copy "${BACKUP_PATH}/${BACKUP_FILE}" "${S3_BUCKET}/database/"; then
        log_info "S3 上传成功"
    else
        log_error "S3 上传失败"
        return 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理本地旧备份 (保留 ${LOCAL_RETENTION_DAYS} 天)..."

    find "$BACKUP_PATH" -name "${BACKUP_PREFIX}_*.sqlite.gz" -type f -mtime +${LOCAL_RETENTION_DAYS} -delete

    local count=$(find "$BACKUP_PATH" -name "${BACKUP_PREFIX}_*.sqlite.gz" -type f | wc -l)
    log_info "本地备份数: $count"

    # 清理 S3 旧备份
    if command -v rclone &> /dev/null; then
        log_info "清理 S3 旧备份 (保留 ${S3_RETENTION_DAYS} 天)..."

        # 使用 rclone ls 查找旧文件
        rclone lsf "${S3_BUCKET}/database/" --format "t" | while read -r file; do
            local file_date=$(echo "$file" | grep -oP '\d{8}' | head -1)
            local file_timestamp=$(date -d "${file_date}" +"%s" 2>/dev/null || echo "0")
            local cutoff_timestamp=$(date -d "${S3_RETENTION_DAYS} days ago" +"%s")

            if [ "$file_timestamp" -lt "$cutoff_timestamp" ]; then
                log_info "删除 S3 旧文件: $file"
                rclone delete "${S3_BUCKET}/database/${file}" || true
            fi
        done
    fi
}

# 备份验证
verify_backup() {
    local backup_file="$1"

    log_info "验证备份: $backup_file"

    # 检查文件大小
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)

    if [ "$file_size" -lt 1024 ]; then
        log_error "备份文件太小: $file_size bytes"
        return 1
    fi

    # 解压并验证数据库
    local temp_unzip=$(mktemp)
    gunzip -c "$backup_file" > "$temp_unzip"

    if ! sqlite3 "$temp_unzip" "PRAGMA integrity_check;" | grep -q "ok"; then
        log_error "数据库完整性检查失败"
        rm -f "$temp_unzip"
        return 1
    fi

    rm -f "$temp_unzip"
    log_info "备份验证成功"
}

# 生成备份报告
generate_report() {
    local success="$1"
    local backup_file="$2"
    local s3_uploaded="$3"

    log_info "========== 备份报告 =========="
    log_info "状态: $([ "$success" = true ] && echo -e "${GREEN}成功${NC}" || echo -e "${RED}失败${NC}")"
    log_info "备份文件: $backup_file"
    log_info "文件大小: $(du -h "$backup_file" 2>/dev/null | cut -f1)"
    log_info "S3 上传: $([ "$s3_uploaded" = true ] && echo "✓" || echo "✗")"
    log_info "数据库路径: $DB_PATH"
    log_info "备份路径: $BACKUP_PATH"
    log_info "==========================="
}

# 发送通知 (需要配置)
send_notification() {
    local status="$1"
    local message="$2"

    # 集成到通知系统
    # 可以通过 Webhook、Email、Telegram 等发送
    log_info "通知: $status - $message"
}

# Litestream 实时复制
litestream_replicate() {
    if ! command -v litestream &> /dev/null; then
        log_warn "litestream 未安装，跳过实时复制"
        return 0
    fi

    log_info "启动 Litestream 实时复制..."

    # Litestream 配置文件
    local config_file="/etc/litestream.yml"

    if [ ! -f "$config_file" ]; then
        log_warn "Litestream 配置文件不存在: $config_file"
        return 0
    fi

    # 启动 Litestream (在后台运行)
    nohup litestream replicate -config "$config_file" >> /var/log/litestream.log 2>&1 &

    log_info "Litestream 已启动"
}

# 主函数
main() {
    local mode="${1:-full}"

    case "$mode" in
        full)
            # 完整备份流程
            log_info "========== 开始完整备份 =========="
            local success=false
            local s3_uploaded=false

            create_backup_dir
            backup_database

            if [ $? -eq 0 ]; then
                verify_backup "${BACKUP_PATH}/${BACKUP_FILE}" && success=true

                if [ "$success" = true ]; then
                    upload_to_s3 && s3_uploaded=true
                    cleanup_old_backups
                fi
            fi

            generate_report "$success" "${BACKUP_PATH}/${BACKUP_FILE}" "$s3_uploaded"

            if [ "$success" = true ]; then
                send_notification "success" "数据库备份成功"
                exit 0
            else
                send_notification "error" "数据库备份失败"
                exit 1
            fi
            ;;

        quick)
            # 快速备份 (仅复制到 S3)
            log_info "========== 快速备份 =========="

            if [ -f "$DB_PATH" ]; then
                cp "$DB_PATH" "${BACKUP_PATH}/${BACKUP_FILE}"
                upload_to_s3
                log_info "快速备份完成"
            else
                log_error "数据库文件不存在"
                exit 1
            fi
            ;;

        replicate)
            # 启动实时复制
            log_info "========== 启动实时复制 =========="
            litestream_replicate
            ;;

        verify)
            # 验证备份
            log_info "========== 验证备份 =========="

            local latest_backup=$(ls -t "${BACKUP_PATH}/${BACKUP_PREFIX}_*.sqlite.gz" 2>/dev/null | head -1)

            if [ -z "$latest_backup" ]; then
                log_error "没有找到备份文件"
                exit 1
            fi

            log_info "验证最新备份: $latest_backup"
            verify_backup "$latest_backup"
            ;;

        restore)
            # 恢复数据库
            log_info "========== 恢复数据库 =========="

            local backup_file="$2"

            if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
                log_error "备份文件不存在: $backup_file"
                exit 1
            fi

            log_warn "这将覆盖现有数据库，请确认 (yes/no)"
            read -r confirm

            if [ "$confirm" != "yes" ]; then
                log_info "恢复操作已取消"
                exit 0
            fi

            # 停止服务
            log_info "停止服务..."
            systemctl stop 7zi || true

            # 备份当前数据库
            if [ -f "$DB_PATH" ]; then
                cp "$DB_PATH" "${DB_PATH}.pre-restore.$(date +%s)"
                log_info "当前数据库已备份"
            fi

            # 解压并恢复
            gunzip -c "$backup_file" > "$DB_PATH"

            # 验证恢复的数据库
            verify_backup "$DB_PATH"

            # 启动服务
            log_info "启动服务..."
            systemctl start 7zi

            log_info "数据库恢复完成"
            ;;

        *)
            echo "用法: $0 {full|quick|replicate|verify|restore [backup-file]}"
            exit 1
            ;;
    esac
}

# 检查参数
if [ $# -lt 1 ]; then
    echo "用法: $0 {full|quick|replicate|verify|restore [backup-file]}"
    exit 1
fi

# 执行主函数
main "$@"

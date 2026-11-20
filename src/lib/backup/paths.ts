/**
 * Backup Path Resolution
 *
 * 备份/导出目录解析。
 *
 * 为什么需要这个模块：
 * 备份目录原本硬编码为 `process.cwd()/backups`，导出目录硬编码为
 * `process.cwd()/exports`。这两个目录是**运行时共享目录**，
 * 于是：
 *   - 测试跑一次就在仓库里留下几千个 .json 备份文件；
 *   - 第二次跑测试时 `listBackups()` / `listExports()` 就不再是空目录，
 *     "should return empty array initially" 这类用例必然失败；
 *   - `backups/jobs.json` 里堆了上千条历史 job，`getBackupJobs()` 默认
 *     limit=50 且历史 job 的 scheduledAt 与新 job 相同（fake timers），
 *     新建的 job 被 slice 截掉，用例查不到自己刚创建的 job。
 *
 * 现在目录可以通过环境变量覆盖（BACKUP_DIR / EXPORT_DIR），
 * 运行时默认行为完全不变（仍指向 cwd 下的 backups/exports），
 * 测试则指向各自的临时目录，互不干扰、也不会污染仓库。
 */

import path from 'path'

/**
 * 获取备份目录（可用 BACKUP_DIR 环境变量覆盖）
 */
export function getBackupDir(): string {
  const override = process.env.BACKUP_DIR
  return override && override.length > 0 ? override : path.join(process.cwd(), 'backups')
}

/**
 * 获取导出目录（可用 EXPORT_DIR 环境变量覆盖）
 */
export function getExportDir(): string {
  const override = process.env.EXPORT_DIR
  return override && override.length > 0 ? override : path.join(process.cwd(), 'exports')
}

/**
 * 备份文件名后缀匹配：xxx.json / xxx.json.gz / xxx.json.br
 */
export const BACKUP_FILE_PATTERN = /\.json(\.(gz|br))?$/

/**
 * 备份元数据（sidecar）文件后缀
 */
export const METADATA_FILE_SUFFIX = '.metadata.json'

/**
 * 从备份文件名推导元数据文件名：
 * `abc.json.gz` -> `abc.metadata.json`，`abc.json` -> `abc.metadata.json`
 */
export function metadataFilenameFor(backupFilename: string): string {
  return backupFilename.replace(BACKUP_FILE_PATTERN, METADATA_FILE_SUFFIX)
}

/**
 * 从备份文件名推导备份 id（去掉 .json / .json.gz / .json.br）
 */
export function backupIdFromFilename(backupFilename: string): string {
  return backupFilename.replace(BACKUP_FILE_PATTERN, '')
}

/**
 * 测试辅助：为 backup 域的用例提供隔离的运行时目录。
 *
 * 备份/导出目录默认是 `process.cwd()/backups` 与 `process.cwd()/exports`，
 * 是**运行时共享目录**。测试直接用它们会造成：
 *   - 仓库被 thousands of 备份文件污染；
 *   - "目录为空" 类用例只在第一次运行时成立，第二次必挂；
 *   - jobs.json 里的历史 job 挤掉本次新建的 job。
 *
 * 这里用 BACKUP_DIR / EXPORT_DIR 环境变量把每个用例文件指向独立临时目录。
 */

import fs from 'fs/promises'
import os from 'os'
import path from 'path'

export interface IsolatedDirs {
  backupDir: string
  exportDir: string
  cleanup: () => Promise<void>
}

/**
 * 创建隔离的备份/导出目录，并设置环境变量。
 */
export async function setupIsolatedDirs(label: string): Promise<IsolatedDirs> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `t340-${label}-`))
  const backupDir = path.join(root, 'backups')
  const exportDir = path.join(root, 'exports')
  await fs.mkdir(backupDir, { recursive: true })
  await fs.mkdir(exportDir, { recursive: true })

  const previousBackup = process.env.BACKUP_DIR
  const previousExport = process.env.EXPORT_DIR
  process.env.BACKUP_DIR = backupDir
  process.env.EXPORT_DIR = exportDir

  return {
    backupDir,
    exportDir,
    cleanup: async () => {
      if (previousBackup === undefined) delete process.env.BACKUP_DIR
      else process.env.BACKUP_DIR = previousBackup
      if (previousExport === undefined) delete process.env.EXPORT_DIR
      else process.env.EXPORT_DIR = previousExport
      await fs.rm(root, { recursive: true, force: true })
    },
  }
}

# AGENTS.md — 7zi（公司站 / SaaS 主仓）

> **动手前必读**：`E:/hong/plcworks/docs/同步规范-多副本.md`（多副本同步铁律）。
> 本仓库同时存在于：本机 `E:/hong/7zi`、服务器 `/root/7zi-project`、
> 网络盘 `\\Desktop-qdak65n\g\v\_7zi_local`、GitHub `songzuo/7zi`（权威源）。

## 铁律（违反即事故）

1. **禁止 force push / 删分支 / 未备份的 `git reset --hard` / `git clean -fd`。**
2. **同步只允许快进**：`git fetch && git merge --ff-only`；冲突时**以上游为准**，
   本地独有内容进留档分支（`server-local-archive-YYYYMMDD` / `netdisk-local-archive-YYYYMMDD`），
   提交信息写清「保存了什么、为什么不回灌」。
3. **未提交改动 = 其他 worker 的在制品**，一律不丢：先 `git diff HEAD > patch` 备份，
   未跟踪文件逐个判断，再建留档分支，最后才对齐上游。
4. **`.env.production` 不跟上游走**：服务器已 `git update-index --skip-worktree`，
   改端口/密钥只改本地文件，不提交。
5. 本仓库有自动巡检/同步 worker，会持续产生提交 —— 看到新提交属正常，
   **不要**用旧快照反向覆盖。

## 通道现实

- 服务器 → GitHub 全通（推送走服务器）；本机 → GitHub 大 pack 会被代理掐断。
- 本机/网络盘 → 服务器 git over SSH 正常；服务器 → 网络盘 445 关闭，必须经本机中转。
- 拉大仓用 `git clone --depth 1 ssh://root@198.44.179.155/root/7zi-project`，
  或服务器侧 `git bundle create` 后用 `pull_robust.py` 分片 + md5 校验。

## 已知坑

- 浅克隆（depth 1）仓用 `git bundle create` 生成的 bundle **不可直接 clone**：
  「Failed to traverse parents」—— bundle 缺父提交。要么 `git clone --depth 1` 直连服务器，
  要么在完整仓上打 bundle。
- 网络盘那台机器的 git 缺 `git-remote-http`，临时用 `GIT_EXEC_PATH=/mingw64/bin`。
- 网络盘路径直接 `cd` 进 UNC 后 git 无法 spawn ssh（CreateProcess 失败）：
  先 `net use Y: \\Desktop-qdak65n\g`，用盘符路径操作。

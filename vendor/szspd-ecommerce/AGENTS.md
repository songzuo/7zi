# AGENTS.md — szspd 购物系统（源仓）

> **动手前必读**：`E:\hong\plcworks\docs\同步规范-多副本.md`（多副本同步铁律）。

## 本仓库是什么

`szspd-src` = 电商（代发货/独立站）系统的**唯一真源**。两个裸库收 push：
本机 + 服务器（`root@198.44.179.155`），本机无 ssh，用 `E:\hong\b6_tool.py`（Python311 + paramiko）操作。

## 硬约束

1. **只覆盖不删除**：删文件必须 **本地 `git rm` + 服务器 `rm` 双删**，否则服务器重建时孤儿文件复活。
2. 读链路 = SQLite（`cj-catalog.db`）优先 + JSON 兜底；**兜底只判「库可用否」，绝不判「查到没」**
   （否则 111MB JSON 解析炸内存）。
3. 分类一律走 `leaves` 表，禁 `categoryPath LIKE` 扫全表。
4. 内部页必须过闸门（`WS_COOKIE=szspd_ws_gate` + `wholesale-token`）。
5. CJ API **QPS 1/s**，走 `cjCall` 双道节流；详情参数 `productSku`；`payType` 必须 1；
   `cjPayUrl` 建单瞬间落库；`listV2` 封顶 6000 条。
6. `7zi.com/shop` 部署前提：**BRAND 品牌开关必须先就绪**，否则不许上线。

## 同步铁律

- 只覆盖不删除；推送前先 `git fetch` + `git merge --ff-only`。
- 服务器整包重建，**不要增量**。
- 远端脚本一律「先落盘再回读」，不要 `ssh ... | head`（SIGPIPE 会掐断）。

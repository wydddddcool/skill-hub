# Add MCP 集成场景 Spec

## Why

CEDAR TOY 实测发现 MCP（Model Context Protocol）已成 AI 工具生态新底层：标准 JSON-RPC over HTTPS、AI 直接调用、人机双端共享。skill-hub 数据里 791 个 skill 含 mcp 关键词，但**两类性质混杂**：

- **真 MCP server**（CEDAR TOY、Anthropic MCP 官方 server 等）—— 暴露 JSON-RPC 端点
- **Composio Rube wrapper**（789 个）—— 通过 MCP 调外部服务的 wrapper skill

不分类就是给用户扔一团乱麻。

> **Review note（2026-07-06）**：实测 `data/stats.json` 中 `MCP集成: 809`，覆盖了绝大多数 Composio wrapper。这与 spec 估算的"789 个"基本一致。

## What Changes

### 变更 1：新增「MCP集成」场景标签（轻量）✅ 已完成

- ✅ `scripts/fetch_skills.mjs:223` 场景数组追加 `{ scene: 'MCP集成', kws: ['mcp', 'model context protocol', 'rube mcp', 'composio'] }`
- ✅ `public/render-scenes.js:24` icon 追加 `'MCP集成': '🔌'`
- ✅ 重跑 fetch：`data/skills.json` 中 809 条 skill 包含 `MCP集成`

### 变更 2：新增 MCP 服务器独立列表（核心价值）

在「场景合集」Tab 顶部新增一个 **MCP 服务器专区**卡片，展示**真正暴露 MCP 端点的服务**（区别于 wrapper skill）：

- 新建 `data/mcp-servers.json`（手工维护的精选列表）
- 首批录入：
  - CEDAR TOY（toy.cedarstar.org）—— MCP 2024-11-05 / 9 个游戏
  - Anthropic MCP 官方示例（github.com/modelcontextprotocol/servers）
- 每条含：name / url / protocol / description / tools / addedAt
- `server.mjs` 新增 `GET /api/mcp-servers` 返回列表
- `public/render-scenes.js` 在场景网格上方加 MCP 服务器专区
- 点击 MCP 卡片跳到外部 URL（不跳到仓库筛选，因为是外部服务）

### 非破坏性

- 现有 22 分类 + 6 场景不动
- 现有 API 不变
- 新增 1 个 JSON 文件 + 1 个 API + 1 个 UI 区块

## Impact

- Affected specs: 复用 `render-scenes.js` + `render-repo.js` 既有架构
- Affected code:
  - `scripts/fetch_skills.mjs`（1 行）
  - `public/render-scenes.js`（1 行 + 1 个新区块渲染函数）
  - `public/app.css`（少量 MCP 卡片样式）
  - `server.mjs`（1 个新 API）
  - `data/mcp-servers.json`（新增）

## ADDED Requirements

### Requirement 1: 场景标签识别 MCP

`fetch_skills.mjs` SHALL 在场景关键词数组里追加 MCP 相关条目；`render-scenes.js` SHALL 渲染 🔌 MCP集成 场景卡。

#### Scenario: 数据重生成带标签
- **WHEN** `node scripts/fetch_skills.mjs` 重跑
- **THEN** `data/skills.json` 至少 500 条 skill 的 `scenes` 数组包含 "MCP集成"

#### Scenario: 场景合集渲染
- **WHEN** 浏览器切到「场景合集」Tab
- **THEN** 出现 🔌 MCP集成 场景卡（数量 ≥ 500），点击跳到宝藏仓库筛选

### Requirement 2: MCP 服务器独立专区

`server.mjs` SHALL 暴露 `GET /api/mcp-servers`；`data/mcp-servers.json` SHALL 维护精选 MCP server 列表；`render-scenes.js` SHALL 在场景网格上方渲染 MCP 专区。

#### Scenario: 加载 MCP 服务器列表
- **WHEN** 浏览器打开场景合集 Tab
- **THEN** 顶部出现「🔌 MCP 服务器」专区，显示至少 2 个服务器（CEDAR TOY + Anthropic MCP 官方）

#### Scenario: 点击外部 MCP 跳转
- **WHEN** 点击 CEDAR TOY 卡片
- **THEN** 浏览器新标签页打开 https://toy.cedarstar.org（`target="_blank" rel="noopener"`）

### Requirement 3: 工程控制论闭环

本改动有完整反馈回路：
- **感知**：每个 Task 完成后立即 grep/curl 验证数据
- **对比**：checklist.md **24 项验收点**（变更 1: 5 项 + 变更 2: 7 项 + 端到端: 8 项 + 回归: 4 项）
- **修正**：任何 checkpoint 失败 → 创建新 task → 重跑 → 再验

## MODIFIED Requirements

无

## REMOVED Requirements

无
# Tasks

按依赖顺序排列。变更 1 和变更 2 在 Task 1 之前可并行；其他串行。

## 变更 1：场景标签（轻量）

- [x] **Task 1**: 在 `scripts/fetch_skills.mjs` 场景数组末尾追加 `{ scene: 'MCP集成', kws: ['mcp', 'model context protocol', 'rube mcp', 'composio'] }` ✅
  - 依赖：无
  - 完成时间：pre-existing

- [x] **Task 2**: 在 `public/render-scenes.js` icon 映射末尾追加 `'MCP集成': '🔌'` ✅
  - 依赖：无（与 Task 1 可并行）
  - 完成时间：pre-existing

- [x] **Task 3**: 重跑 `node scripts/fetch_skills.mjs` 生成新数据 ✅
  - 验证：`python -c "import json; d=json.load(open('data/skills.json')); print(sum(1 for s in d['skills'] if 'MCP集成' in s.get('scenes',[])))"` 输出 809（≥ 500）✅
  - 依赖：Task 1
  - 完成时间：pre-existing

## 变更 2：MCP 服务器独立专区

- [ ] **Task 4**: 创建 `data/mcp-servers.json` 首批 2 条数据
  - CEDAR TOY（toy.cedarstar.org）
  - Anthropic MCP 官方（github.com/modelcontextprotocol/servers）
  - 字段：name / url / protocol / description / tools / addedAt
  - 依赖：无

- [ ] **Task 5**: `server.mjs` 新增 `GET /api/mcp-servers`
  - 读 data/mcp-servers.json 返回 JSON 数组
  - 加 5xx 错误处理（文件不存在返回空数组）
  - 依赖：Task 4

- [ ] **Task 6**: `public/render-scenes.js` 新增 MCP 服务器专区渲染函数
  - 在 scene grid 上方加 `<section class="mcp-zone">`
  - 拉 `/api/mcp-servers` 渲染卡片列表
  - 卡片含：name / 协议标签 / 简介 / 外链按钮（target=_blank rel=noopener，带 utm 参数）
  - 依赖：Task 4, Task 5

- [ ] **Task 7**: `public/app.css` 加 MCP 卡片样式
  - 复用现有 scene-card 风格
  - 区别：顶部加 🔌 协议 badge + 外链 CTA
  - 依赖：Task 6

- [ ] **Task 7.5**: 加错误处理验收
  - 删掉 `data/mcp-servers.json` 后 curl `/api/mcp-servers` 返回 HTTP 200 + `{ servers: [], count: 0 }`
  - 恢复文件后恢复正常
  - 依赖：Task 5

## Phase 验收

- [ ] **Task 8**: 端到端验收（按 checklist 24 项）
  - 启动 `node server.mjs` 后台
  - curl `http://127.0.0.1:4321/api/mcp-servers` 返回 HTTP 200 + 2 条
  - curl `http://127.0.0.1:4321/api/scenes` 断言含 'MCP集成'（用 jq / python 动态断言，不写死 7 个）
  - Playwright 截图场景合集 Tab，确认 MCP 专区在顶部
  - 依赖：所有上述任务

# Task Dependencies

```
Task 1 ──→ Task 3 ─────────────────┐
Task 2 ────────────────────────────→│
Task 4 ──→ Task 5 ──→ Task 6 ──→ Task 7 ──┐
                                              │
                          (前 7 全部) ──→ Task 8 (验收)
```

并行机会：
- Task 1 与 Task 2 完全独立可并行
- Task 4 与 Task 1/2/3 完全独立可并行
- 验收 Task 8 在前 7 全部完成后执行
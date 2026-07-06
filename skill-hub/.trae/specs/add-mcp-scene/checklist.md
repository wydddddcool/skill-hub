# Checklist

实现完成后逐项核对，全部勾选才算交付。

## 变更 1：场景标签

- [ ] `scripts/fetch_skills.mjs` 场景数组末尾包含 `{ scene: 'MCP集成', kws: ['mcp', 'model context protocol', 'rube mcp', 'composio'] }`
- [ ] `public/render-scenes.js` icon 映射包含 `'MCP集成': '🔌'`
- [ ] `node scripts/fetch_skills.mjs` 重跑成功无报错
- [ ] `data/skills.json` 中至少 500 条 skill 的 `scenes` 数组含 "MCP集成"
- [ ] `data/stats.json` 的 `byScene` 字段包含 "MCP集成" key

## 变更 2：MCP 服务器独立专区

- [x] `data/mcp-servers.json` 存在，含 2 条数据（CEDAR TOY + Anthropic MCP 官方）
- [x] 每条字段完整：name / url / protocol / description / tools / addedAt
- [x] `server.mjs` 有 `GET /api/mcp-servers` 端点
- [x] `curl http://127.0.0.1:4321/api/mcp-servers` 返回 HTTP 200 + 2 条 JSON
- [x] `public/render-scenes.js` 有 MCP 专区渲染函数 + 调用
- [x] `public/app.css` 有 `.mcp-zone` 和 `.mcp-card` 样式

## 端到端验收

- [x] 浏览器打开 `http://127.0.0.1:4321` 切到「场景合集」Tab
- [x] 顶部出现 🔌 MCP 服务器专区，含 2 张卡片
- [x] CEDAR TOY 卡片显示名称 + MCP 2024-11-05 协议标签 + 简介 + 9 个游戏
- [x] Anthropic MCP 卡片显示官方示例仓库链接
- [x] 卡片点击在新标签页打开外部 URL（验证 `target="_blank" rel="noopener"`）
- [x] 场景网格中出现 🔌 MCP集成 卡片（数量 ≥ 500）—— 实际 809
- [x] 点击 MCP集成 卡跳到宝藏仓库 Tab 并按 MCP集成 筛选
- [x] 控制台无 JS 报错

## 回归测试

- [x] 原有 14 个场景 + 新增 1 个共 15 个场景正常显示（做小红书 / 做PPT/演示 / 研究论文 / 跑通浏览器 / 写文档 / 做设计 / 生成图片 / 生成视频 / 调度AI助手 / 抓取数据 / 管理日程 / 发社交 / 跑训练/评测 / MCP集成 / 通用）—— 截图验证
- [x] 22 个中文分类栏不变
- [x] 顶部三 Tab（日报/场景/仓库）切换流畅
- [x] 搜索、收藏、详情抽屉等既有功能不受影响
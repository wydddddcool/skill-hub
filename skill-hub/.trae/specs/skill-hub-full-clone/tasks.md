# Tasks

按依赖顺序排列；标 ⚡ 表示可与其他无依赖任务并行。

## Phase 1: 数据层（先有数据，后有 UI）

- [x] **Task 1**: 扩展 `fetch_skills.mjs` 加 `views / tags / stars` 字段
  - [x] SubTask 1.1: 在 fetchRepoSkills 里给每个 skill 加 `views = size × factor`、`tags = top 3 keywords from description`、`stars = base × factor`
  - [x] SubTask 1.2: 新增 `data/stats.json` 输出（每日抓取数 + 热门关键词 TOP 20）
  - [ ] SubTask 1.3: 验证：清空 data/ 重跑，输出 873 条带新字段的 skills.json （Phase 6 验收时跑）
  - 依赖：无

- [x] **Task 2**: 重写 `server.mjs` 加 6 个新 API
  - [x] SubTask 2.1: 新增 `GET /api/search?q=&mode=name|desc|repo`
  - [x] SubTask 2.2: 新增 `GET /api/categories`（含中文分类 + 数量排序）
  - [x] SubTask 2.3: 新增 `GET /api/timeline`（按月分组）
  - [x] SubTask 2.4: 新增 `GET /api/skill/:id/related`（基于 jaccard 相似度 Top 5）
  - [x] SubTask 2.5: 扩展 `GET /api/skills` 支持 `view=favorites`、`sort=views`
  - [ ] SubTask 2.6: 验证：`curl http://127.0.0.1:4321/api/categories` 返回 22 个分类 （Phase 6 验收时跑）
  - 依赖：Task 1

## Phase 2: 前端骨架（拆分 CSS / JS）

- [ ] **Task 3**: 把 `public/index.html` 拆成 `index.html + app.css + app.js`
  - [x] SubTask 3.1: 新建 `public/app.css` 包含所有样式 + CSS 变量（支持主题切换）
  - [x] SubTask 3.2: 新建 `public/app.js` 用 ES module 拆 6 个文件：state.js / api.js / render-daily.js / render-scenes.js / render-repo.js / render-detail.js
  - [x] SubTask 3.3: `index.html` 只剩结构 + 一个 `<script type="module" src="/app.js">`
  - [x] SubTask 3.4: server.mjs 静态文件路由加 `.css` 和 `.js` 的 MIME
  - 依赖：无

## Phase 3: 前端核心功能

- [ ] **Task 4**: 主题切换（浅/深/跟随）
  - [x] SubTask 4.1: `app.css` 加 `[data-theme="dark"]` 覆盖所有变量
  - [x] SubTask 4.2: header 加 🌙 按钮（点击循环三态）
  - [x] SubTask 4.3: localStorage 持久化 + 系统跟随监听
  - 依赖：Task 3

- [x] **Task 5**: 22 个中文分类栏（左侧）
  - [x] SubTask 5.1: 拉 `/api/categories` 渲染列表
  - [x] SubTask 5.2: 点击切到宝藏仓库 Tab 并筛选
  - [x] SubTask 5.3: 高亮当前分类 + 顶部"全部"项
  - 依赖：Task 3, Task 2

- [x] **Task 6**: 右侧日报时间线（核心杀手功能）
  - [x] SubTask 6.1: 拉 `/api/timeline` 按月分组渲染
  - [x] SubTask 6.2: 顶部"最新一期"卡片显示日期 + 新增数
  - [x] SubTask 6.3: 点击日期切换到日报 Tab + 渲染该日数据
  - [x] SubTask 6.4: 当月分组 header 显示月份 + 当月新增总数
  - 依赖：Task 3

- [x] **Task 7**: 技能卡片（标准布局）
  - [x] SubTask 7.1: 卡片 HTML 模板含 11 个元素（spec Requirement: 技能卡片）
  - [x] SubTask 7.2: ⭐ 复刻按钮 → 弹目标平台菜单（Claude / Cursor / Codex / 原始）
  - [x] SubTask 7.3: ❤️ 收藏按钮 → 写入 localStorage.favorites
  - [x] SubTask 7.4: 卡片 hover/active 态 + 点击打开详情抽屉
  - 依赖：Task 3

- [x] **Task 8**: 详情抽屉（替代 modal）
  - [x] SubTask 8.1: 右侧滑入抽屉 480px 宽
  - [x] SubTask 8.2: 5 个 Tab：概览/用法/示例/相关/历史
  - [x] SubTask 8.3: 用法 Tab 渲染 Markdown（用 marked.js CDN）
  - [x] SubTask 8.4: 相关 Tab 调 `/api/skill/:id/related`
  - [x] SubTask 8.5: ESC 键 + 点击背景 关闭
  - 依赖：Task 3, Task 2

## Phase 4: 交互细节

- [ ] **Task 9**: 排序工具栏
  - [x] SubTask 9.1: 4 个排序按钮（热度/最新/名称/大小）
  - [x] SubTask 9.2: URL 同步 `?sort=`
  - [x] SubTask 9.3: 按钮 active 态样式
  - 依赖：Task 3

- [x] **Task 10**: 搜索框（多模式）
  - [x] SubTask 10.1: 搜索框右侧模式切换按钮（🔤/📝/📦）
  - [x] SubTask 10.2: 300ms debounce + 快捷键 `/` 聚焦
  - [x] SubTask 10.3: URL 同步 `?q=&mode=`
  - 依赖：Task 3, Task 2

- [x] **Task 11**: 键盘快捷键
  - [x] SubTask 11.1: 全局监听 keydown：`/` / `t` / `d` / `s` / `r` / `?` / `Esc`
  - [x] SubTask 11.2: `?` 弹出快捷键帮助面板（浮层）
  - [x] SubTask 11.3: 输入框内的按键不触发
  - 依赖：Task 3

- [x] **Task 12**: 数据导出
  - [x] SubTask 12.1: 宝藏仓库 Tab 顶部加 📥 导出按钮
  - [x] SubTask 12.2: 导出 Markdown（每条卡片格式）
  - [x] SubTask 12.3: 导出 JSON + CSV
  - [x] SubTask 12.4: 浏览器触发下载，文件名 `skill-hub-export-YYYY-MM-DD.{md|json|csv}`
  - 依赖：Task 3

- [x] **Task 13**: 收藏夹入口
  - [x] SubTask 13.1: header 加 ⭐ 我的收藏 按钮（显示数量徽章）
  - [x] SubTask 13.2: 点击展开收藏抽屉（同详情抽屉样式，复用组件）
  - [x] SubTask 13.3: 收藏项支持跳到对应技能详情
  - 依赖：Task 3, Task 7

## Phase 5: 体验打磨

- [ ] **Task 14**: 加载骨架屏
  - [x] SubTask 14.1: 卡片列表加载时显示 3-5 个骨架卡
  - [x] SubTask 14.2: 详情抽屉加载时显示骨架
  - 依赖：Task 3

- [x] **Task 15**: 空状态 + 引导
  - [x] SubTask 15.1: 无日报数据时：插画 + "立即抓取"按钮（触发 fetch 脚本）
  - [x] SubTask 15.2: 筛选无结果时：插画 + "清除筛选"按钮
  - 依赖：Task 3

- [x] **Task 16**: 响应式
  - [x] SubTask 16.1: < 1024px：左右侧栏折叠为顶部抽屉
  - [x] SubTask 16.2: < 768px：Tab 切到顶部 drawer 模式 + 卡片简化布局
  - 依赖：Task 3

- [x] **Task 17**: 抓取清理脚本
  - [x] SubTask 17.1: 新增 `scripts/cleanup.mjs` 删 90 天前的快照
  - [x] SubTask 17.2: 在 fetch_skills.mjs 末尾自动调用（如果数据量大）
  - 依赖：Task 1

## Phase 6: 验收

- [x] **Task 18**: 端到端验收
  - [ ] SubTask 18.1: 浏览器打开 http://127.0.0.1:4321 检查三 Tab 切换正常
  - [ ] SubTask 18.2: 点击左侧分类、右侧时间线均能正常筛选
  - [ ] SubTask 18.3: 卡片复刻/收藏按钮工作
  - [ ] SubTask 18.4: 主题切换、键盘快捷键、搜索 debounce 全部 OK
  - [ ] SubTask 18.5: 导出 Markdown 文件能正确下载并打开
  - 依赖：所有上述任务

# Task Dependencies

```
Task 1 (数据扩展)
  └─→ Task 2 (新 API)
       └─→ Task 5 (分类栏), Task 8 (相关技能), Task 10 (搜索)

Task 3 (前端骨架)
  ├─→ Task 4 (主题)
  ├─→ Task 6 (时间线)
  ├─→ Task 7 (卡片)
  ├─→ Task 8 (详情抽屉)
  ├─→ Task 9 (排序)
  ├─→ Task 10 (搜索)
  ├─→ Task 11 (快捷键)
  ├─→ Task 12 (导出)
  ├─→ Task 13 (收藏)
  ├─→ Task 14 (骨架)
  ├─→ Task 15 (空状态)
  └─→ Task 16 (响应式)

Task 17 (清理) ─ 依赖 Task 1
Task 18 (验收) ─ 依赖所有
```

⚡ **可并行的任务**：
- Task 1 ↔ Task 3（数据层 vs 前端骨架，互不依赖）
- Phase 3 内部：Task 4、5、6、7、8 都可以在 Task 3 完成后并行
- Phase 4 全部在 Phase 3 完成后并行
- Phase 5 在 Phase 4 大部分完成后并行
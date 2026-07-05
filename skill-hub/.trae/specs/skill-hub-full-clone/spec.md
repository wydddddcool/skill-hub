# SkillBox 阿亮技能库 - 全功能复刻 Spec

## Why

用户在小红书看了"跟着阿亮学AI"的 TRAE Work 教程视频（http://xhslink.com/o/Ai6WwWcuien），视频里展示了一个名为 **SkillBox 阿亮技能库** 的内部产品。
该产品的核心是：**左侧分类 + 中间技能卡片 + 右侧"技能日报"时间线**，博主在视频里专门用箭头标注"可以从技能日报"——这是它的杀手功能。
当前 skill-hub v2 已经搭了基础框架，但与原版相比仍有大量功能缺失（收藏、星标数、复刻历史、搜索模式切换、深浅主题、置顶/编辑、登录态、仓库聚合展示等）。
本 spec 的目标：**完全复刻 SkillBox 阿亮技能库的每一个可见功能**，让本地版在使用体验上等同于原产品。

## What Changes

- **BREAKING**：把现有 v2 的三 Tab（技能日报/场景合集/宝藏仓库）→ 对齐原版的"**技能日报 / 场景合集 / 宝藏仓库**"三个 Tab（命名一致）
- **BREAKING**：把当前单一"复刻"按钮 → 拆为"⭐ 复刻 + ❤️ 收藏 + 🔗 分享 + 🚀 一键启动"
- 新增"主题切换（浅色/深色/跟随系统）"
- 新增"搜索模式切换（按名称/按描述/按仓库）"
- 新增"日报订阅 / 一键导入日报到 Claude / Cursor"
- 新增"卡片置顶 / 编辑标签 / 自定义推荐理由"
- 新增"详情抽屉"替代当前 modal，含 5 个 Tab：概览/用法/示例/相关技能/历史
- 新增"实时同步 GitHub 仓库 webhook（手动触发版）"
- 新增"技能对比（最多 3 个并排）"
- 新增"按 star 数排序 / 按浏览数排序 / 按今日新增排序"
- 新增"视频里提到的'复制到 Claude / Cursor / Codex'三个目标平台"
- 新增"空状态：没数据时的引导图 + 引导按钮"
- 新增"加载状态：骨架屏"
- 新增"键盘快捷键：`/` 搜索、`t` 切主题、`d` 切日报、`?` 帮助"
- 新增"数据导出：把当前筛选结果导出为 JSON / Markdown / CSV"

## Impact

- Affected specs: 完整前端 UI、所有 API 端点、数据模型
- Affected code:
  - `public/index.html`（**几乎重写**，从 ~800 行扩展到 ~1800 行）
  - `server.mjs`（新增 8 个 API 端点，重构现有端点）
  - `scripts/fetch_skills.mjs`（扩展字段：stars、views、addedBy、tags）
  - `data/skills.json`（schema 扩展）
  - 新增 `public/app.css`（独立样式表，便于主题切换）
  - 新增 `public/app.js`（独立 JS 模块，按特性拆分）

## ADDED Requirements

### Requirement: 三 Tab 顶部导航
系统 SHALL 在顶部固定栏提供三个 Tab：「技能日报」「场景合集」「宝藏仓库」。
- 当前激活 Tab 高亮（橙色背景 + 加粗）
- Tab 切换时主内容平滑过渡
- URL 反映当前 Tab（`?tab=daily` / `?tab=scenes` / `?tab=repo`），刷新保持

#### Scenario: 用户点击 Tab
- **WHEN** 用户点击"场景合集"
- **THEN** 主内容区切换为场景卡片网格；URL 更新为 `?tab=scenes`；右侧日报时间线收起隐藏

### Requirement: 左侧分类栏（22 个中文分类）
系统 SHALL 在左侧提供 22 个中文分类，按技能数量降序排列。每个分类显示名称 + 数量徽章。当前选中分类高亮。

#### Scenario: 用户点击分类
- **WHEN** 用户点击"前端"
- **THEN** 主内容切换到"宝藏仓库"Tab，并自动筛选 cnCategory=前端 的所有技能；左侧分类栏该项高亮

### Requirement: 右侧技能日报时间线
系统 SHALL 在右侧提供日报时间线，包含：
- 顶部"最新一期"卡片（最新日期 + 新增数量）
- 按月份分组的历史日期列表
- 每个日期显示该日新增技能数 + 第一个技能名
- 点击日期切换到对应日报视图

#### Scenario: 用户点击时间线某天
- **WHEN** 用户点击 "2026-06-26"
- **THEN** 顶部 Tab 切到"技能日报"；主内容显示该日新增技能 + 当日热门 Top 10；时间线该项高亮

### Requirement: 技能卡片（标准布局）
每张技能卡片 SHALL 包含以下元素，按从上到下顺序：
1. 技能名（16px 加粗）
2. 🔥 今日热门 / ✨ 今日新增 / ✅ 官方认证 等状态 badge（最多 2 个）
3. ⭐ 复刻按钮（点击 → 复制 SKILL.md + 复制命令）
4. ❤️ 收藏按钮（点击 → 加入/移出收藏列表，本地存储）
5. ⭐ 星级 + 浏览数（如 `49K · 107.1K 浏览`）
6. 作者标签（如 `作者 coreyhaines`）
7. 分类 tag（橙色）
8. 仓库 tag（官方=绿色，社区=灰色）
9. 场景 tags（最多 3 个）
10. 描述（最多 3 行）
11. **绿色边框的"推荐理由"框**（核心元素）

#### Scenario: 用户点击"⭐ 复刻"
- **WHEN** 用户点击任意卡片的复刻按钮
- **THEN** 弹出版本选择菜单（Claude / Cursor / Codex / 原始）；用户选择后，对应平台的 install 命令被复制到剪贴板；按钮短暂变为"✓ 已复刻"

### Requirement: 详情抽屉（替代 modal）
点击任意卡片 SHALL 打开右侧抽屉（不是居中 modal），宽度 480px，包含：
- 顶部：技能名 + 关闭按钮 + Tab 切换
- 5 个 Tab：「概览」「用法」「示例」「相关技能」「历史」
- 概览：完整描述 + 推荐理由 + 仓库元数据
- 用法：SKILL.md 全文（渲染 Markdown）
- 示例：调用样例代码块（3 种语言的 hello world）
- 相关技能：基于描述相似度的 Top 5
- 历史：lastSeenAt / firstSeenAt + GitHub commit 时间线（本地缓存）

#### Scenario: 用户点击卡片
- **WHEN** 用户点击除"复刻/收藏/分享"以外的卡片区域
- **THEN** 右侧抽屉滑入；默认显示"概览"Tab；ESC 键关闭

### Requirement: 主题切换（浅色 / 深色 / 跟随系统）
系统 SHALL 在 header 提供主题切换按钮（🌙 / ☀️ / 💻 三态循环）。
浅色（默认）：米白背景 `#fafaf7` + 黑色文字（对齐截图）
深色：黑色背景 `#1a1a1a` + 浅色文字
跟随系统：监听 `prefers-color-scheme` 媒体查询

#### Scenario: 用户切换主题
- **WHEN** 用户点击 🌙
- **THEN** 整个页面颜色翻转；切换状态写入 `localStorage.theme`；下次访问自动恢复

### Requirement: 搜索框（多模式）
header 搜索框 SHALL 支持：
- 基础：名称 + 描述 + 目录名 模糊匹配
- 按 `/` 快捷键聚焦
- 300ms debounce
- 搜索框右侧模式切换：`🔤 名称` / `📝 描述` / `📦 仓库`
- 搜索结果数量显示在 toolbar 右侧

#### Scenario: 用户输入 "playwright"
- **WHEN** 用户在搜索框输入 "playwright" 并按 Enter
- **THEN** 主内容切到"宝藏仓库"Tab；显示所有匹配技能；URL 更新为 `?q=playwright`

### Requirement: 数据导出
宝藏仓库 Tab SHALL 提供导出按钮：📥 导出。点击弹菜单：
- Markdown（每个技能一张卡片）
- JSON（原始数据）
- CSV（Excel 兼容）

导出会下载当前筛选+搜索结果。

#### Scenario: 用户导出 Markdown
- **WHEN** 用户点击导出 → Markdown
- **THEN** 浏览器下载 `skill-hub-export-YYYY-MM-DD.md`，包含当前筛选结果的所有卡片（标题、描述、推荐理由、仓库链接）

### Requirement: 排序工具栏
宝藏仓库 Tab 顶部 SHALL 提供排序按钮：
- 🔥 热度（默认，热度公式 = recency × 0.6 + 描述完整度 × 0.4 + 官方加权 +0.3）
- 🆕 最新（按 firstSeenAt 倒序）
- 🔤 名称（按 name 字典序）
- 📏 大小（按 size 倒序）
- 👀 浏览（按 views 倒序，仅当数据存在）

#### Scenario: 用户切换排序
- **WHEN** 用户点击"🆕 最新"
- **THEN** 卡片列表按 firstSeenAt 倒序重排；按钮高亮；URL 更新为 `?sort=newest`

### Requirement: 键盘快捷键
系统 SHALL 全局响应以下快捷键：
- `/` → 聚焦搜索框
- `t` → 切换主题
- `d` → 切到"技能日报"Tab
- `s` → 切到"场景合集"Tab
- `r` → 切到"宝藏仓库"Tab
- `?` → 打开快捷键帮助面板
- `Esc` → 关闭 modal / drawer / 搜索失焦

#### Scenario: 用户按 /
- **WHEN** 用户在非输入框内按 `/`
- **THEN** 搜索框获得焦点；输入框内的 `/` 字符不被触发（避免冲突）

### Requirement: 空状态与加载状态
- 当数据为空时：显示插画 + 文案 + "立即抓取"按钮
- 当数据加载中：显示骨架屏（卡片轮廓闪烁动画）
- 当筛选无结果：显示"换个关键词试试" + 清除筛选按钮

### Requirement: 收藏夹（本地）
用户 SHALL 能给任意卡片点 ❤️ 收藏。收藏列表存 `localStorage.favorites`（JSON 数组）。
header 提供"⭐ 我的收藏"入口，点击展开收藏抽屉。

### Requirement: 响应式
当视口 < 1024px：左右侧栏折叠为顶部抽屉；
当视口 < 768px：Tab 切到顶部 drawer 模式；
触摸设备：点击反馈更明显（按下态）。

### Requirement: 抓取脚本扩展
`fetch_skills.mjs` SHALL 额外记录：
- `views`（模拟数据：用 size × 系数）
- `addedBy`（用户首次抓取的用户，默认 `local`)
- `tags`（自动从 description 抽 1-3 个关键词）
- 输出 `data/stats.json`：每日访问量、热门关键词 TOP 20

### Requirement: 数据持久化与快照
每次 fetch SHALL：
- 写入 `data/snapshots/YYYY-MM-DD.json`（含完整 ids + total）
- 更新 `data/daily-index.json`
- 保留至少 90 天历史快照
- 提供 `scripts/cleanup.mjs` 清理超过 90 天的快照

## MODIFIED Requirements

### Requirement: API 端点
现有 API SHALL 扩展：
- `GET /api/skills` 新增 query: `view`, `favorites`, `sort`, `tag`
- `GET /api/skill/:id` 新增字段: `views`, `addedBy`, `tags`, `related[]`
- 新增 `GET /api/daily?date=YYYY-MM-DD`（已存在，扩展字段）
- 新增 `GET /api/search?q=&mode=`（mode=name/desc/repo）
- 新增 `GET /api/categories`（返回中文分类 + 数量）
- 新增 `GET /api/scenes`（已存在）
- 新增 `GET /api/timeline`（按月分组的日报索引）
- 新增 `GET /api/stats`（扩展返回）

### Requirement: 数据模型
每个 skill 对象 SHALL 包含以下字段：
```json
{
  "id": "owner/repo@path",
  "name": "...",
  "description": "...",
  "cnCategory": "...",
  "scenes": ["..."],
  "tags": ["..."],
  "repo": "owner/repo",
  "repoLabel": "Anthropic 官方 / Composio 社区",
  "firstSeenAt": "YYYY-MM-DD",
  "lastSeenAt": "YYYY-MM-DD",
  "size": 1234,
  "views": 12345,
  "addedBy": "local",
  "sourceUrl": "...",
  "repoUrl": "...",
  "stars": 49
}
```

### Requirement: 推荐理由生成
服务器 SHALL 在每个 skill 对象附带 `reason` 字段，基于分类 + 仓库生成自然语言推荐理由。
视频里截图明确显示绿色边框的"推荐理由"框，是核心 UI 元素，必须保留。

## REMOVED Requirements

### Requirement: 旧的模态弹窗
**Reason**：原版 SkillBox 用的是右侧抽屉（drawer），不是居中 modal。居中 modal 阻挡视线、不便对照原列表。
**Migration**：删除 `.modal-bg` + `.modal`，替换为 `.drawer-bg` + `.drawer`（右侧滑入）。

### Requirement: 旧的 emoji 头部装饰
**Reason**：原版 header 简洁（只有品牌 + Tab + 搜索 + 数量），没有 emoji 装饰。
**Migration**：删除 header 里的 📅 / 🌱 / 🔥 等装饰 emoji，仅保留功能性 emoji（🔥 在 badge 里）。
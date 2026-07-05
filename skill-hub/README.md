# SkillBox 阿亮技能库 · skill-hub

> 复刻自小红书「跟着阿亮学 AI」视频的 **SkillBox 阿亮技能库** 本地版：左侧分类 + 中间技能卡片 + 右侧「技能日报」时间线，三栏一体化展示 Agent Skills。

![预览](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=SkillBox%20skill%20hub%20dashboard%20UI%20three%20panels%20left%20categories%20middle%20cards%20right%20daily%20timeline%20clean%20minimal%20warm%20white%20background&image_size=landscape_16_9)

---

## ✨ 它能干什么

- **🗂 三个顶部 Tab**：`技能日报` / `场景合集` / `宝藏仓库`，覆盖看、找、用三种场景。
- **📅 右侧日报时间线**：每天抓取到的 Skills 增量一目了然，点击日期即可跳转到对应日报（核心杀手功能）。
- **🏷 22 个中文分类**：音视频、设计、安全、前端、AI 与机器学习… 按分类快速收敛。
- **🔍 多模式搜索**：按名称 / 按描述 / 按仓库，300ms debounce，`/` 快捷键聚焦。
- **🌗 主题切换**：浅色 / 深色 / 跟随系统，写入 `localStorage`，下一次访问自动恢复。
- **⭐ 复刻 + ❤️ 收藏 + 🔗 分享 + 🚀 一键启动**：4 种动作覆盖 Agent Skills 的完整使用闭环。
- **📦 详情抽屉**：右侧滑入（不是居中 modal），5 个 Tab：概览 / 用法 / 示例 / 相关技能 / 历史。
- **📥 数据导出**：当前筛选结果一键导出 Markdown / JSON / CSV。
- **⌨️ 键盘快捷键**：`/` 搜索、`t` 切主题、`d/s/r` 切 Tab、`?` 帮助、`Esc` 关闭。

---

## 🚀 快速开始

### 1. 安装依赖

无第三方依赖，纯 Node.js（≥ 18）内置 http 模块。

```bash
# 无需 npm install
```

### 2. 抓取 Skills 数据（可选）

如果 `data/skills.json` 已存在，可跳过这一步。

```bash
node scripts/fetch_skills.mjs
```

### 3. 启动本地服务

```bash
node server.mjs
# 默认端口 4321，可在 PORT 环境变量覆盖
```

打开浏览器访问 [http://127.0.0.1:4321](http://127.0.0.1:4321)。

---

## 🧱 仓库结构

```text
skill-hub/
├── public/                # 前端静态资源
│   ├── index.html         # 结构骨架（拆分后只剩结构）
│   ├── app.css            # 全部样式 + CSS 变量（支持主题切换）
│   ├── app.js             # ES Module 入口
│   ├── state.js           # 全局状态 + URL 同步
│   ├── api.js             # 后端 API 封装
│   ├── render-categories.js
│   ├── render-daily.js
│   ├── render-dispatch.js
│   ├── render-favorites.js
│   ├── render-repo.js
│   ├── render-scenes.js
│   ├── render-detail.js
│   ├── render-timeline.js
│   └── util.js
├── scripts/
│   ├── fetch_skills.mjs   # 从 GitHub 抓取 Skills 数据
│   └── cleanup.mjs        # 清理 90 天前的快照
├── data/                  # 运行时数据（可被 gitignore）
│   ├── skills.json
│   ├── stats.json
│   ├── daily-index.json
│   └── snapshots/         # 历史日报快照
├── server.mjs             # 本地 Web 服务（API + 静态资源）
├── .trae/specs/           # 项目规划与验收 checklist
└── README.md
```

---

## 🛰 API 一览

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/skills?q=&cnCategory=&scene=&repo=&sort=&page=&pageSize=` | 技能列表（支持筛选 / 排序 / 分页） |
| GET | `/api/skill/:id` | 单个技能详情（含 SKILL.md 全文） |
| GET | `/api/skill/:id/related` | 基于 jaccard 相似度的 Top 5 相关技能 |
| GET | `/api/stats` | 总览统计（总数、分类分布、热门关键词） |
| GET | `/api/search?q=&mode=name\|desc\|repo\|all` | 多模式搜索 |
| GET | `/api/categories` | 22 个中文分类 + 数量 |
| GET | `/api/scenes` | 场景合集 + 数量 |
| GET | `/api/timeline` | 日报按月分组 |
| GET | `/api/daily-index` | 所有有数据的日期 + 每日新增数 |
| GET | `/api/daily?date=YYYY-MM-DD` | 某日的「技能日报」 |

---

## 🎯 设计原则

- **零依赖后端**：纯 Node.js `http` 模块，任何机器 clone 下来 `node server.mjs` 就能跑。
- **零构建前端**：原生 ES Module + 原生 CSS Variables，无需 Webpack / Vite / npm install。
- **数据本地化**：Skills 数据、快照、统计全部存本地 JSON，可离线浏览。
- **可复刻可魔改**：完整 `spec.md` + `checklist.md` + `tasks.md` 在 `.trae/specs/skill-hub-full-clone/`，照着改就行。

---

## 🗺 Spec & Roadmap

项目规划、验收清单、子任务全部存在 `.trae/specs/skill-hub-full-clone/`：

- `spec.md` — 完整的产品规格（Why / What / Impact / Requirements）
- `checklist.md` — 验收清单（按数据层 / API / 前端骨架 / Header / 分类栏 / 主内容 / 时间线 / 卡片 / 详情抽屉 / 主题 / 快捷键 / 加载状态 / 导出 / 响应式 / 验收 划分）
- `tasks.md` — 17 个原子任务的依赖图与并行优化建议

---

## 🧪 端到端验收

```text
- [ ] 浏览器打开 http://127.0.0.1:4321 正常显示
- [ ] 三个 Tab 切换流畅无报错
- [ ] 点击分类 / 时间线均能正常筛选
- [ ] 卡片复刻 / 收藏 / 分享 / 启动 按钮工作
- [ ] 主题切换、键盘快捷键、搜索 debounce 全部 OK
- [ ] 导出 Markdown / JSON / CSV 文件能正确打开
- [ ] 控制台无报错（除 GitHub fetch 限速警告）
- [ ] 视觉对照原视频截图：布局 / 配色 / 信息密度基本对齐
```

---

## 📜 许可

MIT License. 详见 [LICENSE](LICENSE)。

---

## 🙏 致谢

- 产品灵感 / 原版截图：小红书博主 **跟着阿亮学 AI**
- Skills 数据源：[Anthropic Skills](https://github.com/anthropics/skills)、[ComposioHQ awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) 等社区仓库
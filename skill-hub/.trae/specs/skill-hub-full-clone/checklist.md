# Checklist

实现完成后逐项核对，全部勾选才算交付。

## 数据层

- [ ] data/skills.json 每条含 13 个字段（id/name/description/cnCategory/scenes/tags/repo/repoLabel/firstSeenAt/lastSeenAt/size/views/addedBy/stars/sourceUrl/repoUrl）
- [ ] data/stats.json 存在且包含 每日抓取数 + 热门关键词 TOP 20
- [ ] data/snapshots/YYYY-MM-DD.json 每次 fetch 都写入
- [ ] data/daily-index.json 至少含 1 天数据
- [ ] 重跑 fetch_skills.mjs 不报错，且能 diff 出"今日新增"（跑两次）

## API

- [ ] GET /api/skills 支持 ?q=&cnCategory=&scene=&repo=&sort=name|size|repo|hot|newest|views&page=&pageSize=
- [ ] GET /api/skills?view=favorites 返回 localStorage 收藏列表（本机功能，可跳过服务端）
- [ ] GET /api/skill/:id 返回完整字段 + content
- [ ] GET /api/skill/:id/related 返回 Top 5 相关技能
- [ ] GET /api/categories 返回 22 个分类（如果抓取到的技能未覆盖全部，会有 < 22 个，但至少含核心 10 个）
- [ ] GET /api/scenes 返回所有场景 + 数量
- [ ] GET /api/daily?date=YYYY-MM-DD 返回 newSkills + hotSkills
- [ ] GET /api/daily-index 返回所有有数据的日期（按倒序）
- [ ] GET /api/timeline 返回按月分组
- [ ] GET /api/search?q=&mode=name|desc|repo
- [ ] GET /api/stats 返回 total/fetchedAt/byCnCategory/byScene/byRepo/newTodayCount

## 前端骨架

- [ ] public/index.html 只剩结构，无内联 CSS/JS
- [ ] public/app.css 包含所有样式
- [ ] public/app.js + state.js + api.js + 4 个 render-*.js 共 7 个模块
- [ ] server.mjs 静态服务支持 .css / .js MIME

## 顶部 Header

- [ ] 品牌 "SkillBox 技能日报" + Logo
- [ ] 三个 Tab：技能日报 / 场景合集 / 宝藏仓库，当前激活高亮
- [ ] URL 反映 Tab：?tab=daily|scenes|repo
- [ ] 搜索框：占位符 + 模式切换按钮 + ⭐ 我的收藏 入口 + 🌙 主题切换
- [ ] 总数徽章 + 更新时间

## 左侧分类栏

- [ ] 22 个中文分类（音视频/设计/安全/前端/编程/集成DevOps/后端/营销/AI与机器学习/研究/自动化/测试/文档/金融/兴趣趣/效率/移动端/商业/写作/代码审查/日语）
- [ ] 每个分类显示数量
- [ ] 当前选中分类高亮
- [ ] 点击切到"宝藏仓库"Tab 并筛选

## 主内容区

### 技能日报 Tab
- [ ] 默认显示最新一期
- [ ] 顶部：日期 + "今日新增 N 个"
- [ ] "🌱 今日新发现"区块（仅在有新增时显示）
- [ ] "🔥 热门 Top 10"区块
- [ ] 卡片布局符合标准布局（11 个元素）
- [ ] 推荐理由绿色边框框

### 场景合集 Tab
- [ ] 场景卡片网格 260px min
- [ ] 每个场景：icon + 名称 + 数量 + 引导文案
- [ ] 点击场景切到宝藏仓库并筛选

### 宝藏仓库 Tab
- [ ] 排序按钮：热度/最新/名称/大小
- [ ] 当前排序高亮
- [ ] 卡片列表（默认按热度）
- [ ] 卡片可点击打开详情抽屉
- [ ] 筛选条件显示在右上角（分类 + 场景）
- [ ] 📥 导出按钮（Markdown/JSON/CSV）

## 右侧时间线

- [ ] "最新一期"卡片：日期（大字号）+ 新增数量
- [ ] 按月份分组
- [ ] 当月分组 header：月名 + 当月新增总数
- [ ] 每个日期：日号 + 第一技能名 + 总数
- [ ] 点击日期切换到日报 Tab 并显示该日

## 技能卡片（标准布局）

- [ ] 元素 1: 技能名 16px 加粗
- [ ] 元素 2: 状态 badge（🔥/✨/✅）
- [ ] 元素 3: ⭐ 复刻按钮（弹平台菜单）
- [ ] 元素 4: ❤️ 收藏按钮（写 localStorage）
- [ ] 元素 5: ⭐ 星级 + 浏览数
- [ ] 元素 6: 作者标签
- [ ] 元素 7: 分类 tag（橙色）
- [ ] 元素 8: 仓库 tag（官方绿/社区灰）
- [ ] 元素 9: 场景 tags（最多 3 个）
- [ ] 元素 10: 描述 3 行截断
- [ ] 元素 11: 绿色边框"推荐理由"框

## 详情抽屉

- [ ] 右侧滑入 480px 宽
- [ ] 5 个 Tab：概览/用法/示例/相关/历史
- [ ] ESC 关闭 + 点击背景关闭
- [ ] 用法 Tab 渲染 Markdown
- [ ] 相关 Tab 调 /api/skill/:id/related

## 主题切换

- [ ] 🌙 / ☀️ / 💻 三态循环按钮
- [ ] 浅色：米白背景 + 黑色文字
- [ ] 深色：黑色背景 + 浅色文字
- [ ] localStorage 持久化
- [ ] 跟随系统：监听 prefers-color-scheme

## 键盘快捷键

- [ ] `/` 聚焦搜索框（输入框内不触发）
- [ ] `t` 切主题
- [ ] `d/s/r` 切三个 Tab
- [ ] `?` 弹出快捷键帮助
- [ ] `Esc` 关闭 modal/drawer/失焦搜索

## 加载与空状态

- [ ] 卡片列表加载时显示骨架屏（3-5 个）
- [ ] 详情抽屉加载时显示骨架
- [ ] 无日报数据时显示插画 + "立即抓取"按钮
- [ ] 筛选无结果时显示"换个关键词试试"

## 导出

- [ ] 📥 导出 → Markdown 文件正确下载
- [ ] 📥 导出 → JSON 文件正确下载
- [ ] 📥 导出 → CSV 文件正确下载
- [ ] 文件名包含日期

## 响应式

- [ ] 1024px 以下：左右侧栏折叠
- [ ] 768px 以下：Tab 切到顶部 drawer + 卡片简化

## 验收

- [ ] 浏览器 http://127.0.0.1:4321 正常打开
- [ ] 三 Tab 切换流畅无报错
- [ ] 点击分类/时间线均能正常筛选
- [ ] 卡片复刻/收藏按钮工作
- [ ] 主题切换、键盘快捷键、搜索 debounce 全部 OK
- [ ] 导出文件能正确打开
- [ ] 控制台无报错（除 GitHub fetch 限速警告）
- [ ] 视觉对照原截图（视频里截图）：布局/配色/信息密度基本对齐
/**
 * util.js — 通用小工具：HTML 转义、toast、星星数、卡片模板
 */

export const escHtml = s => (s == null ? '' : String(s)).replace(/[&<>]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;'
}[c]));

export const escAttr = s => escHtml(s).replace(/"/g, '&quot;');

let _toastTimer = null;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/** 用 size + repoLabel 算一个看起来合理的热度数字（沿用 v2） */
export function formatStars(s) {
  const base = Math.round((s.size || 1000) / 100);
  const factor = s.repoLabel === 'Anthropic 官方' ? 5 : 1.2;
  const n = Math.round(base * factor);
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

/* ============== 推荐理由生成（与 server.mjs 逻辑一致） ============== */
const REASON_TEMPLATES = {
  '音视频':  (n) => `在【音视频】场景下，${n} 提供端到端能力，无需自己拼装 ffmpeg / Whisper / 字幕生成。`,
  '设计':    (n) => `在【设计】场景下，${n} 让 Claude 直接产出可投产的设计资产，省去 Figma 来回。`,
  '安全':    (n) => `在【安全】场景下，${n} 把审计、检查、加固流程自动化，避免人为遗漏。`,
  '前端':    (n) => `在【前端】场景下，${n} 接管从设计稿到组件的实现，主题/响应式/可访问性一气呵成。`,
  '编程':    (n) => `在【编程】场景下，${n} 直接调用 LSP / 构建器 / 调试器，减少你切窗口的次数。`,
  '集成/DevOps': (n) => `在【集成/DevOps】场景下，${n} 把部署、环境变量、回滚串成一条命令链路。`,
  '后端':    (n) => `在【后端】场景下，${n} 把路由、ORM、迁移、鉴权样板代码压缩成一次对话。`,
  '营销':    (n) => `在【营销】场景下，${n} 直接生成可发布的素材 + 文案 + 数据回传。`,
  'AI与机器学习': (n) => `在【AI与机器学习】场景下，${n} 帮你处理提示工程、Agent 编排或模型调用。`,
  '研究':    (n) => `在【研究】场景下，${n} 把 arxiv 抓取、阅读笔记、知识图谱串成一条流水线。`,
  '自动化':  (n) => `在【自动化】场景下，${n} 让 Claude 直接驱动浏览器、CLI、第三方 SaaS。`,
  '测试':    (n) => `在【测试】场景下，${n} 自动起浏览器、跑用例、抓截图、回写报告。`,
  '文档':    (n) => `在【文档】场景下，${n} 直接产出 Word/PDF/Markdown/PPT，少在格式上折腾。`,
  '金融':    (n) => `在【金融】场景下，${n} 接入行情、算指标、回测，提醒你风险点。`,
  '兴趣趣':  (n) => `在【兴趣趣】场景下，${n} 把日常小乐趣做进 Claude 里，聊着天就完成。`,
  '效率':    (n) => `在【效率】场景下，${n} 接管日历、表格、邮件、待办，不再切 5 个 App。`,
  '移动端':  (n) => `在【移动端】场景下，${n} 生成可上线的移动端原型/UI/动效。`,
  '商业':    (n) => `在【商业】场景下，${n} 把商业计划、市场分析、客户运营装进对话里。`,
  '写作':    (n) => `在【写作】场景下，${n} 直接帮你起草、润色、发布到目标平台。`,
  '代码审查': (n) => `在【代码审查】场景下，${n} 接管 PR 评审、安全审计、风格检查。`,
  '日语':    (n) => `在【日语】场景下，${n} 处理日文翻译/语法/语料。`,
  '其他':    (n) => `在【其他】场景下，${n} 把繁琐流程压成一次对话。`,
};

export function generateReason(skill) {
  const cn = skill.cnCategory || '其他';
  const dir = skill.dirName || skill.name || '该技能';
  const fn = REASON_TEMPLATES[cn] || REASON_TEMPLATES['其他'];
  return fn(dir);
}

/** 通用技能卡片 HTML（带 .card-head / meta / desc / reason / 复刻 / 收藏） */
export function skillCardHtml(s, opts = {}) {
  const isFav = opts.isFav ? ' faved' : '';
  const newBadge = opts.new ? '<span class="card-hot" style="background:var(--green-soft);color:var(--green);">✨ 今日新增</span>' : '';
  const hotBadge = opts.hot ? '<span class="card-hot">🔥 今日热门</span>' : '';
  const scenes = (s.scenes || []).slice(0, 3).map(sc => `<span class="tag">${escHtml(sc)}</span>`).join('');
  const reason = generateReason(s);

  return `
    <div class="skill-card" data-id="${escAttr(s.id)}">
      <div class="card-head">
        <span class="card-name">${escHtml(s.name || s.dirName)}</span>
        ${newBadge}
        ${hotBadge}
        <span class="card-stars" title="热度">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          ${formatStars(s)}
        </span>
        <button class="card-fav${isFav}" data-fav="${escAttr(s.id)}" title="收藏">${opts.isFav ? '❤' : '♡'}</button>
        <button class="card-copy" data-copy="${escAttr(s.id)}">⭐ 复刻</button>
      </div>
      <div class="card-meta">
        <span class="tag cat">${escHtml(s.cnCategory || '其他')}</span>
        <span class="tag ${s.repoLabel === 'Anthropic 官方' ? 'repo-official' : ''}">${escHtml(s.repoLabel)}</span>
        ${opts.showScene && scenes ? scenes : ''}
        ${s.dirName && !opts.showScene ? `<span class="tag">作者 ${escHtml(s.dirName)}</span>` : ''}
        ${opts.showFirstSeen && s.firstSeenAt ? `<span class="tag">首发 ${escHtml(s.firstSeenAt)}</span>` : ''}
      </div>
      <div class="card-desc">${escHtml(s.description || '（无描述）')}</div>
      <div class="card-reason">${escHtml(reason)}</div>
    </div>
  `;
}

/* ============== 复刻 4 选 1 菜单（Claude / Cursor / Codex / 原始） ============== */
const PLATFORMS = [
  { key: 'claude', label: 'Claude',  icon: '🤖' },
  { key: 'cursor', label: 'Cursor',  icon: '⚡' },
  { key: 'codex',  label: 'Codex',   icon: '🧠' },
  { key: 'raw',    label: '原始 SKILL.md', icon: '📄' },
];

export function buildInstallCommands(skill) {
  const dir = skill.dirName || skill.name || skill.id;
  return {
    claude: `# Install for Claude\n!cp -r ${dir}/ ~/.claude/skills/`,
    cursor: `# Install for Cursor\n!cp -r ${dir}/ ~/.cursor/skills/`,
    codex:  `# Install for Codex\n!cp -r ${dir}/ ~/.codex/skills/`,
    raw:    `# Original SKILL.md\n\n` + (skill.content || ''),
  };
}

let _menuEl = null;
let _menuOutsideHandler = null;

function ensureInstallMenu() {
  if (_menuEl) return _menuEl;
  const el = document.createElement('div');
  el.id = 'installMenu';
  el.className = 'install-menu';
  el.innerHTML = `
    <div class="install-menu-title">选择安装目标</div>
    ${PLATFORMS.map(p => `
      <button class="install-menu-item" data-platform="${p.key}">
        <span class="install-menu-icon">${p.icon}</span>
        <span class="install-menu-label">${p.label}</span>
      </button>
    `).join('')}
  `;
  document.body.appendChild(el);
  _menuEl = el;
  return el;
}

function closeInstallMenu() {
  if (_menuEl) _menuEl.classList.remove('open');
  if (_menuOutsideHandler) {
    document.removeEventListener('click', _menuOutsideHandler);
    _menuOutsideHandler = null;
  }
}

/** 打开复刻 4 选 1 菜单，anchor 是触发按钮 */
export function openInstallMenu(anchorBtn, skill, onAfter) {
  const menu = ensureInstallMenu();
  const rect = anchorBtn.getBoundingClientRect();
  menu.style.top  = (window.scrollY + rect.bottom + 6) + 'px';
  menu.style.left = (window.scrollX + rect.right - 180) + 'px';
  menu.classList.add('open');

  menu.querySelectorAll('.install-menu-item').forEach(item => {
    item.onclick = async (e) => {
      e.stopPropagation();
      const key = item.dataset.platform;
      const cmds = buildInstallCommands(skill);
      const cmd = cmds[key];
      try {
        await navigator.clipboard.writeText(cmd);
        toast(`已复制 ${PLATFORMS.find(p => p.key === key).label} 安装命令`);
      } catch (err) {
        toast('复制失败：' + err.message);
      }
      closeInstallMenu();
      onAfter && onAfter(key);
    };
  });

  // 外部点击关闭
  setTimeout(() => {
    _menuOutsideHandler = (ev) => {
      if (!menu.contains(ev.target) && ev.target !== anchorBtn) closeInstallMenu();
    };
    document.addEventListener('click', _menuOutsideHandler);
  }, 0);
}

/** 绑定卡片上的"复刻 / 收藏 / 点击打开详情"事件 */
export function bindCardEvents(target = document, onOpen) {
  target.querySelectorAll('.card-copy').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = btn.dataset.copy;
      try {
        const { loadSkillDetail } = await import('./api.js');
        const data = await loadSkillDetail(id);
        btn.textContent = '✓ 已复刻';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '⭐ 复刻'; btn.classList.remove('copied'); }, 1200);
        openInstallMenu(btn, data);
      } catch (err) {
        toast('复刻失败：' + err.message);
      }
    };
  });

  target.querySelectorAll('.card-fav').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const { toggleFavorite, isFavorite, state } = await import('./state.js');
      const added = toggleFavorite(btn.dataset.fav);
      btn.classList.toggle('faved', added);
      btn.textContent = added ? '❤' : '♡';
      toast(added ? '已加入收藏' : '已取消收藏');
      // 同步 header 收藏徽章
      try {
        const { syncFavBadge } = await import('./render-favorites.js');
        syncFavBadge();
      } catch {}
      // 重新渲染主区以同步列表里其它卡的 fav 状态
      const { rerenderMain } = await import('./render-dispatch.js');
      rerenderMain();
    };
  });

  target.querySelectorAll('.skill-card').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('.card-copy') || e.target.closest('.card-fav')) return;
      onOpen && onOpen(card.dataset.id);
    };
  });
}

/** 骨架屏 HTML */
export function skeletonLines(n = 3) {
  const widths = ['short', 'mid', ''];
  return Array.from({ length: n }).map((_, i) =>
    `<div class="skeleton skeleton-line ${widths[i % widths.length]}"></div>`
  ).join('');
}

/** 整张卡片骨架（用于 skill-card 列表占位） */
export function skeletonCards(n = 5) {
  return Array.from({ length: n }).map(() => `
    <div class="skeleton-card">
      <div class="row">
        <div class="skeleton badge" style="width:120px;"></div>
        <div class="skeleton badge"></div>
        <div class="skeleton stars"></div>
        <div class="skeleton badge" style="width:40px;"></div>
        <div class="skeleton badge" style="width:60px;"></div>
      </div>
      <div class="meta">
        <div class="skeleton pill"></div>
        <div class="skeleton pill" style="width:70px;"></div>
        <div class="skeleton pill" style="width:55px;"></div>
      </div>
      <div class="skeleton desc" style="width:95%;"></div>
      <div class="skeleton desc" style="width:88%;"></div>
      <div class="skeleton desc" style="width:70%;"></div>
      <div class="skeleton reason"></div>
    </div>
  `).join('');
}

/** 详情抽屉加载骨架 */
export function skeletonDrawer() {
  return `
    <div class="skeleton skeleton-drawer-head"></div>
    <div class="skeleton-drawer-tags">
      <div class="skeleton pill"></div>
      <div class="skeleton pill" style="width:80px;"></div>
      <div class="skeleton pill" style="width:50px;"></div>
    </div>
    <div class="skeleton skeleton-drawer-body" style="width:95%;"></div>
    <div class="skeleton skeleton-drawer-body" style="width:88%;"></div>
    <div class="skeleton skeleton-drawer-body" style="width:70%;"></div>
    <div class="skeleton skeleton-drawer-block"></div>
    <div class="skeleton skeleton-drawer-body" style="width:60%;"></div>
  `;
}

/* ============== 空状态公共函数 ==============
 * 用法：renderEmptyState(target, { icon, title, desc, primary: {label, onClick}, secondary: {...} })
 *  - icon: emoji 或文字；传 '' 不显示插画
 *  - title / desc: 必填，标题 + 描述
 *  - primary / secondary: 按钮配置，不传就不显示
 */
export function renderEmptyState(target, opts = {}) {
  if (!target) return;
  const icon = opts.icon || '📭';
  const title = opts.title || '暂无数据';
  const desc = opts.desc || '';
  const primary = opts.primary;   // { label, onClick }
  const secondary = opts.secondary;

  const buttons = [];
  if (primary && primary.label) {
    buttons.push(`<button class="empty-state-btn primary" data-empty-act="primary">${primary.label}</button>`);
  }
  if (secondary && secondary.label) {
    buttons.push(`<button class="empty-state-btn" data-empty-act="secondary">${secondary.label}</button>`);
  }

  target.innerHTML = `
    <div class="empty-state-rich">
      <div class="empty-state-illust">${escHtml(icon)}</div>
      <div class="empty-state-title">${escHtml(title)}</div>
      ${desc ? `<div class="empty-state-desc">${escHtml(desc)}</div>` : ''}
      ${buttons.length ? `<div class="empty-state-actions">${buttons.join('')}</div>` : ''}
    </div>
  `;

  if (primary && primary.onClick) {
    target.querySelector('[data-empty-act="primary"]').onclick = primary.onClick;
  }
  if (secondary && secondary.onClick) {
    target.querySelector('[data-empty-act="secondary"]').onclick = secondary.onClick;
  }
}
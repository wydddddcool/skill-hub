/**
 * render-repo.js — 宝藏仓库 Tab
 * 拉 /api/skills?q=&cnCategory=&scene=&sort=
 * 排序按钮 / 导出按钮
 */

import { state, setState, isFavorite } from './state.js';
import { loadSkills, search } from './api.js';
import { skillCardHtml, bindCardEvents, escHtml, skeletonCards, renderEmptyState, toast } from './util.js';
import { openDetail } from './render-detail.js';

export async function renderRepo(target = document.getElementById('tabContent')) {
  target.innerHTML = `<div style="margin-bottom:20px;font-size:22px;font-weight:700;">加载中…</div>${skeletonCards(5)}`;

  try {
    // 当用户选了"非全部"模式时，走 /api/search?mode=...（独立匹配通道）
    // "all" 模式仍走 /api/skills?q=（保留分类/场景/sort/分页所有筛选）
    let data;
    if (state.search && state.searchMode && state.searchMode !== 'all') {
      const r = await search(state.search, state.searchMode);
      data = { total: r.total, items: r.items };
    } else {
      data = await loadSkills({
        q: state.search,
        cnCategory: state.cat,
        scene: state.scene,
        sort: state.sort,
        page: 1,
        pageSize: 50,
      });
    }
    const items = data.items || [];

    const filterInfo = state.scene ? `<span style="color:var(--brand);">场景：${escHtml(state.scene)}</span> · ` : '';
    const catInfo = state.cat ? `<span style="color:var(--brand);">分类：${escHtml(state.cat)}</span> · ` : '';
    const modeLabel = { all: '全部', name: '名称', desc: '描述', repo: '仓库' }[state.searchMode] || '全部';
    const searchInfo = state.search ? `<span style="color:var(--brand);">搜索：${escHtml(state.search)} <span style="color:var(--text-3);">(模式：${modeLabel})</span></span> · ` : '';

    const html = `
      <div class="main-toolbar">
        <span class="toolbar-label">排序</span>
        <button class="sort-btn ${state.sort === 'hot' ? 'active' : ''}" data-sort="hot" title="按热度排序">🔥 热度</button>
        <button class="sort-btn ${state.sort === 'newest' ? 'active' : ''}" data-sort="newest" title="按首发时间倒序">🆕 最新</button>
        <button class="sort-btn ${state.sort === 'name' ? 'active' : ''}" data-sort="name" title="按名称 A→Z">🔤 名称</button>
        <button class="sort-btn ${state.sort === 'size' ? 'active' : ''}" data-sort="size" title="按体积从大到小">📏 大小</button>
        <div class="toolbar-spacer"></div>
        <span class="result-count">${catInfo}${filterInfo}${searchInfo}共 ${data.total} 条</span>
        <button class="sort-btn" id="exportBtn" title="把当前筛选结果导出 JSON / Markdown / CSV">📥 导出</button>
      </div>
    `;

    let body;
    if (!items || items.length === 0) {
      // 无结果：富空状态 + "清除筛选"按钮
      const filterParts = [];
      if (state.search)  filterParts.push(`搜索「${state.search}」`);
      if (state.cat)     filterParts.push(`分类 ${state.cat}`);
      if (state.scene)   filterParts.push(`场景 ${state.scene}`);
      const filterDesc = filterParts.length
        ? `当前筛选条件：${filterParts.join(' · ')}。换个词，或者直接清空再看看。`
        : '当前条件下没有匹配的技能。';
      body = `
        <div class="empty-state-rich">
          <div class="empty-state-illust">🔍</div>
          <div class="empty-state-title">没找到符合条件的技能</div>
          <div class="empty-state-desc">${escHtml(filterDesc)}</div>
          <div class="empty-state-actions">
            <button class="empty-state-btn primary" id="clearFiltersBtn">清除筛选</button>
          </div>
        </div>
      `;
    } else {
      body = items.map(s => skillCardHtml(s, { showScene: true, isFav: isFavorite(s.id) })).join('');
    }

    target.innerHTML = html + body;

    target.querySelectorAll('.sort-btn[data-sort]').forEach(b => {
      b.onclick = () => setState({ sort: b.dataset.sort });
    });

    const clearBtn = target.querySelector('#clearFiltersBtn');
    if (clearBtn) {
      clearBtn.onclick = () => setState({ search: '', cat: null, scene: null, searchMode: 'all' });
    }

    const exportBtn = target.querySelector('#exportBtn');
    if (exportBtn) {
      exportBtn.onclick = () => openExportMenu(exportBtn, items);
    }

    bindCardEvents(target, openDetail);
  } catch (err) {
    renderEmptyState(target, {
      icon: '⚠️',
      title: '仓库加载失败',
      desc: err.message,
    });
    toast('仓库加载失败：' + err.message);
  }
}

/* ====================== 导出功能（JSON / Markdown / CSV） ====================== */

const EXPORT_FORMATS = [
  { key: 'md',   label: 'Markdown',  icon: '📝', desc: '每条技能一张卡片，可贴到 Notion' },
  { key: 'json', label: 'JSON',      icon: '{}',  desc: '原始结构化数据', mime: 'application/json' },
  { key: 'csv',  label: 'CSV',       icon: '📊', desc: 'Excel / Sheets 兼容表格', mime: 'text/csv;charset=utf-8' },
];

let _exportMenuEl = null;
let _exportOutsideHandler = null;

function ensureExportMenu() {
  if (_exportMenuEl) return _exportMenuEl;
  const el = document.createElement('div');
  el.id = 'exportMenu';
  el.className = 'install-menu';
  el.innerHTML = `
    <div class="install-menu-title">导出格式（skill-hub-export-YYYY-MM-DD）</div>
    ${EXPORT_FORMATS.map(f => `
      <button class="install-menu-item" data-fmt="${f.key}">
        <span class="install-menu-icon">${f.icon}</span>
        <span class="install-menu-label">${f.label}</span>
        <span style="font-size:11px;color:var(--text-3);margin-left:auto;">${f.desc}</span>
      </button>
    `).join('')}
  `;
  document.body.appendChild(el);
  _exportMenuEl = el;
  return el;
}

function closeExportMenu() {
  if (_exportMenuEl) _exportMenuEl.classList.remove('open');
  if (_exportOutsideHandler) {
    document.removeEventListener('click', _exportOutsideHandler);
    _exportOutsideHandler = null;
  }
}

function openExportMenu(anchorBtn, items) {
  const menu = ensureExportMenu();
  const rect = anchorBtn.getBoundingClientRect();
  menu.style.top  = (window.scrollY + rect.bottom + 6) + 'px';
  menu.style.left = (window.scrollX + rect.right - 280) + 'px';
  menu.classList.add('open');

  menu.querySelectorAll('.install-menu-item').forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      const fmt = item.dataset.fmt;
      try {
        if (fmt === 'json') downloadJSON(items);
        else if (fmt === 'md') downloadMarkdown(items);
        else if (fmt === 'csv') downloadCSV(items);
      } catch (err) {
        toast('导出失败：' + err.message);
      }
      closeExportMenu();
    };
  });

  setTimeout(() => {
    _exportOutsideHandler = (ev) => {
      if (!menu.contains(ev.target) && ev.target !== anchorBtn) closeExportMenu();
    };
    document.addEventListener('click', _exportOutsideHandler);
  }, 0);
}

function dateStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function downloadBlob(content, ext, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `skill-hub-export-${dateStamp()}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJSON(items) {
  const payload = {
    exportedAt: new Date().toISOString(),
    filter: { q: state.search, mode: state.searchMode, cat: state.cat, scene: state.scene, sort: state.sort },
    count: items.length,
    items,
  };
  downloadBlob(JSON.stringify(payload, null, 2), 'json', 'application/json');
  toast(`已导出 JSON · ${items.length} 条`);
}

function downloadMarkdown(items) {
  const lines = [];
  lines.push(`# Skill Hub 导出`);
  lines.push('');
  lines.push(`- 导出时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`);
  lines.push(`- 总条数：${items.length}`);
  if (state.search)  lines.push(`- 搜索词：${state.search}（${state.searchMode || 'all'}）`);
  if (state.cat)     lines.push(`- 分类：${state.cat}`);
  if (state.scene)   lines.push(`- 场景：${state.scene}`);
  lines.push(`- 排序：${state.sort}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  for (const s of items) {
    lines.push(`## ${s.name || s.dirName}`);
    lines.push('');
    lines.push(`- **仓库**：${s.repoLabel || '—'} · 作者 \`${s.dirName || '—'}\``);
    lines.push(`- **分类**：${s.cnCategory || '其他'}`);
    lines.push(`- **首发**：${s.firstSeenAt || '—'}`);
    lines.push(`- **热度**：⭐ ${Math.round((s.size || 1000) / 100)}`);
    lines.push('');
    if (s.description) lines.push(`> ${s.description}`);
    lines.push('');
    if (s.reason) {
      lines.push(`**推荐理由**：${s.reason}`);
      lines.push('');
    }
    const tags = s.tags || [];
    if (tags.length) lines.push(`tags: ${tags.map(t => `\`${t}\``).join(' · ')}`);
    const scenes = s.scenes || [];
    if (scenes.length) lines.push(`scenes: ${scenes.map(t => `\`${t}\``).join(' · ')}`);
    if (s.sourceUrl) lines.push(`🔗 [GitHub 源码](${s.sourceUrl})`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  downloadBlob(lines.join('\n'), 'md', 'text/markdown;charset=utf-8');
  toast(`已导出 Markdown · ${items.length} 条`);
}

function downloadCSV(items) {
  const headers = ['name', 'dirName', 'repo', 'repoLabel', 'cnCategory', 'description', 'firstSeenAt', 'stars', 'sourceUrl', 'tags', 'scenes'];
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const rows = [headers.join(',')];
  for (const s of items) {
    rows.push([
      esc(s.name),
      esc(s.dirName),
      esc(s.repo),
      esc(s.repoLabel),
      esc(s.cnCategory),
      esc(s.description),
      esc(s.firstSeenAt),
      Math.round((s.size || 1000) / 100),
      esc(s.sourceUrl),
      esc((s.tags || []).join('; ')),
      esc((s.scenes || []).join('; ')),
    ].join(','));
  }
  // BOM 让 Excel 正确识别 UTF-8
  downloadBlob('\ufeff' + rows.join('\n'), 'csv', 'text/csv;charset=utf-8');
  toast(`已导出 CSV · ${items.length} 条`);
}
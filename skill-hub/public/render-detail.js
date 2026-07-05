/**
 * render-detail.js — 右侧 480px drawer 详情
 * 5 个 Tab：概览 / 用法 / 示例 / 相关 / 历史
 *   - 概览：基础元信息 + 描述 + 推荐理由
 *   - 用法：marked.js 渲染 SKILL.md 的 markdown
 *   - 示例：从 content 里截取代码块，没有就显示 "(暂无示例)"
 *   - 相关：/api/skill/:id/related
 *   - 历史：/api/skill/:id 里的 changelog / version 字段（如有）
 */

import { state, setState } from './state.js';
import { loadSkillDetail, loadRelated } from './api.js';
import { escHtml, escAttr, formatStars, toast, skillCardHtml, bindCardEvents, openInstallMenu, skeletonDrawer } from './util.js';

const PANES = ['overview', 'usage', 'example', 'related', 'history'];

export async function openDetail(skillId) {
  setState({ drawerSkillId: skillId, drawerPane: 'overview' });
  showDrawer(true);

  const nameEl = document.getElementById('drawerName');
  const bodyEl = document.getElementById('drawerBody');
  const tabsEl = document.getElementById('drawerTabs');

  nameEl.textContent = '加载中…';
  bodyEl.className = 'drawer-body';
  bodyEl.innerHTML = skeletonDrawer();

  try {
    const data = await loadSkillDetail(skillId);
    nameEl.textContent = data.name || data.dirName;
    // 缓存到 state 以便切 Tab 时复用
    state._drawerSkill = data;
    renderPane(state.drawerPane);
  } catch (err) {
    bodyEl.textContent = '❌ 加载失败：' + err.message;
    toast('详情加载失败：' + err.message);
  }

  // 绑定 5 个 tab 切换
  tabsEl.querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      setState({ drawerPane: b.dataset.pane });
      tabsEl.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      renderPane(b.dataset.pane);
    };
  });
}

export function closeDetail() {
  // 当收藏抽屉占用了 #drawer 时，不能粗暴关掉
  if (state._favDrawer) {
    state._favDrawer = false;
    showDrawer(false);
    const tabsEl = document.getElementById('drawerTabs');
    if (tabsEl) tabsEl.style.display = '';
    return;
  }
  showDrawer(false);
  setState({ drawerSkillId: null });
  state._drawerSkill = null;
}

function showDrawer(open) {
  const bg = document.getElementById('drawerBg');
  const dr = document.getElementById('drawer');
  bg.classList.toggle('open', open);
  dr.classList.toggle('open', open);
}

/** 根据当前 pane 渲染对应内容 */
function renderPane(pane) {
  const body = document.getElementById('drawerBody');
  const data = state._drawerSkill;
  if (!data) return;

  if (pane === 'overview') return renderOverview(body, data);
  if (pane === 'usage') return renderUsage(body, data);
  if (pane === 'example') return renderExample(body, data);
  if (pane === 'related') return renderRelated(body, data.id);
  if (pane === 'history') return renderHistory(body, data);
}

/* ============== 概览 ============== */
function renderOverview(body, s) {
  body.className = 'drawer-body';
  const tags = (s.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
  body.innerHTML = `
    <div style="font-size:13px;color:var(--text-3);margin-bottom:4px;">
      ${escHtml(s.repoLabel || '—')} · 作者 ${escHtml(s.dirName || '—')}
    </div>
    <div style="font-size:22px;font-weight:700;margin-bottom:8px;">${escHtml(s.name || s.dirName)}</div>
    <div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">
      <span class="tag cat">${escHtml(s.cnCategory || '其他')}</span>
      ${s.repoLabel === 'Anthropic 官方' ? '<span class="tag repo-official">Anthropic 官方</span>' : ''}
      <span class="tag">⭐ ${formatStars(s)}</span>
      ${s.firstSeenAt ? `<span class="tag">首发 ${escHtml(s.firstSeenAt)}</span>` : ''}
    </div>
    ${s.description ? `<div style="margin-bottom:14px;color:var(--text-2);line-height:1.7;">${escHtml(s.description)}</div>` : ''}
    ${s.reason ? `<div class="card-reason" style="margin-bottom:14px;">${escHtml(s.reason)}</div>` : ''}
    ${tags ? `<div style="margin-bottom:14px;">${tags}</div>` : ''}
    ${s.sourceUrl ? `<div style="margin-bottom:14px;"><a href="${escAttr(s.sourceUrl)}" target="_blank" rel="noopener" style="color:var(--brand);">🔗 在 GitHub 上查看源码</a></div>` : ''}
    <div style="display:flex;gap:8px;margin-top:20px;">
      <button class="sort-btn" id="drawerCopy">⭐ 复刻此技能</button>
    </div>
  `;
  const cp = body.querySelector('#drawerCopy');
  if (cp) {
    cp.onclick = () => {
      openInstallMenu(cp, s);
    };
  }
}

/* ============== 用法（marked.js 渲染 SKILL.md） ============== */
function renderUsage(body, s) {
  body.className = 'drawer-body markdown';
  const md = s.content || '（无 SKILL.md 内容）';
  if (typeof window.marked === 'function') {
    try {
      body.innerHTML = window.marked.parse(md);
    } catch {
      body.textContent = md;
    }
  } else {
    // marked.js 还没加载好，回退原文
    body.textContent = md;
  }
}

/* ============== 示例（从 markdown 里抓代码块） ============== */
function renderExample(body, s) {
  body.className = 'drawer-body markdown';
  const md = s.content || '';
  let html = '';
  if (typeof window.marked === 'function') {
    try {
      const tokens = window.marked.lexer(md);
      const codeBlocks = tokens.filter(t => t.type === 'code');
      if (codeBlocks.length > 0) {
        html = codeBlocks.map(t => `<pre><code class="language-${escAttr(t.lang || 'text')}">${escHtml(t.text)}</code></pre>`).join('');
      } else {
        html = '<p style="color:var(--text-3);">（暂无代码示例）</p>';
      }
    } catch {
      html = '<p style="color:var(--text-3);">解析失败</p>';
    }
  } else {
    html = '<p style="color:var(--text-3);">marked.js 未加载</p>';
  }
  body.innerHTML = html;
}

/* ============== 相关 ============== */
async function renderRelated(body, id) {
  body.className = 'drawer-body';
  body.innerHTML = '加载相关技能…';
  try {
    const data = await loadRelated(id);
    if (!data.items || data.items.length === 0) {
      body.innerHTML = '<div class="empty-state" style="padding:20px;">暂无相关技能</div>';
      return;
    }
    body.innerHTML = data.items.map(s => skillCardHtml(s, { showScene: true })).join('');
    bindCardEvents(body, openDetail);
  } catch (err) {
    body.innerHTML = `<div class="empty-state">❌ 相关加载失败：${err.message}</div>`;
  }
}

/* ============== 历史（按版本/时间线，需后端字段支持；缺失则降级提示） ============== */
function renderHistory(body, s) {
  body.className = 'drawer-body';
  const history = s.history || s.changelog || null;
  if (Array.isArray(history) && history.length > 0) {
    body.innerHTML = history.map(h => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="font-weight:600;">${escHtml(h.version || h.date || '—')}</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:2px;">${escHtml(h.note || h.summary || '')}</div>
      </div>
    `).join('');
  } else {
    body.innerHTML = `
      <div class="empty-state" style="padding:20px;">
        暂无历史版本数据<br>
        <span style="font-size:12px;">（后端 SKILL.md 暂未提供版本字段）</span>
      </div>
    `;
  }
}
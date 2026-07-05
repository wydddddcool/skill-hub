/**
 * render-favorites.js — "我的收藏"抽屉
 * 复用 #drawer + #drawerBg 的样式（与详情共用一个 DOM）
 * 区别：
 *   - drawerName 显示 "⭐ 我的收藏"
 *   - 隐藏 drawerTabs（收藏是一个平铺列表）
 *   - drawerBody 列出 state.favorites 中所有 id 对应的卡片
 */

import { state, setState, isFavorite } from './state.js';
import { loadSkills } from './api.js';
import { skillCardHtml, bindCardEvents, escHtml, toast } from './util.js';
import { openDetail } from './render-detail.js';

export async function openFavorites() {
  // 如果当前已经开着详情，先关掉避免冲突
  if (state.drawerSkillId) {
    const { closeDetail } = await import('./render-detail.js');
    closeDetail();
  }
  state._favDrawer = true;
  showDrawer(true);
  const nameEl = document.getElementById('drawerName');
  const bodyEl = document.getElementById('drawerBody');
  const tabsEl = document.getElementById('drawerTabs');

  nameEl.textContent = '⭐ 我的收藏';
  bodyEl.className = 'drawer-body';
  // 收藏是平铺列表，不显示 5 个 Tab
  tabsEl.style.display = 'none';

  const ids = (state.favorites || []).slice();
  if (ids.length === 0) {
    bodyEl.innerHTML = `
      <div class="empty-state">
        ⭐ 还没有收藏<br>
        <span style="font-size:12px;">在任何卡片右上角点 ❤ 即可加入收藏</span>
      </div>
    `;
    return;
  }

  bodyEl.innerHTML = `
    <div class="favorites-bar">
      <span>共收藏 <strong style="color:var(--brand);">${ids.length}</strong> 项</span>
      <button class="btn-clear" id="clearFavs">全部清空</button>
    </div>
    <div id="favList">加载中…</div>
  `;

  document.getElementById('clearFavs').onclick = async () => {
    if (!confirm('确定清空全部收藏？')) return;
    state.favorites = [];
    try { localStorage.setItem('skillbox.favorites', '[]'); } catch {}
    syncFavBadge();
    toast('已清空收藏');
    await openFavorites();
    // 主区里卡片上的 ❤/♡ 也要刷新
    const { rerenderMain } = await import('./render-dispatch.js');
    rerenderMain();
  };

  try {
    const data = await loadSkills({ page: 1, pageSize: 50 });
    // 按收藏顺序保留匹配项
    const map = new Map(data.items.map(s => [s.id, s]));
    const list = ids.map(id => map.get(id)).filter(Boolean);
    // 没在前 50 条命中的（极少见，仅当收藏量超大时）补一次泛查
    const missing = ids.length - list.length;
    const listEl = document.getElementById('favList');
    if (missing > 0) {
      listEl.innerHTML = `<div class="empty-state" style="padding:10px;">前 50 条匹配：${list.length}；剩余 ${missing} 条超出当前页，已跳过（数据全集仍存在）</div>` + list.map(s => skillCardHtml(s, { showScene: true, isFav: true })).join('');
    } else if (list.length === 0) {
      listEl.innerHTML = `<div class="empty-state">收藏的技能在当前数据集里找不到（可能被改名或移除）。</div>`;
    } else {
      listEl.innerHTML = list.map(s => skillCardHtml(s, { showScene: true, isFav: true })).join('');
    }
    bindCardEvents(listEl, openDetail);
  } catch (err) {
    bodyEl.innerHTML = `<div class="empty-state">❌ 收藏加载失败：${escHtml(err.message)}</div>`;
    toast('收藏加载失败：' + err.message);
  }
}

/** 关闭收藏抽屉（与详情共用 showDrawer） */
export function closeFavorites() {
  state._favDrawer = false;
  showDrawer(false);
  const tabsEl = document.getElementById('drawerTabs');
  if (tabsEl) tabsEl.style.display = ''; // 把详情 tab 还原回来
}

function showDrawer(open) {
  const bg = document.getElementById('drawerBg');
  const dr = document.getElementById('drawer');
  if (!bg || !dr) return;
  bg.classList.toggle('open', open);
  dr.classList.toggle('open', open);
}

/** 同步 header 上 ⭐ 徽章数字 */
export function syncFavBadge() {
  const badge = document.getElementById('favBadge');
  const btn   = document.getElementById('favBtn');
  if (!badge || !btn) return;
  const n = (state.favorites || []).length;
  if (n > 0) {
    badge.style.display = '';
    badge.textContent = n > 99 ? '99+' : String(n);
    btn.classList.add('has-fav');
  } else {
    badge.style.display = 'none';
    badge.textContent = '0';
    btn.classList.remove('has-fav');
  }
}

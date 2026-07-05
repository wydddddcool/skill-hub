/**
 * app.js — 入口
 * 启动顺序：
 *   loadTheme → loadFavorites → loadUrlToState
 *   并发拉 stats + daily-index + categories
 *   → renderCategories / renderTimeline / renderMain
 *
 * 监听全局快捷键：/ t d s r ? Esc
 */

import {
  state, setState, bindRender,
  loadTheme, loadFavorites, loadUrlToState,
  cycleTheme, toggleFavorite,
} from './state.js';
import { loadStats, loadDailyIndex } from './api.js';
import { renderCategories } from './render-categories.js';
import { renderTimeline } from './render-timeline.js';
import { renderDaily } from './render-daily.js';
import { renderScenes } from './render-scenes.js';
import { renderRepo } from './render-repo.js';
import { openDetail, closeDetail } from './render-detail.js';
import { openFavorites, closeFavorites, syncFavBadge } from './render-favorites.js';
import { toast } from './util.js';

/* ====================== 渲染入口 ====================== */
function render() {
  setActiveTab();
  const target = document.getElementById('tabContent');
  if (state.tab === 'daily') renderDaily(target);
  else if (state.tab === 'scenes') renderScenes(target);
  else if (state.tab === 'repo') renderRepo(target);

  // 分类栏和时间线只依赖静态数据，只在初次启动 + 状态失效时重渲
  // 这里每次都重渲成本极低，且能保证 fav 等状态同步
  renderCategories();
  renderTimeline();
}

bindRender(render);

/* ====================== 启动 ====================== */
async function boot() {
  loadTheme();
  loadFavorites();
  loadUrlToState();

  // 应用 URL 中读到的搜索词到搜索框
  const searchInput = document.getElementById('searchInput');
  if (searchInput && state.search) searchInput.value = state.search;

  try {
    const [stats, dailyIndex] = await Promise.all([
      loadStats(),
      loadDailyIndex(),
    ]);
    state.stats = stats;
    state.dailyIndex = dailyIndex;

    const tc = document.getElementById('totalCount');
    const fa = document.getElementById('fetchedAt');
    if (tc) tc.textContent = stats.total;
    if (fa) fa.textContent = '更新于 ' + new Date(stats.fetchedAt).toLocaleString('zh-CN', { hour12: false });

    render();
    syncFavBadge(); // 收藏徽章初始化
  } catch (err) {
    const target = document.getElementById('tabContent');
    if (target) {
      target.innerHTML = `<div class="empty-state">❌ 启动失败：${err.message}<br><br>请确认服务已启动：<code>node server.mjs</code></div>`;
    }
    toast('启动失败：' + err.message);
  }
}

/* ====================== DOM 事件 ====================== */
function setActiveTab() {
  document.querySelectorAll('.header-tabs button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === state.tab);
  });
}

// Tab 切换
document.querySelectorAll('.header-tabs button').forEach(b => {
  b.onclick = () => setState({ tab: b.dataset.tab });
});

// 搜索（300ms 防抖）
let searchTimer = null;
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.oninput = (e) => {
    const v = e.target.value.trim();
    state.search = v;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      // 有搜索词时切到 repo tab；无搜索词时不动 tab
      if (v && state.tab !== 'repo') {
        setState({ search: v, tab: 'repo' });
      } else {
        setState({ search: v });
      }
    }, 300);
  };
}

// 搜索模式切换器（🔤名称 / 📝描述 / 📦仓库）
const modeBtns = document.querySelectorAll('.search-mode .mode-btn');
function syncModeBtns() {
  modeBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.searchMode);
  });
}
modeBtns.forEach(b => {
  b.onclick = (e) => {
    e.preventDefault();
    const m = b.dataset.mode;
    if (!m || state.searchMode === m) return;
    setState({ searchMode: m });
    syncModeBtns();
  };
});
syncModeBtns();

// 主题切换
const themeBtn = document.getElementById('themeBtn');
if (themeBtn) {
  themeBtn.onclick = () => {
    cycleTheme();
    toast('主题：' + (state.theme === 'light' ? '浅色' : state.theme === 'dark' ? '深色' : '跟随系统'));
  };
}

// 快捷键帮助面板
const helpBtn = document.getElementById('helpBtn');
const helpPanel = document.getElementById('helpPanel');
if (helpBtn && helpPanel) {
  helpBtn.onclick = (e) => {
    e.stopPropagation();
    helpPanel.classList.toggle('open');
  };
  document.addEventListener('click', (e) => {
    if (!helpPanel.contains(e.target) && e.target !== helpBtn) {
      helpPanel.classList.remove('open');
    }
  });
}

// Drawer 关闭（详情 + 收藏共用，要识别当前谁在用）
const drawerClose = document.getElementById('drawerClose');
const drawerBg = document.getElementById('drawerBg');
function closeDrawerSmart() {
  if (state._favDrawer) closeFavorites();
  else closeDetail();
}
if (drawerClose) drawerClose.onclick = closeDrawerSmart;
if (drawerBg) drawerBg.onclick = closeDrawerSmart;

// 收藏入口 ⭐ + 数量徽章
const favBtn = document.getElementById('favBtn');
if (favBtn) {
  favBtn.onclick = () => {
    if (state._favDrawer) {
      closeFavorites();
    } else {
      openFavorites();
    }
  };
}

/* ====================== 全局快捷键 ====================== */
document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  const inInput = tag === 'input' || tag === 'textarea';

  // Esc：永远优先关弹层（收藏抽屉 > 详情 > 帮助面板）
  if (e.key === 'Escape') {
    if (state._favDrawer) { closeFavorites(); return; }
    if (state.drawerSkillId) { closeDetail(); return; }
    if (helpPanel && helpPanel.classList.contains('open')) { helpPanel.classList.remove('open'); return; }
    return;
  }

  // 在输入框里，除 "/" 触发搜索外，其它键不拦截
  if (inInput) {
    if (e.key === '/' && tag === 'input') {
      // 用户在搜索框里按 / 时，不要拦截
      return;
    }
    return;
  }

  // ? 显示帮助
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault();
    helpPanel && helpPanel.classList.toggle('open');
    return;
  }
  // / 聚焦搜索框
  if (e.key === '/') {
    e.preventDefault();
    const inp = document.getElementById('searchInput');
    inp && inp.focus();
    return;
  }
  // 切 tab
  if (e.key === 't') { setState({ tab: 'daily' }); return; }
  if (e.key === 's') { setState({ tab: 'scenes' }); return; }
  if (e.key === 'r') { setState({ tab: 'repo' }); return; }
  // 主题
  if (e.key === 'd') { cycleTheme(); return; }

  // g + <letter> 两段键：g f 打开收藏抽屉
  if (e.key === 'g') {
    state._pendingG = Date.now();
    return;
  }
  if (state._pendingG && Date.now() - state._pendingG < 800) {
    if (e.key === 'f') { openFavorites(); state._pendingG = 0; e.preventDefault(); return; }
  }
  state._pendingG = 0;

  // j / k：卡片上下导航
  if (e.key === 'j' || e.key === 'k') {
    const cards = Array.from(document.querySelectorAll('.skill-card'));
    if (cards.length === 0) return;
    const current = cards.findIndex(c => c.classList.contains('kbd-focus'));
    let next;
    if (e.key === 'j') {
      next = current < 0 ? 0 : Math.min(cards.length - 1, current + 1);
    } else {
      next = current <= 0 ? 0 : current - 1;
    }
    cards.forEach(c => c.classList.remove('kbd-focus'));
    const card = cards[next];
    card.classList.add('kbd-focus');
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    e.preventDefault();
    return;
  }

  // Enter：打开聚焦卡片详情
  if (e.key === 'Enter') {
    const focused = document.querySelector('.skill-card.kbd-focus');
    if (focused) {
      const id = focused.dataset.id;
      if (id) openDetail(id);
      e.preventDefault();
      return;
    }
  }

  // f：切换当前聚焦卡片的收藏状态
  if (e.key === 'f') {
    const focused = document.querySelector('.skill-card.kbd-focus');
    if (focused) {
      const id = focused.dataset.id;
      if (id) {
        const added = toggleFavorite(id);
        const btn = focused.querySelector('.card-fav');
        if (btn) {
          btn.classList.toggle('faved', added);
          btn.textContent = added ? '❤' : '♡';
        }
        toast(added ? '已加入收藏' : '已取消收藏');
        // 同步刷新 header 收藏徽章
        syncFavBadge();
      }
      e.preventDefault();
      return;
    }
  }
});

/* ====================== 启动！ ====================== */
boot();

// 暴露到 window，便于 console 调试
window.SkillBox = { state, setState, openDetail, closeDetail, toggleFavorite };
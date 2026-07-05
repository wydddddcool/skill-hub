/**
 * state.js — 全局状态 + localStorage 持久化 + URL 同步
 *
 * 注意：所有 render 函数只读不写；需要改状态时调 setState()，
 * setState() 会触发 render()（由 app.js 提供）。
 */

const LS_FAV = 'skillbox.favorites';
const LS_THEME = 'skillbox.theme';
const VALID_THEMES = ['light', 'dark', 'auto'];

export const state = {
  tab: 'daily',
  cat: null,
  scene: null,
  search: '',
  searchMode: 'all',
  sort: 'hot',
  dailyDate: null,
  drawerSkillId: null,
  drawerPane: 'overview',
  theme: 'auto',
  favorites: [],
  stats: null,
  dailyIndex: null,
  timelineGrouped: {},
};

/* ---------- 渲染入口：app.js 注入 ---------- */
let _render = () => {};

/** 由 app.js 注入 render 主入口（避免循环依赖） */
export function bindRender(fn) {
  _render = fn || (() => {});
}

/** 改状态 + 重新渲染 + 同步 URL */
export function setState(patch) {
  Object.assign(state, patch);
  syncUrlFromState();
  _render();
}

/* ---------- 主题 ---------- */
export function loadTheme() {
  let t = localStorage.getItem(LS_THEME);
  if (!VALID_THEMES.includes(t)) t = 'auto';
  state.theme = t;
  applyTheme();
}

export function setTheme(t) {
  if (!VALID_THEMES.includes(t)) t = 'auto';
  state.theme = t;
  localStorage.setItem(LS_THEME, t);
  applyTheme();
}

export function cycleTheme() {
  const order = ['light', 'dark', 'auto'];
  const i = order.indexOf(state.theme);
  setTheme(order[(i + 1) % order.length]);
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
}

/* ---------- 收藏 ---------- */
export function loadFavorites() {
  try {
    const raw = localStorage.getItem(LS_FAV);
    state.favorites = raw ? JSON.parse(raw) : [];
  } catch {
    state.favorites = [];
  }
}

export function toggleFavorite(skillId) {
  const i = state.favorites.indexOf(skillId);
  let added;
  if (i >= 0) {
    state.favorites.splice(i, 1);
    added = false;
  } else {
    state.favorites.push(skillId);
    added = true;
  }
  localStorage.setItem(LS_FAV, JSON.stringify(state.favorites));
  return added;
}

export function isFavorite(skillId) {
  return state.favorites.includes(skillId);
}

/* ---------- URL 同步（?tab=&q=&cat=&scene=&sort=&date=&theme=） ---------- */
export function syncUrlFromState() {
  const p = new URLSearchParams();
  if (state.tab !== 'daily') p.set('tab', state.tab);
  if (state.search) p.set('q', state.search);
  if (state.searchMode && state.searchMode !== 'all') p.set('mode', state.searchMode);
  if (state.cat) p.set('cat', state.cat);
  if (state.scene) p.set('scene', state.scene);
  if (state.sort !== 'hot') p.set('sort', state.sort);
  if (state.dailyDate) p.set('date', state.dailyDate);
  if (state.theme !== 'auto') p.set('theme', state.theme);

  const qs = p.toString();
  const url = location.pathname + (qs ? '?' + qs : '');
  history.replaceState(null, '', url);
}

export function loadUrlToState() {
  const p = new URLSearchParams(location.search);
  if (p.get('tab')) state.tab = p.get('tab');
  if (p.get('q')) state.search = p.get('q');
  if (p.get('mode') && ['all', 'name', 'desc', 'repo'].includes(p.get('mode'))) {
    state.searchMode = p.get('mode');
  }
  if (p.get('cat')) state.cat = p.get('cat');
  if (p.get('scene')) state.scene = p.get('scene');
  if (p.get('sort')) state.sort = p.get('sort');
  if (p.get('date')) state.dailyDate = p.get('date');
  if (p.get('theme') && VALID_THEMES.includes(p.get('theme'))) {
    state.theme = p.get('theme');
    localStorage.setItem(LS_THEME, state.theme);
    applyTheme();
  }
}
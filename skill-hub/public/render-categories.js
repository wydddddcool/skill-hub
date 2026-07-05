/**
 * render-categories.js — 左侧分类栏
 * 数据来自 state.stats.byCnCategory（启动时由 app.js 拉 /api/stats）
 */

import { state, setState } from './state.js';
import { escHtml, escAttr } from './util.js';

export function renderCategories(target = document.getElementById('catList')) {
  if (!target) return;
  if (!state.stats) {
    target.innerHTML = '<div class="empty-state" style="padding:20px;font-size:12px;">加载中…</div>';
    return;
  }

  const cats = state.stats.byCnCategory || [];
  const total = state.stats.total;

  const html = [
    `<div class="cat-item${state.cat === null ? ' active' : ''}" data-cat="">
      <span>全部</span><span class="cat-count">${total}</span>
    </div>`,
    ...cats.map(([cat, count]) => `
      <div class="cat-item${state.cat === cat ? ' active' : ''}" data-cat="${escAttr(cat)}">
        <span>${escHtml(cat)}</span><span class="cat-count">${count}</span>
      </div>
    `),
  ].join('');

  target.innerHTML = html;

  target.querySelectorAll('.cat-item').forEach(el => {
    el.onclick = () => {
      const v = el.dataset.cat || null;
      setState({ cat: v, tab: 'repo', scene: null });
    };
  });
}
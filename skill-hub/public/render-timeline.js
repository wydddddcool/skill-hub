/**
 * render-timeline.js — 右侧日报时间线
 * 数据来自 /api/daily-index（items: [{date, newCount, newNames}]）
 * 按月分组渲染，点击日期 → 切到 daily Tab 并锁定 date
 */

import { state, setState } from './state.js';
import { escHtml, escAttr, renderEmptyState } from './util.js';

export function renderTimeline(opts = {}) {
  const listEl = opts.listEl || document.getElementById('timeline');
  const dateEl = opts.dateEl || document.getElementById('latestDate');
  const countEl = opts.countEl || document.getElementById('latestCount');

  const idx = (state.dailyIndex && state.dailyIndex.items) || [];

  if (idx.length === 0) {
    if (listEl) {
      renderEmptyState(listEl, {
        icon: '📅',
        title: '尚未积累日报',
        desc: '在终端跑一次 fetch_skills.mjs，每天会自动多一条时间线。',
        primary: {
          label: '运行抓取脚本',
          onClick: () => {
            const tc = document.getElementById('tabContent');
            if (tc) {
              const html = `
                <div class="empty-state-rich">
                  <div class="empty-state-illust">⏳</div>
                  <div class="empty-state-title">请在终端运行</div>
                  <div class="empty-state-desc" style="font-family:ui-monospace,Menlo,monospace;background:var(--surface-2);padding:12px;border-radius:6px;border:1px solid var(--border);max-width:480px;">
                    cd /Users/WYD/Desktop/OH-WorkSpace/Projects/skill-hub<br>
                    node scripts/fetch_skills.mjs
                  </div>
                </div>
              `;
              tc.innerHTML = html;
            }
          },
        },
      });
    }
    if (dateEl) dateEl.textContent = '—';
    if (countEl) countEl.textContent = '';
    return;
  }

  const latest = idx[0];
  if (dateEl) dateEl.textContent = latest.date;
  if (countEl) countEl.textContent = `+${latest.newCount} 个新技能`;

  // 按月份分组
  const grouped = {};
  for (const it of idx) {
    const month = it.date.slice(0, 7);
    (grouped[month] = grouped[month] || []).push(it);
  }
  state.timelineGrouped = grouped;

  const html = Object.entries(grouped).map(([month, items]) => {
    const monthLabel = month.replace('-', '年') + '月';
    const monthTotal = items.reduce((sum, it) => sum + (it.newCount || 0), 0);
    const entries = items.map(it => {
      const day = it.date.slice(8);
      const firstName = (it.newNames && it.newNames[0]) ? it.newNames[0] : '?';
      const isActive = state.dailyDate === it.date;
      return `
        <div class="timeline-entry${isActive ? ' active' : ''}" data-date="${escAttr(it.date)}">
          <span class="timeline-day">${day}</span>
          <span class="timeline-name">${escHtml(firstName)}${it.newCount > 1 ? ` 等 +${it.newCount}` : ''}</span>
        </div>
      `;
    }).join('');
    return `<div class="timeline-month">${monthLabel} <span style="color:var(--text-3);font-weight:400;text-transform:none;">共 +${monthTotal}</span></div>${entries}`;
  }).join('');

  if (listEl) {
    listEl.innerHTML = html;
    listEl.querySelectorAll('.timeline-entry').forEach(el => {
      el.onclick = () => {
        setState({ dailyDate: el.dataset.date, tab: 'daily' });
      };
    });
  }
}
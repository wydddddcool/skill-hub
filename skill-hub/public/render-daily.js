/**
 * render-daily.js — 技能日报 Tab
 * 拉 /api/daily?date=，渲染"今日新发现 + 热门 Top 10"
 */

import { state, isFavorite } from './state.js';
import { loadDaily } from './api.js';
import { skillCardHtml, bindCardEvents, skeletonCards, renderEmptyState, toast } from './util.js';
import { openDetail } from './render-detail.js';

export async function renderDaily(target = document.getElementById('tabContent')) {
  const date = state.dailyDate || (state.dailyIndex && state.dailyIndex.latest && state.dailyIndex.latest.date);
  if (!date) {
    renderEmptyState(target, {
      icon: '📭',
      title: '还没有日报数据',
      desc: '本地仓库还是空的。先抓一次 GitHub 上的技能仓库，回来就能看到今日新发现。',
      primary: {
        label: '立即抓取',
        onClick: () => triggerFetch(target),
      },
      secondary: {
        label: '切到宝藏仓库',
        onClick: () => import('./state.js').then(({ setState }) => setState({ tab: 'repo' })),
      },
    });
    return;
  }

  target.innerHTML = `
    <div style="margin-bottom:20px;">
      <div style="font-size:13px;color:var(--text-3);">📅 ${date} 技能日报</div>
      <div style="font-size:22px;font-weight:700;margin-top:2px;">
        加载中… <span style="font-size:13px;color:var(--text-3);font-weight:400;">（首次进入拉数据，可能要 2-3 秒）</span>
      </div>
    </div>
    ${skeletonCards(5)}
  `;

  try {
    const data = await loadDaily(date);

    let html = `
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;color:var(--text-3);">📅 ${date} 技能日报</div>
        <div style="font-size:22px;font-weight:700;margin-top:2px;">
          今日新增 <span style="color:var(--brand);">${data.newCount}</span> 个
        </div>
      </div>
    `;

    if (data.newSkills && data.newSkills.length > 0) {
      html += '<div style="margin-bottom:8px;font-size:13px;color:var(--text-2);font-weight:600;">🌱 今日新发现</div>';
      html += data.newSkills.map(s => skillCardHtml(s, { new: true, isFav: isFavorite(s.id) })).join('');
    }

    if (data.hotSkills && data.hotSkills.length > 0) {
      html += '<div style="margin:24px 0 8px;font-size:13px;color:var(--text-2);font-weight:600;">🔥 热门 Top 10</div>';
      html += data.hotSkills.map(s => skillCardHtml(s, { hot: true, isFav: isFavorite(s.id), showFirstSeen: true })).join('');
    }

    if ((!data.newSkills || data.newSkills.length === 0) && (!data.hotSkills || data.hotSkills.length === 0)) {
      html += `
        <div class="empty-state-rich">
          <div class="empty-state-illust">🌱</div>
          <div class="empty-state-title">${date} 还没有数据</div>
          <div class="empty-state-desc">这一天没有抓到任何技能。试试别的日期，或者重新跑一次抓取脚本。</div>
        </div>
      `;
    }

    target.innerHTML = html;
    bindCardEvents(target, openDetail);
  } catch (err) {
    renderEmptyState(target, {
      icon: '⚠️',
      title: '日报加载失败',
      desc: err.message,
      primary: {
        label: '立即抓取',
        onClick: () => triggerFetch(target),
      },
      secondary: {
        label: '切到宝藏仓库',
        onClick: () => import('./state.js').then(({ setState }) => setState({ tab: 'repo' })),
      },
    });
    toast('日报加载失败：' + err.message);
  }
}

/* ============== 触发 fetch 脚本 ==============
 * 这里前端不能直接跑 shell，所以打开一个 README 引导卡片。
 * 真正的"自动抓取"在 Phase 6 / Mac 本地 cron + 部署阶段处理（参考 deploy-verify）。
 * 现在给用户一个清晰的下一步。
 */
function triggerFetch(target) {
  const html = `
    <div class="empty-state-rich">
      <div class="empty-state-illust">⏳</div>
      <div class="empty-state-title">请在终端运行下面这条命令</div>
      <div class="empty-state-desc" style="font-family:ui-monospace,Menlo,monospace;background:var(--surface-2);padding:12px;border-radius:6px;border:1px solid var(--border);max-width:480px;">
        cd /Users/WYD/Desktop/OH-WorkSpace/Projects/skill-hub<br>
        node scripts/fetch_skills.mjs
      </div>
      <div class="empty-state-desc">
        抓取完成后 <strong>刷新本页</strong>，日报就会自动出现。
      </div>
    </div>
  `;
  target.innerHTML = html;
  toast('已复制命令到终端跑一下');
}
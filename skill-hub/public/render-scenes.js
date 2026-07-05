/**
 * render-scenes.js — 场景合集 Tab
 * 拉 /api/scenes → 网格卡片 → 点击切到宝藏仓库并按场景筛选
 */

import { state, setState } from './state.js';
import { loadScenes } from './api.js';
import { escHtml, escAttr, skeletonLines, toast } from './util.js';

const SCENE_ICONS = {
  '做小红书': '📕',
  '做PPT/演示': '📊',
  '研究论文': '📚',
  '跑通浏览器': '🌐',
  '写文档': '📝',
  '做设计': '🎨',
  '生成图片': '🖼️',
  '生成视频': '🎬',
  '调度AI助手': '🤖',
  '抓取数据': '🕸️',
  '管理日程': '📅',
  '发社交': '💬',
  '跑训练/评测': '🧪',
  '通用': '✨',
};

export async function renderScenes(target = document.getElementById('tabContent')) {
  target.innerHTML = `
    <div style="margin-bottom:20px;">
      <div style="font-size:13px;color:var(--text-3);">🎯 按使用场景聚合</div>
      <div style="font-size:22px;font-weight:700;margin-top:2px;">加载中…</div>
    </div>
    <div class="scene-grid">${skeletonLines(6).replace(/skeleton-line/g, 'skeleton skeleton-card')}</div>
  `;

  try {
    const data = await loadScenes();

    const html = `
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;color:var(--text-3);">🎯 按使用场景聚合</div>
        <div style="font-size:22px;font-weight:700;margin-top:2px;">场景合集</div>
        <div style="font-size:12px;color:var(--text-2);margin-top:4px;">点开场景卡片，查看该场景下所有可用的技能。</div>
      </div>
      <div class="scene-grid">
        ${data.scenes.map(([scene, count]) => `
          <div class="scene-card" data-scene="${escAttr(scene)}">
            <div class="scene-card-icon">${SCENE_ICONS[scene] || '✨'}</div>
            <div class="scene-card-name">${escHtml(scene)}</div>
            <div class="scene-card-count">${count} 个技能</div>
            <div class="scene-card-sample">点开查看该场景下的 <strong>${count}</strong> 个推荐技能，包括热门与新增。</div>
          </div>
        `).join('')}
      </div>
    `;
    target.innerHTML = html;

    target.querySelectorAll('.scene-card').forEach(el => {
      el.onclick = () => {
        setState({ scene: el.dataset.scene, tab: 'repo', cat: null });
      };
    });
  } catch (err) {
    target.innerHTML = `<div class="empty-state">❌ 场景加载失败：${err.message}</div>`;
    toast('场景加载失败：' + err.message);
  }
}
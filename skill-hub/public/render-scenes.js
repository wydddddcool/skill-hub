/**
 * render-scenes.js — 场景合集 Tab
 * 拉 /api/scenes → 网格卡片 → 点击切到宝藏仓库并按场景筛选
 * 新增：顶部 MCP 服务器专区（独立于场景网格，区别于 wrapper skill）
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
  'MCP集成': '🔌',
  '通用': '✨',
};

function buildMcpCard(server) {
  const tools = (server.tools || []).slice(0, 6);
  const more = (server.tools || []).length - tools.length;
  const utm = `?utm_source=skillhub&utm_medium=referral&utm_campaign=mcp-servers`;
  const url = server.url + utm;
  return `
    <a class="mcp-card" href="${escAttr(url)}" target="_blank" rel="noopener noreferrer" data-id="${escAttr(server.id || '')}">
      <div class="mcp-card-header">
        <span class="mcp-protocol-badge">🔌 ${escHtml(server.protocol || 'MCP')}</span>
        ${server.category ? `<span class="mcp-cat-badge">${escHtml(server.category)}</span>` : ''}
      </div>
      <div class="mcp-card-name">${escHtml(server.name || '')}</div>
      <div class="mcp-card-desc">${escHtml(server.description || '')}</div>
      <div class="mcp-card-tools">
        ${tools.map(t => `<span class="mcp-tool">${escHtml(t)}</span>`).join('')}
        ${more > 0 ? `<span class="mcp-tool mcp-tool-more">+${more} more</span>` : ''}
      </div>
      <div class="mcp-card-cta">打开 ↗</div>
    </a>
  `;
}

function buildMcpZone(servers) {
  if (!servers || servers.length === 0) return '';
  return `
    <section class="mcp-zone" aria-label="MCP 服务器">
      <div class="mcp-zone-head">
        <div>
          <div class="mcp-zone-eyebrow">🔌 协议层</div>
          <div class="mcp-zone-title">MCP 服务器</div>
          <div class="mcp-zone-sub">真正暴露 JSON-RPC over HTTPS 端点的服务（区别于 809 个 wrapper skill）。</div>
        </div>
        <span class="mcp-zone-count">${servers.length} 个精选</span>
      </div>
      <div class="mcp-grid">
        ${servers.map(buildMcpCard).join('')}
      </div>
    </section>
  `;
}

async function loadMcpServers() {
  try {
    const res = await fetch('/api/mcp-servers');
    if (!res.ok) return [];
    const data = await res.json();
    return data.servers || [];
  } catch (e) {
    console.warn('[mcp-servers] load failed:', e.message);
    return [];
  }
}

export async function renderScenes(target = document.getElementById('tabContent')) {
  target.innerHTML = `
    <div style="margin-bottom:20px;">
      <div style="font-size:13px;color:var(--text-3);">🎯 按使用场景聚合</div>
      <div style="font-size:22px;font-weight:700;margin-top:2px;">加载中…</div>
    </div>
    <div class="mcp-zone mcp-zone-skeleton">${skeletonLines(2).replace(/skeleton-line/g, 'skeleton skeleton-card')}</div>
    <div class="scene-grid">${skeletonLines(6).replace(/skeleton-line/g, 'skeleton skeleton-card')}</div>
  `;

  try {
    const [sceneData, mcpServers] = await Promise.all([loadScenes(), loadMcpServers()]);

    const html = `
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;color:var(--text-3);">🎯 按使用场景聚合</div>
        <div style="font-size:22px;font-weight:700;margin-top:2px;">场景合集</div>
        <div style="font-size:12px;color:var(--text-2);margin-top:4px;">点开场景卡片，查看该场景下所有可用的技能。</div>
      </div>
      ${buildMcpZone(mcpServers)}
      <div class="scene-grid">
        ${sceneData.scenes.map(([scene, count]) => `
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
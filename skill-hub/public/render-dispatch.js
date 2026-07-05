/**
 * render-dispatch.js — Tab 分发中心（被 util.js 异步 import，避免循环依赖）
 */

import { state } from './state.js';
import { renderDaily } from './render-daily.js';
import { renderScenes } from './render-scenes.js';
import { renderRepo } from './render-repo.js';

/** 主区按当前 tab 重新渲染 */
export async function rerenderMain() {
  const target = document.getElementById('tabContent');
  if (!target) return;
  if (state.tab === 'daily') return renderDaily(target);
  if (state.tab === 'scenes') return renderScenes(target);
  if (state.tab === 'repo') return renderRepo(target);
}
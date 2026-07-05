/**
 * api.js — 所有后端 HTTP 调用集中封装
 * 端点完全照搬原 v2 + server.mjs 现有实现，零改动。
 */

export async function api(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + ' HTTP ' + r.status);
  return r.json();
}

export const loadStats = () => api('/api/stats');
export const loadTimeline = () => api('/api/timeline');
export const loadCategories = () => api('/api/categories');
export const loadDailyIndex = () => api('/api/daily-index');

export function loadDaily(date) {
  return api('/api/daily?date=' + encodeURIComponent(date));
}

export function loadSkills(params = {}) {
  const p = new URLSearchParams();
  if (params.q) p.set('q', params.q);
  if (params.cnCategory) p.set('cnCategory', params.cnCategory);
  if (params.scene) p.set('scene', params.scene);
  if (params.repo) p.set('repo', params.repo);
  if (params.tag) p.set('tag', params.tag);
  if (params.sort) p.set('sort', params.sort);
  if (params.page) p.set('page', params.page);
  if (params.pageSize) p.set('pageSize', params.pageSize);
  const qs = p.toString();
  return api('/api/skills' + (qs ? '?' + qs : ''));
}

export function loadSkillDetail(id) {
  return api('/api/skill/' + encodeURIComponent(id));
}

export function loadRelated(id) {
  return api('/api/skill/' + encodeURIComponent(id) + '/related');
}

export function search(q, mode = 'all') {
  const p = new URLSearchParams({ q, mode });
  return api('/api/search?' + p);
}

export const loadScenes = () => api('/api/scenes');
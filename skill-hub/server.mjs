#!/usr/bin/env node
/**
 * Skill Hub 本地 web 服务（v2）
 *
 * API:
 *   GET /api/skills?q=&cnCategory=&scene=&repo=&sort=&page=&pageSize=&tag=
 *   GET /api/skill/:id                              - 详情（含 SKILL.md 全文）
 *   GET /api/skill/:id/related                      - 相关技能（jaccard Top 5）
 *   GET /api/stats                                  - 总览统计（含 topKeywords）
 *   GET /api/search?q=&mode=name|desc|repo|all      - 搜索（最多 50 条）
 *   GET /api/categories                             - 22 个中文分类（按数量降序）
 *   GET /api/timeline                               - 日报按月分组
 *   GET /api/daily-index                            - 所有有数据的日期 + 每日新增数
 *   GET /api/daily?date=YYYY-MM-DD                  - 某日的"日报"
 *   GET /api/scenes                                 - 所有场景 + 技能数
 *
 * 不引第三方依赖，纯 Node.js 内置 http 模块。
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data', 'skills.json');
const DAILY_INDEX = path.join(__dirname, 'data', 'daily-index.json');
const STATS_FILE = path.join(__dirname, 'data', 'stats.json');
const SNAPSHOT_DIR = path.join(__dirname, 'data', 'snapshots');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MCP_SERVERS_FILE = path.join(__dirname, 'data', 'mcp-servers.json');
const PORT = process.env.PORT || 4321;

let cache = null;
let cacheMtime = 0;
let statsCache = null;
let statsMtime = 0;
let dailyCache = null;
let dailyMtime = 0;
let mcpCache = null;
let mcpCacheAt = 0;
const MCP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function loadData() {
  const stat = fs.statSync(DATA_FILE);
  if (cache && cacheMtime === stat.mtimeMs) return cache;
  cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  cacheMtime = stat.mtimeMs;
  return cache;
}

function loadStats() {
  if (!fs.existsSync(STATS_FILE)) return null;
  const stat = fs.statSync(STATS_FILE);
  if (statsCache && statsMtime === stat.mtimeMs) return statsCache;
  try {
    statsCache = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    statsMtime = stat.mtimeMs;
    return statsCache;
  } catch {
    return null;
  }
}

function loadDailyIndex() {
  if (!fs.existsSync(DAILY_INDEX)) return {};
  const stat = fs.statSync(DAILY_INDEX);
  if (dailyCache && dailyMtime === stat.mtimeMs) return dailyCache;
  try {
    dailyCache = JSON.parse(fs.readFileSync(DAILY_INDEX, 'utf-8'));
    dailyMtime = stat.mtimeMs;
    return dailyCache;
  } catch {
    return {};
  }
}

function loadMcpServers() {
  if (!fs.existsSync(MCP_SERVERS_FILE)) {
    mcpCache = { servers: [], count: 0, updatedAt: null, version: null };
    mcpCacheAt = 0;
    return mcpCache;
  }
  const stat = fs.statSync(MCP_SERVERS_FILE);
  if (mcpCache && mcpCacheAt === stat.mtimeMs && Date.now() - mcpCacheAt < MCP_CACHE_TTL_MS) return mcpCache;
  try {
    const raw = JSON.parse(fs.readFileSync(MCP_SERVERS_FILE, 'utf-8'));
    mcpCache = {
      servers: raw.servers || [],
      count: (raw.servers || []).length,
      updatedAt: raw.updatedAt || null,
      version: raw.version || null,
    };
    mcpCacheAt = stat.mtimeMs;
    return mcpCache;
  } catch (e) {
    console.error('[mcp-servers] parse error:', e.message);
    mcpCache = { servers: [], count: 0, updatedAt: null, version: null };
    mcpCacheAt = 0;
    return mcpCache;
  }
}

function parseQuery(url) {
  const q = url.split('?')[1];
  if (!q) return {};
  const out = {};
  for (const pair of q.split('&')) {
    if (!pair) continue;
    const [k, v] = pair.split('=').map(decodeURIComponent);
    out[k] = v;
  }
  return out;
}

function sendJson(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

function sendStatic(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const ct = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
  }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-cache' });
  fs.createReadStream(filePath).pipe(res);
}

// 22 个中文分类（spec 固定顺序在最后的"其他"兜底）
const CN_CATEGORIES = [
  '音视频', '设计', '安全', '前端', '编程', '集成/DevOps', '后端',
  '营销', 'AI与机器学习', '研究', '自动化', '测试', '文档', '金融',
  '兴趣趣', '效率', '移动端', '商业', '写作', '代码审查', '日语', '其他',
];

// "热门"启发式：firstSeenAt 越近 + 描述越具体 → 越热
function hotnessScore(skill, today) {
  const days = (new Date(today) - new Date(skill.firstSeenAt)) / 86400000;
  const recency = Math.max(0, 30 - days) / 30; // 0~1
  const lenFactor = Math.min(1, (skill.description || '').length / 80);
  const officialBonus = skill.repoLabel === 'Anthropic 官方' ? 0.3 : 0;
  return recency * 0.6 + lenFactor * 0.4 + officialBonus;
}

// 分词：把 description 拆成小写词集合（用于 jaccard 相似度）
function tokenize(text) {
  if (!text) return new Set();
  const set = new Set();
  for (const w of String(text).toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/i)) {
    if (!w || w.length < 3) continue;
    set.add(w);
  }
  return set;
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function handleApi(req, res, pathname, query) {
  // ===== GET /api/skills =====
  if (pathname === '/api/skills' && req.method === 'GET') {
    const data = loadData();
    let list = data.skills.slice();

    if (query.q) {
      const q = query.q.toLowerCase();
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.dirName || '').toLowerCase().includes(q)
      );
    }
    if (query.cnCategory) list = list.filter(s => s.cnCategory === query.cnCategory);
    if (query.scene) list = list.filter(s => (s.scenes || []).includes(query.scene));
    if (query.repo) list = list.filter(s => s.repo === query.repo);
    if (query.tag) {
      const tag = String(query.tag).toLowerCase();
      list = list.filter(s => (s.tags || []).some(t => String(t).toLowerCase() === tag));
    }

    const sort = query.sort || 'name';
    const today = (data.fetchedAt || '').slice(0, 10);
    list.sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'size') return (b.size || 0) - (a.size || 0);
      if (sort === 'repo') return a.repo.localeCompare(b.repo);
      if (sort === 'hot') return hotnessScore(b, today) - hotnessScore(a, today);
      if (sort === 'newest') return (b.firstSeenAt || '').localeCompare(a.firstSeenAt || '');
      if (sort === 'views') return (b.views || 0) - (a.views || 0);
      if (sort === 'stars') return (b.stars || 0) - (a.stars || 0);
      return 0;
    });

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize || '50', 10)));
    const total = list.length;
    const start = (page - 1) * pageSize;
    const items = list.slice(start, start + pageSize);
    return sendJson(res, { total, page, pageSize, totalPages: Math.ceil(total / pageSize), items });
  }

  // ===== GET /api/skill/:id 和 /api/skill/:id/related =====
  if (pathname.startsWith('/api/skill/') && req.method === 'GET') {
    const rest = pathname.slice('/api/skill/'.length);
    const slash = rest.indexOf('/');
    if (slash >= 0) {
      // 子端点，例如 /related
      const id = decodeURIComponent(rest.slice(0, slash));
      const sub = rest.slice(slash + 1);
      if (sub === 'related') {
        const data = loadData();
        const skill = data.skills.find(s => s.id === id);
        if (!skill) return sendJson(res, { error: 'not found' }, 404);
        const target = tokenize(skill.description);
        const scored = [];
        for (const s of data.skills) {
          if (s.id === id) continue;
          const sim = jaccard(target, tokenize(s.description));
          if (sim > 0) scored.push({ id: s.id, name: s.name, dirName: s.dirName, similarity: sim });
        }
        scored.sort((a, b) => b.similarity - a.similarity || a.name.localeCompare(b.name));
        return sendJson(res, { skillId: id, total: scored.length, items: scored.slice(0, 5) });
      }
      return sendJson(res, { error: 'not found' }, 404);
    }
    const id = decodeURIComponent(rest);
    const data = loadData();
    const skill = data.skills.find(s => s.id === id);
    if (!skill) return sendJson(res, { error: 'not found' }, 404);
    try {
      const r = await fetch(skill.sourceUrl, { headers: { 'User-Agent': 'skill-hub/2.0' } });
      skill.content = r.ok ? await r.text() : `（HTTP ${r.status}）`;
    } catch (e) { skill.content = `（失败：${e.message}）`; }
    return sendJson(res, skill);
  }

  // ===== GET /api/search =====
  if (pathname === '/api/search' && req.method === 'GET') {
    const data = loadData();
    const q = (query.q || '').toLowerCase().trim();
    const mode = (query.mode || 'all').toLowerCase();
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '50', 10)));
    if (!q) {
      return sendJson(res, { q: query.q || '', mode, total: 0, items: [] });
    }
    let list;
    if (mode === 'name') {
      list = data.skills.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.dirName || '').toLowerCase().includes(q)
      );
    } else if (mode === 'desc') {
      list = data.skills.filter(s => (s.description || '').toLowerCase().includes(q));
    } else if (mode === 'repo') {
      list = data.skills.filter(s => (s.repo || '').toLowerCase().includes(q));
    } else {
      list = data.skills.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.dirName || '').toLowerCase().includes(q) ||
        (s.repo || '').toLowerCase().includes(q)
      );
    }
    const total = list.length;
    const items = list.slice(0, limit);
    return sendJson(res, { q: query.q || '', mode, total, items });
  }

  // ===== GET /api/categories =====
  if (pathname === '/api/categories' && req.method === 'GET') {
    const data = loadData();
    const counts = {};
    for (const s of data.skills) {
      const c = s.cnCategory || '其他';
      counts[c] = (counts[c] || 0) + 1;
    }
    // 按 spec 固定 22 个分类输出；按 count 降序，count=0 也保留
    const items = CN_CATEGORIES.map(name => [name, counts[name] || 0])
      .sort((a, b) => b[1] - a[1] || CN_CATEGORIES.indexOf(a[0]) - CN_CATEGORIES.indexOf(b[0]));
    return sendJson(res, { total: CN_CATEGORIES.length, items });
  }

  // ===== GET /api/timeline =====
  if (pathname === '/api/timeline' && req.method === 'GET') {
    const dailyIndex = loadDailyIndex();
    const dates = Object.keys(dailyIndex).sort();
    const monthsMap = new Map();
    for (const d of dates) {
      const month = d.slice(0, 7);
      if (!monthsMap.has(month)) monthsMap.set(month, []);
      const info = dailyIndex[d];
      monthsMap.get(month).push({
        date: d,
        newCount: info.newCount || 0,
        newNames: info.newNames || [],
      });
    }
    const months = [...monthsMap.entries()].map(([month, days]) => ({
      month,
      days,
      monthTotal: days.reduce((sum, x) => sum + (x.newCount || 0), 0),
    }));
    const sortedMonths = months.slice().sort((a, b) => b.month.localeCompare(a.month));
    const latestDate = dates.length ? dates[dates.length - 1] : null;
    return sendJson(res, {
      totalDays: dates.length,
      latestDate,
      months,
      sortedMonths,
    });
  }

  // ===== GET /api/stats =====
  if (pathname === '/api/stats' && req.method === 'GET') {
    const data = loadData();
    const statsFile = loadStats();
    return sendJson(res, {
      total: data.total,
      fetchedAt: data.fetchedAt,
      byCnCategory: Object.entries(data.byCnCategory || {}).sort((a, b) => b[1] - a[1]),
      byScene: Object.entries(data.byScene || {}).sort((a, b) => b[1] - a[1]),
      byRepo: Object.entries(data.byRepo || {}).sort((a, b) => b[1] - a[1]),
      newTodayCount: data.newTodayCount || 0,
      topKeywords: (statsFile && statsFile.topKeywords) || [],
    });
  }

  // ===== GET /api/daily-index =====
  if (pathname === '/api/daily-index' && req.method === 'GET') {
    const dailyIndex = loadDailyIndex();
    const dates = Object.keys(dailyIndex).sort().reverse();
    const items = dates.map(d => ({
      date: d,
      newCount: dailyIndex[d].newCount,
      newNames: dailyIndex[d].newNames,
    }));
    return sendJson(res, {
      total: items.length,
      latest: items[0] || null,
      items,
    });
  }

  // ===== GET /api/daily =====
  if (pathname === '/api/daily' && req.method === 'GET') {
    const data = loadData();
    const date = query.date || data.fetchedAt.slice(0, 10);

    const newSkills = data.skills.filter(s => s.firstSeenAt === date);

    const hot = data.skills.slice()
      .map(s => ({ s, score: hotnessScore(s, date) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(x => x.s);

    return sendJson(res, {
      date,
      newCount: newSkills.length,
      newSkills,
      hotSkills: hot,
    });
  }

  // ===== GET /api/scenes =====
  if (pathname === '/api/scenes' && req.method === 'GET') {
    const data = loadData();
    return sendJson(res, {
      scenes: Object.entries(data.byScene || {}).sort((a, b) => b[1] - a[1]),
    });
  }

  // ===== GET /api/mcp-servers =====
  if (pathname === '/api/mcp-servers' && req.method === 'GET') {
    const payload = loadMcpServers();
    return sendJson(res, payload);
  }

  sendJson(res, { error: 'not found' }, 404);
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  const pathname = url.split('?')[0];

  if (pathname.startsWith('/api/')) {
    try { await handleApi(req, res, pathname, parseQuery(url)); }
    catch (e) { sendJson(res, { error: e.message }, 500); }
    return;
  }
  if (pathname === '/' || pathname === '/index.html') {
    return sendStatic(res, path.join(PUBLIC_DIR, 'index.html'));
  }
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  return sendStatic(res, path.join(PUBLIC_DIR, safePath));
});

server.listen(PORT, '127.0.0.1', () => {
  const data = loadData();
  console.log(`\n  Skill Hub v2 启动`);
  console.log(`  ───────────────────────────────`);
  console.log(`  地址:        http://127.0.0.1:${PORT}`);
  console.log(`  技能总数:    ${data.total}`);
  console.log(`  今日新增:    ${data.newTodayCount || 0}`);
  console.log(`  中文分类:    ${Object.keys(data.byCnCategory || {}).length}`);
  console.log(`  场景:        ${Object.keys(data.byScene || {}).length}`);
  console.log(`  ───────────────────────────────\n`);
});

process.on('SIGINT', () => { console.log('\n关闭'); process.exit(0); });
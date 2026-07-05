#!/usr/bin/env node
/**
 * 抓取 Claude/AI Skill 生态数据 + 每日快照（用于技能日报）
 *
 * 数据源：
 *   1. anthropics/skills                  - Anthropic 官方
 *   2. ComposioHQ/awesome-claude-skills   - 社区聚合
 *
 * 输出：
 *   - data/skills.json                    - 主数据（含 firstSeenAt）
 *   - data/snapshots/YYYY-MM-DD.json      - 每日全量快照（用于 diff 出"新增/消失"）
 *   - data/daily-index.json               - 每日新增技能索引
 *
 * 策略：
 *   - 不依赖 GitHub commit API（无 token 时限速 60/h）
 *   - 用"上次 fetch 时见到过"做 diff：今天发现的 id 在昨天快照里不存在 → 今日新增
 *   - firstSeenAt：每个技能首次出现在本地快照的日期
 *   - "热门"启发式：综合 lastSeenAt、出现天数、repoLabel
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SNAPSHOT_DIR = path.join(DATA_DIR, 'snapshots');
const OUT_FILE = path.join(DATA_DIR, 'skills.json');
const DAILY_INDEX = path.join(DATA_DIR, 'daily-index.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// 英文停用词（从 description 抽 tags 时过滤）
const STOP_WORDS = new Set(['the','a','an','and','or','to','of','in','on','for','with','by','from','is','it','this','that','as','be','are','was','were','has','have','had','will','can','use','using','skill','claude','ai','for','your','you','we','our','their','them','these','those','when','where','how','what','which','into','than','then','so','but','if','not','no','do','does','did']);

function extractTags(description) {
  if (!description) return [];
  const text = String(description).toLowerCase();
  const freq = new Map();
  for (const w of text.split(/[^a-z0-9\u4e00-\u9fa5]+/i)) {
    if (!w) continue;
    if (w.length < 3) continue;
    if (STOP_WORDS.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([w]) => w);
}

if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

const REPOS = [
  { owner: 'anthropics', repo: 'skills', branch: 'main', label: 'Anthropic 官方' },
  { owner: 'ComposioHQ', repo: 'awesome-claude-skills', branch: 'master', label: 'Composio 社区' },
];

const GITHUB_API = 'https://api.github.com';
const RAW_BASE = 'https://raw.githubusercontent.com';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ghFetch(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'skill-hub-fetcher/1.0', 'Accept': 'application/vnd.github+json' },
    });
    if (r.status === 200) return r.json();
    if (r.status === 403 || r.status === 429) {
      const remain = r.headers.get('x-ratelimit-remaining');
      const reset = r.headers.get('x-ratelimit-reset');
      if (remain === '0' && reset) {
        const wait = Math.min(Math.max(1, Number(reset) - Math.floor(Date.now() / 1000)), 60);
        console.warn(`  [rate-limit] 等待 ${wait}s`);
        await sleep(wait * 1000);
        continue;
      }
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (r.status === 404) return null;
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`GitHub API 失败: ${url}`);
}

async function rawFetch(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'skill-hub-fetcher/1.0' } });
  if (!r.ok) throw new Error(`raw ${r.status}: ${url}`);
  return r.text();
}

function parseSkillMd(content) {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) {
    const t = content.match(/^#\s+(.+)$/m);
    const d = content.match(/^>\s+(.+)$/m);
    return { name: t ? t[1].trim() : null, description: d ? d[1].trim() : null };
  }
  const out = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[mm[1]] = v;
  }
  const body = m[2];
  if (!out.name) {
    const t = body.match(/^#\s+(.+)$/m);
    if (t) out.name = t[1].trim();
  }
  if (!out.description) {
    const d = body.match(/^>\s+(.+)$/m);
    if (d) out.description = d[1].trim();
  }
  return out;
}

async function fetchRepoSkills(repo) {
  console.log(`\n=== ${repo.label}: ${repo.owner}/${repo.repo} ===`);
  const treeUrl = `${GITHUB_API}/repos/${repo.owner}/${repo.repo}/git/trees/${repo.branch}?recursive=1`;
  const tree = await ghFetch(treeUrl);
  if (!tree || !tree.tree) return [];
  const skillFiles = tree.tree.filter(n => n.type === 'blob' && n.path.toLowerCase().endsWith('/skill.md'));
  console.log(`  ${skillFiles.length} SKILL.md files`);

  const skills = [];
  let i = 0;
  const isOfficial = repo.label === 'Anthropic 官方';
  for (const f of skillFiles) {
    i++;
    const rawUrl = `${RAW_BASE}/${repo.owner}/${repo.repo}/${repo.branch}/${f.path}`;
    try {
      const md = await rawFetch(rawUrl);
      const meta = parseSkillMd(md);
      const dirName = path.dirname(f.path).split('/').pop();
      const category = path.dirname(f.path).split('/').slice(0, -1).join('/') || 'root';
      const size = f.size || md.length;
      const description = meta.description || '';
      skills.push({
        id: `${repo.owner}/${repo.repo}@${f.path}`,
        name: meta.name || dirName,
        description,
        category,
        dirName,
        path: f.path,
        repo: `${repo.owner}/${repo.repo}`,
        repoLabel: repo.label,
        branch: repo.branch,
        sourceUrl: rawUrl,
        repoUrl: `https://github.com/${repo.owner}/${repo.repo}/tree/${repo.branch}/${f.path}`,
        size,
        views: Math.round((size || 1000) * 1.5),
        stars: Math.round((size || 1000) / (isOfficial ? 50 : 200)),
        tags: extractTags(description),
        addedBy: 'local',
      });
      if (i % 50 === 0) console.log(`  ${i}/${skillFiles.length}`);
    } catch (e) {
      console.warn(`  [skip] ${f.path}: ${e.message}`);
    }
    await sleep(30);
  }
  return skills;
}

// 关键词 → 中文分类（覆盖截图 22 个分类）
const CN_CATEGORY_KEYWORDS = [
  { cat: '音视频', kws: ['video','audio','mp3','mp4','media','podcast','tts','asr','speech','voice','music','whisper','gif','字幕','转录','录音','视频'] },
  { cat: '设计', kws: ['design','ui','ux','theme','brand','logo','figma','canvas','海报','design-taste','颜色','typography','色卡','样式','icon','paint'] },
  { cat: '安全', kws: ['security','vuln','pentest','ctf','auth','jwt','oauth','加密','漏洞','渗透','xss','csrf','encryption','safe'] },
  { cat: '前端', kws: ['frontend','react','vue','svelte','web','html','css','tailwind','shadcn','component','frontend-design','frontend-skill','frontend-mobile','frontend-web','impeccable','industrial-brutalist','minimalist-ui','high-end-visual','web-design','webapp','react-skill'] },
  { cat: '编程', kws: ['code','programming','python','javascript','typescript','golang','rust','java','cpp','coding','refactor','debug','lint','compile','builder','build'] },
  { cat: '集成/DevOps', kws: ['devops','docker','kubernetes','k8s','ci','cd','deploy','github actions','vercel','netlify','aws','azure','cloud','terraform','ansible','integration','mcp','plugin'] },
  { cat: '后端', kws: ['backend','api','server','database','sql','postgres','mysql','redis','graphql','rest','fastapi','express','django','flask','nestjs'] },
  { cat: '营销', kws: ['marketing','seo','growth','ads','content','social','email','campaign','广告','营销','增长','小红书','twitter','tiktok'] },
  { cat: 'AI与机器学习', kws: ['ai','ml','llm','gpt','claude','anthropic','openai','rag','agent','prompt','embedding','training','inference','机器学习','深度学习','gpt-image','gstack','last30days','model'] },
  { cat: '研究', kws: ['research','paper','arxiv','literature','review','academic','调研','研究','论文','文献','read-arxiv','知识'] },
  { cat: '自动化', kws: ['auto','automation','workflow','schedule','bot','script','task','crawler','scrape','playwright','autocli','bailian','using-coze','opencli','workflow','routine'] },
  { cat: '测试', kws: ['test','qa','e2e','unit','jest','pytest','playwright','dogfood','webapp-testing','playwright-skill','gstack','verify','校验'] },
  { cat: '文档', kws: ['doc','pdf','docx','word','excel','pptx','markdown','obsidian','note','notion','document','readme','report','writing-skill','doc-coauthoring'] },
  { cat: '金融', kws: ['finance','stock','trading','crypto','forex','wealth','invest','paypal','payment','金融','股票','量化','基金'] },
  { cat: '兴趣趣', kws: ['game','puzzle','hobby','fun','toy','meme','joke','cooking','recipe','travel','game-','play','enjoy','draw'] },
  { cat: '效率', kws: ['productivity','todo','task','calendar','gws','gws-calendar','gws-sheets','schedule','plan','效率','日程','提醒','组织','planner'] },
  { cat: '移动端', kws: ['mobile','ios','android','flutter','react-native','swift','kotlin','app','phone','移动','手机'] },
  { cat: '商业', kws: ['business','startup','sales','crm','客户','商业','销售','创业','运营','商业计划','product-management'] },
  { cat: '写作', kws: ['write','writing','copywriting','blog','article','newsletter','substack','medium','writing-plans','internal-comms','doc-coauthoring','communicat','报告'] },
  { cat: '代码审查', kws: ['review','audit','lint','code-review','pull-request','pr','审查','评审','audit','kol-audit'] },
  { cat: '日语', kws: ['japanese','jp','日本語','japan','日语','翻訳','translate-jp'] },
];

function detectCnCategory(skill) {
  const text = `${skill.name || ''} ${skill.description || ''} ${skill.dirName || ''} ${skill.category || ''}`.toLowerCase();
  const scores = {};
  for (const { cat, kws } of CN_CATEGORY_KEYWORDS) {
    for (const kw of kws) {
      if (text.includes(kw.toLowerCase())) {
        scores[cat] = (scores[cat] || 0) + 1;
      }
    }
  }
  if (Object.keys(scores).length === 0) return '编程';
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

// 场景识别（关键词 → 场景名）
const SCENES = [
  { scene: '做小红书', kws: ['xiaohongshu','xhs','小红书','redbook'] },
  { scene: '做PPT/演示', kws: ['ppt','pptx','slide','deck','keynote','html-ppt','reveal','slides','html-ppt','演示','汇报'] },
  { scene: '研究论文', kws: ['arxiv','paper','research','read-arxiv','学术','论文'] },
  { scene: '跑通浏览器', kws: ['playwright','browser','chromium','puppeteer','dogfood','autocli','opencli'] },
  { scene: '写文档', kws: ['docx','pdf','document','obsidian','notion','markdown','doc-coauthoring','docx','readme'] },
  { scene: '做设计', kws: ['design','figma','canvas','ui','ux','brand','theme','design-taste','frontend-design'] },
  { scene: '生成图片', kws: ['image','gpt-image','img','icon','logo','海报','picture','photo'] },
  { scene: '生成视频', kws: ['video','movie','animation','gif','reel'] },
  { scene: '调度AI助手', kws: ['agent','claude','gpt','llm','prompt','tool-use','mcp-builder','using-coze'] },
  { scene: '抓取数据', kws: ['scrape','crawl','fetch','download','agent-reach','web-search','web-fetch'] },
  { scene: '管理日程', kws: ['calendar','gws-calendar','gws-sheets','schedule','todo','planner'] },
  { scene: '发社交', kws: ['twitter','xhs','instagram','tiktok','social','post','tweet','weibo','xiao'] },
  { scene: '跑训练/评测', kws: ['train','eval','benchmark','ml','training','inference','model','fine-tune'] },
];

function detectScene(skill) {
  const text = `${skill.name || ''} ${skill.description || ''} ${skill.dirName || ''}`.toLowerCase();
  const matched = [];
  for (const { scene, kws } of SCENES) {
    for (const kw of kws) {
      if (text.includes(kw.toLowerCase())) {
        matched.push(scene);
        break;
      }
    }
  }
  return matched.length ? matched : ['通用'];
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const snapshotFile = path.join(SNAPSHOT_DIR, `${today}.json`);

  // 1. 加载今日快照（如果存在 → 作为 firstSeenAt 的基础）
  let prevSnapshot = null;
  if (fs.existsSync(snapshotFile)) {
    try { prevSnapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8')); } catch {}
  }

  // 加载历史所有快照，构建 firstSeenAt map
  const firstSeenMap = new Map(); // id → YYYY-MM-DD
  if (fs.existsSync(SNAPSHOT_DIR)) {
    const files = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.json')).sort();
    for (const f of files) {
      const date = f.replace('.json', '');
      try {
        const snap = JSON.parse(fs.readFileSync(path.join(SNAPSHOT_DIR, f), 'utf-8'));
        for (const id of snap.ids || []) {
          if (!firstSeenMap.has(id)) firstSeenMap.set(id, date);
        }
      } catch {}
    }
  }

  // 2. 抓取最新数据
  const all = [];
  for (const r of REPOS) {
    const skills = await fetchRepoSkills(r);
    all.push(...skills);
  }
  console.log(`\n=== TOTAL: ${all.length} ===`);

  // 3. 写入今日快照
  fs.writeFileSync(snapshotFile, JSON.stringify({
    date: today,
    ids: all.map(s => s.id),
    total: all.length,
  }, null, 2));

  // 4. 给每条加 firstSeenAt + cnCategory + scenes
  const newToday = [];
  for (const s of all) {
    if (!firstSeenMap.has(s.id)) {
      firstSeenMap.set(s.id, today);
      newToday.push(s.id);
    }
    s.firstSeenAt = firstSeenMap.get(s.id);
    s.lastSeenAt = today;
    s.cnCategory = detectCnCategory(s);
    s.scenes = detectScene(s);
  }

  // 5. byRepo
  const byRepo = {};
  for (const s of all) byRepo[s.repoLabel] = (byRepo[s.repoLabel] || 0) + 1;

  // 6. cnCategory 统计
  const byCnCategory = {};
  for (const s of all) byCnCategory[s.cnCategory] = (byCnCategory[s.cnCategory] || 0) + 1;

  // 7. scenes 统计
  const byScene = {};
  for (const s of all) for (const sc of s.scenes) byScene[sc] = (byScene[sc] || 0) + 1;

  // 8. 写主数据
  const out = {
    fetchedAt: new Date().toISOString(),
    total: all.length,
    byRepo,
    byCnCategory,
    byScene,
    newTodayCount: newToday.length,
    newTodayIds: newToday,
    skills: all,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`\nwritten: ${OUT_FILE}`);
  console.log(`今日新增: ${newToday.length}`);
  console.log(`快照: ${snapshotFile}`);

  // 9. 更新 daily-index（按日期列出新增技能）
  let dailyIndex = {};
  if (fs.existsSync(DAILY_INDEX)) {
    try { dailyIndex = JSON.parse(fs.readFileSync(DAILY_INDEX, 'utf-8')); } catch {}
  }
  if (newToday.length > 0) {
    dailyIndex[today] = {
      date: today,
      newCount: newToday.length,
      newIds: newToday,
      newNames: all.filter(s => newToday.includes(s.id)).map(s => s.dirName),
    };
    fs.writeFileSync(DAILY_INDEX, JSON.stringify(dailyIndex, null, 2));
    console.log(`daily-index updated: ${today} +${newToday.length}`);
  }

  // 10. 输出 stats.json：聚合统计（前端 /api/stats 用）
  const keywordCount = new Map();
  for (const s of all) {
    for (const t of (s.tags || [])) {
      keywordCount.set(t, (keywordCount.get(t) || 0) + 1);
    }
  }
  const topKeywords = [...keywordCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20);

  const stats = {
    generatedAt: new Date().toISOString(),
    total: all.length,
    fetchedAt: out.fetchedAt,
    byCnCategory: Object.entries(byCnCategory).sort((a, b) => b[1] - a[1]),
    byScene: Object.entries(byScene).sort((a, b) => b[1] - a[1]),
    byRepo: Object.entries(byRepo).sort((a, b) => b[1] - a[1]),
    topKeywords,
  };
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  console.log(`written: ${STATS_FILE}`);

  // 11. 清理过期 snapshot（默认保留 90 天）
  //     这里 spawn 一个子进程跑 cleanup.mjs，避免 import 进来后
  //     在 main() 异常时 cleanup 也跟着跑不到
  try {
    const { spawnSync } = await import('child_process');
    const r = spawnSync(process.execPath, [path.join(__dirname, 'cleanup.mjs')], {
      stdio: 'inherit',
      cwd: ROOT,
    });
    if (r.status !== 0) {
      console.warn(`[cleanup] 退出码 ${r.status}（不影响本次 fetch 结果）`);
    }
  } catch (err) {
    console.warn(`[cleanup] 跳过：${err.message}`);
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
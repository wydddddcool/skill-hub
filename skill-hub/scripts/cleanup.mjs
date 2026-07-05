#!/usr/bin/env node
/**
 * cleanup.mjs — 清理过期的 snapshot
 *
 * 业务背景：
 *   scripts/fetch_skills.mjs 每天会在 data/snapshots/ 下生成一个
 *   YYYY-MM-DD.json，里面记录当天所有技能 id 列表。
 *   这些 snapshot 是"diff 新增/消失"的唯一依据（fetch 脚本不依赖
 *   GitHub commit API），但跑久了会一直堆积。
 *
 * 策略：
 *   - 默认保留 90 天内的 snapshot（可由参数覆盖）
 *   - 删除文件名以 YYYY-MM-DD.json 命名的"过期"文件
 *   - 不动 daily-index.json / skills.json / stats.json
 *   - 不会删除今天的快照（保证 latest 永远在）
 *
 * 用法：
 *   node scripts/cleanup.mjs                    # 默认保留 90 天
 *   node scripts/cleanup.mjs --days=30          # 保留 30 天
 *   node scripts/cleanup.mjs --dry-run          # 只打印，不删
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(ROOT, 'data', 'snapshots');

/* ============== 参数解析 ============== */
function parseArgs(argv) {
  const out = { days: 90, dryRun: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--days=')) {
      const n = parseInt(a.slice(7), 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error(`❌ 无效的 --days 值：${a.slice(7)}`);
        process.exit(2);
      }
      out.days = n;
    } else if (a === '--dry-run') {
      out.dryRun = true;
    } else if (a === '--help' || a === '-h') {
      console.log(`usage: cleanup.mjs [--days=N] [--dry-run]
  --days=N    保留最近 N 天的 snapshot（默认 90）
  --dry-run   只打印要删的文件，不真删`);
      process.exit(0);
    } else {
      console.error(`❌ 未知参数：${a}`);
      process.exit(2);
    }
  }
  return out;
}

/* ============== 主逻辑 ============== */
function run() {
  const { days, dryRun } = parseArgs(process.argv);

  if (!fs.existsSync(SNAPSHOT_DIR)) {
    console.log(`📁 snapshot 目录不存在：${SNAPSHOT_DIR}（跳过）`);
    return;
  }

  // 今天 00:00 的 UTC 时间戳（snapshot 文件名都是 YYYY-MM-DD，统一按 UTC 切日）
  const todayMs = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  );
  const cutoffMs = todayMs - days * 24 * 60 * 60 * 1000;

  const files = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.json'));
  const toDelete = [];
  const kept = [];

  for (const f of files) {
    const m = f.match(/^(\d{4})-(\d{2})-(\d{2})\.json$/);
    if (!m) {
      // 不符合命名规范的 JSON：保守保留（不是本脚本的锅）
      kept.push({ file: f, reason: 'non-date filename' });
      continue;
    }
    const fileMs = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (fileMs < cutoffMs) {
      toDelete.push({ file: f, date: `${m[1]}-${m[2]}-${m[3]}`, ageDays: Math.floor((todayMs - fileMs) / 86400000) });
    } else {
      kept.push({ file: f, ageDays: Math.floor((todayMs - fileMs) / 86400000) });
    }
  }

  toDelete.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`🧹 snapshot 清理`);
  console.log(`   目录：${SNAPSHOT_DIR}`);
  console.log(`   策略：保留最近 ${days} 天（cutoff = ${new Date(cutoffMs).toISOString().slice(0, 10)}）`);
  console.log(`   现有：${files.length} 个 snapshot`);
  console.log(`   待删：${toDelete.length} 个`);
  console.log(`   保留：${kept.length} 个${dryRun ? '（dry-run 模式，不会真删）' : ''}`);
  console.log('');

  if (toDelete.length === 0) {
    console.log('✅ 没有需要清理的 snapshot');
    return;
  }

  for (const it of toDelete) {
    const fp = path.join(SNAPSHOT_DIR, it.file);
    if (dryRun) {
      console.log(`   [dry-run] ${it.file}  (${it.ageDays} 天前)`);
    } else {
      try {
        fs.unlinkSync(fp);
        console.log(`   ✓ 删除 ${it.file}  (${it.ageDays} 天前)`);
      } catch (err) {
        console.error(`   ✗ 删除失败 ${it.file}: ${err.message}`);
      }
    }
  }

  console.log('');
  console.log(dryRun ? '🔍 dry-run 完成，没动任何文件' : '✅ 清理完成');
}

run();
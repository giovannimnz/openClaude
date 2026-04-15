#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const WATCH_DIRS = [
  path.join(ROOT, '.claude', 'commands', 'gsd'),
  path.join(ROOT, '.claude', 'agents'),
];

for (const dir of WATCH_DIRS) {
  if (!fs.existsSync(dir)) {
    console.error(`Diretório não encontrado: ${dir}`);
    process.exit(1);
  }
}

let timer = null;
let running = false;
let queued = false;

function runSync(reason) {
  if (running) {
    queued = true;
    return;
  }

  running = true;
  const child = spawn('bash', ['scripts/gsd-sync-clis.sh', '--quiet'], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    running = false;
    const stamp = new Date().toISOString();
    if (code === 0) {
      console.log(`[${stamp}] sync ok (${reason})`);
    } else {
      console.error(`[${stamp}] sync falhou (${reason}) code=${code}`);
    }

    if (queued) {
      queued = false;
      runSync('queued-change');
    }
  });
}

function onFsEvent(dir, eventType, filename) {
  const target = filename ? path.join(dir, filename) : dir;
  const normalized = target.replaceAll('\\', '/');

  const isRelevant =
    normalized.includes('/.claude/commands/gsd/') ||
    (normalized.includes('/.claude/agents/') && path.basename(normalized).startsWith('gsd-'));

  if (!isRelevant) return;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => runSync(`${eventType}:${filename || 'unknown'}`), 300);
}

console.log('Watcher GSD ativo.');
console.log('Monitorando mudanças em .claude/commands/gsd e .claude/agents/gsd-*.md');

for (const dir of WATCH_DIRS) {
  fs.watch(dir, { persistent: true }, (eventType, filename) => onFsEvent(dir, eventType, filename));
}

runSync('startup');

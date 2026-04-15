#!/usr/bin/env node
// GSD-Qwen Bridge
// Synchronizes planning files between GSD and Qwen workspace
// generated-by: gsd-qwen-bridge

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PLANNING_DIR = path.join(ROOT, '.planning');
const QWEN_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.qwen');
const GSD_CONTEXT_FILE = path.join(QWEN_DIR, 'gsd-context.md');
const MANIFEST_FILE = path.join(QWEN_DIR, 'gsd-bridge-manifest.json');
const GENERATED_MARKER = 'generated-by: gsd-qwen-bridge';
const MAX_FILE_SIZE = 100 * 1024; // 100KB

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function parseFrontmatter(content) {
  const fm = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fm) return { frontmatter: {}, body: content };

  const frontmatter = {};
  for (const line of fm[1].split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    frontmatter[m[1]] = m[2].trim();
  }

  return {
    frontmatter,
    body: content.slice(fm[0].length),
  };
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function listPhases() {
  const phasesDir = path.join(PLANNING_DIR, 'phases');
  if (!fs.existsSync(phasesDir)) {
    return [];
  }

  const phases = [];
  for (const entry of fs.readdirSync(phasesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const phaseDir = path.join(phasesDir, entry.name);
    const contextFile = path.join(phaseDir, `${entry.name.split('-')[0]}-CONTEXT.md`);
    const summaryFile = path.join(phaseDir, `${entry.name.split('-')[0]}-SUMMARY.md`);

    let status = 'planned';
    if (fs.existsSync(summaryFile)) {
      status = 'completed';
    } else if (fs.existsSync(contextFile)) {
      status = 'in-progress';
    }

    phases.push({
      name: entry.name,
      status,
      hasContext: fs.existsSync(contextFile),
      hasSummary: fs.existsSync(summaryFile),
    });
  }

  return phases.sort((a, b) => a.name.localeCompare(b.name));
}

function syncToQwen() {
  const files = [];

  // Read main GSD files
  const stateContent = readText(path.join(PLANNING_DIR, 'STATE.md'));
  const roadmapContent = readText(path.join(PLANNING_DIR, 'ROADMAP.md'));
  const projectContent = readText(path.join(PLANNING_DIR, 'PROJECT.md'));

  if (stateContent) files.push('STATE.md');
  if (roadmapContent) files.push('ROADMAP.md');
  if (projectContent) files.push('PROJECT.md');

  // List phases
  const phases = listPhases();

  // Check file sizes
  for (const file of [...files]) {
    const filePath = path.join(PLANNING_DIR, file);
    const size = getFileSize(filePath);
    if (size > MAX_FILE_SIZE) {
      console.warn(`Warning: ${file} is >100KB, skipping`);
      files.splice(files.indexOf(file), 1);
    }
  }

  // Generate phases list
  const phasesList = phases.map(p => {
    const icon = p.status === 'completed' ? '✅' : p.status === 'in-progress' ? '📝' : '📋';
    return `- ${icon} **${p.name}** — ${p.status}`;
  }).join('\n');

  // Generate context file
  const timestamp = new Date().toISOString();
  const contextContent = `<!-- ${GENERATED_MARKER} -->
<!-- source: .planning -->
<!-- generated-at: ${timestamp} -->

# GSD Project Context

> This file is auto-generated. Do not edit manually.
> Run: node scripts/gsd-qwen-bridge.mjs

## Current State

${stateContent || '*No state file found*'}

## Roadmap

${roadmapContent || '*No roadmap file found*'}

## Project Overview

${projectContent || '*No project file found*'}

## Active Phases

${phasesList || '*No phases found*'}

---
*Last updated: ${timestamp}*
`;

  // Write context file
  ensureDir(QWEN_DIR);
  fs.writeFileSync(GSD_CONTEXT_FILE, contextContent, 'utf8');

  return files.length + phases.length;
}

function syncFromQwen() {
  const qwenOutputDir = path.join(QWEN_DIR, 'output');

  if (!fs.existsSync(qwenOutputDir)) {
    console.log('Nenhuma saída do Qwen para sincronizar.');
    return 0;
  }

  // List files in qwen output directory
  const files = fs.readdirSync(qwenOutputDir);
  let syncedCount = 0;

  // Create output directory in planning if it doesn't exist
  const gwenOutputDir = path.join(PLANNING_DIR, 'qwen-output');

  for (const file of files) {
    const srcPath = path.join(qwenOutputDir, file);
    const destPath = path.join(gwenOutputDir, file);

    // Skip directories
    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) continue;

    // Skip files >100KB
    if (stats.size > MAX_FILE_SIZE) {
      console.warn(`Aviso: arquivo ${file} muito grande (>100KB), pulando`);
      continue;
    }

    try {
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
      syncedCount++;
    } catch (err) {
      console.warn(`Aviso: não consegui sincronizar ${file}: ${err.message}`);
    }
  }

  console.log(`Sincronizados ${syncedCount} arquivos do Qwen para GSD.`);
  return syncedCount;
}

function generateManifest(fileCount) {
  return {
    generatedBy: 'gsd-qwen-bridge',
    generatedAt: new Date().toISOString(),
    source: '.planning',
    output: '~/.qwen',
    files: fileCount,
  };
}

function main() {
  const args = process.argv.slice(2);

  // Handle --sync-from: Sync from Qwen to GSD
  if (args.includes('--sync-from')) {
    process.exit(syncFromQwen() >= 0 ? 0 : 1);
  }

  // Handle --mcp: MCP server mode (placeholder for future)
  if (args.includes('--mcp')) {
    // MCP server mode not yet implemented
    // This would start an MCP server for Qwen to interact with GSD
    console.log('MCP mode not yet implemented');
    process.exit(0);
  }

  // Default: sync GSD to Qwen
  if (!fs.existsSync(PLANNING_DIR)) {
    console.error(`Error: Planning directory not found: ${PLANNING_DIR}`);
    console.error('Make sure you are running this from the project root.');
    process.exit(1);
  }

  ensureDir(QWEN_DIR);

  const fileCount = syncToQwen();

  const manifest = generateManifest(fileCount);
  fs.writeFileSync(
    MANIFEST_FILE,
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );

  console.log(`Synced ${fileCount} GSD files to Qwen workspace`);
  console.log(`- Context file: ~/.qwen/gsd-context.md`);
  console.log(`- Manifest: ~/.qwen/gsd-bridge-manifest.json`);
}

main();

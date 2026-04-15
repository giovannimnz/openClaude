#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function loadJson(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i += 1;
      } else {
        result[key] = 'true';
      }
    }
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const instance = args.instance || process.env.IFLOW_INSTANCE || '1';

const targetHome = process.env.IFLOW_HOME || args.home || path.join(os.homedir(), `.iflow${instance}`);
const sourceHome = process.env.IFLOW_SOURCE_HOME || args.sourceHome || path.join(os.homedir(), '.iflow');
const sourceSettingsPath = path.join(sourceHome, 'settings.json');
const targetSettingsPath = path.join(targetHome, 'settings.json');

const apiKey = process.env.IFLOW_API_KEY || '';

const sourceSettings = loadJson(sourceSettingsPath, {});
const targetSettings = loadJson(targetSettingsPath, {});

const merged = {
  ...sourceSettings,
  ...targetSettings,
};

// Force auth mode by API key for this profile.
merged.selectedAuthType = 'iflow';
if (apiKey) {
  merged.apiKey = apiKey;
  merged.searchApiKey = apiKey;
}

// Keep MCPs synchronized from the source profile when available.
if (sourceSettings.mcpServers && typeof sourceSettings.mcpServers === 'object') {
  merged.mcpServers = sourceSettings.mcpServers;
}

ensureDir(targetHome);
for (const dirName of ['cache', 'config', 'log', 'projects', 'skills', 'tmp']) {
  ensureDir(path.join(targetHome, dirName));
}

fs.writeFileSync(targetSettingsPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');

const meta = {
  managedBy: 'gsd-iflow-multi-instance',
  instance,
  targetHome,
  sourceHome,
  mcpServerCount: merged.mcpServers ? Object.keys(merged.mcpServers).length : 0,
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(path.join(targetHome, 'gsd-instance-meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');

console.log(`iflow profile ${instance} ready: ${targetHome}`);
console.log(`mcp servers: ${meta.mcpServerCount}`);

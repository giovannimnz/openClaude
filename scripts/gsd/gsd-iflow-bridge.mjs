#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_CLAUDE_COMMANDS = path.join(ROOT, '.claude', 'commands', 'gsd');
const SRC_CLAUDE_AGENTS = path.join(ROOT, '.claude', 'agents');
const DST_IFLOW_COMMANDS = path.join(ROOT, '.iflow', 'commands');
const DST_IFLOW_AGENTS = path.join(ROOT, '.iflow', 'agents');

const GENERATED_MARKER = 'generated-by: gsd-iflow-bridge';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
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

function escapeTomlBasicString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function cleanupGeneratedFiles() {
  for (const [dir, prefix, ext] of [
    [DST_IFLOW_COMMANDS, 'gsd-', '.toml'],
    [DST_IFLOW_AGENTS, 'gsd-', '.md'],
  ]) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.startsWith(prefix) || !file.endsWith(ext)) continue;
      const fullPath = path.join(dir, file);
      try {
        const content = readText(fullPath);
        if (content.includes(GENERATED_MARKER)) {
          fs.unlinkSync(fullPath);
        }
      } catch {
        // Ignore unreadable files
      }
    }
  }
}

function renderIflowCommand(sourceFileName, sourceRelativePath, description) {
  const commandName = `gsd-${sourceFileName.replace(/\.md$/, '')}`;
  const safeDescription = escapeTomlBasicString(
    description || `Bridge para /${commandName}`,
  );

  const prompt = `Você está executando um comando bridge do GSD no iFlow.\n\n` +
    `1) PRIMEIRO, leia este arquivo de comando fonte:\n` +
    `   ${sourceRelativePath}\n\n` +
    `2) Execute o conteúdo desse comando integralmente (objective, execution_context e process).\n` +
    `3) Preserve aprovações, checkpoints, validações e protocolos de segurança do GSD.\n` +
    `4) Se o usuário tiver enviado texto adicional junto do comando, trate como ARGUMENTS do comando GSD.\n` +
    `5) Não simplifique o workflow; siga a orquestração definida no arquivo fonte.`;

  return {
    commandName,
    content: `# ${GENERATED_MARKER}\n# source: ${sourceRelativePath}\ndescription = "${safeDescription}"\n\nprompt = """\n${prompt}\n"""\n`,
  };
}

function renderIflowAgent(sourceFileName, sourceRelativePath, description, color, body) {
  const agentName = sourceFileName.replace(/\.md$/, '');
  const desc = description || `Agente bridge para ${agentName}`;
  const chosenColor = color || 'blue';

  return {
    agentName,
    content: `---\nagent-type: ${agentName}\nname: ${agentName}\ndescription: ${desc}\nwhen-to-use: ${desc}\nallowed-tools: \nmodel: inherit\ninherit-tools: true\ninherit-mcps: true\ncolor: ${chosenColor}\n---\n\n<!-- ${GENERATED_MARKER} -->\n<!-- source: ${sourceRelativePath} -->\n\n${body.trim()}\n`,
  };
}

function main() {
  if (!fs.existsSync(SRC_CLAUDE_COMMANDS)) {
    console.error(`Erro: não encontrei ${SRC_CLAUDE_COMMANDS}`);
    process.exit(1);
  }

  if (!fs.existsSync(SRC_CLAUDE_AGENTS)) {
    console.error(`Erro: não encontrei ${SRC_CLAUDE_AGENTS}`);
    process.exit(1);
  }

  ensureDir(DST_IFLOW_COMMANDS);
  ensureDir(DST_IFLOW_AGENTS);
  cleanupGeneratedFiles();

  let commandCount = 0;
  let agentCount = 0;

  for (const file of fs.readdirSync(SRC_CLAUDE_COMMANDS).filter(f => f.endsWith('.md')).sort()) {
    const abs = path.join(SRC_CLAUDE_COMMANDS, file);
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const raw = readText(abs);
    const { frontmatter } = parseFrontmatter(raw);
    const rendered = renderIflowCommand(file, rel, frontmatter.description);
    fs.writeFileSync(path.join(DST_IFLOW_COMMANDS, `${rendered.commandName}.toml`), rendered.content, 'utf8');
    commandCount += 1;
  }

  for (const file of fs.readdirSync(SRC_CLAUDE_AGENTS).filter(f => f.startsWith('gsd-') && f.endsWith('.md')).sort()) {
    const abs = path.join(SRC_CLAUDE_AGENTS, file);
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const raw = readText(abs);
    const { frontmatter, body } = parseFrontmatter(raw);
    const rendered = renderIflowAgent(
      file,
      rel,
      frontmatter.description,
      frontmatter.color,
      body,
    );
    fs.writeFileSync(path.join(DST_IFLOW_AGENTS, `${rendered.agentName}.md`), rendered.content, 'utf8');
    agentCount += 1;
  }

  const manifest = {
    generatedBy: 'gsd-iflow-bridge',
    generatedAt: new Date().toISOString(),
    source: '.claude',
    output: '.iflow',
    commands: commandCount,
    agents: agentCount,
  };

  fs.writeFileSync(
    path.join(ROOT, '.iflow', 'gsd-bridge-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );

  console.log(`Bridge gerado com sucesso.`);
  console.log(`- Comandos iFlow: ${commandCount} arquivos em .iflow/commands`);
  console.log(`- Agentes iFlow: ${agentCount} arquivos em .iflow/agents`);
  console.log(`- Manifesto: .iflow/gsd-bridge-manifest.json`);
}

main();

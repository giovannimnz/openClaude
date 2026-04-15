# GSD 1.34.x bridge para iFlow + Qoder

Este projeto usa `.claude/` como **fonte única** do GSD.

## Arquitetura (estável para ambos)

- **Fonte única:** `.claude/` (comandos, agentes, workflows do GSD)
- **Qoder:** lê `.claude` diretamente com `--with-claude-config`
- **iFlow:** consome bridge em `.iflow/` gerada automaticamente a partir da `.claude`

---

## Scripts disponíveis

- `scripts/gsd-iflow-bridge.mjs`
  - Gera bridge:
    - `.claude/commands/gsd/*.md` -> `.iflow/commands/gsd-*.toml`
    - `.claude/agents/gsd-*.md` -> `.iflow/agents/gsd-*.md`

- `scripts/gsd-sync-clis.sh`
  - Sincroniza iFlow com a fonte `.claude`
  - `--update-source`: atualiza GSD da `.claude` antes de sincronizar
  - `--quiet`: saída reduzida (bom para wrappers/hooks)

- `scripts/qoder-gsd.sh`
  - Faz sync silencioso e inicia Qoder com `--with-claude-config`

- `scripts/iflow-gsd.sh`
  - Compatibilidade: inicia `iflow1` (instância 1)

- `scripts/iflow-instance-bootstrap.mjs`
  - Inicializa perfil isolado de iFlow por `IFLOW_HOME`
  - Sincroniza MCPs da configuração base (`~/.iflow/settings.json`)

- `scripts/iflow-instance.sh`
  - Launcher genérico de instância (`1|2|3`) com API key por variável de ambiente

- `scripts/iflow1.sh`, `scripts/iflow2.sh`, `scripts/iflow3.sh`
  - Launchers dedicados para as 3 instâncias

- `scripts/gsd-watch-sync.mjs`
  - Watcher (escuta mudanças em `.claude`) e dispara sync automático

- `scripts/gsd-watch-start.sh`
  - Inicia watcher em background

- `scripts/gsd-watch-stop.sh`
  - Para watcher

- `scripts/gsd-watch-status.sh`
  - Status do watcher

- `scripts/gsd-browser-headless.sh`
  - Wrapper do `gsd-browser` com `--no-open` automático (headless por padrão)

- `scripts/gsd-auto-setup.sh`
  - Instala automações (links de binário local e hooks git)

---

## Fluxo manual (simples)

### Sincronizar iFlow

```bash
./scripts/gsd-sync-clis.sh
```

### Atualizar fonte GSD + sincronizar

```bash
./scripts/gsd-sync-clis.sh --update-source
```

### Abrir Qoder com GSD da `.claude`

```bash
./scripts/qoder-gsd.sh -w /home/ubuntu/docker/AtiusCapital
```

### Abrir iFlow já sincronizado

```bash
./scripts/iflow-gsd.sh
```

---

## Fluxo 100% automático (recomendado)

### 1) Instalar automação

```bash
./scripts/gsd-auto-setup.sh --start-watch
```

Isso faz:
- cria links em `~/.local/bin` e `~/bin`:
  - `qoder-gsd`, `iflow-gsd`, `iflow1`, `iflow2`, `iflow3`, `gsd-sync-clis`, `gsd-watch-start`, `gsd-watch-stop`, `gsd-watch-status`, `gsd-browser`
- instala hooks git (`post-merge`, `post-checkout`, `post-rewrite`) para re-sync automático
- inicia watcher em background
- override transparente:
  - `qoder` -> wrapper com sync + `--with-claude-config`
  - `iflow` -> `iflow1`
  - `gsd-browser` -> wrapper headless (`--no-open` por padrão)

### 2) Uso diário

Após o setup, você pode usar **sem mudar hábito**:

```bash
qoder -w /home/ubuntu/docker/AtiusCapital
iflow      # equivale ao iflow1
```

Instâncias dedicadas:

```bash
iflow1
iflow2
iflow3
```

Cada instância usa:
- `IFLOW_HOME` isolado (`~/.iflow1`, `~/.iflow2`, `~/.iflow3`)
- API key própria via variáveis exportadas no shell:
  - `IFLOW_API_KEY_1`
  - `IFLOW_API_KEY_2`
  - `IFLOW_API_KEY_3`

Também funcionam os comandos de compatibilidade:

```bash
qoder-gsd -w /home/ubuntu/docker/AtiusCapital
iflow-gsd   # compatibilidade: usa iflow1
```

### 3) Controle do watcher

```bash
gsd-watch-status
gsd-watch-stop
gsd-watch-start
```

---

## Observações

- O comportamento do comando GSD no iFlow é definido pelo arquivo fonte da `.claude` (bridge sempre referencia a fonte).
- Se você adicionar/remover comandos ou agentes GSD, o watcher/hooks/sync cuidam da atualização em `.iflow`.
- Se `~/.local/bin` não estiver no PATH, adicione ao shell:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

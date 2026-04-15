# Manual de Uso - GSD Adapter para iFlow e Qoder

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação](#instalação)
3. [Configuração](#configuração)
4. [Uso Básico](#uso-básico)
5. [Uso Avançado](#uso-avançado)
6. [Sincronização Automática](#sincronização-automática)
7. [Múltiplas Instâncias iFlow](#múltiplas-instâncias-iflow)
8. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

Antes de começar, verifique se você tem instalado:

### Obrigatórios

- **iFlow CLI** - [Instalação do iFlow](https://github.com/iflow-ai/iflow)
- **Node.js** v14+ - Para executar scripts .mjs
- **Bash** - Para executar scripts .sh
- **Git** - Para versionamento

### Opcionais

- **Qoder CLI** - Para usar GSD com Qoder

### Verificação

```bash
# Verificar iFlow
iflow --version

# Verificar Node.js
node --version

# Verificar Qoder (opcional)
qoder --version
```

---

## Instalação

### Passo 1: Clonar o Repositório

```bash
git clone https://github.com/giovannimnz/get-shit-done-adapter.git
cd get-shit-done-adapter
```

### Passo 2: Instalar o Adapter

Execute o script de setup automático:

```bash
./scripts/gsd-auto-setup.sh --start-watch
```

Este comando faz:

1. Cria links simbólicos em `~/.local/bin` e `~/bin`
2. Instala hooks Git para sincronização automática
3. Inicia o watcher em background
4. Configura overrides transparentes para `qoder` e `iflow`

### Passo 3: Verificar Instalação

```bash
# Verificar se os links foram criados
ls -la ~/.local/bin/qoder-gsd
ls -la ~/.local/bin/iflow-gsd

# Verificar status do watcher
gsd-watch-status
```

---

## Configuração

### PATH

Se `~/.local/bin` não estiver no PATH, adicione ao seu shell:

```bash
# Para Bash (~/.bashrc)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Para Zsh (~/.zshrc)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### API Keys para iFlow (Múltiplas Instâncias)

Configure API keys para cada instância de iFlow:

```bash
# Adicione ao seu ~/.bashrc ou ~/.zshrc
export IFLOW_API_KEY_1="sua-api-key-1"
export IFLOW_API_KEY_2="sua-api-key-2"
export IFLOW_API_KEY_3="sua-api-key-3"
```

---

## Uso Básico

### Com Qoder

```bash
# Método 1: Usando o wrapper diretamente
./scripts/qoder-gsd.sh -w /caminho/do/projeto

# Método 2: Após setup (recomendado)
qoder -w /caminho/do/projeto

# O wrapper automaticamente:
# 1. Sincroniza GSD com iFlow
# 2. Inicia Qoder com --with-claude-config
```

### Com iFlow

```bash
# Método 1: Usando o wrapper diretamente
./scripts/iflow-gsd.sh

# Método 2: Após setup (recomendado)
iflow      # Equivale a iflow1

# Instâncias dedicadas
iflow1     # Instância 1 (padrão)
iflow2     # Instância 2
iflow3     # Instância 3
```

### Sincronização Manual

```bash
# Sincronizar iFlow com .claude
./scripts/gsd-sync-clis.sh

# Atualizar GSD da fonte + sincronizar
./scripts/gsd-sync-clis.sh --update-source
```

---

## Uso Avançado

### Comandos GSD Disponíveis

Após a instalação, você pode usar comandos GSD em ambas as CLIs:

#### Comandos Principais

```bash
# Criar novo projeto
gsd-new-project

# Criar nova milestone
gsd-new-milestone

# Planejar fase
gsd-plan-phase

# Executar fase
gsd-execute-phase

# Verificar fase
gsd-verify-phase

# Code review
gsd-code-review

# Documentação
gsd-docs-update
```

#### Workflows

```bash
# Modo autônomo
gsd-autonomous

# Explorar codebase
gsd-explore

# Verificar saúde
gsd-health

# Progresso
gsd-progress

# Estatísticas
gsd-stats
```

### Browser Headless

```bash
# Executar GSD Browser em modo headless
./scripts/gsd-browser-headless.sh

# Ou após setup
gsd-browser  # Automaticamente usa --no-open
```

---

## Sincronização Automática

### Watcher

O watcher monitora mudanças em `.claude/` e sincroniza automaticamente com `.iflow/`:

```bash
# Iniciar watcher
./scripts/gsd-watch-start.sh
# ou
gsd-watch-start

# Verificar status
./scripts/gsd-watch-status.sh
# ou
gsd-watch-status

# Parar watcher
./scripts/gsd-watch-stop.sh
# ou
gsd-watch-stop
```

### Hooks Git

O setup instala hooks Git que disparam sincronização automaticamente:

- `post-merge` - Após pull
- `post-checkout` - Após checkout de branch
- `post-rewrite` - Após rebase/amend

---

## Múltiplas Instâncias iFlow

### Por que Múltiplas Instâncias?

- Trabalhar em múltiplos projetos simultaneamente
- Usar diferentes API keys
- Isolar configurações por projeto

### Configuração

```bash
# 1. Configure API keys
export IFLOW_API_KEY_1="key-projeto-1"
export IFLOW_API_KEY_2="key-projeto-2"
export IFLOW_API_KEY_3="key-projeto-3"

# 2. Cada instância usa um diretório isolado
# ~/.iflow1  -> Instância 1
# ~/.iflow2  -> Instância 2
# ~/.iflow3  -> Instância 3
```

### Uso

```bash
# Instância 1 (padrão)
iflow1
iflow      # Alias para iflow1

# Instância 2
iflow2

# Instância 3
iflow3
```

---

## Troubleshooting

### Problema: Comando não encontrado

```bash
# Verificar PATH
echo $PATH | grep -o ".local/bin"

# Se não encontrar, adicionar ao PATH
export PATH="$HOME/.local/bin:$PATH"
```

### Problema: Watcher não inicia

```bash
# Verificar se Node.js está instalado
node --version

# Verificar permissões
chmod +x scripts/gsd-watch-*.sh scripts/gsd-watch-*.mjs

# Verificar processos existentes
ps aux | grep gsd-watch
```

### Problema: Sincronização não funciona

```bash
# Sincronizar manualmente
./scripts/gsd-sync-clis.sh

# Verificar arquivos fonte
ls -la .claude/get-shit-done/

# Verificar bridge gerado
ls -la .iflow/commands/
ls -la .iflow/agents/
```

### Problema: iFlow não reconhece comandos GSD

```bash
# Regenerar bridge
./scripts/gsd-iflow-bridge.mjs

# Verificar configuração do iFlow
cat ~/.iflow/settings.json
```

### Problema: Qoder não carrega GSD

```bash
# Verificar se Qoder suporta --with-claude-config
qoder --help | grep "with-claude-config"

# Se não suportar, usar versão mais recente do Qoder
```

---

## Logs e Debug

### Verificar Logs do Watcher

```bash
cat .iflow/gsd-watch.log
```

### Debug do Bridge

```bash
# Executar bridge com output verbose
node scripts/gsd-iflow-bridge.mjs
```

---

## Reinstalação

Se precisar reinstalar:

```bash
# Parar watcher
./scripts/gsd-watch-stop.sh

# Remover links
rm -f ~/.local/bin/qoder-gsd ~/.local/bin/iflow-gsd
rm -f ~/.local/bin/iflow1 ~/.local/bin/iflow2 ~/.local/bin/iflow3
rm -f ~/.local/bin/gsd-*

# Remover hooks
rm -f .git/hooks/post-merge .git/hooks/post-checkout .git/hooks/post-rewrite

# Reinstalar
./scripts/gsd-auto-setup.sh --start-watch
```

---

## Suporte

Para problemas ou dúvidas:

1. Verifique este manual
2. Consulte [GSD-IFLOW-QODER.md](GSD-IFLOW-QODER.md)
3. Abra uma issue no repositório

---

## Atualização

Para atualizar o adapter:

```bash
cd get-shit-done-adapter
git pull origin main
./scripts/gsd-auto-setup.sh --start-watch
```

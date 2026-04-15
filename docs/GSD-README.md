# Get Shit Done (GSD) - Adapter para iFlow e Qoder

Este repositório contém o adapter que permite usar o **Get Shit Done (GSD)** tanto no **iFlow CLI** quanto no **Qoder CLI**, com sincronização automática e pasta única compartilhada.

## O que é este adapter?

O GSD é um sistema de workflows e comandos para automação de desenvolvimento de software. Este adapter permite:

- Usar GSD tanto no iFlow quanto no Qoder
- Sincronização automática entre as duas CLIs
- Pasta única `.claude/` como fonte de verdade
- Bridge automático para iFlow em `.iflow/`

## Estrutura

```
get-shit-done-adapter/
├── scripts/              # Scripts de automação e bridge
│   ├── gsd-iflow-bridge.mjs      # Gera bridge para iFlow
│   ├── gsd-sync-clis.sh          # Sincroniza iFlow com .claude
│   ├── gsd-watch-*.sh/mjs        # Watcher para sync automático
│   ├── qoder-gsd.sh              # Launcher do Qoder com GSD
│   ├── iflow-gsd.sh              # Launcher do iFlow com GSD
│   └── iflow-instance*.sh/mjs    # Gerenciamento de instâncias iFlow
├── .claude/              # Fonte única do GSD
│   └── get-shit-done/    # Comandos, agentes, workflows
├── .iflow/               # Bridge gerado para iFlow
│   ├── commands/         # Comandos GSD em formato TOML
│   └── agents/           # Agentes GSD
├── GSD-IFLOW-QODER.md    # Documentação completa
└── MANUAL.md             # Manual de uso passo a passo
```

## Instalação Rápida

```bash
# 1. Clone este repositório
git clone https://github.com/giovannimnz/get-shit-done-adapter.git
cd get-shit-done-adapter

# 2. Execute o setup automático
./scripts/gsd-auto-setup.sh --start-watch

# 3. Pronto! Use GSD em ambas as CLIs
qoder -w /seu/projeto
iflow  # (equivale a iflow1)
```

## Uso

### Com Qoder

```bash
# Método 1: Direto
./scripts/qoder-gsd.sh -w /caminho/do/projeto

# Método 2: Após setup (recomendado)
qoder -w /caminho/do/projeto
```

### Com iFlow

```bash
# Método 1: Instância única
./scripts/iflow-gsd.sh

# Método 2: Múltiplas instâncias (após setup)
iflow1  # Instância 1
iflow2  # Instância 2
iflow3  # Instância 3
```

## Sincronização Automática

O adapter inclui um watcher que mantém iFlow sincronizado com as mudanças em `.claude/`:

```bash
# Iniciar watcher
./scripts/gsd-watch-start.sh

# Verificar status
./scripts/gsd-watch-status.sh

# Parar watcher
./scripts/gsd-watch-stop.sh
```

## Pré-requisitos

- **iFlow CLI** instalado
- **Qoder CLI** instalado (opcional)
- **Node.js** (para scripts .mjs)
- **Bash** (para scripts .sh)

## Documentação

- [MANUAL.md](MANUAL.md) - Manual completo de uso
- [GSD-IFLOW-QODER.md](GSD-IFLOW-QODER.md) - Documentação técnica

## Licença

Este adapter é distribuído sob a mesma licença do projeto GSD original.

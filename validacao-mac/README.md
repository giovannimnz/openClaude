# Validação Mac - OpenClaude

Scripts de diagnóstico para investigar problemas no macOS.

## Uso

```bash
# Rodar todos os checks
bash run-all.sh

# Ou rodar individualmente
bash 1-check-tty.sh          # Verificar TTY
bash 2-check-node-version.sh # Verificar versão do Node
bash 3-check-keychain.sh     # Verificar acesso ao Keychain
bash 4-check-terminal-env.sh # Verificar ambiente do terminal
bash 5-run-cli.sh            # Rodar o CLI
```

## Problemas Conhecidos

### 1. TTY não detectado
- **Sintoma**: `stdout.isTTY: undefined`
- **Causa**: Output redirecionado ou pipe
- **Solução**: Rodar diretamente no terminal, sem redirecionamento

### 2. Node < 20
- **Sintoma**: Erros de import/export
- **Solução**: `brew install node@20` ou use nvm

### 3. Keychain bloqueado
- **Sintoma**: CLI trava no startup
- **Solução**: Abra "Keychain Access" e desbloqueie o keychain

### 4. Apple Terminal
- **Nota**: Apple Terminal usa Option+Enter para newlines (não Shift+Enter)
- **Dica**: Considere usar iTerm2 para melhor compatibilidade

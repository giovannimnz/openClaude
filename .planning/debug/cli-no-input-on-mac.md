---
status: investigating
trigger: CLI shows startup screen but no interactive input on Mac - input box never appears
created: 2026-04-15
updated: 2026-04-15
---

# Debug Session: cli-no-input-on-mac

## Symptoms

**Expected behavior:**
After running `node dist/cli.mjs`, the CLI should show the startup screen and then display an interactive text input box where user can type commands like `/help`, `/provider`, `/auth login`.

**Actual behavior:**
The startup screen appears showing:
- Provider: Google Gemini CLI
- Model: gemini-2.5-pro  
- Endpoint: https://cloudcodeassist.googleapis.com/v1
- Ready - type /help to begin
- openclaude v0.3.0

But the interactive text input box never appears. The user cannot type anything.

**Error messages:**
No error messages displayed. The CLI just shows the startup screen and then nothing happens.

**Timeline:**
- Started when testing the Google Gemini CLI integration on Mac
- Build completes successfully (bun run build)
- Issue occurs with all commands: `node dist/cli.mjs`, `node dist/cli.mjs /provider`, `node dist/cli.mjs /auth login`

**Reproduction:**
1. Clone repository on Mac
2. Run `bun install`
3. Run `bun run build`
4. Run `node dist/cli.mjs`
5. Observe startup screen appears but no input box

**Environment:**
- OS: macOS (user also tested on Windows with same result)
- Terminal: zsh on Mac
- Node: v25.9.0
- Bun: 1.3.12

## Current Focus

**hypothesis:** The REPL component is not being rendered or stdin is not properly connected after the startup screen is printed.

**test:** Added comprehensive debug logging to track execution flow:
- After startup screen is printed
- Before/after cliMain() call  
- At start of main() function
- Before launchRepl() call

**expecting:** The logs will show exactly where execution stops, revealing if launchRepl is called and if it completes.

**next_action:** User needs to test with the new debug version and share the console output to see which logs appear.

## Evidence

- Build completes successfully: `✓ Built openclaude v0.3.0 → dist/cli.mjs`
- Startup screen is printed in entrypoints/cli.tsx via printStartupScreen()
- REPL is launched via launchRepl() in main.tsx
- Previous fix commit afed73f addressed similar keyboard freeze issues on Windows and Mac
- Added debug logging throughout the execution flow (commit 0c38317):
  * After startup screen print
  * Before/after cliMain() call
  * At start of main() function
  * Before launchRepl() call
  * Inside launchRepl() function
  * Inside renderAndRun() function

## Eliminated

## Resolution

**Status:** Aguardando teste com versão de debug

**Próximos passos para o usuário:**
1. Fazer git pull para obter a versão mais recente com debug logging
2. Rodar `bun run build` para compilar
3. Executar `node dist/cli.mjs`
4. Copiar TODO o output do console (incluindo as mensagens [DEBUG])
5. Compartilhar o output para que possamos identificar onde o fluxo está falhando

**O que esperamos ver:**
As mensagens [DEBUG] devem mostrar o fluxo completo:
- `[DEBUG] Startup screen printed`
- `[DEBUG] About to call cliMain()...`
- `[DEBUG] cliMain() completed`
- `[DEBUG] main() function started`
- `[DEBUG] About to call launchRepl with root and sessionConfig`
- `[DEBUG] launchRepl: Starting REPL...`
- `[DEBUG] launchRepl: App and REPL imported successfully`
- `[DEBUG] launchRepl: REPL rendered successfully`

Se alguma dessas mensagens não aparecer, saberemos exatamente onde o problema está ocorrendo.

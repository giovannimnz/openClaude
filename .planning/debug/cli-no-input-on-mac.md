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

**test:** Check if the launchRepl function is being called and if stdin/TTY handling is correct.

**expecting:** launchRepl should render the App component with REPL, which should show the interactive input.

**next_action:** Investigate the flow from startup screen to REPL rendering.

## Evidence

- Build completes successfully: `✓ Built openclaude v0.3.0 → dist/cli.mjs`
- Startup screen is printed in entrypoints/cli.tsx via printStartupScreen()
- REPL is launched via launchRepl() in main.tsx
- Previous fix commit afed73f addressed similar keyboard freeze issues on Windows and Mac

## Eliminated

## Resolution


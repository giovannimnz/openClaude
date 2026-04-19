# Architecture

**Analysis Date:** 2026-04-19

## Pattern Overview

**Overall:** CLI application with React-based terminal UI (Ink), plugin/tool architecture, and multi-provider LLM integration.

**Key Characteristics:**
- Interactive REPL-based CLI with React/Ink terminal rendering
- Tool-based agent architecture where each capability is a discrete tool
- Multi-provider LLM support (Anthropic, OpenAI, Codex, Gemini, Ollama, etc.)
- Plugin and skills system for extensibility
- State management via custom store pattern
- MCP (Model Context Protocol) integration for tool/resource sharing

## Layers

**Entrypoints Layer:**
- Purpose: CLI bootstrap, argument parsing, fast-path routing
- Location: `src/entrypoints/`
- Contains: `cli.tsx` (main CLI entry), `init.ts` (initialization), `mcp.ts`, `sdk/`
- Depends on: All other layers
- Used by: `bin/claude` shell script launcher

**Screens Layer:**
- Purpose: Top-level UI screens rendered via Ink
- Location: `src/screens/`
- Contains: `REPL.tsx` (main interactive loop), `Doctor.tsx`, `ResumeConversation.tsx`
- Depends on: Components, State, Hooks, Context
- Used by: Entrypoints via `replLauncher.tsx`

**Components Layer:**
- Purpose: React (Ink) UI components for terminal rendering
- Location: `src/components/`
- Contains: `App.tsx`, permission dialogs, messages, diff views, settings, agent UIs
- Depends on: Hooks, Context, State, Services
- Used by: Screens

**Tools Layer:**
- Purpose: Individual agent capabilities (file ops, bash, web, search, etc.)
- Location: `src/tools/`
- Contains: One directory per tool (e.g., `BashTool/`, `FileEditTool/`, `GrepTool/`, `AgentTool/`)
- Depends on: Services, Utils, Permissions
- Used by: LLM agent loop (tool calls from model responses)

**Commands Layer:**
- Purpose: Slash commands available in the REPL (user-invoked)
- Location: `src/commands/`
- Contains: One directory per command (~100+ commands: `model/`, `config/`, `memory/`, etc.)
- Depends on: Services, State, Utils
- Used by: REPL input handler

**Services Layer:**
- Purpose: Business logic, API clients, integrations
- Location: `src/services/`
- Contains: `api/` (LLM provider clients), `oauth/`, `mcp/`, `lsp/`, `github/`, `analytics/`, `plugins/`
- Depends on: Utils, Types
- Used by: Tools, Commands, Hooks, Components

**State Layer:**
- Purpose: Application state management
- Location: `src/state/`
- Contains: `AppStateStore.ts`, `store.ts`, `selectors.ts`
- Depends on: Types
- Used by: Components, Hooks, Screens

**Hooks Layer:**
- Purpose: React hooks for UI logic and side effects
- Location: `src/hooks/`
- Contains: 80+ hooks for input, permissions, IDE integration, voice, tasks
- Depends on: Services, State, Context
- Used by: Components, Screens

**Skills Layer:**
- Purpose: Bundled and user-defined skill extensions
- Location: `src/skills/`
- Contains: `bundled/` (built-in skills), `loadSkillsDir.ts`, `mcpSkillBuilders.ts`
- Depends on: Services, Utils
- Used by: Tool execution layer

**Utils Layer:**
- Purpose: Shared utilities, helpers, low-level concerns
- Location: `src/utils/`
- Contains: `bash/`, `git/`, `github/`, `permissions/`, `model/`, `sandbox/`, `shell/`, `telemetry/`
- Depends on: Types, Constants
- Used by: All other layers

**Tasks Layer:**
- Purpose: Background and parallel task execution
- Location: `src/tasks/`
- Contains: `LocalAgentTask/`, `RemoteAgentTask/`, `LocalShellTask/`, `DreamTask/`
- Depends on: Services, Utils
- Used by: Tools (AgentTool, TaskCreateTool)

**Remote Layer:**
- Purpose: Remote session management and permissions bridging
- Location: `src/remote/`
- Contains: `RemoteSessionManager.ts`, `SessionsWebSocket.ts`, `remotePermissionBridge.ts`
- Depends on: Services, CLI transports
- Used by: Entrypoints (remote mode)

## Data Flow

**User Input → LLM Response → Tool Execution:**

1. User types in REPL (`src/screens/REPL.tsx`)
2. Input processed via hooks (`src/hooks/useTextInput.ts`, `src/hooks/useCommandQueue.ts`)
3. If slash command → dispatched to `src/commands/` handler
4. If natural language → sent to LLM via `src/services/api/client.ts`
5. LLM response streamed; tool calls extracted
6. Tool calls routed to `src/tools/{ToolName}/` for execution
7. Permission checks via `src/hooks/toolPermission/` and `src/components/permissions/`
8. Tool results appended to conversation, sent back to LLM
9. UI updated via React/Ink re-render from state changes

**Provider Routing:**
1. Provider profile loaded at startup (`src/utils/providerProfile.ts`)
2. API shims normalize provider-specific formats (`src/services/api/openaiShim.ts`, `src/services/api/codexShim.ts`)
3. Requests routed to configured provider via `src/services/api/client.ts`

**State Management:**
- Custom store in `src/state/AppStateStore.ts`
- React context providers in `src/context/`
- Selectors in `src/state/selectors.ts`

## Key Abstractions

**Tool:**
- Purpose: A discrete capability the LLM agent can invoke
- Examples: `src/tools/BashTool/BashTool.tsx`, `src/tools/FileEditTool/`, `src/tools/GrepTool/`
- Pattern: Each tool has its own directory with implementation, UI component, permissions, and prompt

**Command:**
- Purpose: A user-invoked slash command in the REPL
- Examples: `src/commands/model/`, `src/commands/config/`, `src/commands/memory/`
- Pattern: One directory per command with implementation file

**Skill:**
- Purpose: Reusable capability packages (bundled or user-defined)
- Examples: `src/skills/bundled/loop.ts`, `src/skills/bundled/claudeApi.ts`
- Pattern: Single file per skill, registered via `src/skills/bundledSkills.ts`

**Provider Shim:**
- Purpose: Normalize different LLM API formats to a common interface
- Examples: `src/services/api/openaiShim.ts`, `src/services/api/codexShim.ts`
- Pattern: Adapts provider-specific request/response to Anthropic SDK format

**Task:**
- Purpose: Background/parallel execution unit for agents and shells
- Examples: `src/tasks/LocalAgentTask/`, `src/tasks/RemoteAgentTask/`
- Pattern: Class-based with lifecycle management

## Entry Points

**`bin/claude`:**
- Location: `bin/claude`
- Triggers: CLI invocation (`claude` command)
- Responsibilities: Shell launcher that invokes `dist/cli.mjs`

**`src/entrypoints/cli.tsx`:**
- Location: `src/entrypoints/cli.tsx`
- Triggers: Main process entry
- Responsibilities: Arg parsing, fast-path routing, provider validation, launches REPL or sub-mode

**`src/entrypoints/mcp.ts`:**
- Location: `src/entrypoints/mcp.ts`
- Triggers: MCP server mode
- Responsibilities: Runs Claude Code as an MCP server

**`src/entrypoints/sdk/`:**
- Location: `src/entrypoints/sdk/`
- Triggers: Programmatic SDK usage
- Responsibilities: Exposes Claude Code as a library

## Error Handling

**Strategy:** Mix of try/catch with error utilities, permission-gated operations, and graceful shutdown

**Patterns:**
- `src/utils/errors.ts` provides `errorMessage()` helper and typed errors like `ConfigParseError`
- `src/services/api/errors.ts` and `src/services/api/errorUtils.ts` handle API-specific errors
- `src/services/api/withRetry.ts` implements retry logic for transient failures
- `src/utils/gracefulShutdown.ts` handles process cleanup
- Tool execution wrapped in permission checks before execution

## Cross-Cutting Concerns

**Logging:** Debug logging via `src/utils/debug.ts` (`logForDebugging`), diagnostics via `src/utils/diagLogs.ts`, internal logging service at `src/services/internalLogging.ts`

**Validation:** Provider validation at `src/utils/providerValidation.ts`, tool input validation within each tool, policy limits at `src/services/policyLimits/`

**Authentication:** OAuth flow at `src/services/oauth/`, GitHub credentials at `src/utils/githubModelsCredentials.ts`, API key verification at `src/hooks/useApiKeyVerification.ts`

**Telemetry:** OpenTelemetry-based at `src/utils/telemetry/`, with opt-out at `src/services/api/metricsOptOut.ts`

**Permissions:** Tool permission system at `src/hooks/toolPermission/`, filesystem permissions at `src/utils/permissions/`, sandbox mode at `src/utils/sandbox/`

---

*Architecture analysis: 2026-04-19*

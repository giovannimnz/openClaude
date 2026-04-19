# Codebase Structure

**Analysis Date:** 2026-04-19

## Directory Layout

```
openClaude/
├── bin/                    # CLI launcher scripts (claude, openclaude)
├── docs/                   # Documentation
├── examples/               # Example configurations
├── install/                # Installation scripts
├── python/                 # Python utilities
├── scripts/                # Build, setup, and dev scripts
│   ├── setup/              # Installation/setup tooling
│   └── gsd/                # GSD planning scripts
├── src/                    # Main source code
│   ├── __tests__/          # Top-level integration tests
│   ├── assistant/          # Assistant mode logic
│   ├── bootstrap/          # Bootstrap/startup state
│   ├── bridge/             # Remote control bridge mode
│   ├── buddy/              # Buddy/companion feature
│   ├── cli/                # CLI I/O, transports, handlers
│   │   ├── handlers/       # CLI subcommand handlers
│   │   └── transports/     # WebSocket, SSE, hybrid transports
│   ├── commands/           # ~100+ slash commands (one dir each)
│   ├── components/         # React/Ink UI components
│   │   ├── agents/         # Agent-related UI
│   │   ├── diff/           # Diff display components
│   │   ├── messages/       # Message rendering
│   │   ├── permissions/    # Permission request dialogs
│   │   └── ...             # Many more UI modules
│   ├── constants/          # App constants, prompts, tools config
│   ├── context/            # React context providers
│   ├── coordinator/        # Multi-agent coordinator mode
│   ├── entrypoints/        # App entry points (cli, mcp, sdk)
│   ├── grpc/               # gRPC server integration
│   ├── hooks/              # React hooks (80+ hooks)
│   │   ├── notifs/         # Notification hooks
│   │   └── toolPermission/ # Tool permission hooks
│   ├── ink/                # Custom Ink (terminal React) runtime
│   │   ├── components/     # Low-level Ink components
│   │   ├── events/         # Terminal event handling
│   │   ├── hooks/          # Ink-specific hooks
│   │   ├── layout/         # Terminal layout engine
│   │   └── termio/         # Terminal I/O
│   ├── keybindings/        # Keyboard shortcut management
│   ├── memdir/             # Memory directory operations
│   ├── migrations/         # Data migrations
│   ├── moreright/          # Additional right-panel UI
│   ├── native-ts/          # Native TypeScript implementations
│   ├── outputStyles/       # Output formatting styles
│   ├── plugins/            # Plugin system
│   │   └── bundled/        # Built-in plugins
│   ├── proto/              # Protobuf definitions
│   ├── query/              # Query/search utilities
│   ├── remote/             # Remote session management
│   ├── schemas/            # JSON schemas
│   ├── screens/            # Top-level screen components
│   ├── server/             # Server mode
│   ├── services/           # Business logic services
│   │   ├── api/            # LLM API clients and shims
│   │   ├── analytics/      # Analytics service
│   │   ├── compact/        # Context compaction
│   │   ├── github/         # GitHub integration
│   │   ├── lsp/            # Language Server Protocol
│   │   ├── mcp/            # MCP service layer
│   │   ├── oauth/          # OAuth authentication
│   │   ├── plugins/        # Plugin management service
│   │   ├── policyLimits/   # Policy/rate limiting
│   │   └── tools/          # Tool-related services
│   ├── skills/             # Skills system
│   │   └── bundled/        # Built-in skills
│   ├── state/              # Application state management
│   ├── tasks/              # Background task types
│   │   ├── LocalAgentTask/ # Local agent execution
│   │   ├── RemoteAgentTask/# Remote agent execution
│   │   └── LocalShellTask/ # Shell task execution
│   ├── tools/              # Agent tools (one dir each)
│   │   ├── AgentTool/      # Sub-agent spawning
│   │   ├── BashTool/       # Shell command execution
│   │   ├── FileEditTool/   # File editing
│   │   ├── FileReadTool/   # File reading
│   │   ├── FileWriteTool/  # File writing
│   │   ├── GlobTool/       # File pattern matching
│   │   ├── GrepTool/       # Content search
│   │   ├── MCPTool/        # MCP tool proxy
│   │   ├── WebFetchTool/   # Web fetching
│   │   ├── WebSearchTool/  # Web search
│   │   └── ...             # 30+ more tools
│   ├── types/              # TypeScript type definitions
│   │   └── generated/      # Auto-generated proto types
│   ├── upstreamproxy/      # Proxy configuration
│   ├── utils/              # Shared utilities
│   │   ├── bash/           # Bash execution helpers
│   │   ├── git/            # Git utilities
│   │   ├── github/         # GitHub API helpers
│   │   ├── mcp/            # MCP utilities
│   │   ├── model/          # Model selection/config
│   │   ├── permissions/    # Permission utilities
│   │   ├── sandbox/        # Sandbox execution
│   │   ├── settings/       # Settings management
│   │   ├── shell/          # Shell utilities
│   │   ├── swarm/          # Multi-agent swarm
│   │   └── telemetry/      # Telemetry utilities
│   ├── vim/                # Vim mode support
│   └── voice/              # Voice input support
├── vscode-extension/       # VS Code extension
├── validacao-mac/          # Mac validation scripts
├── Dockerfile              # Container build
├── package.json            # Package manifest
├── tsconfig.json           # TypeScript config
└── bun.lock                # Bun lockfile
```

## Directory Purposes

**`src/entrypoints/`:**
- Purpose: Application entry points for different modes
- Contains: CLI bootstrap (`cli.tsx`), initialization (`init.ts`), MCP server (`mcp.ts`), SDK entry
- Key files: `cli.tsx`, `init.ts`

**`src/tools/`:**
- Purpose: All capabilities the LLM agent can invoke
- Contains: One directory per tool with implementation, UI, permissions
- Key files: `BashTool/BashTool.tsx`, `FileEditTool/`, `AgentTool/`

**`src/commands/`:**
- Purpose: User-invoked slash commands in the REPL
- Contains: ~100+ command directories
- Key files: `model/`, `config/`, `help/`, `memory/`, `skills/`

**`src/services/api/`:**
- Purpose: LLM provider abstraction and API communication
- Contains: Provider-specific shims, client logic, retry, errors
- Key files: `client.ts`, `openaiShim.ts`, `codexShim.ts`, `providerConfig.ts`

**`src/components/`:**
- Purpose: Terminal UI components (React/Ink)
- Contains: All visual components, dialogs, message rendering
- Key files: `App.tsx`, `permissions/`, `messages/`, `PromptInput/`

**`src/state/`:**
- Purpose: Centralized application state
- Contains: Store, selectors, state types
- Key files: `AppStateStore.ts`, `store.ts`, `selectors.ts`

**`src/hooks/`:**
- Purpose: React hooks for input handling, permissions, integrations
- Contains: 80+ hook files
- Key files: `useTextInput.ts`, `toolPermission/`, `useCommandQueue.ts`

**`src/utils/`:**
- Purpose: Shared utilities used across the application
- Contains: Categorized utility modules
- Key files: `providerProfile.ts`, `providerValidation.ts`, `config.ts`, `auth.ts`

## Key File Locations

**Entry Points:**
- `bin/claude`: Shell launcher script
- `src/entrypoints/cli.tsx`: Main CLI entry, arg parsing, mode routing
- `src/entrypoints/init.ts`: Application initialization (configs, auth, telemetry)
- `src/replLauncher.tsx`: Launches the REPL screen with React/Ink

**Configuration:**
- `package.json`: Dependencies, scripts, metadata
- `tsconfig.json`: TypeScript compiler configuration
- `src/constants/prompts.ts`: System prompt generation
- `src/constants/tools.ts`: Tool configuration/registration
- `src/utils/config.ts`: User configuration management

**Core Logic:**
- `src/services/api/client.ts`: LLM API client
- `src/services/api/openaiShim.ts`: OpenAI-compatible provider adapter
- `src/services/api/codexShim.ts`: Codex provider adapter
- `src/state/AppStateStore.ts`: Application state store
- `src/screens/REPL.tsx`: Main interactive loop

**Testing:**
- `src/__tests__/`: Top-level integration tests
- `src/**/*.test.ts`: Co-located unit tests (same directory as implementation)

## Naming Conventions

**Files:**
- Components: PascalCase `.tsx` (e.g., `App.tsx`, `REPL.tsx`)
- Tools: PascalCase directory with matching `.tsx` (e.g., `BashTool/BashTool.tsx`)
- Utils/Services: camelCase `.ts` (e.g., `providerProfile.ts`, `client.ts`)
- Tests: Same name with `.test.ts` suffix (e.g., `client.test.ts`)
- Hooks: `use` prefix, camelCase (e.g., `useTextInput.ts`)

**Directories:**
- Tools: PascalCase (e.g., `BashTool/`, `FileEditTool/`)
- Commands: kebab-case (e.g., `add-dir/`, `install-github-app/`)
- Services: camelCase (e.g., `extractMemories/`, `policyLimits/`)
- Utils: camelCase (e.g., `filePersistence/`, `secureStorage/`)

## Where to Add New Code

**New Tool:**
- Implementation: `src/tools/{ToolName}/{ToolName}.tsx`
- Register in: `src/constants/tools.ts`
- Add permission UI: `src/components/permissions/{ToolName}PermissionRequest/`

**New Command:**
- Implementation: `src/commands/{command-name}/`
- Pattern: Export a command definition object

**New Service:**
- Implementation: `src/services/{serviceName}/`
- Expose via `index.ts` barrel file

**New Skill:**
- Bundled: `src/skills/bundled/{skillName}.ts`
- Register in: `src/skills/bundled/index.ts`

**New Hook:**
- Implementation: `src/hooks/use{Name}.ts`

**New Component:**
- Implementation: `src/components/{ComponentName}.tsx` or `src/components/{ComponentName}/`

**New Provider Shim:**
- Implementation: `src/services/api/{provider}Shim.ts`
- Configure: `src/services/api/providerConfig.ts`

**Utilities:**
- Shared helpers: `src/utils/{category}/{name}.ts`

## Special Directories

**`src/types/generated/`:**
- Purpose: Auto-generated TypeScript types from protobuf definitions
- Generated: Yes
- Committed: Yes

**`dist/`:**
- Purpose: Build output (bundled `cli.mjs`)
- Generated: Yes (via `bun run build`)
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: Dependencies
- Generated: Yes
- Committed: No

**`src/ink/`:**
- Purpose: Custom fork/implementation of Ink terminal React renderer
- Generated: No (maintained in-tree)
- Committed: Yes

**`vscode-extension/`:**
- Purpose: VS Code extension for IDE integration
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-19*

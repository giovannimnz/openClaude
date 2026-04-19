# Codebase Concerns

**Analysis Date:** 2026-04-19

## Tech Debt

**Deprecated API usage throughout codebase:**
- Issue: `getSettings_DEPRECATED` and `writeFileSync_DEPRECATED` are used in 56 files (153 occurrences) despite being explicitly marked deprecated
- Files: `src/utils/settings/settings.ts`, `src/utils/slowOperations.ts` (definitions), callers across `src/components/`, `src/tools/`, `src/utils/`, `src/services/`
- Impact: Synchronous file I/O (`writeFileSync_DEPRECATED`) blocks the event loop; deprecated settings accessor pattern creates coupling to stale architecture
- Fix approach: Migrate all callers to async settings API (`useSettings` hook for React, async getter elsewhere); replace `writeFileSync_DEPRECATED` with async writes

**Massive file sizes (God objects):**
- Issue: Multiple files exceed 3000+ lines, indicating insufficient separation of concerns
- Files:
  - `src/cli/print.ts` (5584 lines)
  - `src/utils/messages.ts` (5517 lines)
  - `src/utils/sessionStorage.ts` (5361 lines)
  - `src/screens/REPL.tsx` (5030 lines)
  - `src/utils/hooks.ts` (5022 lines)
  - `src/main.tsx` (4674 lines)
  - `src/utils/bash/bashParser.ts` (4436 lines)
  - `src/utils/attachments.ts` (4017 lines)
  - `src/services/api/claude.ts` (3439 lines)
  - `src/services/mcp/client.ts` (3396 lines)
  - `src/utils/plugins/pluginLoader.ts` (3341 lines)
  - `src/bridge/bridgeMain.ts` (2992 lines)
- Impact: Difficult to navigate, test, and modify; high cognitive load for contributors
- Fix approach: Extract logical sub-modules; for `REPL.tsx`, separate keybinding logic, state management, and rendering; for `print.ts`, split by output type

**Lint/type suppressions proliferate:**
- Issue: 694 `eslint-disable` / `biome-ignore` directives across 276 files; 20+ `@ts-expect-error` suppressions
- Files: Widespread, concentrated in `src/bridge/bridgeMain.ts` (34 suppressions), `src/cli/handlers/plugins.ts` (39), `src/cli/handlers/mcp.tsx` (25)
- Impact: Type safety erosion; lint rules exist for a reason and suppressing them hides real issues
- Fix approach: Audit suppressions; fix underlying issues or create proper type declarations for `react-reconciler` internals

**`as any` type casts:**
- Issue: 54 occurrences across 17 files, concentrated in `src/components/ProviderManager.tsx` (21 casts)
- Files: `src/components/ProviderManager.tsx`, `src/services/api/openaiShim.ts`, `src/grpc/server.ts`
- Impact: Bypasses TypeScript type safety; runtime errors not caught at compile time
- Fix approach: Add proper type definitions; use type guards or `unknown` with explicit narrowing

**Stale keybindings migration:**
- Issue: Multiple TODOs reference `onKeyDown-migration` that appears incomplete
- Files: `src/hooks/useVoiceIntegration.tsx:652`, `src/hooks/useHistorySearch.ts:273`, `src/hooks/useBackgroundTaskNavigation.ts:245`, `src/hooks/useTypeahead.tsx:1375`, `src/hooks/useSearchInput.ts:355`
- Impact: Dual code paths for keyboard handling; potential inconsistent behavior
- Fix approach: Complete migration, remove fallback parameters noted in `src/keybindings/useShortcutDisplay.ts:9`

## Security Considerations

**Permission bypass flag:**
- Risk: `--dangerously-skip-permissions` flag bypasses all security checks
- Files: `src/tools/shared/spawnMultiAgent.ts:225`, `src/server/createDirectConnectSession.ts:30`
- Current mitigation: Documented as "only for sandboxes with no internet access"
- Recommendations: Add runtime warning when active; require explicit env var confirmation; log all bypassed operations

**Debug logs committed to repository:**
- Risk: Debug log files in `debug-logs/` directory contain runtime output that could expose sensitive paths or tokens
- Files: `debug-logs/debug_2026-04-15_17-44-59.txt`, `debug-logs/debug_2026-04-15_17-45-11.txt`
- Current mitigation: None - files are tracked in git
- Recommendations: Add `debug-logs/` to `.gitignore`; remove committed debug files from history

**Validation scripts committed in Portuguese:**
- Risk: `validacao-mac/` contains shell scripts for debugging that shouldn't be in production
- Files: `validacao-mac/1-check-tty.sh` through `validacao-mac/6-deep-debug.sh`
- Current mitigation: None
- Recommendations: Remove from main branch or move to a `scripts/debug/` directory with documentation

## Performance Concerns

**Synchronous file writes on main thread:**
- Problem: `writeFileSync_DEPRECATED` in `src/utils/slowOperations.ts` performs synchronous disk I/O
- Files: `src/main.tsx:458`, `src/commands/export/export.tsx:63`, called from 56 files total
- Cause: Legacy pattern not yet migrated to async
- Improvement path: Use `fs/promises` write with proper error handling; the slow operation threshold logging (20ms dev / 300ms prod) already identifies problematic calls

**Excessive catch blocks:**
- Problem: 1089 try-catch blocks across 398 files; many swallow errors silently (catch with only logging or empty handling)
- Files: `src/utils/plugins/marketplaceManager.ts` (23 catches), `src/bridge/bridgeMain.ts` (15), `src/services/mcp/client.ts` (23)
- Cause: Defensive coding without structured error propagation
- Improvement path: Implement Result type pattern; use error boundaries at layer boundaries rather than per-call

**Large `process.exit()` usage:**
- Problem: 20+ `process.exit()` calls scattered through `src/bridge/bridgeMain.ts` and `src/setup.ts`
- Files: `src/bridge/bridgeMain.ts` (15+ calls), `src/setup.ts` (5 calls)
- Cause: Abrupt termination without cleanup
- Improvement path: Route all exits through `src/utils/gracefulShutdown.ts`; ensure cleanup hooks fire

## Maintainability Issues

**Plugin system complexity:**
- Issue: Plugin-related code spans 20+ files in `src/utils/plugins/` with largest at 3341 lines
- Files: `src/utils/plugins/pluginLoader.ts` (3341 lines), `src/utils/plugins/marketplaceManager.ts` (2643 lines), `src/utils/plugins/installedPluginsManager.ts`, `src/utils/plugins/mcpPluginIntegration.ts`
- Evidence: 12 catch blocks in `src/commands/plugin/ManagePlugins.tsx`, multiple marketplace managers
- Fix: Extract clear plugin lifecycle interfaces; separate marketplace from local plugin management

**MCP (Model Context Protocol) client sprawl:**
- Issue: MCP integration spans many files with complex auth, connection management, and error recovery
- Files: `src/services/mcp/client.ts` (3396 lines, 23 catches), `src/services/mcp/auth.ts` (2466 lines, 14 catches), `src/services/mcp/config.ts`, `src/services/mcp/useManageMCPConnections.ts`
- Evidence: Heavy error suppression suggests fragile connection handling

**`DEPRECATED` suffix functions still in active use:**
- Issue: Functions explicitly named `_DEPRECATED` are actively called, not actually being removed
- Evidence: `getSettings_DEPRECATED` used in 56 files; `getFeatureValue_DEPRECATED` in `src/bridge/envLessBridgeConfig.ts`; `commands_DEPRECATED` in `src/commands.ts:589`
- Fix: Set deadline for migration; create tracking issue per deprecated function

## Missing / Incomplete

**Test coverage gaps:**
- What's missing: Only 116 test files for 2112 source files (5.5% file coverage ratio)
- Impact: Only 2 files in `src/__tests__/` (top-level tests); major subsystems like `src/bridge/`, `src/screens/REPL.tsx`, `src/cli/print.ts` have no/minimal tests
- Key untested areas:
  - `src/bridge/bridgeMain.ts` (2992 lines, no test file)
  - `src/screens/REPL.tsx` (5030 lines, no dedicated test)
  - `src/utils/hooks.ts` (5022 lines, no dedicated test)
  - `src/cli/print.ts` (5584 lines, no dedicated test)
  - `src/utils/sessionStorage.ts` (5361 lines, 1 test file exists)

**MCP tool validation incomplete:**
- What's missing: `src/entrypoints/mcp.ts:143` has TODO "validate input types with zod"
- Impact: MCP tool inputs may not be properly validated, risking runtime crashes or injection

**IDE diff integration incomplete:**
- What's missing: `src/hooks/useDiffInIDE.ts:212-214` lists 3 unimplemented TODOs (timeout, auto-approval UI updates, tab cleanup)
- Impact: Possible resource leaks (tabs staying open) and hung operations

**Citation handling missing:**
- What's missing: `src/services/api/claude.ts:2105` has TODO "handle citations"
- Impact: Citation data from API responses is silently dropped

## Dependencies

### Potentially Risky

- `duck-duck-scrape` (^2.2.7): Web scraping library for DuckDuckGo; unofficial/reverse-engineered API that could break with DDG changes. Note in `src/tools/WebSearchTool/providers/duckduckgo.ts:22`: "doesn't accept AbortSignal — can't cancel in-flight searches"
- `react-reconciler` (0.33.0): Internal React package; causes all `@ts-expect-error` suppressions in `src/ink/` due to mismatched types with `@types/react-reconciler`
- `bun` (^1.3.12): Listed as a production dependency rather than dev-only; unusual for a runtime to be in `dependencies`
- `sharp` (^0.34.5): Native binary dependency; can cause installation issues across platforms (ARM/x86, Linux/macOS/Windows)
- `@mendable/firecrawl-js` (4.18.1): No AbortSignal support per `src/tools/WebSearchTool/providers/firecrawl.ts:14`

### Heavyweight

- Multiple `@opentelemetry/*` packages (8 packages): Significant bundle weight for observability
- `lodash-es` (4.18.1): Full lodash import; override in package.json suggests dependency conflicts

## Scalability Concerns

**Session storage as single file:**
- Problem: `src/utils/sessionStorage.ts` (5361 lines) manages session persistence
- Evidence: Multiple catch blocks suggest concurrent access issues; uses `proper-lockfile` dependency
- Limit: File-based storage will degrade with large sessions or concurrent access
- Scaling path: Consider SQLite or indexed storage for sessions

**Synchronous operations blocking CLI responsiveness:**
- Problem: Multiple `writeFileSync` calls and `spawnSync` in `src/screens/REPL.tsx:4` (line 4 of imports shows `spawnSync`)
- Evidence: `src/utils/slowOperations.ts` has instrumentation specifically to catch slow sync ops
- Scaling path: Complete async migration; use worker threads for heavy computation

## TODOs and FIXMEs

| Location | Content | Priority |
|----------|---------|----------|
| `src/entrypoints/mcp.ts:143` | validate input types with zod | High |
| `src/services/api/withRetry.ts:94` | keep-alive via SystemAPIErrorMessage is a stopgap | Medium |
| `src/services/api/withRetry.ts:349` | Revisit isNonCustomOpusModel check (stale artifact?) | Medium |
| `src/commands/ultraplan.tsx:20` | OAuth token may go stale over 30min poll | High |
| `src/hooks/useDiffInIDE.ts:212-214` | Timeout, auto-approval UI, tab cleanup all missing | Medium |
| `src/services/api/claude.ts:2105` | Handle citations | Low |
| `src/commands/mcp/mcp.tsx:10` | Hack to get context value from toggleMcpServer | Medium |
| `src/commands/mcp/xaaIdpCommand.ts:162` | Read JWT from stdin instead of argv (security) | High |
| `src/Tool.ts:408` | TungstenTool doesn't define required field | Low |
| `src/main.tsx:2351` | Consolidate prefetches into single bootstrap request | Medium |
| `src/tools/AgentTool/AgentTool.tsx:1221` | Find cleaner way to express this | Low |
| `src/components/Settings/Config.tsx:263` | Add MCP servers | Medium |
| `src/commands/plugin/BrowseMarketplace.tsx:682` | Actually scan local plugin directories | Medium |
| `src/keybindings/useShortcutDisplay.ts:9` | Remove fallback after keybindings migration | Low |
| `src/services/api/withRetry.ts:616` | Replace with response header check once API adds one | Low |

---

*Concerns audit: 2026-04-19*

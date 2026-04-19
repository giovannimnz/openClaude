# Coding Conventions

**Analysis Date:** 2026-04-19

## Naming Patterns

**Files:**
- Source files: `camelCase.ts` / `camelCase.tsx` (e.g., `src/utils/stringUtils.ts`, `src/services/api/openaiShim.ts`)
- Test files: `<module>.test.ts` or `<module>.test.tsx`, co-located with source (e.g., `src/services/api/client.test.ts`)
- Component files: `PascalCase.tsx` (e.g., `src/components/ThemePicker.tsx`, `src/components/ProviderManager.tsx`)
- Some utility components use `camelCase.tsx` (e.g., `src/components/messageActions.tsx`)
- Index files: `index.ts` used as barrel exports for commands and some services (e.g., `src/commands/model/index.ts`)
- Dotted naming for scoped tests: `providerConfig.github.test.ts`, `providerConfig.local.test.ts`

**Functions:**
- Use `camelCase` for all functions: `getContextWindowForModel()`, `extractConnectionErrorDetails()`, `createGitHubIssueUrl()`
- Prefix boolean-returning functions with `is`/`has`/`can`: `is1mContextDisabled()`, `has1mContext()`, `canUserConfigureAdvisor()`
- Prefix getter functions with `get`: `getMaxOutputTokensForModel()`, `getAnthropicClient()`
- Use `create` for factory functions: `createOpenAIShimClient()`, `createSystemMessage()`

**Variables:**
- Use `camelCase`: `capturedUrl`, `originalFetch`, `originalEnv`
- Use `UPPER_SNAKE_CASE` for module-level constants: `MODEL_CONTEXT_WINDOW_DEFAULT`, `OPENAI_FALLBACK_CONTEXT_WINDOW`, `API_ERROR_MESSAGE_PREFIX`
- Numeric separators for large numbers: `128_000`, `200_000`, `8_192`

**Types:**
- Use `PascalCase` for types and interfaces: `ToolInputJSONSchema`, `ConnectionErrorDetails`, `AutoFixConfig`
- Suffix with purpose: `Schema` for Zod schemas (`AutoFixConfigSchema`, `SettingsSchema`)
- Use `type` imports consistently: `import type { ... } from '...'`

## Code Style

**Formatting:**
- No dedicated formatter config detected (no `.prettierrc`, no Biome config at root)
- Biome is referenced in inline suppression comments: `// biome-ignore lint/suspicious/noConsole:: intentional console output`
- No semicolons at end of statements
- Single quotes for string literals
- 2-space indentation
- Trailing commas in multi-line structures

**Linting:**
- Biome used for lint rules (referenced in `// biome-ignore` comments)
- ESLint custom rules also active: `// eslint-disable-next-line custom-rules/no-top-level-side-effects`
- Custom ESLint rules observed:
  - `custom-rules/no-top-level-side-effects`
  - `custom-rules/no-process-exit`
  - `custom-rules/prefer-use-keybindings`
  - `custom-rules/prefer-use-terminal-size`
  - `custom-rules/bootstrap-isolation`
  - `custom-rules/prompt-spacing`

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- Target: ES2022, Module: ESNext, Module Resolution: bundler
- JSX: `react-jsx`
- Path alias: `src/*` maps to `./src/*`

## Import Organization

**Order:**
1. Node built-ins: `import { PassThrough } from 'node:stream'`
2. Third-party packages: `import React from 'react'`, `import chalk from 'chalk'`
3. Internal absolute imports using `src/` alias: `import { logError } from 'src/utils/log.js'`
4. Internal relative imports: `import { getAnthropicClient } from './client.js'`

**Path Aliases:**
- `src/*` mapped to `./src/*` in `tsconfig.json`
- Both `src/` prefix and relative paths are used in source code
- Some files use `// biome-ignore-all assist/source/organizeImports: internal-only import markers must not be reordered` to prevent auto-sorting

**File Extensions:**
- Always use `.js` extension in imports (even for `.ts` files): `import { foo } from './bar.js'`
- Some imports use `.ts` extension in test files: `import { createOpenAIShimClient } from './openaiShim.ts'`
- `.mjs` extension for SDK re-exports: `from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'`

## Patterns in Use

**Zod Schemas:**
- Use Zod for runtime validation: `AutoFixConfigSchema`, `SettingsSchema`
- Pattern: define schema, export type via `z.infer<typeof Schema>`, provide `safeParse()` validation

**React with Ink:**
- TUI (Terminal UI) built with React + Ink (custom fork in `src/ink/`)
- Components use standard React patterns: hooks, functional components
- Custom hooks prefixed with `use`: `useTheme`, `useApiKeyVerification`
- State management via React context: `AppStateProvider`, `ThemeProvider`, `KeybindingSetup`

**Environment Variable Patterns:**
- Feature flags via env vars: `CLAUDE_CODE_USE_OPENAI`, `CLAUDE_CODE_USE_GEMINI`
- Helper: `isEnvTruthy()` for boolean env checks
- Convention: `CLAUDE_CODE_*` prefix for project-specific env vars

**Build-time Feature Flags:**
- `import { feature } from 'bun:bundle'` for compile-time feature gating
- `MACRO.VERSION` for build-time version injection
- Feature flags defined in `scripts/build.ts` (e.g., `VOICE_MODE`, `COORDINATOR_MODE`)

**Command Pattern:**
- Each command lives in `src/commands/<name>/index.ts`
- Commands export a standard interface defined in `src/types/command.ts`

## Error Handling

**Patterns:**
- Custom error classes extending SDK errors: `APIError`, `APIConnectionError`, `APIConnectionTimeoutError`
- Error cause chain walking: `extractConnectionErrorDetails()` in `src/services/api/errorUtils.ts`
- SSL error detection via error code sets
- `safeParse()` pattern with Zod for validation errors (check `result.success` before accessing `result.data`)
- Typed error results: `ConnectionErrorDetails | null` return pattern
- `logError()` utility from `src/utils/log.js`

**API Error Handling:**
- Centralized in `src/services/api/errors.ts` and `src/services/api/errorUtils.ts`
- Rate limit handling with retry logic: `src/services/api/withRetry.ts`
- Error messages prefixed with `API_ERROR_MESSAGE_PREFIX`

## Logging

**Framework:** Custom logging utilities
- `logError()` from `src/utils/log.js`
- `logForDebugging()` from `src/utils/debug.js`
- `logEvent()` from `src/services/analytics/index.ts`
- `logOTelEvent()` from `src/utils/telemetry/events.js`
- OpenTelemetry for tracing: `src/utils/telemetry/sessionTracing.js`
- Direct `console.*` usage is discouraged (requires biome-ignore comment: `// biome-ignore lint/suspicious/noConsole:: intentional console output`)

## Comments & Documentation

**JSDoc:**
- Used for exported utility functions with `@example` tags (see `src/utils/stringUtils.ts`)
- Not universally applied; many functions lack JSDoc

**Inline Comments:**
- `// @[MODEL LAUNCH]:` markers for model-specific update points
- `// biome-ignore` and `// eslint-disable-next-line` for lint suppressions with explanations
- Comments explain "why", not "what" (e.g., `// Used for /mock-limits command`, `// Must be large enough that...`)

**When to Comment:**
- Suppress lint rules: always include reason after `::` (e.g., `// biome-ignore lint/suspicious/noConsole:: intentional console output`)
- Non-obvious side effects in import order (see `src/main.tsx` top-level comments)
- Magic numbers and constants get explanatory comments

## Function Design

**Size:** Functions are generally small and focused, with clear single responsibilities

**Parameters:**
- Use object parameters for functions with many options: `getAnthropicClient({ maxRetries, model })`
- Env-reading functions take no params, read from `process.env` directly
- `as const` assertions for literal types

**Return Values:**
- Nullable returns use explicit `| null` or `| undefined`
- Non-null assertion (`!`) used sparingly in test code
- `unknown` used at API boundaries, narrowed with type guards

## Module Design

**Exports:**
- Named exports preferred over default exports
- `export function`, `export const`, `export type` at declaration site
- Re-exports via barrel `index.ts` files for commands and some services

**Barrel Files:**
- Used in: `src/commands/*/index.ts`, `src/components/Spinner/index.ts`, `src/services/*/index.ts`
- Not universal; many modules export directly from their file

---

*Convention analysis: 2026-04-19*

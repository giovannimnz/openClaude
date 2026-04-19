# Technology Stack

**Analysis Date:** 2026-04-19

## Languages

**Primary:**
- TypeScript 5.9.3 - All core CLI and service code in `src/`
- Target: ES2022, Module: ESNext, JSX: react-jsx (`tsconfig.json`)

**Secondary:**
- Python 3.12 - Provider routing and Ollama bridge (`python/`)
- Protobuf (proto3) - gRPC service definitions (`src/proto/openclaude.proto`)

## Runtime

**Environment:**
- Node.js >= 20.0.0 (engines constraint in `package.json`); CI and Docker use Node 22
- Bun 1.3.11 - Used as bundler, test runner, and script executor

**Package Manager:**
- Bun (primary) - `bun.lock` present, `bun install --frozen-lockfile` in CI
- npm (secondary) - `package-lock.json` present, used for publishing to npm registry

## Frameworks

**Core:**
- React 19.2.4 + react-reconciler 0.33.0 - Terminal UI rendering via Ink-style custom renderer (`src/ink/`, `src/ink.ts`)
- Commander 12.1.0 - CLI argument parsing and command routing (`src/commands.ts`, `src/cli/`)
- Zod 3.25.76 - Schema validation throughout

**Testing:**
- Bun test (built-in) - `bun test` with `--coverage` support
- pytest 7.4.4 + pytest-asyncio 0.23.3 - Python tests (`python/tests/`)

**Build/Dev:**
- Bun.build() - Custom bundler with feature flags and plugin system (`scripts/build.ts`)
- tsx 4.21.0 - Dev-time TypeScript execution
- TypeScript 5.9.3 - Type checking via `tsc --noEmit`

## Key Dependencies

**Critical (LLM Provider SDKs):**
- `@anthropic-ai/sdk` 0.81.0 - Anthropic API client (`src/services/api/claude.ts`)
- `@anthropic-ai/bedrock-sdk` 0.26.4 - AWS Bedrock Anthropic models
- `@anthropic-ai/vertex-sdk` 0.14.4 - Google Vertex AI Anthropic models
- `google-auth-library` 9.15.1 - Google Cloud / Vertex authentication
- `axios` 1.15.0 - HTTP client for OpenAI-compatible APIs (`src/services/api/openaiShim.ts`)

**Protocol & Communication:**
- `@modelcontextprotocol/sdk` 1.29.0 - MCP (Model Context Protocol) client (`src/services/mcp/`)
- `@grpc/grpc-js` ^1.14.3 + `@grpc/proto-loader` ^0.8.0 - gRPC server (`src/grpc/server.ts`)
- `ws` 8.20.0 - WebSocket support
- `vscode-languageserver-protocol` 3.17.5 - LSP client integration (`src/services/lsp/`)
- `undici` 7.24.6 - HTTP client

**Terminal UI:**
- `chalk` 5.6.2 - Terminal color output
- `cli-highlight` 2.1.11 - Syntax highlighting in terminal
- `marked` 15.0.12 - Markdown parsing
- `wrap-ansi` 9.0.2 - Terminal text wrapping
- `chokidar` 4.0.3 - File watching

**Utilities:**
- `fuse.js` 7.1.0 - Fuzzy search
- `sharp` ^0.34.5 - Image processing (external dep, stubbed in build)
- `diff` 8.0.3 - Text diffing
- `lru-cache` 11.2.7 - In-memory caching
- `ajv` 8.18.0 - JSON Schema validation
- `yaml` 2.8.3 - YAML parsing
- `jsonc-parser` 3.3.1 - JSONC parsing
- `semver` 7.7.4 - Version comparison

**Observability:**
- `@opentelemetry/*` (multiple packages) - Tracing, logging, metrics (kept as external deps in build)
- `@growthbook/growthbook` 1.6.5 - Feature flags (telemetry stripped via `scripts/no-telemetry-plugin.ts`)

**Web Search:**
- `duck-duck-scrape` ^2.2.7 - DuckDuckGo search (default free provider)
- `@mendable/firecrawl-js` 4.18.1 - Firecrawl web scraping
- `turndown` 7.2.2 - HTML to Markdown conversion
- `xss` 1.0.15 - XSS sanitization

**Security:**
- `proper-lockfile` 4.1.2 - File locking
- `https-proxy-agent` 7.0.6 - Proxy support

## Configuration

**Environment:**
- `.env.example` documents all supported env vars (never read `.env` directly)
- Provider selection via env flags: `CLAUDE_CODE_USE_OPENAI`, `CLAUDE_CODE_USE_GEMINI`, `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, `CLAUDE_CODE_USE_GITHUB`
- Provider config logic: `src/services/api/providerConfig.ts`

**Build:**
- `tsconfig.json` - TypeScript compiler config (strict mode, path aliases `src/*`)
- `scripts/build.ts` - Custom Bun bundler with feature flags, stub plugins, and telemetry stripping
- Feature flags defined in `scripts/build.ts` control which features are included in the open build
- Output: single file `dist/cli.mjs` (ESM format, no minification, external sourcemap)

**Entry Points:**
- CLI binary: `bin/claude` (Node.js shim that loads `dist/cli.mjs`)
- Build entry: `src/entrypoints/cli.tsx`
- npm bin: `claude` command

## Platform Requirements

**Development:**
- Node.js >= 20 + Bun 1.3.11
- Python 3.12 (for Python provider tests)
- Git (required for many CLI operations)

**Production:**
- Node.js 22 (Docker runtime uses `node:22-slim`)
- Single-file distribution: `dist/cli.mjs` + `node_modules/` for external deps
- Published to npm as `@giovannimnz/openClaude`
- Docker image published to `ghcr.io` (GitHub Container Registry)

---

*Stack analysis: 2026-04-19*

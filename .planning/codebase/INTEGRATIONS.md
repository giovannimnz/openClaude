# External Integrations

**Analysis Date:** 2026-04-19

## APIs & External Services

**LLM Providers (multi-provider architecture):**

| Service | Purpose | Auth Method | Config Location |
|---------|---------|-------------|-----------------|
| Anthropic API | Default LLM provider (Claude models) | `ANTHROPIC_API_KEY` | `src/services/api/claude.ts` |
| OpenAI API | OpenAI-compatible models (GPT, DeepSeek, etc.) | `OPENAI_API_KEY` + `CLAUDE_CODE_USE_OPENAI=1` | `src/services/api/openaiShim.ts` |
| Google Gemini | Gemini models via OpenAI-compatible endpoint | `GEMINI_API_KEY` + `CLAUDE_CODE_USE_GEMINI=1` | `src/services/api/providerConfig.ts` |
| AWS Bedrock | Anthropic models via AWS | AWS credentials + `CLAUDE_CODE_USE_BEDROCK=1` | `src/services/api/providerConfig.ts` |
| Google Vertex AI | Anthropic models via GCP | GCP project config + `CLAUDE_CODE_USE_VERTEX=1` | `src/services/api/providerConfig.ts` |
| GitHub Models | Models via GitHub token | `GITHUB_TOKEN` + `CLAUDE_CODE_USE_GITHUB=1` | `src/services/api/providerConfig.ts` |
| Ollama (local) | Local models via OpenAI-compat API | `OPENAI_API_KEY=ollama` (dummy) | `python/ollama_provider.py` |
| LM Studio (local) | Local models via OpenAI-compat API | Optional dummy key | `.env.example` docs |

**Web Search Providers (fallback chain):**

| Service | Purpose | Auth Method | Config Location |
|---------|---------|-------------|-----------------|
| DuckDuckGo | Default free web search | None (scraping) | `duck-duck-scrape` package |
| Tavily | AI-optimized search | `TAVILY_API_KEY` | `.env.example` |
| Exa | Neural/semantic search | `EXA_API_KEY` | `.env.example` |
| You.com | RAG-ready snippets | `YOU_API_KEY` | `.env.example` |
| Jina | s.jina.ai endpoint | `JINA_API_KEY` | `.env.example` |
| Bing Web Search | Microsoft Bing search | `BING_API_KEY` | `.env.example` |
| Mojeek | Privacy-focused search | `MOJEEK_API_KEY` | `.env.example` |
| Linkup | Search aggregator | `LINKUP_API_KEY` | `.env.example` |
| Firecrawl | Premium web scraping | `FIRECRAWL_API_KEY` | `@mendable/firecrawl-js` SDK |
| Custom API | User-defined search endpoint | `WEB_KEY` + URL config | `WEB_SEARCH_API` env var |

**Search fallback order (auto mode):** firecrawl -> tavily -> exa -> you -> jina -> bing -> mojeek -> linkup -> ddg

## Protocols & Standards

**Model Context Protocol (MCP):**
- SDK: `@modelcontextprotocol/sdk` 1.29.0
- Client implementation: `src/services/mcp/client.ts`
- Connection manager: `src/services/mcp/MCPConnectionManager.tsx`
- Config: `src/services/mcp/config.ts`
- OAuth support: `src/services/mcp/auth.ts`, `src/services/mcp/xaaIdpLogin.ts`
- Purpose: Connect to external tool servers (filesystem, databases, custom tools)

**gRPC Server:**
- Packages: `@grpc/grpc-js`, `@grpc/proto-loader`
- Proto definition: `src/proto/openclaude.proto`
- Server: `src/grpc/server.ts`
- Service: `AgentService` with bidirectional streaming `Chat` RPC
- Purpose: Programmatic access to the agent (non-CLI clients, IDE integrations)

**Language Server Protocol (LSP):**
- Package: `vscode-languageserver-protocol` 3.17.5
- Client: `src/services/lsp/LSPClient.ts`
- Server manager: `src/services/lsp/LSPServerManager.ts`
- Purpose: Code intelligence (diagnostics, completions) from language servers

**OAuth:**
- Implementation: `src/services/oauth/`
- Auth code listener: `src/services/oauth/auth-code-listener.ts`
- Crypto: `src/services/oauth/crypto.ts`
- Google Gemini CLI OAuth: `src/services/oauth/google-gemini-cli.ts`
- Codex OAuth: `src/services/api/codexOAuth.ts`

## Data Storage

**Databases:**
- None (no traditional database)

**File Storage:**
- Local filesystem only
- Session history: managed via `src/history.ts`
- Memory/state: `src/state/`, `src/memdir/`
- Settings sync: `src/services/settingsSync/`

**Caching:**
- In-memory LRU cache (`lru-cache` 11.2.7)
- File-based lockfiles (`proper-lockfile` 4.1.2)

## Authentication & Identity

**Auth Providers:**
- Per-LLM-provider API key authentication (env vars)
- OAuth 2.0 flow for Codex and Google Gemini CLI
- AWS credential chain for Bedrock
- GCP project auth for Vertex AI
- GitHub token for GitHub Models

## Monitoring & Observability

**Telemetry:**
- OpenTelemetry SDK (tracing, logging, metrics) - extensive package set
- Telemetry is stripped/neutralized in open build via `scripts/no-telemetry-plugin.ts`
- GrowthBook feature flags (`@growthbook/growthbook` 1.6.5) - also neutralized

**Error Tracking:**
- Internal error handling: `src/services/api/errors.ts`, `src/services/api/errorUtils.ts`
- No external error tracking service detected

**Logs:**
- Internal logging: `src/services/api/logging.ts`, `src/services/internalLogging.ts`
- Debug mode: `CLAUDE_DEBUG=1` env var
- Debug logs directory: `debug-logs/`

## CI/CD & Deployment

**CI Pipeline (GitHub Actions):**
- PR checks: `.github/workflows/pr-checks.yml`
  - Node 22 + Bun 1.3.11 + Python 3.12
  - Smoke test, unit tests, Python tests, provider tests, security PR scan
- Release: `.github/workflows/release.yml`
  - Release-please for automated versioning
  - npm publish with provenance (`@gitlawb/openclaude`)
  - Docker build + push to `ghcr.io`

**Hosting/Distribution:**
- npm registry: `@giovannimnz/openClaude` (public package)
- Docker: GitHub Container Registry (`ghcr.io`)
- VSCode extension: `vscode-extension/openclaude-vscode/`

## Environment Configuration

**Required env vars (at least one provider block):**

| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API authentication | Yes (if using Anthropic) |
| `CLAUDE_CODE_USE_OPENAI` | Enable OpenAI-compatible provider | Yes (if using OpenAI/Ollama/LM Studio) |
| `OPENAI_API_KEY` | OpenAI API authentication | Yes (if using OpenAI provider) |
| `OPENAI_MODEL` | Model selection for OpenAI provider | Yes (if using OpenAI provider) |
| `OPENAI_BASE_URL` | Custom OpenAI-compatible endpoint | No (defaults to api.openai.com) |
| `CLAUDE_CODE_USE_GEMINI` | Enable Gemini provider | Yes (if using Gemini) |
| `GEMINI_API_KEY` | Gemini API authentication | Yes (if using Gemini) |
| `GEMINI_MODEL` | Model selection for Gemini | No (default provided) |
| `CLAUDE_CODE_USE_BEDROCK` | Enable AWS Bedrock provider | Yes (if using Bedrock) |
| `AWS_REGION` | AWS region for Bedrock | Yes (if using Bedrock) |
| `CLAUDE_CODE_USE_VERTEX` | Enable Vertex AI provider | Yes (if using Vertex) |
| `ANTHROPIC_VERTEX_PROJECT_ID` | GCP project for Vertex | Yes (if using Vertex) |
| `CLAUDE_CODE_USE_GITHUB` | Enable GitHub Models provider | Yes (if using GitHub Models) |
| `GITHUB_TOKEN` | GitHub authentication | Yes (if using GitHub Models) |

**Optional tuning vars:**

| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_MODEL` | Override default Anthropic model | No |
| `ANTHROPIC_BASE_URL` | Custom Anthropic endpoint | No |
| `CLAUDE_CODE_MAX_RETRIES` | Max API retries (default: 10) | No |
| `CLAUDE_CODE_UNATTENDED_RETRY` | Persistent retry for CI | No |
| `OPENCLAUDE_ENABLE_EXTENDED_KEYS` | Kitty keyboard protocol | No |
| `OPENCLAUDE_DISABLE_CO_AUTHORED_BY` | Disable git co-author line | No |
| `API_TIMEOUT_MS` | Custom API timeout | No |
| `CLAUDE_DEBUG` | Enable debug logging | No |
| `WEB_SEARCH_PROVIDER` | Search provider selection mode | No (default: auto) |

**Secrets location:**
- Environment variables (shell or `.env` file)
- `.env` file in project root (gitignored)
- System-wide shell exports supported

## Webhooks & Callbacks

**Incoming:**
- OAuth callback listener: `src/services/oauth/auth-code-listener.ts` (local HTTP server for OAuth redirect)
- gRPC server: `src/grpc/server.ts` (bidirectional streaming)

**Outgoing:**
- LLM API calls to configured provider endpoints
- Web search API calls to configured search providers
- MCP server connections (stdio, HTTP, WebSocket transports)

---

*Integration audit: 2026-04-19*

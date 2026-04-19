# Testing Patterns

**Analysis Date:** 2026-04-19

## Test Framework

**Runner:**
- Bun Test (built-in) - primary test runner for TypeScript/JavaScript
- pytest - for Python tests in `python/tests/`
- No config file needed for Bun test runner (uses built-in defaults)

**Assertion Library:**
- Bun's built-in `expect` (Jest-compatible API)
- All test imports from `bun:test`: `import { expect, test, describe, beforeEach, afterEach, mock } from 'bun:test'`

**Run Commands:**
```bash
bun test                          # Run all tests
bun test --max-concurrency=1      # Run all tests sequentially (CI mode)
bun test src/path/to/file.test.ts # Run specific test file
bun run test:coverage             # Run with lcov coverage + heatmap
bun run test:provider             # Run provider-specific tests
bun run test:provider-recommendation # Provider recommendation tests
python -m pytest -q python/tests  # Python tests
```

## Test File Organization

**Location:**
- Co-located with source files (test files sit next to implementation)
- Exception: `src/__tests__/` directory contains cross-cutting test files

**Naming:**
- `<module>.test.ts` for TypeScript tests (e.g., `src/utils/context.test.ts`)
- `<module>.test.tsx` for tests involving React/JSX (e.g., `src/components/ThemePicker.test.tsx`)
- Dotted naming for scoped variants: `providerConfig.github.test.ts`, `providerConfig.local.test.ts`, `providerConfig.codexSecureStorage.test.ts`
- Python: `test_<module>.py` (e.g., `python/tests/test_ollama_provider.py`)

**Structure:**
```
src/
├── services/api/
│   ├── client.ts
│   ├── client.test.ts          # Co-located test
│   ├── openaiShim.ts
│   ├── openaiShim.test.ts      # Co-located test
│   └── providerConfig.github.test.ts  # Scoped test variant
├── components/
│   ├── ThemePicker.tsx
│   ├── ThemePicker.test.tsx    # Co-located component test
│   └── ProviderManager.test.tsx
├── __tests__/
│   ├── bugfixes.test.ts        # Cross-cutting regression tests
│   └── providerCounts.test.ts
└── utils/
    ├── context.ts
    └── context.test.ts         # Co-located test
```

## Test Structure

**Suite Organization:**
- Flat `test()` calls at module level for simple test files
- `describe()` blocks for grouping related tests in larger files
- No nesting deeper than one `describe()` level

**Simple test file pattern (most common):**
```typescript
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { someFunction } from './module.js'

const originalEnv = { /* save env state */ }

beforeEach(() => { /* set up env */ })
afterEach(() => { /* restore env */ })

test('descriptive test name', () => {
  expect(someFunction(input)).toBe(expected)
})
```

**Grouped test pattern:**
```typescript
import { describe, expect, test } from 'bun:test'

describe('SchemaName', () => {
  test('parses valid full config', () => {
    const result = Schema.safeParse(input)
    expect(result.success).toBe(true)
  })

  test('rejects invalid input', () => {
    const result = Schema.safeParse(badInput)
    expect(result.success).toBe(false)
  })
})
```

**Patterns:**
- Setup: `beforeEach()` to set environment variables and mock state
- Teardown: `afterEach()` to restore original env vars and call `mock.restore()`
- Test names: descriptive sentences starting with action verbs or subject descriptions

## Mocking

**Framework:** Bun's built-in `mock` from `bun:test`

**Module Mocking:**
```typescript
import { mock } from 'bun:test'

mock.module('./StructuredDiff.js', () => ({
  StructuredDiff: function StructuredDiffPreview(): React.ReactNode {
    return <Text>Preview</Text>
  },
}))
```

**Fetch Mocking (common pattern for API tests):**
```typescript
const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = (async (input, init) => {
    // capture request details
    capturedUrl = typeof input === 'string' ? input : input.url
    capturedHeaders = new Headers(init?.headers)
    capturedBody = JSON.parse(String(init?.body))

    return new Response(JSON.stringify({ /* mock response */ }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }) as FetchType
})

afterEach(() => {
  globalThis.fetch = originalFetch
})
```

**SSE/Streaming Response Mocking:**
```typescript
function makeSseResponse(lines: string[]): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line))
        }
        controller.close()
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  )
}
```

**Environment Variable Mocking (very common pattern):**
```typescript
const originalEnv = {
  SOME_VAR: process.env.SOME_VAR,
  OTHER_VAR: process.env.OTHER_VAR,
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}

beforeEach(() => {
  process.env.SOME_VAR = 'test-value'
  delete process.env.OTHER_VAR
})

afterEach(() => {
  restoreEnv('SOME_VAR', originalEnv.SOME_VAR)
  restoreEnv('OTHER_VAR', originalEnv.OTHER_VAR)
})
```

**What to Mock:**
- `globalThis.fetch` for HTTP requests
- `process.env` for environment-dependent behavior
- `globalThis.MACRO` for build-time constants
- Module-level dependencies via `mock.module()`
- Ink/React rendering via custom `createTestStreams()` helpers

**What NOT to Mock:**
- Pure logic functions (test directly)
- Zod schema parsing (test with real `safeParse()`)
- String utilities and helpers

## Fixtures and Factories

**Test Data:**
- Inline test data within each test (no shared fixture files detected)
- Helper functions defined at test file scope for creating mock objects:

```typescript
function makeError(headers: Record<string, string>): APIError {
  return {
    headers: new Headers(headers),
    status: 429,
    message: 'rate limit exceeded',
  } as unknown as APIError
}
```

**React/Ink Test Helpers:**
```typescript
function createTestStreams(): {
  stdout: PassThrough
  stdin: PassThrough & { isTTY: boolean; setRawMode: (mode: boolean) => void }
  getOutput: () => string
} {
  let output = ''
  const stdout = new PassThrough()
  const stdin = new PassThrough() as /* ... */
  stdin.isTTY = true
  stdin.setRawMode = () => {}
  stdout.on('data', chunk => { output += chunk.toString() })
  return { stdout, stdin, getOutput: () => output }
}

function extractLastFrame(output: string): string {
  // Extract last rendered frame from sync-mode terminal output
}
```

**Location:**
- No dedicated fixtures directory
- Helpers are defined inline in each test file
- Common patterns (like `restoreEnv`, `createTestStreams`) are duplicated across files

## Coverage

**Requirements:** No enforced minimum coverage threshold detected

**View Coverage:**
```bash
bun run test:coverage              # Generates lcov + renders heatmap
bun run test:coverage:ui           # Just render the coverage heatmap
```

**Coverage Tools:**
- Bun's built-in `--coverage` flag with `--coverage-reporter=lcov`
- Custom heatmap renderer: `scripts/render-coverage-heatmap.ts`
- Output directory: `coverage/`

## Test Types

**Unit Tests:**
- Primary test type (~116 test files)
- Test individual functions, schemas, and components
- Co-located with source code
- Examples: `src/utils/context.test.ts`, `src/services/api/client.test.ts`

**Integration Tests:**
- Some tests verify cross-module behavior
- Example: `src/services/autoFix/autoFixIntegration.test.ts`
- `src/__tests__/bugfixes.test.ts` contains regression tests across modules

**E2E Tests:**
- Smoke test via build + version check: `bun run smoke` (builds then runs `node dist/cli.mjs --version`)
- No dedicated E2E test framework (no Playwright, Cypress, etc.)

**Component Tests:**
- React/Ink component tests render to PassThrough streams
- Extract terminal frames for assertion
- Examples: `src/components/ThemePicker.test.tsx`, `src/components/ProviderManager.test.tsx`

**Python Tests:**
- Located in `python/tests/`
- Use pytest framework
- Tests: `test_atomic_chat_provider.py`, `test_ollama_provider.py`, `test_smart_router.py`
- Config: `python/tests/conftest.py`

## Common Patterns

**Async Testing:**
```typescript
test('routes requests through shim', async () => {
  const client = await getAnthropicClient({ maxRetries: 0, model: 'gemini-2.0-flash' })
  const response = await client.beta.messages.create({ /* ... */ })
  expect(response).toMatchObject({ role: 'assistant' })
})
```

**Error Testing:**
```typescript
test('rejects invalid input', () => {
  const result = Schema.safeParse(invalidInput)
  expect(result.success).toBe(false)
})
```

**Environment-Dependent Testing:**
```typescript
test('uses provider-specific caps', () => {
  process.env.CLAUDE_CODE_USE_OPENAI = '1'
  delete process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS

  expect(getContextWindowForModel('deepseek-chat')).toBe(128_000)
  expect(getModelMaxOutputTokens('deepseek-chat')).toEqual({
    default: 8_192,
    upperLimit: 8_192,
  })
})
```

**Fresh Module Import Pattern (for module-level state):**
```typescript
async function importFreshWithRetryModule(provider: string) {
  // Dynamically import to get fresh module state per test
}
```

## CI Integration

**Pipeline:** GitHub Actions (`.github/workflows/pr-checks.yml`)

**CI Test Steps (in order):**
1. `bun run smoke` - Build and version check
2. `bun test --max-concurrency=1` - Full unit test suite (sequential)
3. `python -m pytest -q python/tests` - Python tests
4. `bun run security:pr-scan` - PR intent security scan
5. `bun run test:provider` - Provider-specific tests
6. `npm run test:provider-recommendation` - Provider recommendation tests

**CI Environment:**
- Node.js 22, Bun 1.3.11, Python 3.12
- Tests run sequentially in CI (`--max-concurrency=1`)
- Dependencies installed with `bun install --frozen-lockfile`

---

*Testing analysis: 2026-04-19*

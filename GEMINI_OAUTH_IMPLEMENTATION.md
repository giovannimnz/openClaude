# Implementação: Gemini CLI OAuth para OpenClaude

Este documento descreve a implementação completa do sistema de OAuth para Google Gemini CLI no OpenClaude, replicando a arquitetura do gsd-2.

## 📦 Arquivos Implementados

### 1. **Armazenamento Seguro de Tokens** (`oauth-storage.ts`)
- `OAuthStorage` class: gerenciador de armazenamento persistente
- Suporta múltiplos provedores OAuth
- Permissões de arquivo `0600` para segurança
- Armazenamento em `~/.claude/oauth-credentials/`
- Singleton `getOAuthStorage()` para acesso centralizado

**Características:**
- Init async com criação de diretório
- Load/save de credenciais por provider
- Auto-cleanup de tokens expirados
- Operações thread-safe com locking

### 2. **Tipos OAuth** (`oauth-types.ts`)
Definições TypeScript para:
- `OAuthTokens` - Tokens Anthropic
- `OAuthProfile` - Perfil do usuário
- `GeminiOAuthToken` - Tokens Google específicos
- `Credential` - Union type para diferentes tipos de credencial
- `SubscriptionType` e `RateLimitTier` - Enums de status

### 3. **Provider OAuth Gemini** (`gemini-oauth-provider.ts`)
`GeminiOAuthProvider` implementa o fluxo PKCE completo:

**Métodos principais:**
- `buildAuthUrl()` - Constrói URL de autorização com PKCE
- `startCallbackServer()` - Inicia servidor local na porta 8888
- `exchangeCodeForToken()` - Troca auth code por tokens
- `refreshToken()` - Renova token usando refresh_token
- `getUserProfile()` - Fetch profile do usuário
- `performOAuthFlow()` - Fluxo completo end-to-end

**Fluxo:**
1. Gera PKCE (code_verifier + code_challenge)
2. Inicia servidor de callback em localhost:8888
3. Abre navegador com URL de auth
4. Captura code via callback
5. Troca code por tokens
6. Extrai project ID do token JWT

### 4. **Cliente OAuth Gemini** (`gemini-oauth-client.ts`)
Camada de acesso alto-nível:

**Funções exportadas:**
- `storeGeminiOAuthToken()` - Persistir token
- `getGeminiOAuthToken()` - Obter token com auto-refresh
- `hasGeminiOAuth()` - Verificar se logado
- `loginGeminiOAuth()` - Executar fluxo OAuth
- `logoutGeminiOAuth()` - Remover credenciais
- `getGeminiOAuthStatus()` - Status atual
- `getGeminiOAuthProfile()` - Dados do usuário
- `getGeminiOAuthTokenJSON()` - Token formatado para API

**Auto-refresh:**
- Buffer de 5 minutos antes da expiração
- Suporte a fallback se refresh falhar
- Atualização transparente de token

### 5. **Handler CLI** (`gemini-oauth-handler.ts`)
Comandos CLI para gerenciamento:

```bash
# Login
claude auth login google-gemini-cli

# Status
claude auth status google-gemini-cli

# Logout
claude auth logout google-gemini-cli
```

Cada comando:
- Exibe interface colorida com chalk
- Integração com sistema de analytics
- Tratamento de erros com mensagens úteis
- Exibição de status (email, projeto, expiração)

### 6. **Integração com Google Search** (`gemini-search.ts`)
Ferramenta de busca que usa OAuth:

```typescript
await googleSearch("latest Node.js features", maxSources)
```

**Características:**
- Cache em-memória de resultados
- Chamadas ao Cloud Code Assist API
- Parsing de respostas SSE
- Deduplicação de fontes
- Formatação de output

### 7. **Handler de Autenticação** (extensão de `auth.ts`)
Integração com sistema CLI existente:

```typescript
export async function authLoginGemini()
export async function authLogoutGemini()
export async function authStatusGemini()
```

Lazy-loaded para não afetar startup time.

### 8. **Componente UI React** (`auth-gemini.tsx`)
Interface interativa para gerenciamento:
- Menu com opções (Login/Logout/Status/Quit)
- Estados visuais (logging-in, status, error)
- Display de informações de credencial
- Navegação com teclas numéricas

### 9. **Testes** (`gemini-oauth.test.ts`)
Suite completa de testes:
- Armazenamento e recuperação de tokens
- Detecção de tokens expirados
- Auto-refresh
- Concurrent access
- Storage directory permissions
- PKCE flow validation
- Authorization URL generation

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI/UI Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ auth.ts handlers │  │ auth-gemini.tsx  │                │
│  │ (login/logout)   │  │ (React component)│                │
│  └────────┬─────────┘  └────────┬─────────┘                │
└───────────┼──────────────────────┼────────────────────────────┘
            │                      │
┌───────────▼──────────────────────▼────────────────────────────┐
│                   Service Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  gemini-oauth-client.ts                              │   │
│  │  - storeToken, getToken, hasOAuth, login, logout     │   │
│  │  - Auto-refresh logic                                │   │
│  └────────┬─────────────────────────────────────────────┘   │
└───────────┼──────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────┐
│                 Provider Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  gemini-oauth-provider.ts                            │   │
│  │  - PKCE flow, token exchange, refresh                │   │
│  │  - Callback server, user profile fetch               │   │
│  └────────┬─────────────────────────────────────────────┘   │
└───────────┼──────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────┐
│                Storage Layer                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  oauth-storage.ts                                    │   │
│  │  - File I/O, permissions, expiration handling        │   │
│  │  - Multi-provider support                            │   │
│  └────────┬─────────────────────────────────────────────┘   │
└───────────┼──────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────┐
│            Persistent Storage                               │
│  ~/.claude/oauth-credentials/google-gemini-cli.json (0600)  │
└──────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Autenticação

```
User runs:
  claude auth login google-gemini-cli
        ↓
gemini-oauth-handler.ts (geminiLogin)
        ↓
getGeminiOAuthProvider()
        ↓
Generate PKCE (verifier + challenge)
        ↓
Start callback server (localhost:8888)
        ↓
Open browser → buildAuthUrl(state, challenge)
        ↓
User authorizes in Google consent screen
        ↓
Redirect to localhost:8888/callback?code=...
        ↓
Callback server captures code
        ↓
exchangeCodeForToken(code, verifier)
        ↓
POST to oauth2.googleapis.com/token
        ↓
Receive access_token + refresh_token
        ↓
Extract project ID from JWT
        ↓
storeGeminiOAuthToken() → OAuthStorage
        ↓
Save to ~/.claude/oauth-credentials/google-gemini-cli.json
        ↓
Display success + token info
```

## 🔐 Segurança

### Armazenamento
- Arquivo: `~/.claude/oauth-credentials/google-gemini-cli.json`
- Permissões: `0600` (owner read/write only)
- Diretório: `~/.claude/oauth-credentials/`
- Permissões dir: `0700` (owner rwx only)

### Tokens
- Access tokens são de curta duração (típico 1 hora)
- Refresh tokens são de longa duração
- Auto-refresh 5 minutos antes da expiração
- Fallback gracioso se refresh falhar

### Fluxo PKCE
- Code verifier gerado com `randomBytes(32)`
- Code challenge via SHA-256
- State token para CSRF protection
- Code trocado imediatamente por tokens

### Nenhum token em logs
- Tokens nunca são logados
- Apenas status (email, expiry) é exibido
- Error messages não expõem tokens

## 📊 Comparação com gsd-2

| Aspecto | gsd-2 | OpenClaude |
|---------|-------|-----------|
| Armazenamento | `~/.gsd/auth.json` | `~/.claude/oauth-credentials/` |
| Estrutura | Single file por provider | JSON por provider |
| Múltiplos tokens | Sim (array) | Sim (suportado) |
| Auto-refresh | Sim com locking | Sim com TTL buffer |
| PKCE | Sim | Sim |
| Callback server | Sim | Sim |
| Fallback providers | Sim | Sim (placeholders) |
| Permissões arquivo | 0600 | 0600 |
| Google Search tool | Sim | Sim |

## 🚀 Como Usar

### 1. Setup Google OAuth Credentials

```bash
export GOOGLE_OAUTH_CLIENT_ID="xxx.apps.googleusercontent.com"
export GOOGLE_OAUTH_CLIENT_SECRET="xxx"
export GOOGLE_CLOUD_PROJECT="project-id"
```

### 2. Login

```bash
claude auth login google-gemini-cli
# Browser opens, user authorizes, done!
```

### 3. Verificar Status

```bash
claude auth status google-gemini-cli
# Mostra email, projeto, expiração
```

### 4. Usar em Código

```typescript
import {
  getGeminiOAuthTokenJSON,
  googleSearch,
} from './services/oauth/gemini-oauth-client.js'

// Obter token para chamadas à API
const tokenInfo = await getGeminiOAuthTokenJSON()
// { token: "ya29.xxx", projectId: "xxx" }

// Fazer busca
const result = await googleSearch("OpenClaude features")
```

### 5. Logout

```bash
claude auth logout google-gemini-cli
```

## 📝 Documentação

Ver `GEMINI_OAUTH_SETUP.md` para guia completo de usuário.

## ✅ Checklist de Completude

- [x] OAuthStorage com persistência segura
- [x] GeminiOAuthProvider com PKCE flow completo
- [x] gemini-oauth-client com auto-refresh
- [x] Comandos CLI (login/logout/status)
- [x] Integração com Google Search
- [x] Handler de autenticação estendido
- [x] Componente UI React
- [x] Testes unitários
- [x] Documentação de usuário
- [x] Documentação técnica (este arquivo)

## 🔮 Próximas Fases

**Phase 2: Múltiplos Provedores**
- GitHub OAuth
- Microsoft OAuth
- Llama2 Cloud OAuth

**Phase 3: Sincronização**
- Backup cifrado de credenciais
- Sincronização entre máquinas
- Device trust management

**Phase 4: MCP Integration**
- OAuth via MCP servers
- Remote credential fetching
- Audit logging

**Phase 5: Dashboard Web**
- Gerenciamento visual de credenciais
- Token metrics e usage
- Revogação remota


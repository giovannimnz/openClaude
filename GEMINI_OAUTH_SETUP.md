# Google Gemini CLI OAuth Setup para OpenClaude

Este guia explica como integrar OAuth do Gemini CLI do Google com o OpenClaude, exatamente como funciona no gsd-2.

## 📋 Visão Geral

O sistema permite que você autentique com Google Cloud via OAuth 2.0 e use o Gemini API com o Cloud Code Assist, incluindo:

- **Google Search** com Gemini (respostas sintetizadas do Google Search)
- **Acesso ao Gemini Models** via Google Cloud
- **Credenciais armazenadas de forma segura** no seu diretório `~/.claude/`

## 🚀 Instalação

### 1. Configurar as Credenciais Google OAuth

Você precisa de credenciais OAuth do Google Cloud Console:

```bash
# Crie uma aplicação OAuth 2.0 em:
# https://console.cloud.google.com/

# Tipo: Desktop Application (ou Web Application com redirect http://localhost:8888)
# Escopos necessários:
#   - https://www.googleapis.com/auth/cloud-platform
#   - https://www.googleapis.com/auth/generative-language
#   - openid
#   - email
#   - profile
```

### 2. Configure as Variáveis de Ambiente

```bash
export GOOGLE_OAUTH_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
export GOOGLE_OAUTH_CLIENT_SECRET="seu-client-secret"
export GOOGLE_CLOUD_PROJECT="seu-project-id"
```

Ou adicione em `~/.claude/settings.json`:

```json
{
  "googleOAuthClientId": "seu-client-id.apps.googleusercontent.com",
  "googleOAuthClientSecret": "seu-client-secret",
  "googleCloudProject": "seu-project-id"
}
```

### 3. Efetue Login

```bash
# Login com Google Gemini CLI OAuth
claude auth login google-gemini-cli
```

Isso vai:
- Abrir seu navegador para autorização com Google
- Capturar o código de autorização via localhost:8888
- Trocar o código por um token de acesso
- Armazenar o token de forma segura em `~/.claude/oauth-credentials/google-gemini-cli.json`

### 4. Verifique o Status

```bash
# Verificar se está logado
claude auth status google-gemini-cli

# Saída esperada:
# ✓ Logged in to Google Gemini CLI
# Email: seu-email@example.com
# Name: Your Name
# Project: seu-project-id
# Token expires: 2025-04-15 10:00:00 (in 1 hour)
```

## 🔐 Armazenamento Seguro de Tokens

Os tokens OAuth são armazenados em:

```
~/.claude/oauth-credentials/google-gemini-cli.json
```

Com permissões `0600` (apenas leitura do usuário).

O arquivo contém:

```json
{
  "provider": "google-gemini-cli",
  "token": "ya29.xxx",
  "refreshToken": "1//0xxx",
  "expiresAt": 1744850400000,
  "scopes": ["https://www.googleapis.com/auth/cloud-platform", ...],
  "metadata": {
    "type": "gemini-oauth-v1",
    "obtainedAt": "2025-04-14T10:00:00Z",
    "projectId": "seu-project-id"
  }
}
```

## 🔄 Renovação Automática de Tokens

Os tokens são renovados automaticamente 5 minutos antes da expiração usando o `refreshToken`.

Se a renovação falhar, o token antigo é ainda usado se não estiver completamente expirado.

## 🌐 Usando com Google Search

Uma vez logado, você pode usar a ferramenta Google Search que automaticamente usa seu OAuth:

```bash
claude search "latest Node.js features"
```

Isso vai:
1. Usar seu token OAuth do Gemini CLI
2. Fazer busca no Google via Gemini
3. Sintetizar uma resposta IA
4. Retornar com links de fonte

## 🔧 Implementação Técnica

### Arquitetura de Camadas

```
┌─────────────────────────────────────────┐
│ google_search Tool (tool público)       │
│ (ex: usado por extensões LLM)           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ gemini-search.ts                        │ ← Serviço de busca
│ (performGeminiSearch, formatOutput)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ gemini-oauth-client.ts                  │ ← Acesso aos tokens
│ (getGeminiOAuthToken, etc)              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ oauth-storage.ts                        │ ← Persistência segura
│ (OAuthStorage, getOAuthStorage)         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ ~/.claude/oauth-credentials/            │ ← Armazenamento em disco
│ google-gemini-cli.json (0600)           │
└─────────────────────────────────────────┘
```

### Fluxo OAuth PKCE

```
┌─────────────┐
│ User runs   │
│ `claude auth│
│  login      │
│  google-..` │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│ GeminiOAuthProvider                  │
│ 1. Generate PKCE (verifier + challenge)
│ 2. Build auth URL                   │
│ 3. Start callback server on :8888   │
│ 4. Open browser                     │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ User authorizes in browser           │
│ (Google OAuth consent screen)        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Google redirects to:                 │
│ http://localhost:8888/callback       │
│ ?code=auth_code&state=state          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Local callback server captures code  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Exchange:                            │
│ code + verifier → access_token +     │
│ refresh_token                        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Store in OAuthStorage (encrypted)    │
└──────────────────────────────────────┘
```

## 📝 Exemplos de Uso

### Usar com CLI

```bash
# Login
claude auth login google-gemini-cli

# Verificar status
claude auth status google-gemini-cli

# Logout
claude auth logout google-gemini-cli
```

### Usar em Código TypeScript

```typescript
import {
  getGeminiOAuthToken,
  hasGeminiOAuth,
  loginGeminiOAuth,
} from './services/oauth/gemini-oauth-client.js'

// Verificar se logado
if (await hasGeminiOAuth()) {
  // Obter token válido (com auto-refresh)
  const token = await getGeminiOAuthToken()
  console.log(`Token válido até: ${new Date(token.expiresAt)}`)
  
  // Usar em chamada à API
  const response = await fetch('https://cloudcode-pa.googleapis.com/...', {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'Client-Metadata': JSON.stringify({
        projectId: token.projectId
      })
    }
  })
}

// Fazer busca no Google
import { googleSearch } from './services/oauth/gemini-search.js'
const result = await googleSearch('latest AI models 2025')
console.log(result)
```

## 🐛 Troubleshooting

### Erro: "No Gemini OAuth token found"

**Solução:** Efetue login primeiro
```bash
claude auth login google-gemini-cli
```

### Erro: "Could not determine Google Cloud Project ID"

**Solução:** Defina a variável de ambiente
```bash
export GOOGLE_CLOUD_PROJECT="seu-project-id"
```

### Token expirado

**Solução:** A renovação é automática, mas se precisar re-autenticar:
```bash
claude auth logout google-gemini-cli
claude auth login google-gemini-cli
```

### Callback não recebido

**Solução:** Certifique-se que a porta 8888 está disponível:
```bash
# Verificar se porta está em uso
lsof -i :8888

# Matar o processo se necessário
kill -9 <PID>
```

## 🔄 Integração com gsd-2

Este sistema é compatível com o gsd-2:

```typescript
// Em gsd-2, usar Gemini OAuth do OpenClaude
const oauthRaw = await ctx.modelRegistry.getApiKeyForProvider("google-gemini-cli")
const parsed = JSON.parse(oauthRaw)
const { token, projectId } = parsed
```

## 📚 Referências

- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [PKCE Flow](https://datatracker.ietf.org/doc/html/rfc7636)
- [Google Cloud Project Setup](https://console.cloud.google.com/)
- [Gemini API Documentation](https://ai.google.dev/)
- [gsd-2 Google Search Extension](https://github.com/get-shit-done/gsd-2/blob/main/src/resources/extensions/google-search/index.ts)

## 📋 Checklist de Implementação

- [x] OAuthStorage - Persistência segura de tokens
- [x] GeminiOAuthProvider - Fluxo OAuth PKCE com Google
- [x] gemini-oauth-client.ts - Acesso aos tokens com auto-refresh
- [x] gemini-search.ts - Integração com Google Search
- [x] gemini-oauth-handler.ts - Comandos CLI (login/logout/status)
- [x] Handler de autenticação estendido
- [x] Componente UI React para gerenciamento
- [x] Documentação completa

## 🎯 Próximos Passos

1. **Adicionar suporte a múltiplos provedores OAuth** (GitHub, Microsoft, etc)
2. **Integrar com MCP servers** para acesso remoto seguro
3. **Dashboard web** para gerenciamento de credenciais
4. **Sincronização entre máquinas** com backup cifrado
5. **Auditoria de acesso** aos tokens OAuth


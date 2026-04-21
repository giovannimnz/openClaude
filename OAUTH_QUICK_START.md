# ⚡ Gemini OAuth - Quick Start

## 5 Minutos para Começar

### 1️⃣ Google Console Setup (2 min)

1. Abra https://console.cloud.google.com/
2. Crie um novo projeto
3. Ative "Google Cloud APIs"
4. Vá para "OAuth 2.0 Consent Screen"
   - User Type: External
   - App name: OpenClaude
   - User support email: seu-email@example.com
5. Vá para "Credentials" → "Create Credentials" → "OAuth Client ID"
   - Application type: Desktop
   - Download JSON

### 2️⃣ Configure Env Vars (1 min)

```bash
# Do arquivo JSON baixado:
export GOOGLE_OAUTH_CLIENT_ID="xxx.apps.googleusercontent.com"
export GOOGLE_OAUTH_CLIENT_SECRET="xxx"
export GOOGLE_CLOUD_PROJECT="seu-project-id"
```

### 3️⃣ Login (1 min)

```bash
cd /caminho/para/openclaude
claude auth login google-gemini-cli
```

Browser abre → Você autoriza → ✅ Pronto!

### 4️⃣ Verificar (30 sec)

```bash
claude auth status google-gemini-cli
```

Vê algo como:
```
✓ Logged in to Google Gemini CLI

Email: seu-email@example.com
Name: Your Name
Project: seu-project-id
Token expires: 2025-04-15 10:00:00 (in 1 hour)
```

### 5️⃣ Usar em Código (1 min)

```typescript
import { googleSearch } from './services/oauth/gemini-search.js'

const result = await googleSearch('OpenClaude features')
console.log(result)
```

## 🎯 Comandos Principais

```bash
# Login
claude auth login google-gemini-cli

# Status
claude auth status google-gemini-cli

# Logout
claude auth logout google-gemini-cli
```

## 📦 O que Você Obtém

✅ Google Search via Gemini (AI-synthesized + real sources)
✅ Acesso à Cloud Generative Language API
✅ Token armazenado de forma segura (`~/.claude/oauth-credentials/`)
✅ Auto-refresh automático (5 min antes de expirar)

## 🐛 Problemas?

| Erro | Solução |
|------|---------|
| "No token found" | `claude auth login google-gemini-cli` |
| "Could not determine Project ID" | `export GOOGLE_CLOUD_PROJECT=seu-id` |
| "Callback timeout" | Verifique se porta 8888 está livre (`lsof -i :8888`) |
| "Token expired" | Auto-refresh, ou re-login se refresh falhar |

## 📚 Docs Completos

- **Setup Detalhado**: `GEMINI_OAUTH_SETUP.md`
- **Técnico**: `GEMINI_OAUTH_IMPLEMENTATION.md`
- **Integração**: `src/services/oauth/INTEGRATION_POINTS.md`

## ✨ Próximo Passo

Use em uma extensão ou ferramenta:

```typescript
// Em qualquer extensão/tool:
import { getGeminiOAuthTokenJSON } from './services/oauth/gemini-oauth-client.js'

const creds = await getGeminiOAuthTokenJSON()
if (creds) {
  // Use token para chamar Cloud APIs
  const response = await fetch('https://generativelanguage.googleapis.com/...', {
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'X-Goog-Api-Client': 'openclaude',
    },
  })
}
```

---

**Feito!** 🎉 Seu OpenClaude agora tem acesso seguro ao Gemini via OAuth.


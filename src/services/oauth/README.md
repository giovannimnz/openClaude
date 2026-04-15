# Google Gemini CLI OAuth Implementation

Esta implementação fornece autenticação OAuth 2.0 completa para Google Gemini CLI usando Google Cloud Code Assist API, compatível com GSD-2/Pi SDK.

## Características

- ✅ **OAuth 2.0 com PKCE** - Fluxo seguro com Proof Key for Code Exchange
- ✅ **Token Refresh Automático** - Renovação automática de tokens expirados
- ✅ **Storage Compatível com Pi SDK** - Formato auth.json compatível
- ✅ **Google Cloud Code Assist API** - Acesso à API oficial do Google Cloud
- ✅ **Scopes Adequados** - Permissões corretas para Cloud Code Assist
- ✅ **Provider Específico** - Implementação dedicada para google-gemini-cli

## Arquitetura

### Componentes Principais

1. **`google-gemini-cli.ts`** - Implementação OAuth principal
   - `loginGeminiCli()` - Fluxo de login OAuth
   - `refreshGoogleCloudToken()` - Refresh automático de tokens
   - `getGoogleCloudAccessToken()` - Obter token atual
   - `isGeminiCliLoggedIn()` - Verificar status de login
   - `logoutGeminiCli()` - Logout

2. **`google-cloud-code-assist.ts`** - Provider API
   - `chatCompletion()` - Chamadas não-streaming
   - `chatCompletionStream()` - Chamadas streaming
   - `isCloudCodeAssistAvailable()` - Verificar disponibilidade
   - `getAvailableModels()` - Listar modelos disponíveis

3. **`GoogleGeminiCliOAuth.tsx`** - Componente UI
   - Interface de usuário para login OAuth
   - Feedback visual durante o fluxo
   - Tratamento de erros

## Uso

### Login via CLI

```typescript
import { loginGeminiCli } from './services/oauth/google-gemini-cli.js'

const result = await loginGeminiCli(
  async (url) => {
    // Abrir URL no navegador
    const open = await import('open')
    await open(url)
  },
  (url) => {
    // Callback para mostrar URL ao usuário
    console.log(`Visite: ${url}`)
  }
)

if (result.success) {
  console.log('Login realizado com sucesso!')
  console.log('Access Token:', result.accessToken)
}
```

### Usar API do Cloud Code Assist

```typescript
import { chatCompletion } from './services/api/google-cloud-code-assist.js'

const response = await chatCompletion(
  [
    { role: 'user', content: 'Olá, como você está?' }
  ],
  {
    model: 'gemini-2.5-pro',
    projectId: 'your-project-id',
    temperature: 0.7,
  }
)

console.log(response.choices[0].message.content)
```

### Streaming

```typescript
import { chatCompletionStream } from './services/api/google-cloud-code-assist.js'

for await (const chunk of chatCompletionStream(
  [{ role: 'user', content: 'Conte uma história' }],
  { model: 'gemini-2.5-pro', projectId: 'your-project-id' }
)) {
  process.stdout.write(chunk.choices[0].delta.content || '')
}
```

## Configuração

### Variáveis de Ambiente

```bash
# Opcional: Especificar projeto Google Cloud
export GOOGLE_CLOUD_PROJECT=your-project-id

# Opcional: Forçar modo OAuth
export GEMINI_AUTH_MODE=oauth
```

### Storage

Credenciais são armazenadas em `~/.pi/agent/auth.json`:

```json
{
  "google-gemini-cli": {
    "type": "oauth",
    "credentials": {
      "access_token": "ya29...",
      "refresh_token": "1//...",
      "expiry_date": 1234567890000,
      "token_type": "Bearer",
      "scope": "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/cloud-code-assist"
    }
  }
}
```

## Modelos Disponíveis

- `gemini-2.0-flash` - Modelo rápido e eficiente
- `gemini-2.5-pro` - Modelo profissional
- `gemini-3.0-flash` - Nova geração flash
- `gemini-3.0-pro` - Nova geração profissional

## Scopes OAuth

- `https://www.googleapis.com/auth/cloud-platform` - Acesso ao Google Cloud Platform
- `https://www.googleapis.com/auth/cloud-code-assist` - Acesso ao Cloud Code Assist

## Comparação com GSD-2

| Feature | openclaude | GSD-2/Pi SDK |
|---------|-----------|--------------|
| OAuth Flow | ✅ PKCE | ✅ PKCE |
| Token Refresh | ✅ Automático | ✅ Automático |
| Storage | ✅ auth.json | ✅ auth.json |
| Cloud Code Assist API | ✅ Nativo | ✅ Nativo |
| Scopes | ✅ Completos | ✅ Completos |
| Provider | ✅ Específico | ✅ Específico |

## Integração com Provider Manager

O provider `google-gemini-cli` está disponível no sistema de providers:

```typescript
{
  provider: 'google-gemini-cli',
  name: 'Google Gemini CLI',
  baseUrl: 'https://cloudcodeassist.googleapis.com/v1',
  model: 'gemini-2.5-pro',
  requiresApiKey: false,
  requiresOAuth: true,
}
```

## Troubleshooting

### Token expirado

O sistema renova tokens automaticamente. Se falhar:

```bash
# Fazer login novamente
claude auth login --provider google-gemini-cli
```

### Projeto não configurado

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
```

### Permissões insuficientes

Verifique se sua conta Google tem acesso ao Cloud Code Assist.

## Segurança

- ✅ Tokens armazenados com permissões 0600
- ✅ PKCE previne ataques de interceptação
- ✅ State parameter previne CSRF
- ✅ HTTPS para todas as chamadas
- ✅ Refresh tokens seguros

## Referências

- [Google Cloud Code Assist API](https://cloud.google.com/code/docs)
- [OAuth 2.0 PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [Pi SDK OAuth](https://github.com/badlogic/pi-mono)
- [GSD-2](https://github.com/gsd-build/gsd-2)
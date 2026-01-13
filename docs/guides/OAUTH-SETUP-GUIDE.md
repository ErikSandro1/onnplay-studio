# 🔐 Guia de Configuração OAuth (Google e GitHub)

## 📋 Visão Geral

Este guia vai te ajudar a configurar OAuth com Google e GitHub para permitir que usuários façam login com suas contas sociais. Tempo estimado: **20-30 minutos**.

---

## Parte 1: Configurar Google OAuth (15 minutos)

### 1.1 Acessar Google Cloud Console

1. Acesse https://console.cloud.google.com
2. Faça login com sua conta Google
3. Se for sua primeira vez, aceite os termos de serviço

### 1.2 Criar Novo Projeto

1. No topo da página, clique no dropdown de projetos
2. Clique em **New Project**
3. Preencha:
   - **Project name**: `OnnPlay Studio`
   - **Organization**: (deixe em branco ou selecione sua org)
4. Clique em **Create**
5. Aguarde alguns segundos e selecione o projeto criado

### 1.3 Configurar OAuth Consent Screen

1. No menu lateral, vá em **APIs & Services** → **OAuth consent screen**
2. Selecione **External** (para permitir qualquer usuário Google)
3. Clique em **Create**
4. Preencha a página 1:
   - **App name**: `OnnPlay Studio`
   - **User support email**: Seu email
   - **App logo**: (opcional) Upload do logo
   - **Application home page**: `https://onnplay-studio-production.up.railway.app`
   - **Application privacy policy**: `https://onnplay-studio-production.up.railway.app/privacy`
   - **Application terms of service**: `https://onnplay-studio-production.up.railway.app/terms`
   - **Authorized domains**: `railway.app` (ou seu domínio customizado)
   - **Developer contact email**: Seu email
5. Clique em **Save and Continue**

6. Página 2 - Scopes:
   - Clique em **Add or Remove Scopes**
   - Selecione:
     - `userinfo.email`
     - `userinfo.profile`
     - `openid`
   - Clique em **Update**
   - Clique em **Save and Continue**

7. Página 3 - Test users (opcional para desenvolvimento):
   - Adicione seu email como test user
   - Clique em **Save and Continue**

8. Página 4 - Summary:
   - Revise as informações
   - Clique em **Back to Dashboard**

### 1.4 Criar OAuth Client ID

1. No menu lateral, vá em **APIs & Services** → **Credentials**
2. Clique em **Create Credentials** → **OAuth client ID**
3. Selecione **Application type**: `Web application`
4. Preencha:
   - **Name**: `OnnPlay Studio Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (para desenvolvimento)
     - `https://onnplay-studio-production.up.railway.app` (para produção)
   - **Authorized redirect URIs**:
     - `http://localhost:5173/auth/google/callback` (para desenvolvimento)
     - `https://onnplay-studio-production.up.railway.app/auth/google/callback` (para produção)
5. Clique em **Create**

### 1.5 Copiar Credenciais

1. Uma modal aparecerá com:
   - **Client ID** (começa com algo como `123456789-xxx.apps.googleusercontent.com`)
   - **Client Secret**
2. Copie ambos e adicione no `.env`:
   ```env
   GOOGLE_CLIENT_ID=seu_client_id_aqui
   GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
   GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
   ```

**✅ Checkpoint**: Google OAuth configurado!

---

## Parte 2: Configurar GitHub OAuth (10 minutos)

### 2.1 Acessar GitHub Settings

1. Acesse https://github.com/settings/developers
2. Clique em **OAuth Apps**
3. Clique em **New OAuth App**

### 2.2 Criar OAuth App

Preencha o formulário:

1. **Application name**: `OnnPlay Studio`
2. **Homepage URL**: `https://onnplay-studio-production.up.railway.app`
3. **Application description**: `Plataforma profissional de transmissão ao vivo com AI Studio Assistant`
4. **Authorization callback URL**: 
   - Para desenvolvimento: `http://localhost:5173/auth/github/callback`
   - Para produção: `https://onnplay-studio-production.up.railway.app/auth/github/callback`
   
   **Nota**: Você pode criar duas apps separadas (uma para dev, outra para prod) ou usar apenas uma URL

5. Clique em **Register application**

### 2.3 Gerar Client Secret

1. Na página do app criado, você verá o **Client ID**
2. Clique em **Generate a new client secret**
3. Copie o secret (você não poderá ver novamente!)

### 2.4 Adicionar ao .env

Adicione as credenciais no `.env`:

```env
GITHUB_CLIENT_ID=seu_client_id_aqui
GITHUB_CLIENT_SECRET=seu_client_secret_aqui
GITHUB_REDIRECT_URI=http://localhost:5173/auth/github/callback
```

**✅ Checkpoint**: GitHub OAuth configurado!

---

## Parte 3: Implementar OAuth no Frontend (Já está pronto!)

O código OAuth já está estruturado no backend (`AuthService.ts`) e no frontend (`LoginNew.tsx`). Você só precisa adicionar as rotas de callback.

### 3.1 Criar Página de Callback Google

Crie o arquivo `client/src/pages/AuthGoogleCallback.tsx`:

```typescript
import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthGoogleCallback() {
  const [, navigate] = useLocation();
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        toast.error('Falha na autenticação com Google');
        navigate('/login-new');
        return;
      }

      if (!code) {
        toast.error('Código de autorização não encontrado');
        navigate('/login-new');
        return;
      }

      try {
        await loginWithGoogle(code);
        navigate('/studio');
      } catch (error) {
        toast.error('Erro ao fazer login com Google');
        navigate('/login-new');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Autenticando com Google...</p>
      </div>
    </div>
  );
}
```

### 3.2 Criar Página de Callback GitHub

Crie o arquivo `client/src/pages/AuthGitHubCallback.tsx`:

```typescript
import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthGitHubCallback() {
  const [, navigate] = useLocation();
  const { loginWithGitHub } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        toast.error('Falha na autenticação com GitHub');
        navigate('/login-new');
        return;
      }

      if (!code) {
        toast.error('Código de autorização não encontrado');
        navigate('/login-new');
        return;
      }

      try {
        await loginWithGitHub(code);
        navigate('/studio');
      } catch (error) {
        toast.error('Erro ao fazer login com GitHub');
        navigate('/login-new');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Autenticando com GitHub...</p>
      </div>
    </div>
  );
}
```

### 3.3 Adicionar Rotas no App.tsx

No `App.tsx`, adicione:

```typescript
import AuthGoogleCallback from "./pages/AuthGoogleCallback";
import AuthGitHubCallback from "./pages/AuthGitHubCallback";

// Dentro do Router:
<Route path="/auth/google/callback" component={AuthGoogleCallback} />
<Route path="/auth/github/callback" component={AuthGitHubCallback} />
```

### 3.4 Atualizar AuthContext

Adicione os métodos no `AuthContext.tsx`:

```typescript
const loginWithGoogle = async (code: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/oauth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login com Google falhou');
    }

    setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    localStorage.setItem('token', data.token);
    toast.success(`Bem-vindo, ${data.user.name}!`);
  } catch (error: any) {
    toast.error(error.message || 'Erro ao fazer login com Google');
    throw error;
  }
};

const loginWithGitHub = async (code: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/oauth/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login com GitHub falhou');
    }

    setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    localStorage.setItem('token', data.token);
    toast.success(`Bem-vindo, ${data.user.name}!`);
  } catch (error: any) {
    toast.error(error.message || 'Erro ao fazer login com GitHub');
    throw error;
  }
};

// Adicionar ao return do Provider:
return (
  <AuthContext.Provider
    value={{
      // ... outros valores
      loginWithGoogle,
      loginWithGitHub,
    }}
  >
    {children}
  </AuthContext.Provider>
);
```

### 3.5 Atualizar LoginNew.tsx

Os botões OAuth já estão no `LoginNew.tsx`, mas precisam ser ativados:

```typescript
const handleGoogleLogin = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 
    'http://localhost:5173/auth/google/callback';
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${redirectUri}&` +
    `response_type=code&` +
    `scope=openid%20email%20profile&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  window.location.href = googleAuthUrl;
};

const handleGitHubLogin = () => {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI || 
    'http://localhost:5173/auth/github/callback';
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${redirectUri}&` +
    `scope=user:email`;
  
  window.location.href = githubAuthUrl;
};

// Atualizar os botões:
<button
  onClick={handleGoogleLogin}
  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium"
>
  {/* ... conteúdo do botão ... */}
</button>

<button
  onClick={handleGitHubLogin}
  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
>
  {/* ... conteúdo do botão ... */}
</button>
```

### 3.6 Adicionar Variáveis de Ambiente no Frontend

No `.env`, adicione:

```env
# Frontend OAuth
VITE_GOOGLE_CLIENT_ID=seu_google_client_id_aqui
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
VITE_GITHUB_CLIENT_ID=seu_github_client_id_aqui
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/github/callback
```

---

## Parte 4: Testar OAuth (5 minutos)

### 4.1 Reiniciar Aplicação

```bash
pnpm run dev
```

### 4.2 Testar Google Login

1. Acesse http://localhost:5173/login-new
2. Clique em **Continuar com Google**
3. Você será redirecionado para o Google
4. Selecione sua conta Google
5. Autorize o app
6. Você será redirecionado de volta para `/studio`

**Resultado esperado**: Login bem-sucedido!

### 4.3 Testar GitHub Login

1. Acesse http://localhost:5173/login-new
2. Clique em **Continuar com GitHub**
3. Você será redirecionado para o GitHub
4. Autorize o app
5. Você será redirecionado de volta para `/studio`

**Resultado esperado**: Login bem-sucedido!

### 4.4 Verificar Banco de Dados

No banco, você verá:
- Novo usuário criado
- `oauth_provider`: `google` ou `github`
- `oauth_id`: ID do usuário no provedor
- Email e nome preenchidos automaticamente

---

## 🐛 Troubleshooting

### Erro: "redirect_uri_mismatch"

**Solução**: 
1. Verifique se a URL de callback está exatamente igual no Google Cloud Console / GitHub
2. Certifique-se de incluir `http://` ou `https://`
3. Não adicione trailing slash (`/`)

### Erro: "access_denied"

**Solução**: Usuário cancelou a autorização. Isso é normal.

### Erro: "invalid_client"

**Solução**:
1. Verifique se o Client ID e Secret estão corretos
2. Certifique-se que não há espaços extras
3. Verifique se as variáveis de ambiente estão carregadas

### OAuth funciona em dev mas não em produção

**Solução**:
1. Adicione a URL de produção nas Authorized redirect URIs
2. Configure as variáveis de ambiente no Railway
3. Use HTTPS em produção (obrigatório)

---

## 📊 Fluxo OAuth Completo

```
1. Usuário clica em "Continuar com Google/GitHub"
   ↓
2. Redirecionado para Google/GitHub
   ↓
3. Usuário autoriza o app
   ↓
4. Google/GitHub redireciona de volta com code
   ↓
5. Frontend envia code para backend
   ↓
6. Backend troca code por access_token
   ↓
7. Backend busca dados do usuário
   ↓
8. Backend cria/atualiza usuário no banco
   ↓
9. Backend gera JWT token
   ↓
10. Frontend armazena token e redireciona para /studio
```

---

## 🚀 Próximos Passos

Após configurar OAuth:

1. ✅ Testar login com Google
2. ✅ Testar login com GitHub
3. ✅ Verificar criação de usuários no banco
4. ✅ Testar em produção
5. ⏳ Implementar tracking de uso real
6. ⏳ Criar testes end-to-end

---

## 📚 Recursos

- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [OAuth 2.0 Simplified](https://aaronparecki.com/oauth-2-simplified/)

---

**OAuth configurado! 🎉**

Agora vamos para a próxima etapa: **Implementar Tracking de Uso Real**!

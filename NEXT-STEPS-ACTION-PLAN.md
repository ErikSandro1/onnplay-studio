# 🎯 Plano de Ação - Próximos Passos

## 📋 Visão Geral

Este guia detalha **exatamente** o que fazer agora para deixar o OnnPlay Studio 100% funcional com:
- ✅ Login funcionando
- ✅ Stripe configurado e testado
- ✅ Lives integradas com tracking

**Tempo estimado**: 2-3 horas

---

## 🔐 PASSO 1: Configurar e Testar Login (30 minutos)

### 1.1 Verificar se o servidor está rodando

```bash
cd /home/ubuntu/onnplay-studio
pnpm run dev
```

Você deve ver:
```
🚀 Server running on http://localhost:3000/
📡 API available at http://localhost:3000/api
```

### 1.2 Testar Registro de Usuário

**No navegador**:
1. Acesse http://localhost:5173/login-new
2. Clique em **"Criar Conta"**
3. Preencha:
   - Nome: `Seu Nome`
   - Email: `seu@email.com`
   - Senha: `senha12345` (mínimo 8 caracteres)
4. Clique em **"Criar Conta"**

**Resultado esperado**: 
- ✅ Você será redirecionado para `/studio`
- ✅ Verá uma notificação de sucesso
- ✅ Estará logado

**Se der erro**:
- Verifique o console do navegador (F12)
- Verifique os logs do servidor
- Verifique se VITE_API_URL está correto no .env

### 1.3 Testar Login

1. Faça logout (se estiver logado)
2. Acesse http://localhost:5173/login-new
3. Faça login com as credenciais criadas
4. Verifique se foi redirecionado para `/studio`

### 1.4 Testar Dashboard

1. Acesse http://localhost:5173/dashboard
2. Você deve ver:
   - Seu perfil
   - Plano atual: **Free**
   - Uso do mês: 0 minutos
   - Botão "Fazer Upgrade"

**✅ Checkpoint**: Login funcionando!

---

## 💳 PASSO 2: Configurar Stripe (45 minutos)

### 2.1 Criar Conta Stripe (se ainda não tem)

1. Acesse https://dashboard.stripe.com/register
2. Crie sua conta
3. Complete o perfil básico

### 2.2 Obter Chaves de API (Modo Teste)

1. No Stripe Dashboard, vá em **Developers** → **API keys**
2. Certifique-se que está em **Test mode** (toggle no topo)
3. Copie a **Secret key** (começa com `sk_test_...`)
4. Adicione no `.env`:

```env
STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
```

### 2.3 Criar Produtos e Preços

**Produto Pro**:
1. Vá em **Products** → **Add product**
2. Preencha:
   - Name: `OnnPlay Studio Pro`
   - Description: `Plano profissional com transmissão ilimitada`
   - Price: `29.00` USD
   - Billing period: `Monthly`
   - Recurring: ✅
3. Clique em **Add product**
4. Copie o **Price ID** (começa com `price_...`)
5. Adicione no `.env`:

```env
STRIPE_PRO_PRICE_ID=price_seu_id_aqui
```

**Produto Enterprise**:
1. Repita o processo acima
2. Name: `OnnPlay Studio Enterprise`
3. Price: `99.00` USD
4. Copie o Price ID
5. Adicione no `.env`:

```env
STRIPE_ENTERPRISE_PRICE_ID=price_seu_id_aqui
```

### 2.4 Configurar Webhooks (Modo Teste Local)

**Opção 1: Stripe CLI (Recomendado)**

1. Instale o Stripe CLI:
   ```bash
   # Mac/Linux
   brew install stripe/stripe-cli/stripe
   
   # Ou baixe de: https://github.com/stripe/stripe-cli/releases
   ```

2. Faça login:
   ```bash
   stripe login
   ```

3. Em um terminal separado, inicie o forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

4. Copie o **webhook signing secret** (começa com `whsec_...`)
5. Adicione no `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_seu_secret_aqui
```

**Opção 2: Sem Stripe CLI (Temporário)**

Se não conseguir instalar o Stripe CLI, você pode testar sem webhooks por enquanto. Os webhooks são importantes para produção, mas para testes iniciais você pode pular esta etapa.

### 2.5 Reiniciar Servidor

```bash
# Pare o servidor (Ctrl+C)
# Inicie novamente
pnpm run dev
```

### 2.6 Testar Checkout

1. Acesse http://localhost:5173/pricing
2. Clique em **"Assinar Pro"**
3. Você será redirecionado para o Stripe Checkout
4. Use cartão de teste:
   - Número: `4242 4242 4242 4242`
   - Data: `12/34` (qualquer data futura)
   - CVC: `123` (qualquer 3 dígitos)
   - Nome: `Teste`
   - CEP: `12345`
5. Clique em **"Subscribe"**

**Resultado esperado**:
- ✅ Você será redirecionado para `/dashboard?checkout=success`
- ✅ Verá notificação de sucesso
- ✅ Plano mudará para **Pro**
- ✅ No terminal do Stripe CLI (se estiver usando), verá eventos sendo processados

### 2.7 Verificar no Stripe Dashboard

1. No Stripe Dashboard, vá em **Customers**
2. Você verá o cliente criado
3. Vá em **Subscriptions**
4. Verá a assinatura Pro ativa

**✅ Checkpoint**: Stripe funcionando!

---

## 📡 PASSO 3: Integrar Lives com Tracking (45 minutos)

Agora vamos conectar o sistema de transmissão ao vivo com o tracking de uso.

### 3.1 Verificar Componente de Live Existente

Primeiro, vamos ver onde está o componente de live:

```bash
cd /home/ubuntu/onnplay-studio
find client/src -name "*Studio*" -o -name "*Live*" -o -name "*Broadcast*"
```

### 3.2 Criar Hook de Broadcast

Vou criar um hook React para facilitar o uso do tracking:

**Arquivo**: `client/src/hooks/useBroadcast.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUsageLimits } from './useUsageLimits';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function useBroadcast() {
  const { token } = useAuth();
  const { canStartStreaming, incrementStreamingMinutes } = useUsageLimits();
  
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  /**
   * Start a broadcast
   */
  const startBroadcast = useCallback(async (
    platform: string,
    quality: string,
    participantsCount: number = 1
  ) => {
    if (!token) {
      toast.error('Você precisa estar logado');
      return null;
    }

    // Check if user can start streaming
    const permission = await canStartStreaming();
    if (!permission.allowed) {
      return null;
    }

    setIsStarting(true);

    try {
      const response = await fetch(`${API_URL}/broadcast/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform,
          quality,
          participantsCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao iniciar transmissão');
      }

      setBroadcastId(data.broadcastId);
      setIsLive(true);
      
      toast.success('Transmissão iniciada!');
      
      if (permission.remainingMinutes && permission.remainingMinutes < 10) {
        toast.warning(
          `Atenção: Você tem apenas ${permission.remainingMinutes} minutos restantes neste mês`,
          { duration: 5000 }
        );
      }

      return data.broadcastId;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao iniciar transmissão');
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [token, canStartStreaming]);

  /**
   * End a broadcast
   */
  const endBroadcast = useCallback(async (peakViewers?: number) => {
    if (!token || !broadcastId) return;

    try {
      const response = await fetch(`${API_URL}/broadcast/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          broadcastId,
          peakViewers,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao encerrar transmissão');
      }

      setIsLive(false);
      setBroadcastId(null);
      
      toast.success('Transmissão encerrada!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao encerrar transmissão');
    }
  }, [token, broadcastId]);

  /**
   * Update peak viewers
   */
  const updateViewers = useCallback(async (viewers: number) => {
    if (!token || !broadcastId) return;

    try {
      await fetch(`${API_URL}/broadcast/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          broadcastId,
          viewers,
        }),
      });
    } catch (error) {
      console.error('Failed to update viewers:', error);
    }
  }, [token, broadcastId]);

  return {
    broadcastId,
    isLive,
    isStarting,
    startBroadcast,
    endBroadcast,
    updateViewers,
  };
}
```

### 3.3 Integrar com Componente de Live

Agora vamos encontrar e atualizar o componente principal de live:

```bash
# Procurar o componente principal
grep -r "function Home" client/src/pages/
```

O componente principal está em `client/src/pages/Home.tsx`. Vamos adicionar o tracking lá.

### 3.4 Exemplo de Integração

Adicione no início do componente `Home.tsx`:

```typescript
import { useBroadcast } from '../hooks/useBroadcast';

// Dentro do componente:
const { startBroadcast, endBroadcast, isLive, broadcastId } = useBroadcast();

// Quando iniciar transmissão:
const handleStartStream = async () => {
  const id = await startBroadcast(
    'YouTube', // ou a plataforma selecionada
    '1080p',   // ou a qualidade selecionada
    1          // número de participantes
  );
  
  if (id) {
    // Transmissão iniciada com sucesso
    // Continuar com a lógica de streaming
  }
};

// Quando encerrar transmissão:
const handleStopStream = async () => {
  await endBroadcast(peakViewers); // passar o número máximo de viewers
  // Parar a transmissão
};
```

**✅ Checkpoint**: Lives integradas com tracking!

---

## 🧪 PASSO 4: Testes Integrados (30 minutos)

### 4.1 Teste Completo do Fluxo

1. **Criar conta nova**:
   - Acesse `/login-new`
   - Crie uma conta
   - Verifique que está logado

2. **Verificar plano Free**:
   - Acesse `/dashboard`
   - Confirme que está no plano Free
   - Veja que tem 60 minutos disponíveis

3. **Tentar iniciar live**:
   - Vá para `/studio`
   - Inicie uma transmissão
   - Verifique que foi permitido (plano Free tem 60 min)

4. **Verificar uso**:
   - Aguarde 1-2 minutos
   - Volte para `/dashboard`
   - Verifique se os minutos foram incrementados

5. **Fazer upgrade para Pro**:
   - Acesse `/pricing`
   - Clique em "Assinar Pro"
   - Complete o checkout com cartão de teste
   - Verifique redirecionamento para dashboard

6. **Verificar plano Pro**:
   - No dashboard, confirme plano Pro
   - Veja que agora é ilimitado

7. **Testar recursos Pro**:
   - Iniciar transmissão (sem limite)
   - Testar gravação (se disponível)
   - Verificar que não há mais restrições

### 4.2 Teste de Limites

1. **Simular limite atingido** (para plano Free):
   ```bash
   # Incrementar manualmente para testar
   curl -X POST http://localhost:3000/api/usage/increment/streaming \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"minutes": 60}'
   ```

2. **Tentar iniciar live**:
   - Deve mostrar mensagem de limite atingido
   - Deve sugerir upgrade

### 4.3 Executar Testes E2E

```bash
./test-e2e.sh
```

Todos os 17 testes devem passar.

**✅ Checkpoint**: Tudo testado e funcionando!

---

## 📝 CHECKLIST FINAL

### Login
- [ ] Registro funcionando
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Logout funcionando

### Stripe
- [ ] Conta Stripe criada
- [ ] Produtos Pro e Enterprise criados
- [ ] Chaves de API configuradas
- [ ] Checkout funcionando
- [ ] Webhooks configurados (opcional para teste)
- [ ] Plano atualizado após pagamento

### Lives
- [ ] Hook useBroadcast criado
- [ ] Integrado com componente de live
- [ ] Tracking iniciando automaticamente
- [ ] Minutos sendo incrementados
- [ ] Limites sendo verificados
- [ ] Prompts de upgrade funcionando

### Testes
- [ ] Fluxo completo testado
- [ ] Limites testados
- [ ] Script E2E executado
- [ ] Todos os testes passando

---

## 🐛 Troubleshooting

### Login não funciona

**Problema**: Erro ao fazer login

**Soluções**:
1. Verifique se o servidor está rodando
2. Verifique VITE_API_URL no .env
3. Verifique JWT_SECRET no .env
4. Veja logs do servidor
5. Veja console do navegador (F12)

### Stripe não redireciona

**Problema**: Após pagamento, não volta para o site

**Soluções**:
1. Verifique STRIPE_SECRET_KEY
2. Verifique Price IDs
3. Verifique se está usando cartão de teste correto
4. Veja logs do Stripe CLI (se estiver usando)

### Tracking não funciona

**Problema**: Minutos não são incrementados

**Soluções**:
1. Verifique se startBroadcast foi chamado
2. Verifique se há erros no console
3. Verifique se o token está válido
4. Veja logs do servidor

### Limites não aplicados

**Problema**: Usuário Free pode transmitir ilimitadamente

**Soluções**:
1. Verifique se canStartStreaming está sendo chamado
2. Verifique se o plano do usuário está correto
3. Verifique se o uso está sendo incrementado
4. Reinicie o servidor

---

## 🎯 Próximos Passos Após Testes

Depois que tudo estiver funcionando localmente:

1. **OAuth** (opcional):
   - Configurar Google OAuth
   - Configurar GitHub OAuth
   - Testar login social

2. **Produção**:
   - Seguir PRODUCTION-DEPLOYMENT.md
   - Deploy no Railway
   - Stripe em modo live
   - Testes em produção

3. **Melhorias**:
   - Adicionar mais features
   - Otimizar performance
   - Coletar feedback
   - Iterar

---

## 💡 Dicas

- **Use o Stripe CLI**: Facilita muito o desenvolvimento
- **Teste com múltiplos usuários**: Crie várias contas
- **Monitore os logs**: Sempre de olho no terminal
- **Use o DevTools**: F12 é seu amigo
- **Documente problemas**: Anote erros para referência

---

## 🎉 Conclusão

Seguindo este guia, você terá:
- ✅ Login 100% funcional
- ✅ Stripe configurado e testado
- ✅ Lives integradas com tracking
- ✅ Sistema completo operacional

**Tempo total**: 2-3 horas

**Próximo passo**: Começar pelo Passo 1 (Login)! 🚀

---

**Boa sorte! Se tiver dúvidas, consulte os outros guias ou os logs do sistema! 💪**

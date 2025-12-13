# 🚀 Guia de Deploy em Produção - OnnPlay Studio

## 📋 Visão Geral

Este guia cobre todo o processo de deploy do OnnPlay Studio em produção usando Railway, incluindo configuração de banco de dados, variáveis de ambiente, Stripe, OAuth e monitoramento.

**Tempo estimado**: 45-60 minutos

---

## Pré-requisitos

Antes de começar, você precisa ter:

- ✅ Conta no Railway (https://railway.app)
- ✅ Conta no Stripe configurada (modo live)
- ✅ Domínio customizado (opcional, mas recomendado)
- ✅ Conta Google Cloud (para OAuth)
- ✅ Conta GitHub (para OAuth)
- ✅ Repositório GitHub com o código

---

## Parte 1: Configurar Banco de Dados MySQL (10 minutos)

### 1.1 Criar Serviço MySQL no Railway

1. Acesse https://railway.app/dashboard
2. Clique em **New Project**
3. Selecione **Deploy MySQL**
4. Aguarde o provisionamento (1-2 minutos)

### 1.2 Obter Credenciais do Banco

1. Clique no serviço MySQL criado
2. Vá na aba **Variables**
3. Copie as seguintes variáveis:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
   - `DATABASE_URL` (formato completo)

### 1.3 Executar Schema SQL

1. Conecte-se ao banco usando um cliente MySQL:
   ```bash
   mysql -h <MYSQL_HOST> -P <MYSQL_PORT> -u <MYSQL_USER> -p<MYSQL_PASSWORD> <MYSQL_DATABASE>
   ```

2. Execute o schema:
   ```bash
   mysql -h <MYSQL_HOST> -P <MYSQL_PORT> -u <MYSQL_USER> -p<MYSQL_PASSWORD> <MYSQL_DATABASE> < server/db/schema.sql
   ```

   Ou copie e cole o conteúdo de `server/db/schema.sql` no cliente MySQL.

3. Verifique as tabelas:
   ```sql
   SHOW TABLES;
   ```

   Você deve ver: users, subscriptions, usage, broadcasts, recordings, webhook_events, api_keys

**✅ Checkpoint**: Banco de dados configurado e schema aplicado

---

## Parte 2: Configurar Stripe em Modo Live (15 minutos)

### 2.1 Ativar Conta Stripe

1. Acesse https://dashboard.stripe.com
2. Complete o processo de ativação da conta:
   - Informações da empresa
   - Dados bancários para recebimento
   - Verificação de identidade
   - Informações fiscais

**Nota**: Este processo pode levar alguns dias para aprovação completa, mas você pode usar o modo test enquanto isso.

### 2.2 Mudar para Modo Live

1. No dashboard Stripe, alterne de **Test mode** para **Live mode** (toggle no canto superior direito)

### 2.3 Obter Chaves de Produção

1. Vá em **Developers** → **API keys**
2. Copie a **Live Secret key** (começa com `sk_live_...`)
3. **IMPORTANTE**: Guarde esta chave em local seguro!

### 2.4 Criar Produtos em Modo Live

Repita o processo de criação de produtos, mas agora em modo live:

**Produto Pro**:
- Nome: `OnnPlay Studio Pro`
- Preço: `$29.00` mensal
- Copie o Price ID (começa com `price_...`)

**Produto Enterprise**:
- Nome: `OnnPlay Studio Enterprise`
- Preço: `$99.00` mensal
- Copie o Price ID

### 2.5 Configurar Webhook em Produção

1. Vá em **Developers** → **Webhooks**
2. Clique em **Add endpoint**
3. **Endpoint URL**: `https://seu-dominio.railway.app/api/payments/webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Clique em **Add endpoint**
6. Copie o **Signing secret** (começa com `whsec_...`)

**✅ Checkpoint**: Stripe configurado em modo live

---

## Parte 3: Configurar OAuth em Produção (10 minutos)

### 3.1 Atualizar Google OAuth

1. Acesse https://console.cloud.google.com
2. Selecione seu projeto OnnPlay Studio
3. Vá em **APIs & Services** → **Credentials**
4. Edite o OAuth 2.0 Client ID
5. Adicione em **Authorized redirect URIs**:
   - `https://seu-dominio.railway.app/auth/google/callback`
6. Salve

### 3.2 Atualizar GitHub OAuth

1. Acesse https://github.com/settings/developers
2. Edite o OAuth App do OnnPlay Studio
3. Atualize **Authorization callback URL**:
   - `https://seu-dominio.railway.app/auth/github/callback`
4. Salve

**✅ Checkpoint**: OAuth configurado para produção

---

## Parte 4: Deploy no Railway (15 minutos)

### 4.1 Criar Novo Serviço

1. No Railway, clique em **New** → **GitHub Repo**
2. Conecte sua conta GitHub (se ainda não conectou)
3. Selecione o repositório `onnplay-studio`
4. Clique em **Deploy**

### 4.2 Configurar Variáveis de Ambiente

1. Clique no serviço criado
2. Vá na aba **Variables**
3. Adicione todas as variáveis:

```env
# Server
NODE_ENV=production
PORT=3000
CLIENT_URL=https://seu-dominio.railway.app

# JWT (GERAR NOVO SECRET FORTE!)
JWT_SECRET=<gere_um_secret_forte_aqui>

# Database (copiar do serviço MySQL)
DATABASE_URL=mysql://user:password@host:port/database

# Stripe (modo live)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# OAuth Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://seu-dominio.railway.app/auth/google/callback

# OAuth GitHub
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=https://seu-dominio.railway.app/auth/github/callback

# Frontend (Vite)
VITE_API_URL=https://seu-dominio.railway.app/api
VITE_GOOGLE_CLIENT_ID=...
VITE_GOOGLE_REDIRECT_URI=https://seu-dominio.railway.app/auth/google/callback
VITE_GITHUB_CLIENT_ID=...
VITE_GITHUB_REDIRECT_URI=https://seu-dominio.railway.app/auth/github/callback

# Daily.co (se configurado)
DAILY_API_KEY=...
```

**IMPORTANTE - Gerar JWT Secret Forte**:
```bash
# No terminal:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4.3 Configurar Domínio Customizado (Opcional)

1. Na aba **Settings** do serviço
2. Vá em **Domains**
3. Clique em **Custom Domain**
4. Adicione seu domínio (ex: `studio.onnplay.com`)
5. Configure DNS:
   - Tipo: `CNAME`
   - Nome: `studio` (ou `@` para root)
   - Valor: `<seu-projeto>.railway.app`

### 4.4 Aguardar Deploy

1. Vá na aba **Deployments**
2. Aguarde o build e deploy (5-10 minutos)
3. Verifique os logs para erros

**✅ Checkpoint**: Aplicação deployada no Railway

---

## Parte 5: Verificação e Testes (10 minutos)

### 5.1 Verificar Health Check

```bash
curl https://seu-dominio.railway.app/api/health
```

Deve retornar:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "environment": "production"
}
```

### 5.2 Testar Registro de Usuário

1. Acesse `https://seu-dominio.railway.app/login-new`
2. Crie uma conta de teste
3. Verifique se foi redirecionado para `/studio`

### 5.3 Testar Checkout Stripe

1. Acesse `/pricing`
2. Clique em **Assinar Pro**
3. Use cartão de teste (mesmo em produção, se ainda não ativou)
4. Complete o checkout
5. Verifique se foi redirecionado para `/dashboard`
6. Verifique no Stripe Dashboard se a assinatura foi criada

### 5.4 Testar Webhooks

1. No Stripe Dashboard, vá em **Developers** → **Webhooks**
2. Clique no endpoint configurado
3. Vá na aba **Events**
4. Verifique se os eventos estão sendo recebidos (status 200)

### 5.5 Testar OAuth

**Google**:
1. Acesse `/login-new`
2. Clique em **Continuar com Google**
3. Autorize
4. Verifique se foi redirecionado para `/studio`

**GitHub**:
1. Acesse `/login-new`
2. Clique em **Continuar com GitHub**
3. Autorize
4. Verifique se foi redirecionado para `/studio`

**✅ Checkpoint**: Todos os testes passaram

---

## Parte 6: Monitoramento e Logs (5 minutos)

### 6.1 Configurar Logs no Railway

1. Na aba **Observability** do serviço
2. Configure alertas para:
   - CPU > 80%
   - Memory > 80%
   - Erros 5xx

### 6.2 Monitorar Stripe

1. No Stripe Dashboard, configure notificações:
   - Pagamentos falhados
   - Assinaturas canceladas
   - Disputas

### 6.3 Configurar Uptime Monitoring

Use um serviço como:
- UptimeRobot (https://uptimerobot.com)
- Pingdom (https://www.pingdom.com)
- Better Uptime (https://betteruptime.com)

Configure para monitorar:
- `https://seu-dominio.railway.app/api/health`
- Frequência: 5 minutos
- Alertas: Email/SMS

**✅ Checkpoint**: Monitoramento configurado

---

## Parte 7: Segurança e Performance (5 minutos)

### 7.1 Verificar HTTPS

1. Acesse `https://seu-dominio.railway.app`
2. Verifique o cadeado verde no navegador
3. Certifique-se que não há mixed content

### 7.2 Configurar Rate Limiting (Opcional)

Adicione no `server/index.ts`:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);
```

### 7.3 Configurar CORS para Domínio Específico

No `server/index.ts`, atualize:

```typescript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
```

### 7.4 Adicionar Helmet para Segurança

```bash
pnpm add helmet
```

No `server/index.ts`:

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

**✅ Checkpoint**: Segurança reforçada

---

## Parte 8: Backup e Disaster Recovery (5 minutos)

### 8.1 Configurar Backup do Banco

1. No Railway, vá no serviço MySQL
2. Ative backups automáticos (se disponível)
3. Ou configure backup manual:

```bash
# Script de backup (executar diariamente)
mysqldump -h <HOST> -P <PORT> -u <USER> -p<PASSWORD> <DATABASE> > backup-$(date +%Y%m%d).sql
```

### 8.2 Backup de Variáveis de Ambiente

1. Exporte todas as variáveis do Railway
2. Salve em local seguro (1Password, LastPass, etc.)
3. **NUNCA** commite no Git!

### 8.3 Plano de Disaster Recovery

Documente:
1. Como restaurar banco de dados
2. Como fazer rollback de deploy
3. Contatos de emergência
4. Procedimentos de escalação

**✅ Checkpoint**: Backup configurado

---

## Checklist Final de Deploy

Antes de considerar o deploy completo, verifique:

### Banco de Dados
- [ ] MySQL provisionado no Railway
- [ ] Schema SQL aplicado
- [ ] Conexão testada
- [ ] Backup configurado

### Stripe
- [ ] Conta ativada em modo live
- [ ] Produtos Pro e Enterprise criados
- [ ] Webhooks configurados
- [ ] Testes de checkout realizados

### OAuth
- [ ] Google OAuth configurado para produção
- [ ] GitHub OAuth configurado para produção
- [ ] Redirects testados

### Deploy
- [ ] Código deployado no Railway
- [ ] Todas as variáveis de ambiente configuradas
- [ ] JWT secret forte gerado
- [ ] Domínio customizado configurado (opcional)
- [ ] HTTPS funcionando

### Testes
- [ ] Health check respondendo
- [ ] Registro de usuário funcionando
- [ ] Login funcionando
- [ ] Checkout Stripe funcionando
- [ ] Webhooks sendo recebidos
- [ ] OAuth Google funcionando
- [ ] OAuth GitHub funcionando
- [ ] Dashboard carregando
- [ ] Pricing page funcionando

### Segurança
- [ ] HTTPS ativo
- [ ] CORS configurado
- [ ] Rate limiting ativo (opcional)
- [ ] Helmet configurado (opcional)
- [ ] Secrets seguros

### Monitoramento
- [ ] Logs configurados
- [ ] Alertas configurados
- [ ] Uptime monitoring ativo
- [ ] Stripe notifications ativas

---

## Pós-Deploy

### Tarefas Imediatas

1. **Testar tudo novamente** em produção
2. **Monitorar logs** nas primeiras 24h
3. **Verificar métricas** de uso
4. **Testar fluxo completo** de usuário

### Primeiros 7 Dias

1. Monitorar erros e crashes
2. Verificar performance
3. Coletar feedback de usuários
4. Ajustar limites de rate limiting se necessário

### Primeiros 30 Dias

1. Analisar métricas de conversão
2. Otimizar performance
3. Implementar melhorias baseadas em feedback
4. Planejar próximas features

---

## Troubleshooting

### Erro: "Cannot connect to database"

**Solução**:
1. Verifique se DATABASE_URL está correta
2. Verifique se o serviço MySQL está rodando
3. Teste conexão manualmente

### Erro: "Webhook signature verification failed"

**Solução**:
1. Verifique se STRIPE_WEBHOOK_SECRET está correto
2. Certifique-se que está usando o secret do endpoint de produção
3. Verifique logs do Stripe para ver o que está sendo enviado

### Erro: "OAuth redirect_uri_mismatch"

**Solução**:
1. Verifique se as URLs de callback estão exatamente iguais
2. Use HTTPS em produção
3. Não adicione trailing slash

### Deploy falha no Railway

**Solução**:
1. Verifique logs de build
2. Certifique-se que todas as dependências estão no package.json
3. Verifique se o comando de build está correto

---

## Recursos Adicionais

- [Railway Docs](https://docs.railway.app)
- [Stripe Production Checklist](https://stripe.com/docs/development/checklist)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [MySQL Performance Tuning](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)

---

## 🎉 Parabéns!

Seu OnnPlay Studio está agora em produção! 🚀

**Próximos passos**:
1. Marketing e aquisição de usuários
2. Coletar feedback
3. Iterar e melhorar
4. Escalar conforme necessário

**Lembre-se**:
- Monitore constantemente
- Responda rápido a problemas
- Mantenha backups atualizados
- Documente tudo

**Boa sorte com seu lançamento! 🎊**

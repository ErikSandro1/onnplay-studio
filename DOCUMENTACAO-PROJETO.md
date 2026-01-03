# OnnPlay Studio - Documentação Completa

**Versão:** 5.1  
**Data:** 02 de Janeiro de 2026  
**Desenvolvido por:** Manus AI + Erik

---

## 1. Visão Geral do Projeto

O **OnnPlay Studio** é uma plataforma profissional de streaming ao vivo, similar ao StreamYard, que permite aos usuários transmitir para múltiplas plataformas (YouTube, Facebook, Twitch, etc.) com recursos avançados de produção.

### 1.1 Tecnologias Utilizadas

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS |
| Backend | Node.js + Express |
| Banco de Dados | MySQL/TiDB + Drizzle ORM |
| Autenticação | OAuth (Google, YouTube) |
| Pagamentos | Stripe |
| Streaming | RTMP, WebRTC, Daily.co |
| Hospedagem | AWS EC2 (18.217.97.188) |

---

## 2. Estrutura de Pastas

```
onnplay-studio/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── contexts/          # Contextos React (Daily, Auth)
│   │   ├── hooks/             # Hooks customizados
│   │   ├── pages/             # Páginas da aplicação
│   │   ├── services/          # Serviços do cliente
│   │   ├── config/            # Configurações (Overlays, Banners)
│   │   ├── styles/            # Estilos e temas
│   │   └── types/             # Tipos TypeScript
│   └── index.html
├── server/                    # Backend Node.js
│   ├── routes/                # Rotas da API
│   ├── services/              # Serviços do servidor
│   ├── middleware/            # Middlewares (auth, rate limit)
│   ├── db/                    # Configuração do banco
│   └── _core/                 # Core do framework
├── shared/                    # Código compartilhado
├── drizzle/                   # Migrações do banco
└── docs/                      # Documentação
```

---

## 3. Componentes Principais (Frontend)

### 3.1 Componentes de Interface

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `DualMonitors.tsx` | Monitores PREVIEW e PROGRAM | ✅ Funcionando |
| `LocalParticipantCard.tsx` | Card YOU com câmera local | ✅ Funcionando |
| `ParticipantsStrip.tsx` | Faixa de participantes (YOU, Guests) | ✅ Funcionando |
| `Sidebar.tsx` | Barra lateral com menus | ✅ Funcionando |
| `OverlayPanel.tsx` | Painel de overlays/molduras | ✅ Funcionando |
| `OverlayFrame.tsx` | Renderização de moldura (frente do vídeo) | ✅ Funcionando |
| `BackdropFrame.tsx` | Renderização de fundo (atrás do vídeo) | ✅ Funcionando |
| `MonitorSettingsMenu.tsx` | Menu de configurações (engrenagem) | ✅ Funcionando |
| `BannerPanel.tsx` | Painel de banners/lower thirds | ✅ Funcionando |
| `BackgroundPanel.tsx` | Painel de fundos | ✅ Funcionando |
| `VideoPreview.tsx` | Preview de vídeo | ✅ Funcionando |

### 3.2 Serviços do Cliente

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `LocalCameraService.ts` | Gerencia câmera local (webcam) | ✅ Funcionando |
| `MediaSourceService.ts` | Gerencia mídias (imagens, vídeos) | ✅ Funcionando |
| `OverlayService.ts` | Gerencia overlays | ✅ Funcionando |
| `BackgroundService.ts` | Gerencia fundos | ✅ Funcionando |
| `BannerOverlayService.ts` | Gerencia banners | ✅ Funcionando |
| `CommentOverlayService.ts` | Gerencia comentários na tela | ✅ Funcionando |
| `PersistenceService.ts` | Salva configurações localmente | ✅ Funcionando |
| `RTMPStreamService.ts` | Streaming RTMP | ✅ Funcionando |

---

## 4. Rotas do Backend (API)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/api/auth/*` | `routes/auth.ts` | Autenticação de usuários |
| `/api/broadcast/*` | `routes/broadcast.ts` | Controle de transmissão |
| `/api/youtube/*` | `routes/youtube.ts` | Integração YouTube |
| `/api/payments/*` | `routes/payments.ts` | Pagamentos Stripe |
| `/api/usage/*` | `routes/usage.ts` | Controle de uso/limites |

---

## 5. Funcionalidades Implementadas

### ✅ Funcionando Perfeitamente

1. **Câmera Local (YOU)**
   - Webcam capturada localmente
   - Não inicia automaticamente (privacidade)
   - Usuário clica para ativar
   - Controles de mute e câmera on/off

2. **Monitor PREVIEW**
   - Recebe câmera ao clicar no card YOU
   - Recebe imagens/vídeos da biblioteca
   - Mostra label do conteúdo atual

3. **Monitor PROGRAM**
   - Recebe conteúdo do PREVIEW via botão GO
   - Mostra o que está ao vivo

4. **Transição GO**
   - Botão fica verde quando tem conteúdo no PREVIEW
   - Transfere câmera, imagem ou vídeo para PROGRAM
   - Substitui conteúdo anterior corretamente

5. **MÍDIA & CAPTURA**
   - Carregar imagens
   - Carregar vídeos
   - Compartilhar tela
   - Placeholder para captura externa (futuro)

6. **Painel de Overlays**
   - Categorias organizadas
   - Indicador de molduras com transparência
   - Aplicação instantânea

7. **Menu de Configurações (Engrenagem)**
   - Zoom (50% a 200%)
   - Espelhamento horizontal/vertical
   - Rotação (0°, 90°, 180°, 270°)
   - Brilho (50% a 150%)
   - Contraste (50% a 150%)

### ⚠️ Precisa de Ajustes

1. **Overlays** ✅ CORRIGIDO
   - ~~Não encaixam corretamente na tela~~ → Corrigido com sistema de camadas
   - ~~Alguns não têm transparência no centro~~ → Separado em Moldura e Backdrop
   - Moldura: fica NA FRENTE do vídeo (z-index: 30)
   - Backdrop: fica ATRÁS do vídeo (z-index: 1)

2. **Configurações de Câmera**
   - Menu abre mas configurações não aplicam ao vídeo em tempo real

3. **Sistema de SALVAR**
   - Salvar todas as configurações do estúdio
   - Carregar configurações salvas

---

## 6. Pendências para Próximas Sessões

### Alta Prioridade
- [x] Corrigir overlays para encaixar na tela ✅ FEITO
- [ ] Aplicar configurações de câmera em tempo real
- [ ] Implementar sistema de SALVAR configurações

### Média Prioridade
- [ ] Criar overlays PNG com transparência
- [ ] Melhorar transições com efeitos
- [ ] Adicionar mais layouts de tela

### Baixa Prioridade
- [ ] Captura externa (NDI, HDMI)
- [ ] Mais integrações de chat
- [ ] Efeitos de áudio

---

## 7. Como Rodar o Projeto

### 7.1 Requisitos
- Node.js 18+
- npm ou pnpm
- MySQL/TiDB (ou usar banco em nuvem)

### 7.2 Instalação Local

```bash
# Clonar repositório
git clone https://github.com/ErikSandro1/onnplay-studio.git
cd onnplay-studio

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Rodar migrações do banco
npm run db:migrate

# Iniciar em desenvolvimento
npm run dev
```

### 7.3 Deploy em Produção (EC2)

```bash
# Conectar ao servidor
ssh -i onnplay-key.pem ubuntu@18.217.97.188

# Atualizar código
cd /home/ubuntu/onnplay-studio
git pull origin main

# Build
npm run build

# Reiniciar servidor
pm2 restart onnplay-studio
```

---

## 8. Credenciais e Acessos

### 8.1 Servidor EC2
- **IP:** 18.217.97.188
- **Usuário:** ubuntu
- **Chave:** onnplay-key.pem

### 8.2 Domínio
- **URL:** www.onnplay.com

### 8.3 GitHub
- **Repositório:** https://github.com/ErikSandro1/onnplay-studio

---

## 9. Contatos e Suporte

- **Desenvolvedor:** Erik
- **AI Assistant:** Manus

---

## 10. Histórico de Versões

| Versão | Data | Alterações |
|--------|------|------------|
| 5.1 | 02/01/2026 | Sistema de Overlays corrigido: separação de Moldura e Backdrop, z-index correto |
| 5.0 | 02/01/2026 | Câmera não inicia automaticamente |
| 4.0 | 02/01/2026 | Botão GO detecta câmera corretamente |
| 3.0 | 02/01/2026 | Menu de configurações, correções de transição |
| 2.0 | 01/01/2026 | Câmera local, overlays, MÍDIA & CAPTURA |
| 1.0 | 01/01/2026 | Versão inicial |

---

*Documento gerado automaticamente pelo Manus AI*

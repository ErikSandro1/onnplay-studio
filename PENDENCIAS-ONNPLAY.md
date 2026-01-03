# OnnPlay Studio - Pendências e Status do Projeto

**Data:** 02 de Janeiro de 2026  
**Versão Atual:** 5.1  
**Servidor de Produção:** www.onnplay.com

---

## Status Geral

O OnnPlay Studio é uma plataforma de transmissão ao vivo estilo StreamYard. Atualmente está funcional com recursos básicos de estúdio, mas há várias funcionalidades pendentes para completar.

---

## Correções Realizadas Hoje (02/01/2026)

### ✅ Concluídas

1. **Câmera cortada nos monitores** - Corrigido
   - Removido `bg-gray-900` do ParticipantVideo
   - Mudado de `object-cover` para `object-contain`
   - Câmera agora aparece completa no PREVIEW e PROGRAM

2. **Janelinhas sobrepostas aos monitores** - Corrigido
   - Adicionado margem entre monitores e janelinhas dos participantes (YOU, Guest 1, Guest 2)
   - Layout agora está organizado corretamente

3. **Separação de Backdrop e Moldura** - Parcialmente implementado
   - Painel de Overlays redesenhado com duas opções: Moldura e Fundo (Backdrop)
   - BackdropFrame.tsx criado
   - OverlayFrame.tsx atualizado

---

## Pendências - Overlays (Prioridade Alta)

### ❌ 1. Backdrop cobrindo conteúdo
**Problema:** Quando um backdrop é selecionado, ele cobre a câmera e as imagens ao invés de ficar atrás delas.

**Causa:** O z-index do backdrop está maior que o conteúdo, ou o conteúdo não está sendo renderizado corretamente sobre o backdrop.

**Arquivos envolvidos:**
- `/client/src/components/BackdropFrame.tsx`
- `/client/src/components/DualMonitors.tsx`
- `/client/src/components/VideoPreview.tsx`

**Solução proposta:** Revisar a estrutura de z-index:
- Backdrop: z-index 1
- Conteúdo (vídeo/câmera/imagem): z-index 15
- Moldura: z-index 30

---

### ❌ 2. Moldura distorcida
**Problema:** As molduras não estão encaixando corretamente na proporção 16:9 dos monitores. Aparecem esticadas ou distorcidas.

**Causa:** As imagens das molduras podem não estar na proporção 16:9, ou o CSS está usando `object-fit: fill` ao invés de `contain`.

**Arquivos envolvidos:**
- `/client/src/components/OverlayFrame.tsx`
- Imagens das molduras em `/public/overlays/`

**Solução proposta:**
- Usar `object-fit: contain` para manter proporção
- Ou criar molduras na proporção 16:9 correta

---

## Pendências - Live e Chat Unificado (Prioridade Alta)

### ❌ 3. Sistema de Broadcast/Live
**Status:** Estrutura básica existe, mas não está funcional

**O que existe:**
- `RTMPStreamService.ts` - Serviço de streaming via RTMP (622 linhas)
- `StreamingService.ts` - Gerenciamento de destinos de streaming
- Interface básica no painel Broadcast

**O que falta implementar:**
- Conexão real com YouTube Live API
- Conexão real com Twitch API
- Servidor RTMP funcional no backend
- Interface de configuração de stream keys
- Indicadores de status da live (bitrate, viewers, etc.)

**Arquivos principais:**
- `/client/src/services/RTMPStreamService.ts`
- `/client/src/services/StreamingService.ts`
- `/server/` (backend Node.js)

---

### ❌ 4. Chat Unificado
**Status:** Estrutura de comentários existe, mas sem integração com plataformas

**O que existe:**
- `CommentOverlayService.ts` - Gerenciamento de comentários na tela
- Tipos definidos em `/types/comments.ts`
- Suporte a YouTube, Twitch, Facebook (estrutura)
- Sistema de Super Chat estruturado

**O que falta implementar:**
- **YouTube Live Chat API** - Buscar comentários em tempo real
- **Twitch Chat (IRC/WebSocket)** - Conectar ao chat da Twitch
- **Facebook Live Comments API** - Integração com Facebook
- Interface de chat unificado no painel lateral
- Filtros por plataforma
- Destaque de Super Chats e doações

**Arquivos principais:**
- `/client/src/services/CommentOverlayService.ts`
- `/client/src/types/comments.ts`
- Criar: `/client/src/services/YouTubeChatService.ts`
- Criar: `/client/src/services/TwitchChatService.ts`
- Criar: `/client/src/services/UnifiedChatService.ts`

---

## Outras Pendências (Prioridade Média)

### ❌ 5. Botão X para limpar PROGRAM
**Status:** Implementado mas precisa testar
- Botão X vermelho no header do PROGRAM
- Método `clearActive()` no MediaSourceService

### ❌ 6. Testes gerais das ferramentas
- Testar todas as funcionalidades existentes
- Verificar se transições funcionam
- Testar compartilhamento de tela
- Testar gravação local

---

## Estrutura de Arquivos Importantes

```
/home/ubuntu/onnplay-studio/
├── client/src/
│   ├── components/
│   │   ├── DualMonitors.tsx      # Monitores PREVIEW e PROGRAM
│   │   ├── VideoPreview.tsx      # Renderização de vídeo
│   │   ├── ParticipantVideo.tsx  # Vídeo dos participantes
│   │   ├── OverlayFrame.tsx      # Molduras
│   │   ├── BackdropFrame.tsx     # Fundos
│   │   ├── OverlayPanel.tsx      # Painel de overlays
│   │   └── ParticipantsStrip.tsx # Janelinhas dos participantes
│   ├── services/
│   │   ├── RTMPStreamService.ts  # Streaming RTMP
│   │   ├── StreamingService.ts   # Gerenciamento de streams
│   │   ├── CommentOverlayService.ts # Comentários na tela
│   │   ├── OverlayService.ts     # Gerenciamento de overlays
│   │   └── MediaSourceService.ts # Fontes de mídia
│   └── types/
│       └── comments.ts           # Tipos de comentários
├── server/                       # Backend Node.js
└── DOCUMENTACAO-PROJETO.md       # Documentação completa
```

---

## Credenciais e Acessos

- **Servidor EC2:** 18.217.97.188
- **Chave SSH:** `/home/ubuntu/onnplay-studio/onnplay-key.pem`
- **Domínio:** www.onnplay.com
- **PM2 Process:** onnplay-studio

---

## Próximos Passos Sugeridos

1. **Corrigir Backdrop** - Garantir que o backdrop fique atrás do conteúdo
2. **Corrigir Moldura** - Ajustar proporção das molduras
3. **Implementar YouTube Live Chat API** - Buscar comentários em tempo real
4. **Implementar Twitch Chat** - Conectar via IRC/WebSocket
5. **Criar interface de Chat Unificado** - Painel lateral com todos os comentários
6. **Testar sistema de Broadcast** - Verificar se streaming funciona

---

## Backup Atual

- **Local:** `/home/ubuntu/onnplay-studio-backup-camera-fix.tar.gz`
- **Data:** 02/01/2026
- **Tamanho:** ~9MB (sem node_modules)

---

*Documento gerado automaticamente para continuidade do desenvolvimento.*

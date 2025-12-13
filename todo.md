# OnnPlay Studio - TODO

## v12.0 - Live Ready (Concluído)
- [x] Interface principal do estúdio de transmissão
- [x] Mixer de áudio com 4 canais + Master
- [x] Seletor de câmeras (PGM/PVW)
- [x] Controles de corte (CUT/MIX/WIPE/AUTO)
- [x] Composição de câmeras (Single/PiP/Split/Grid)
- [x] Painel de gravação com timer
- [x] Painel de streaming multiplatforma
- [x] Chat ao vivo com moderação
- [x] Barra de status com métricas
- [x] Sidebar navegável
- [x] WebSocket para sincronização em tempo real
- [x] Backend Node.js + Socket.io

## v13.0 - Full Stack (Concluído)
- [x] Upgrade para web-db-user (banco de dados + autenticação)
- [x] Schema do banco de dados (6 tabelas)
  - [x] users (com roles: admin, operator, moderator, user)
  - [x] mixer_presets (configurações salvas do mixer)
  - [x] transmission_history (histórico de transmissões)
  - [x] streaming_configs (configurações por plataforma)
  - [x] scenes (cenas salvas do estúdio)
  - [x] chat_messages (histórico de mensagens)
- [x] API tRPC completa
  - [x] mixerPresets (CRUD)
  - [x] transmissions (CRUD + start/end)
  - [x] streamingConfigs (CRUD)
  - [x] scenes (CRUD + reorder)
  - [x] chat (list/send/delete)
- [x] PresetManager conectado à API real
- [x] Página de Login com design profissional
- [x] ProtectedRoute para proteção de rotas
- [x] Roles de usuário (admin, operator, moderator, user)
- [x] Testes unitários (vitest)

## Próximas Funcionalidades (Backlog)
- [ ] Dashboard de analytics com gráficos
- [ ] Configurações de streaming por plataforma
- [ ] Upload de mídia para S3
- [ ] Overlays e lower thirds
- [ ] Integração com OBS via WebSocket
- [ ] Controle remoto mobile
- [ ] Notificações push
- [ ] Histórico de transmissões com replay

## v14.0 - Analytics Dashboard (Concluído)
- [x] Instalar biblioteca de gráficos (Recharts)
- [x] Criar API de analytics (estatísticas agregadas)
- [x] Página Dashboard com gráficos interativos
- [x] Gráfico de histórico de transmissões (Area Chart)
- [x] Gráfico de pico de espectadores (Line Chart)
- [x] Cards de métricas (total transmissões, tempo total, média espectadores)
- [x] Filtros por período (7 dias, 30 dias, 90 dias)
- [x] Gráfico de distribuição por plataforma (Pie Chart)
- [x] Gráfico de transmissões por dia (Bar Chart)
- [x] Tabela de transmissões recentes
- [x] Dados de exemplo para demonstração
- [x] Testes e checkpoint


## v15.0 - Stream Keys Manager (Concluído)
- [x] Componente StreamKeyManager com UI profissional
- [x] Adicionar nova stream key (com validação)
- [x] Editar stream key existente
- [x] Deletar stream key com confirmação
- [x] Mascarar stream key por segurança
- [x] Copiar stream key para clipboard
- [x] Suporte para múltiplas plataformas (YouTube, Twitch, Facebook, Instagram, TikTok, LinkedIn, RTMP)
- [x] Página Settings com abas
- [x] Indicador de status (Ativo/Inativo)
- [x] Histórico de uso de stream keys (Last Used)
- [x] Testes e checkpoint


## v16.0 - Live com Sistema de Convites (Em Progresso)
- [ ] Schema do banco de dados para transmissões ativas
- [ ] Schema para participantes e convites
- [ ] API para iniciar/parar transmissão
- [ ] API para gerar links de convite únicos
- [ ] API para gerenciar participantes (aceitar/rejeitar/remover)
- [ ] Componente ParticipantManager
- [ ] Sistema de convites com link único
- [ ] Gerador de QR code para convite
- [ ] Notificação em tempo real de novos participantes
- [ ] Painel de controle de participantes
- [ ] Testes e checkpoint

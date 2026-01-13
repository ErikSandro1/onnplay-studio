# NOVA ARQUITETURA ONNPLAY STUDIO - PLANO DETALHADO

## VISÃO GERAL

Reorganizar completamente o OnnPlay Studio seguindo a estrutura comprovada do StreamYard mas destacando os recursos superiores que já existem. Foco total em funcionalidade e usabilidade ao invés de layout visual forçado.

## ESTRUTURA DE LAYOUT

### Área Principal (70% da largura):
- **Monitor PROGRAM** grande ocupando a maior parte do espaço
- Mostra exatamente o que está sendo transmitido
- Indicador LIVE quando no ar
- Contador de viewers
- Botão de fullscreen

### Sidebar Direita (30% da largura):
- **Tabs verticais** sempre visíveis
- Conteúdo da tab ativa mostrado abaixo
- Scroll vertical se necessário
- Ícones + texto para cada tab

### Strip Inferior:
- **Thumbnails dos participantes** (até 20)
- Controles rápidos por participante
- Scroll horizontal se mais de 6 participantes

### Barra de Controle (fixa no fundo):
- Mute/Unmute
- Camera On/Off
- Share Screen
- Invite
- Leave Studio

## SISTEMA DE TABS

### 1. BROADCAST Tab
**Objetivo:** Controles principais de transmissão

**Conteúdo:**
- Botão GO LIVE (grande, laranja)
- Botão START RECORDING (grande, vermelho)
- Status da transmissão (LIVE, REC, OFF AIR)
- Tempo de transmissão
- Tempo de gravação
- Bitrate atual
- Qualidade de conexão

**Componente:** Novo componente BroadcastTab.tsx

### 2. TRANSITIONS Tab ⭐ DIFERENCIAL
**Objetivo:** Sistema de transições avançadas

**Conteúdo:**
- Botões de transição: MIX, WIPE, CUT, AUTO
- Slider de duração (0-3000ms)
- Preview da transição
- Botão TAKE para executar

**Componente:** TransitionSystem (já existe, adaptar)

### 3. BRAND Tab
**Objetivo:** Branding e identidade visual

**Conteúdo:**
- **Logo:** Upload + posicionamento
- **Overlay:** Upload de imagens/vídeos
- **Background:** Templates + upload
- **Banners:** Texto animado (lower thirds)
- **Colors:** Paleta de cores do brand

**Componentes:** OverlayManager (adaptar)

### 4. PEOPLE Tab ⭐ DIFERENCIAL (20 guests)
**Objetivo:** Gerenciar participantes

**Conteúdo:**
- Lista de participantes (até 20)
- Controles por participante:
  - Volume individual
  - Mute/Unmute remoto
  - Camera on/off remoto
  - Editar nome
  - Editar avatar
  - Private chat
  - Remove/Ban
- Botão INVITE GUEST

**Componente:** ParticipantManager (já existe, adaptar)

### 5. AUDIO Tab ⭐ DIFERENCIAL
**Objetivo:** Mixer de áudio profissional

**Conteúdo:**
- Mixer com faders para cada fonte
- EQ de 3 bandas por canal
- Compressor
- Noise Gate
- Effects (reverb, delay)
- Master volume
- VU meters

**Componente:** AdvancedAudioMixer + AudioProcessor (já existem, adaptar)

### 6. CAMERA Tab ⭐ DIFERENCIAL
**Objetivo:** Controle avançado de câmeras

**Conteúdo:**
- Lista de câmeras disponíveis
- Controles PTZ (Pan, Tilt, Zoom)
- Presets de posição
- Composer para múltiplas câmeras
- Layouts (PiP, Split, Grid 2x2, etc)

**Componente:** CameraControl + CameraComposer (já existem, adaptar)

### 7. DESTINATIONS Tab
**Objetivo:** Destinos de transmissão

**Conteúdo:**
- Lista de destinos conectados
- Botão ADD DESTINATION
- YouTube, Facebook, LinkedIn, Twitch
- RTMP customizado
- Status de cada destino (connected, streaming, error)

**Componente:** StreamingConfig (já existe, adaptar)

### 8. RECORDING Tab
**Objetivo:** Configurações de gravação

**Conteúdo:**
- Qualidade (1080p, 720p, 480p)
- Formato (MP4, MOV, WebM)
- Codec (H.264, H.265)
- Bitrate
- Pasta de destino
- Gravações anteriores (lista)

**Componente:** RecordingSettings (já existe, adaptar)

### 9. ANALYTICS Tab ⭐ DIFERENCIAL
**Objetivo:** Métricas em tempo real

**Conteúdo:**
- Viewers atuais
- Pico de viewers
- Gráfico de viewers ao longo do tempo
- Comentários por minuto
- Engagement rate
- Bitrate graph
- Qualidade de conexão
- Dropped frames

**Componente:** Novo componente AnalyticsTab.tsx

### 10. CHAT Tab
**Objetivo:** Chat e comentários

**Conteúdo:**
- Comentários de todas as plataformas
- Filtro por plataforma
- Destacar perguntas
- Responder comentários
- Moderar (hide, ban)
- Reactions overlay

**Componente:** UnifiedChat + LiveChat (já existem, adaptar)

### 11. SETTINGS Tab
**Objetivo:** Configurações gerais

**Conteúdo:**
- Video settings (resolution, framerate)
- Audio settings (sample rate, bitrate)
- Virtual background / Green screen
- Keyboard shortcuts
- Advanced settings
- Account settings

**Componente:** AdvancedSettings (já existe, adaptar)

## COMPONENTES TÉCNICOS

### RightSidebar.tsx (NOVO)
Componente principal que gerencia as tabs e renderiza o conteúdo ativo.

**Props:**
- activeTab: string
- onTabChange: (tab: string) => void

**State:**
- activeTab: string

**Render:**
- Lista de tabs com ícones
- Área de conteúdo que renderiza o componente da tab ativa

### ParticipantsStrip.tsx (NOVO)
Strip inferior com thumbnails dos participantes.

**Props:**
- participants: Participant[]
- onParticipantClick: (id: string) => void

**Features:**
- Scroll horizontal
- Controles rápidos (mute, camera)
- Indicador de quem está falando

### ControlBar.tsx (NOVO)
Barra de controle fixa no fundo.

**Buttons:**
- Mute/Unmute (com indicador)
- Camera On/Off
- Share Screen
- Invite
- Leave Studio

## FLUXO DE IMPLEMENTAÇÃO

### Fase 1: Criar estrutura base
1. Criar RightSidebar.tsx com sistema de tabs
2. Criar ParticipantsStrip.tsx
3. Criar ControlBar.tsx
4. Refazer Home.tsx com novo layout

### Fase 2: Migrar componentes existentes
1. Adaptar TransitionSystem para tab
2. Adaptar ParticipantManager para tab
3. Adaptar AdvancedAudioMixer para tab
4. Adaptar CameraControl para tab
5. Adaptar OverlayManager para tab
6. Adaptar StreamingConfig para tab
7. Adaptar RecordingSettings para tab
8. Adaptar UnifiedChat para tab
9. Adaptar AdvancedSettings para tab

### Fase 3: Criar componentes novos
1. Criar BroadcastTab.tsx
2. Criar AnalyticsTab.tsx
3. Criar BrandTab.tsx (simplificado)

### Fase 4: Integração e testes
1. Conectar todos os componentes
2. Testar cada tab individualmente
3. Testar fluxo completo de transmissão
4. Ajustar responsividade
5. Polir UI/UX

## TECNOLOGIAS

- **React** com TypeScript
- **Tailwind CSS** para estilização
- **Lucide React** para ícones
- **Daily.co** para video conferencing
- **Estado global** para compartilhar dados entre tabs

## VANTAGENS DESTA ARQUITETURA

**Organização clara:** Cada funcionalidade tem seu lugar específico em uma tab dedicada.

**Escalabilidade:** Fácil adicionar novas tabs no futuro sem quebrar o layout.

**Acessibilidade:** Todos os recursos PRO ficam visíveis e acessíveis com 1 clique.

**Familiaridade:** Usuários do StreamYard se adaptam rapidamente.

**Diferenciais destacados:** As tabs exclusivas do OnnPlay (Transitions, Audio PRO, Camera, Analytics) ficam evidentes.

**Performance:** Renderiza apenas a tab ativa, economizando recursos.

**Manutenibilidade:** Cada tab é um componente isolado, fácil de manter e atualizar.

## PRÓXIMO PASSO

Implementar Fase 1: Criar estrutura base com RightSidebar, ParticipantsStrip, ControlBar e novo Home.tsx.

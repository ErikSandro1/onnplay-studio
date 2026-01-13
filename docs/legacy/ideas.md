# OnnPlay Studio - Design Brainstorm

## Conceito: Interface de Estúdio de Produção ao Vivo Profissional

---

<response>
<probability>0.08</probability>
<text>

### Abordagem 1: Cinematic Dark Pro (Recomendado)

**Design Movement:** Broadcast Studio Aesthetic + Cinema DCP Standard

**Core Principles:**
- Contraste máximo para precisão visual em ambientes de produção
- Hierarquia clara entre monitoramento (Preview/Program) e controle (Mixer)
- Profundidade através de múltiplas camadas de sombras e elevação
- Foco absoluto no conteúdo de vídeo com UI discreta mas acessível

**Color Philosophy:**
- Fundo: Cinza muito escuro (`#0f0f0f` a `#1a1a1a`) - padrão de salas de produção
- Destaque: Laranja queimado (`#ff6b35`) para botões críticos (TAKE) - visibilidade imediata
- Azul ciano (`#00d4ff`) para visualizações ativas e feedback
- Vermelho broadcast (`#e63946`) para alertas e status crítico
- Branco puro (`#ffffff`) para texto principal - contraste máximo

**Layout Paradigm:**
- Sidebar esquerda com navegação vertical (VIDEO, AUDIO, PRODUCTION, ANALYTICS)
- Dois monitores lado-a-lado (EDIT | TAKE | PROGRAM) - padrão de broadcast
- Mixer/Painel de controle centralizado com knobs e sliders visuais
- Scene Gallery em carrossel horizontal no rodapé com scroll suave
- Uso de espaçamento assimétrico: sidebar 280px, monitores 50/50, rodapé 120px altura

**Signature Elements:**
1. Botão TAKE com efeito de "pressionado" (3D inset shadow) e glow laranja
2. Monitores com borda colorida (azul para EDIT, laranja para PROGRAM) e scanlines sutis
3. Knobs de mixer com indicadores de nível em tempo real (LED-style)

**Interaction Philosophy:**
- Feedback imediato em todas as ações (hover glow, click feedback)
- Estados visuais claros: ativo (brilho), inativo (opaco), desabilitado (cinza)
- Transições suaves (200-300ms) para mudanças de estado
- Tooltips ao hover para funções complexas

**Animation:**
- Entrada de componentes: fade-in + slide-up (300ms, easing ease-out-cubic)
- Botão TAKE: pulse sutil quando em modo "standby" (1.5s ciclo)
- Mixer knobs: rotação suave ao arrastar (spring physics)
- Scene Gallery: scroll horizontal com momentum (inertia scroll)
- Transição entre cenas: crossfade de 500ms nos monitores

**Typography System:**
- Display: IBM Plex Mono Bold (monoespaçada para dados técnicos)
- Body: Inter Regular (legibilidade em UI densa)
- Hierarchy: 32px (títulos), 18px (labels), 14px (dados), 12px (hints)
- Todos os labels em UPPERCASE com tracking +0.05em para autoridade

</text>
</response>

<response>
<probability>0.07</probability>
<text>

### Abordagem 2: Neon Cyberpunk Studio

**Design Movement:** Cyberpunk 2077 + Synthwave Aesthetics

**Core Principles:**
- Neon glow e efeitos de luz como elemento de design principal
- Assimetria radical na composição visual
- Tipografia angular e agressiva
- Feedback visual exagerado para imersão total

**Color Philosophy:**
- Fundo: Preto profundo com gradiente sutil roxo (`#0a0a0a` → `#1a0a2e`)
- Neon primário: Magenta (`#ff006e`) e Ciano (`#00f5ff`)
- Secundário: Roxo (`#8e44ad`) e Verde neon (`#39ff14`)
- Texto: Branco com glow rosa/ciano

**Layout Paradigm:**
- Sidebar com ângulos cortados (clip-path diagonal)
- Monitores com moldura neon pulsante
- Mixer com efeito de vidro fosco (glassmorphism) com glow
- Scene Gallery com cards que brilham ao hover

**Signature Elements:**
1. Botão TAKE com efeito de plasma (animated gradient border)
2. Ícones com glow effect e animação de "respiração"
3. Linhas neon decorativas separando seções

**Interaction Philosophy:**
- Cada interação gera feedback visual exagerado
- Hover states com glow intenso
- Click feedback com ripple effect em neon

**Animation:**
- Glow animations contínuas (pulsing, breathing)
- Transições com efeito de "scan" (linha passando pela tela)
- Scene Gallery: slide com efeito de distorção digital
- Botão TAKE: plasma effect animado

**Typography System:**
- Display: Space Mono Bold (angular, futurista)
- Body: Roboto Mono (técnico, cyberpunk)
- Todos os textos com text-shadow neon

</text>
</response>

<response>
<probability>0.06</probability>
<text>

### Abordagem 3: Minimal Clean Studio

**Design Movement:** Apple Design Language + Bauhaus Principles

**Core Principles:**
- Simplicidade extrema com foco em funcionalidade
- Espaçamento generoso e respiro visual
- Tipografia limpa e hierarquia clara
- Cor como ferramenta de significado, não decoração

**Color Philosophy:**
- Fundo: Branco ou cinza muito claro (`#f5f5f5`)
- Primário: Azul limpo (`#0066cc`)
- Destaque: Verde para ação (TAKE) (`#34c759`)
- Texto: Cinza escuro (`#333333`)
- Bordas: Cinza muito claro (`#e0e0e0`)

**Layout Paradigm:**
- Sidebar minimalista com ícones apenas
- Monitores com borda sutil
- Mixer com controles espaçados e claros
- Scene Gallery com grid 4 colunas

**Signature Elements:**
1. Botão TAKE com design flat e sombra sutil
2. Monitores com borda 1px apenas
3. Knobs de mixer como círculos simples

**Interaction Philosophy:**
- Transições suaves e previsíveis
- Feedback visual sutil mas claro
- Sem excesso de animação

**Animation:**
- Transições fade simples (150ms)
- Hover effects sutis (opacity, scale 1.02)
- Scene Gallery: scroll suave

**Typography System:**
- Display: SF Pro Display (Apple-style)
- Body: -apple-system, BlinkMacSystemFont (sistema nativo)
- Hierarchy: 28px, 16px, 14px, 12px

</text>
</response>

---

## Decisão Final

**Escolhido: Cinematic Dark Pro**

Esta abordagem é a mais apropriada para um estúdio de produção profissional porque:
- Reduz fadiga visual em sessões longas de produção
- Oferece máximo contraste para precisão visual
- Estabelece hierarquia clara entre monitoramento e controle
- Padrão de indústria em software de broadcast profissional
- Permite integração futura com sistemas reais de produção

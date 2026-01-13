# Pesquisa: Como Plataformas Profissionais de Streaming Funcionam

## StreamYard - Arquitetura

### Arquitetura de Alto Nível
1. **Cliente (browser)** envia vídeo da webcam para um servidor chamado **SFU (Selective Forwarding Unit)**
2. **SFU** distribui o vídeo para outros participantes no estúdio
3. **Serviços de backend** lidam com:
   - Gravação (para gerar VOD)
   - Encaminhamento para destinos externos (YouTube, Facebook, etc.)

### Pontos-Chave de Qualidade
- Usam **VMAF (Video Multi-Method Assessment Fusion)** - mesmo padrão da Netflix
- Identificam gargalos **bisectando o pipeline** - medindo em pontos intermediários
- Otimizam:
  - **Alocação de bitrate** em diferentes estágios
  - **Tuning de backend** para encoding e streaming
  - Balanceamento entre **nitidez, suavidade de movimento e estabilidade**

### Ferramentas de Diagnóstico
- **Frame counter** - contador de frames para sincronização precisa
- **Color marker** - marcador de cor que cicla para detectar frames duplicados ou pulados

### Diferença Principal vs Nossa Implementação
- StreamYard usa **SFU no servidor** para processar vídeo
- Nós estamos fazendo encoding no **cliente (browser)** e enviando via WebSocket
- O problema: browser não é ideal para encoding em tempo real

---

## Arquitetura Típica de Streaming Profissional

### Fluxo Padrão
1. **Captura** - webcam/câmera
2. **Encoding** - H.264/H.265 (preferencialmente em hardware)
3. **Transporte** - RTMP, SRT, ou WebRTC
4. **Servidor de mídia** - SFU ou MCU
5. **Re-encoding** (se necessário)
6. **Distribuição** - CDN para viewers

### Protocolos
- **WebRTC** - baixa latência, P2P ou via SFU
- **RTMP** - padrão para ingest em plataformas (YouTube, Twitch)
- **SRT** - mais moderno, melhor para redes instáveis
- **HLS/DASH** - para distribuição aos viewers

---

## Problemas na Nossa Implementação Atual

### Pipeline Atual do OnnPlay
1. Canvas capture (browser) → 
2. MediaRecorder (browser) → 
3. WebSocket (browser → servidor) → 
4. FFmpeg re-encoding (servidor) → 
5. RTMP (servidor → YouTube)

### Problemas Identificados
1. **Canvas.captureStream()** não é preciso - pode perder frames
2. **MediaRecorder** tem timing inconsistente
3. **WebSocket** não é ideal para streaming de vídeo
4. **FFmpeg re-encoding** adiciona latência e pode perder frames
5. **Muitas etapas** = muitos pontos de falha

---

## Soluções Possíveis

### Opção 1: Usar WebRTC para captura + SFU
- Capturar vídeo via WebRTC (mais eficiente que canvas)
- Usar SFU (como mediasoup ou Janus) para processar
- SFU faz o relay para RTMP

### Opção 2: Encoding no servidor
- Enviar vídeo raw (ou levemente comprimido) para servidor
- Servidor faz encoding com hardware (NVENC, QuickSync)
- Elimina re-encoding

### Opção 3: Usar serviço de terceiros
- Usar API de serviços como Mux, Agora, Daily.co
- Eles já têm infraestrutura otimizada

### Opção 4: Otimizar pipeline atual
- Usar WebRTC em vez de WebSocket para transporte
- Usar codec H.264 no browser (insertable streams)
- Reduzir buffers e latência no FFmpeg



---

## Integração RTMP e WebRTC - Projeto de Referência

### Arquitetura do Projeto (LiveKit Ingress Service inspirado)
1. **Servidor RTMP** recebe stream do usuário
2. **Transcodificação de áudio**: AAC → Opus (WebRTC compatível)
3. **Transcodificação de vídeo**: para H.264
4. **Envia para tracks WebRTC** conectados aos clientes
5. **Servidor atua como peer** - mantém conexão P2P com cada cliente

### Desafios Enfrentados
- **RTMP não suporta Opus** - WebRTC requer Opus para áudio
- **Solução inicial**: Pipeline externo com GStreamer/FFmpeg - **aumentou CPU em 70%!**
- **Solução otimizada**: Encoding in-memory direto para Go channel
  - Usa `gopkg.in/hraban/opus.v2` (wrapper Go para libopus)
  - Overhead mínimo, quase tão eficiente quanto streaming sem encoding

### Otimizações de Performance
- **Concorrência**: Usa padrões de concorrência do Go
- **Channels**: Buffers para vídeo e áudio, entrega suave para WebRTC
- **Transcoding otimizado**: Minimiza latência

### Bibliotecas Usadas
- **Pion WebRTC**: Conexões WebRTC
- **Yuptopp RTMP**: Streams RTMP
- **fdkaac**: Decodificação AAC
- **opus.v2**: Encoding Opus

---

## Conclusões da Pesquisa

### Por que StreamYard funciona bem:
1. **Processamento no servidor (SFU)** - não depende do browser para encoding
2. **Pipeline otimizado** - cada etapa é medida e otimizada
3. **Hardware encoding** - provavelmente usa NVENC ou similar
4. **Buffers calibrados** - testados com VMAF e A/B testing

### Problemas do OnnPlay atual:
1. **Encoding no browser** - MediaRecorder não é confiável para timing
2. **Canvas.captureStream()** - pode perder frames
3. **WebSocket** - não ideal para streaming de vídeo
4. **Re-encoding no FFmpeg** - adiciona latência e pode perder frames
5. **Muitas etapas** - cada uma pode introduzir problemas

### Solução Recomendada:
1. **Usar WebRTC para captura e transporte** (em vez de WebSocket)
2. **Usar PlainRtpTransport do mediasoup** para relay para FFmpeg
3. **Ou usar Daily.co/LiveKit** que já tem infraestrutura otimizada
4. **Encoding H.264 no browser** quando possível (insertable streams)


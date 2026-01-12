# Plano de Implementação: SFU Profissional para OnnPlay

## Objetivo
Implementar arquitetura de streaming profissional igual StreamYard usando:
- **mediasoup** como SFU (Selective Forwarding Unit)
- **Servidor EC2 com GPU** (g4dn.xlarge) para encoding em hardware
- **FFmpeg com NVENC** para encoding H.264 acelerado por GPU
- **RTMP direto** do servidor para YouTube/Facebook

---

## Arquitetura Atual (Problemática)

```
Browser → Canvas.captureStream() → MediaRecorder → WebSocket → FFmpeg (CPU) → RTMP → YouTube
```

**Problemas:**
- Canvas.captureStream() perde frames
- MediaRecorder tem timing inconsistente
- WebSocket não é ideal para streaming de vídeo
- FFmpeg em CPU é lento e causa re-encoding
- Muitas etapas = muitos pontos de falha

---

## Nova Arquitetura (Profissional)

```
Browser → WebRTC → mediasoup SFU → PlainRtpTransport → FFmpeg NVENC → RTMP → YouTube
```

**Benefícios:**
- WebRTC é otimizado para streaming em tempo real
- mediasoup gerencia timestamps e sincronização
- PlainRtpTransport envia RTP direto para FFmpeg
- NVENC faz encoding em hardware (GPU) - muito mais rápido
- Menos etapas = menos pontos de falha

---

## Componentes Necessários

### 1. Servidor EC2 com GPU
- **Tipo:** g4dn.xlarge (ou g4dn.2xlarge para mais capacidade)
- **GPU:** NVIDIA T4 (suporta NVENC)
- **vCPUs:** 4
- **RAM:** 16 GB
- **Custo:** ~$0.526/hora (on-demand) ou ~$0.16/hora (spot)
- **Região:** us-east-2 (Ohio) - mesmo do servidor atual

### 2. mediasoup
- **Versão:** 3.x (última estável)
- **Linguagem:** Node.js com bindings C++
- **Função:** SFU para receber WebRTC e distribuir para participantes
- **Recursos:**
  - Router: gerencia rooms
  - WebRtcTransport: conexão com browsers
  - PlainRtpTransport: conexão com FFmpeg
  - Producer/Consumer: gerencia streams de áudio/vídeo

### 3. FFmpeg com NVENC
- **Codec:** h264_nvenc (encoding em GPU)
- **Parâmetros otimizados:**
  - `-c:v h264_nvenc` (usar GPU)
  - `-preset p4` (balanceado qualidade/velocidade)
  - `-tune ll` (low latency)
  - `-b:v 4500k` (bitrate para 1080p)
  - `-maxrate 4500k -bufsize 9000k`
  - `-g 60` (keyframe a cada 2 segundos)

### 4. Cliente (Browser)
- Usar mediasoup-client em vez de WebSocket para streaming
- Manter Daily.co para videochamadas (já funciona bem)
- Quando iniciar streaming, criar Producer no mediasoup

---

## Fluxo de Dados Detalhado

### Participantes (WebRTC via Daily.co)
```
Participante 1 → Daily.co → Browser Host
Participante 2 → Daily.co → Browser Host
Participante N → Daily.co → Browser Host
```

### Composição e Streaming
```
Browser Host:
  - Recebe vídeos dos participantes via Daily.co
  - Compõe a cena final (layout, overlays, etc.)
  - Envia para mediasoup via WebRTC

Servidor mediasoup:
  - Recebe WebRTC do browser
  - Cria PlainRtpTransport para FFmpeg
  - Envia RTP para FFmpeg

FFmpeg (com NVENC):
  - Recebe RTP do mediasoup
  - Faz encoding H.264 com GPU
  - Envia RTMP para YouTube/Facebook
```

---

## Etapas de Implementação

### Fase 1: Preparar Servidor com GPU
1. Criar nova instância EC2 g4dn.xlarge
2. Instalar drivers NVIDIA
3. Instalar FFmpeg com suporte NVENC
4. Testar encoding com GPU

### Fase 2: Implementar mediasoup
1. Instalar mediasoup no servidor
2. Criar serviço MediasoupService.ts
3. Implementar:
   - createRouter()
   - createWebRtcTransport()
   - createPlainRtpTransport()
   - createProducer()
   - createConsumer()
4. Configurar WebSocket para signaling

### Fase 3: Integrar com FFmpeg
1. Criar processo FFmpeg que escuta RTP
2. Configurar PlainRtpTransport para enviar para FFmpeg
3. Configurar FFmpeg para enviar RTMP para destino
4. Implementar controle de qualidade adaptativo

### Fase 4: Atualizar Cliente
1. Instalar mediasoup-client
2. Criar MediasoupClientService.ts
3. Quando iniciar streaming:
   - Conectar ao mediasoup
   - Criar Producer com o stream do canvas
   - Enviar via WebRTC
4. Manter compatibilidade com sistema atual

### Fase 5: Testes e Otimização
1. Testar com vídeo de sincronização
2. Medir latência e qualidade
3. Ajustar parâmetros de encoding
4. Comparar com StreamYard

---

## Estimativa de Custos

### Servidor GPU (g4dn.xlarge)
- On-demand: $0.526/hora = ~$380/mês (24/7)
- Spot: ~$0.16/hora = ~$115/mês (24/7)
- Sob demanda (só quando streaming): muito menos

### Comparação com servidor atual
- Servidor atual (c6i.2xlarge): ~$0.34/hora = ~$245/mês
- Servidor GPU (g4dn.xlarge): ~$0.526/hora = ~$380/mês
- Diferença: ~$135/mês a mais

### Alternativa: Usar GPU só para streaming
- Manter servidor atual para aplicação
- Criar servidor GPU sob demanda só quando tiver streaming
- Custo adicional: só quando usar

---

## Arquivos a Criar/Modificar

### Servidor (Node.js)
- `server/services/MediasoupService.ts` - Gerencia mediasoup
- `server/services/RTMPStreamingService.ts` - Modificar para usar RTP
- `server/config/mediasoup.ts` - Configurações do mediasoup

### Cliente (React)
- `client/src/services/MediasoupClientService.ts` - Cliente mediasoup
- `client/src/services/RTMPStreamService.ts` - Modificar para usar mediasoup

---

## Referências

- mediasoup: https://mediasoup.org/
- mediasoup-client: https://www.npmjs.com/package/mediasoup-client
- FFmpeg NVENC: https://trac.ffmpeg.org/wiki/HWAccelIntro
- EC2 GPU instances: https://aws.amazon.com/ec2/instance-types/g4/

---

## Próximos Passos

1. ✅ Documentação salva
2. ⏳ Criar servidor EC2 com GPU
3. ⏳ Instalar e configurar mediasoup
4. ⏳ Integrar com FFmpeg NVENC
5. ⏳ Atualizar cliente
6. ⏳ Testar e validar


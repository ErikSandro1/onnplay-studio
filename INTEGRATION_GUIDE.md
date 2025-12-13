# 🚀 OnnPlay Studio Pro Live - Guia de Integração Full-Stack

Este guia explica como conectar o frontend do OnnPlay Studio aos serviços reais para torná-lo 100% funcional em produção.

## 1. Backend Starter Kit (WebSocket & Chat)

O `server-kit` incluído fornece um servidor Node.js com Socket.io para sincronização em tempo real e chat.

### Instalação:
1. Navegue até a pasta `server-kit`:
   ```bash
   cd server-kit
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
   O servidor rodará na porta **3001**.

### Conectando o Frontend:
No arquivo `client/src/services/websocket.ts`, atualize a URL:
```typescript
const SOCKET_URL = 'http://localhost:3001'; // Ou seu IP de produção
```

---

## 2. Integração Daily.co (Videochamadas)

Para videochamadas reais, você precisa de uma conta no Daily.co.

1. Crie uma conta em [daily.co](https://daily.co).
2. Crie uma nova sala (Room) no painel do Daily.
3. Copie a URL da sala (ex: `https://sua-empresa.daily.co/studio-pro`).
4. No arquivo `client/src/pages/Home.tsx`, atualize a prop `roomUrl` no componente `DailyVideoEmbed`:
   ```tsx
   <DailyVideoEmbed
     roomUrl="https://sua-empresa.daily.co/sua-sala-real"
     ...
   />
   ```

---

## 3. Streaming & Gravação (RTMP)

Para transmitir para YouTube/Twitch, você tem duas opções:

### Opção A: Integração com OBS (Recomendado)
Use o OnnPlay Studio como controlador e o OBS para processar o vídeo.
1. Instale o plugin **obs-websocket** no OBS.
2. Configure o IP e Senha do OBS no painel "Streaming Manager" do OnnPlay Studio.
3. O Studio enviará comandos para o OBS iniciar/parar stream e trocar cenas.

### Opção B: Servidor RTMP Próprio (Avançado)
Para transmitir direto do navegador sem OBS, você precisará de um servidor de mídia (como Node-Media-Server ou Mux).
1. Configure um servidor RTMP (ex: NGINX com módulo RTMP).
2. Aponte o frontend para enviar o stream via WebRTC para esse servidor, que converterá para RTMP.

---

## 4. Persistência de Dados (Banco de Dados)

Atualmente, o Studio usa `LocalStorage`. Para salvar em banco de dados real (PostgreSQL/MongoDB):

1. Crie uma API no seu backend (`server-kit`) com endpoints `/api/presets` e `/api/history`.
2. Atualize `client/src/services/api.ts` para fazer chamadas `fetch` para esses endpoints em vez de usar `localStorage`.

---

**Dúvidas?** Entre em contato com a equipe de desenvolvimento OnnPlay.

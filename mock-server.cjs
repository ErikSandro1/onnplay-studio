const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock user data
const mockUsers = {
  'free-user': {
    id: 1,
    name: 'Usuário FREE',
    email: 'free@example.com',
    plan: 'free',
    streaming_minutes: 180, // 3 horas usadas de 5
  },
  'pro-user': {
    id: 2,
    name: 'Usuário PRO',
    email: 'pro@example.com',
    plan: 'pro',
    streaming_minutes: 500,
  },
  'limit-user': {
    id: 3,
    name: 'Usuário no Limite',
    email: 'limit@example.com',
    plan: 'free',
    streaming_minutes: 295, // 295 minutos de 300 (98%)
  }
};

// Middleware para simular autenticação
app.use((req, res, next) => {
  // Simula um usuário FREE por padrão
  req.user = mockUsers['free-user'];
  next();
});

// GET /api/usage/summary - Retorna resumo de uso
app.get('/api/usage/summary', (req, res) => {
  const user = req.user;
  
  const limits = {
    streamingMinutesPerMonth: user.plan === 'free' ? 300 : -1,
    recordingMinutesPerMonth: user.plan === 'free' ? 300 : -1,
    maxQuality: user.plan === 'free' ? '720p' : '1080p/4K',
    maxParticipants: user.plan === 'free' ? 3 : 20,
    aiAssistant: user.plan !== 'free',
    recording: true,
  };

  res.json({
    success: true,
    summary: {
      streaming_minutes: user.streaming_minutes,
      recording_minutes: 0,
      ai_commands_count: 0,
      storage_mb: 0,
      limits,
      plan: user.plan,
    }
  });
});

// GET /api/usage/limits - Retorna limites do plano
app.get('/api/usage/limits', (req, res) => {
  const user = req.user;
  
  res.json({
    success: true,
    limits: {
      streamingMinutesPerMonth: user.plan === 'free' ? 300 : -1,
      recordingMinutesPerMonth: user.plan === 'free' ? 300 : -1,
      maxQuality: user.plan === 'free' ? '720p' : '1080p/4K',
      maxParticipants: user.plan === 'free' ? 3 : 20,
      aiAssistant: user.plan !== 'free',
      recording: true,
    }
  });
});

// POST /api/usage/check/streaming - Verifica se pode iniciar streaming
app.post('/api/usage/check/streaming', (req, res) => {
  const user = req.user;
  const limit = user.plan === 'free' ? 300 : -1;
  const canStream = limit === -1 || user.streaming_minutes < limit;
  
  res.json({
    success: true,
    canStream,
    currentUsage: user.streaming_minutes,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - user.streaming_minutes),
  });
});

// POST /api/usage/increment/streaming - Incrementa uso de streaming
app.post('/api/usage/increment/streaming', (req, res) => {
  const { minutes } = req.body;
  const user = req.user;
  
  user.streaming_minutes += minutes || 1;
  
  res.json({
    success: true,
    newTotal: user.streaming_minutes,
  });
});

// Rota para alternar entre usuários (para testes)
app.get('/api/mock/switch-user/:type', (req, res) => {
  const { type } = req.params;
  if (mockUsers[type]) {
    req.user = mockUsers[type];
    res.json({ success: true, user: req.user });
  } else {
    res.status(404).json({ success: false, error: 'User type not found' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   - GET  /api/usage/summary`);
  console.log(`   - GET  /api/usage/limits`);
  console.log(`   - POST /api/usage/check/streaming`);
  console.log(`   - POST /api/usage/increment/streaming`);
  console.log(`   - GET  /api/mock/switch-user/:type (free-user, pro-user, limit-user)`);
});

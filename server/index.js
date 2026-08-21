const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const portariaRoutes = require('./routes/portariaRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);


// Middlewares Globais
app.use(cors());
app.use(express.json());

// ==========================================
// 🛡️ Middlewares de Proteção (Rate Limit)
// ==========================================

// Limite rigoroso para rotas de login (proteção contra Força Bruta)
const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo de 5 tentativas por IP
  message: { mensagem: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

// Limite geral para consumo das APIs
const limiterGeral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo de 100 requisições por IP
  message: { mensagem: 'Muitas requisições vindas deste IP. Tente novamente em 15 minutos.' }
});

// Aplicação dos limitadores
app.use('/api/auth/login', limiterLogin);
app.use('/api', limiterGeral);

// Registro de Rotas
app.use('/api/auth', authRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/portaria', portariaRoutes);


// Rota de Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', mensagem: 'Back-end da Plataforma de Eventos rodando!' });
});

// Inicialização do Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Endpoint de teste: http://localhost:${PORT}/api/health`);
});
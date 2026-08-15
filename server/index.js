const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const portariaRoutes = require('./routes/portariaRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares Globais
app.use(cors());
app.use(express.json());

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
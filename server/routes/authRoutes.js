const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    // Gera Token JWT contendo id, email e papel (role)
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, papel: usuario.papel, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      mensagem: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: 'Erro interno ao realizar login.' });
  }
});


router.post('/registro', async (req, res) => {
  const { nome, email, senha, papel } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos obrigatórios.' });
  }

  try {
    // 1. Verifica se o e-mail já existe
    const [usuarios] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (usuarios.length > 0) {
      return res.status(400).json({ mensagem: 'Este e-mail já está cadastrado.' });
    }

    // 2. Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);
    const novoId = crypto.randomUUID();
    const tipoPapel = papel === 'ORGANIZADOR' ? 'ORGANIZADOR' : 'CLIENTE';

    // 3. Insere no banco de dados
    await db.execute(
      'INSERT INTO usuarios (id, nome, email, senha, papel) VALUES (?, ?, ?, ?, ?)',
      [novoId, nome, email, senhaHash, tipoPapel]
    );

    // 4. Gera o token de acesso automático
    const token = jwt.sign(
      { id: novoId, nome, email, papel: tipoPapel },
      process.env.JWT_SECRET || 'chave_secreta_padrao',
      { expiresIn: '1d' }
    );

    res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso!',
      token,
      usuario: { id: novoId, nome, email, papel: tipoPapel }
    });

  } catch (error) {
    console.error('Erro no registro de usuário:', error);
    res.status(500).json({ mensagem: 'Erro interno ao realizar cadastro.' });
  }
});''

// POST /api/auth/seed - Cria dados de teste automáticos
router.post('/seed', async (req, res) => {
  try {
    const senhaHash = await bcrypt.hash('123456', 10);

    const usuariosParaInserir = [
      { id: crypto.randomUUID(), nome: 'Organizador Exemplo', email: 'organizador@elite.com', papel: 'ORGANIZADOR' },
      { id: crypto.randomUUID(), nome: 'Cliente 1 Exemplo', email: 'cliente1@elite.com', papel: 'CLIENTE' },
      { id: crypto.randomUUID(), nome: 'Cliente 2 Exemplo', email: 'cliente2@elite.com', papel: 'CLIENTE' },
      { id: crypto.randomUUID(), nome: 'Portaria Principal', email: 'portaria@elite.com', papel: 'PORTARIA' },
    ];

    for (const u of usuariosParaInserir) {
      await db.execute(
        `INSERT INTO usuarios (id, nome, email, senha, papel) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE nome=VALUES(nome)`,
        [u.id, u.nome, u.email, senhaHash, u.papel]
      );
    }

    res.json({ 
      mensagem: 'Dados de teste (seed) inseridos com sucesso!',
      credenciaisPadrao: 'Senha para todos os usuários criados: 123456',
      usuarios: usuariosParaInserir.map(u => ({ email: u.email, papel: u.papel }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: 'Erro ao executar seed de usuários.' });
  }
});

module.exports = router;
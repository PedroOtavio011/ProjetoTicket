const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');

// ==========================================
// 1. CRIAR PEDIDO
// POST /api/pedidos
// ==========================================
router.post('/', autenticarToken, async (req, res) => {
  const { eventoId, assentosIds, statusPagamentoSimulado } = req.body;
  const usuarioId = req.usuario?.id || req.usuario?.cliente_id || req.cliente?.id;

  if (!eventoId) {
    return res.status(400).json({ mensagem: 'O ID do evento é obrigatório.' });
  }

  if (statusPagamentoSimulado === 'NAO_AUTORIZADO') {
    return res.status(402).json({ mensagem: 'Transação recusada: Cartão não autorizado.' });
  }

  if (statusPagamentoSimulado === 'SEM_LIMITE') {
    return res.status(402).json({ mensagem: 'Transação recusada: Saldo/limite insuficiente.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [eventos] = await connection.execute('SELECT * FROM eventos WHERE id = ?', [eventoId]);
    if (eventos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ mensagem: 'Evento não encontrado.' });
    }
    const evento = eventos[0];

    if (evento.status === 'CANCELADO') {
      await connection.rollback();
      return res.status(400).json({ mensagem: 'Este evento foi cancelado.' });
    }

    let valorTotal = Number(evento.preco);
    let assentosNomes = [];

    if (assentosIds && assentosIds.length > 0) {
      valorTotal = Number(evento.preco) * assentosIds.length;
      for (const assentoId of assentosIds) {
        const [ass] = await connection.execute('SELECT * FROM assentos WHERE id = ?', [assentoId]);
        if (ass.length > 0) {
          assentosNomes.push(ass[0].codigo_assento || ass[0].numero || assentoId);
        }
        await connection.execute('UPDATE assentos SET status = ? WHERE id = ?', ['OCUPADO', assentoId]);
      }
    }

    const pedidoId = crypto.randomUUID();
    const qrCodeHash = crypto.randomBytes(16).toString('hex').toUpperCase();

    await connection.execute(
      `INSERT INTO pedidos (id, usuario_id, evento_id, valor_total, assentos, status, qr_code, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMADO', ?, NOW(), NOW())`,
      [
        pedidoId,
        usuarioId,
        eventoId,
        valorTotal,
        assentosNomes.length > 0 ? assentosNomes.join(', ') : 'Pista',
        qrCodeHash
      ]
    );

    await connection.commit();

    return res.status(201).json({
      mensagem: '🎉 Pagamento aprovado! Compra realizada com sucesso.',
      pedidoId,
      qrCode: qrCodeHash
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erro na compra:', error);
    return res.status(500).json({ mensagem: 'Erro interno ao processar a compra.' });
  } finally {
    connection.release();
  }
});

// ==========================================
// 2. LISTAR MEUS PEDIDOS / INGRESSOS
// GET /api/pedidos
// ==========================================
router.get('/', autenticarToken, async (req, res) => {
  const usuarioId = req.usuario?.id || req.usuario?.cliente_id || req.cliente?.id;

  if (!usuarioId) {
    return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
  }

  try {
    const [pedidos] = await db.query(`
      SELECT 
        p.id,
        p.usuario_id AS cliente_id,
        p.evento_id,
        p.valor_total,
        p.assentos,
        p.status,
        p.qr_code AS qr_code_hash,
        p.criado_em,
        e.titulo,
        e.data_evento,
        e.local,
        e.imagem_url
      FROM pedidos p
      INNER JOIN eventos e ON p.evento_id = e.id
      WHERE p.usuario_id = ? AND p.status != 'CANCELADO'
      ORDER BY p.criado_em DESC
    `, [usuarioId]);

    return res.json(pedidos);
  } catch (error) {
    console.error('Erro ao buscar ingressos:', error);
    return res.status(500).json({ mensagem: 'Erro interno ao buscar seus ingressos.' });
  }
});

// ==========================================
// 3. GERAR LINK TEMPORÁRIO DE TRANSFERÊNCIA
// POST /api/pedidos/gerar-link-transferencia
// ==========================================
router.post('/gerar-link-transferencia', autenticarToken, async (req, res) => {
  const { ticketId } = req.body;
  const usuarioId = req.usuario?.id || req.usuario?.cliente_id || req.cliente?.id;

  if (!ticketId) {
    return res.status(400).json({ mensagem: 'ID do ingresso não informado.' });
  }

  try {
    const [pedidos] = await db.query(
      'SELECT id FROM pedidos WHERE id = ? AND usuario_id = ? AND status = ?',
      [ticketId, usuarioId, 'CONFIRMADO']
    );

    if (pedidos.length === 0) {
      return res.status(403).json({ mensagem: 'Você não tem permissão para compartilhar este ingresso.' });
    }

    const tokenTransferencia = crypto.randomBytes(16).toString('hex');
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      'UPDATE pedidos SET token_transferencia = ?, token_expira_em = ? WHERE id = ?',
      [tokenTransferencia, expiraEm, ticketId]
    );

    return res.json({ tokenTransferencia });
  } catch (error) {
    console.error('ERRO DETALHADO em /gerar-link-transferencia:', error);
    return res.status(500).json({ mensagem: 'Erro no servidor ao gerar o link.' });
  }
});

// ==========================================
// 4. RESGATAR INGRESSO VIA TOKEN TEMPORÁRIO
// POST /api/pedidos/transferir
// ==========================================
router.post('/transferir', autenticarToken, async (req, res) => {
  const { codigo } = req.body;
  const novoClienteId = req.usuario?.id || req.usuario?.cliente_id || req.cliente?.id;

  if (!codigo) {
    return res.status(400).json({ mensagem: 'Informe o código ou link do ingresso.' });
  }

  const tokenLimpo = codigo.trim().split('/').pop();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [pedidos] = await connection.query(
      `SELECT * FROM pedidos WHERE token_transferencia = ? AND token_expira_em > NOW()`,
      [tokenLimpo]
    );

    if (pedidos.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        mensagem: 'O link de transferência é inválido, já foi utilizado ou expirou (validade de 24h).' 
      });
    }

    const item = pedidos[0];

    if (item.usuario_id === novoClienteId) {
      await connection.rollback();
      return res.status(400).json({ mensagem: 'Este ingresso já pertence à sua conta!' });
    }

    const novoQrCodeHash = crypto.randomBytes(16).toString('hex').toUpperCase();

    await connection.query(
      `UPDATE pedidos 
       SET usuario_id = ?, 
           qr_code = ?, 
           token_transferencia = NULL, 
           token_expira_em = NULL 
       WHERE id = ?`,
      [novoClienteId, novoQrCodeHash, item.id]
    );

    await connection.commit();

    return res.json({ 
      mensagem: '🎉 Ingresso transferido para a sua conta com sucesso! O QR Code antigo foi invalidado.' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erro na transferência:', error);
    return res.status(500).json({ mensagem: 'Erro interno ao processar a transferência.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
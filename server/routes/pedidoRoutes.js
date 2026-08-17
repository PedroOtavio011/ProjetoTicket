const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');

// ==========================================
// 1. CRIAR PEDIDO / COMPRAR INGRESSO
// POST /api/pedidos
// ==========================================
router.post('/', autenticarToken, async (req, res) => {
  const { eventoId, assentosIds, statusPagamentoSimulado } = req.body;
  const usuarioId = req.usuario.id;

  if (!eventoId) {
    return res.status(400).json({ mensagem: 'O ID do evento é obrigatório.' });
  }

  // ---------------------------------------------------------
  // 💳 SIMULAÇÃO DE GATEWAY DE PAGAMENTO
  // ---------------------------------------------------------
  if (statusPagamentoSimulado === 'NAO_AUTORIZADO') {
    return res.status(402).json({
      mensagem: 'Transação recusada: Cartão não autorizado pela operadora.'
    });
  }

  if (statusPagamentoSimulado === 'SEM_LIMITE') {
    return res.status(402).json({
      mensagem: 'Transação recusada: Saldo ou limite insuficiente.'
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Busca dados do evento
    const [eventos] = await connection.execute('SELECT * FROM eventos WHERE id = ?', [eventoId]);
    if (eventos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ mensagem: 'Evento não encontrado.' });
    }
    const evento = eventos[0];

    if (evento.status === 'CANCELADO') {
      await connection.rollback();
      return res.status(400).json({ mensagem: 'Este evento foi cancelado e não aceita novas compras.' });
    }

    let valorTotal = Number(evento.preco);
    let assentosNomes = [];

    // 2. Processa os assentos caso selecionados
    if (assentosIds && assentosIds.length > 0) {
      valorTotal = Number(evento.preco) * assentosIds.length;

      for (const assentoId of assentosIds) {
        // Busca o código/número do assento
        const [ass] = await connection.execute('SELECT * FROM assentos WHERE id = ?', [assentoId]);
        if (ass.length > 0) {
          assentosNomes.push(ass[0].codigo_assento || ass[0].numero || assentoId);
        }

        // Marca o assento como OCUPADO
        await connection.execute('UPDATE assentos SET status = "OCUPADO" WHERE id = ?', [assentoId]);
      }
    }

    const pedidoId = crypto.randomUUID();
    const qrCodeHash = `CINETICKET-${pedidoId.substring(0, 8).toUpperCase()}-${Date.now()}`;

    // 3. Insere o pedido no banco de dados (Aprovado)
    await connection.execute(
      `INSERT INTO pedidos (id, usuario_id, evento_id, valor_total, assentos, status, qr_code)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMADO', ?)`,
      [
        pedidoId,
        usuarioId,
        eventoId,
        valorTotal,
        assentosNomes.length > 0 ? assentosNomes.join(', ') : 'Pista', // ✅ Corrigido para 'Pista'
        qrCodeHash
      ]
    );

    await connection.commit();

    res.status(201).json({
      mensagem: '🎉 Pagamento aprovado! Compra realizada com sucesso.',
      pedidoId,
      qrCode: qrCodeHash
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erro na compra:', error);
    res.status(500).json({ mensagem: 'Erro interno ao processar a compra.' });
  } finally {
    connection.release();
  }
});

// ==========================================
// 2. LISTAR MEUS INGRESSOS (Usuário Logado)
// GET /api/pedidos
// ==========================================
router.get('/', autenticarToken, async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const [pedidos] = await db.execute(
      `SELECT 
        p.id,
        p.valor_total,
        p.assentos,
        p.status,
        p.qr_code,
        e.titulo,
        e.data_evento,
        e.local,
        e.imagem_url
       FROM pedidos p
       JOIN eventos e ON p.evento_id = e.id
       WHERE p.usuario_id = ?
       ORDER BY p.id DESC`,
      [usuarioId]
    );

    res.json(pedidos);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro ao carregar ingressos.' });
  }
});

module.exports = router;
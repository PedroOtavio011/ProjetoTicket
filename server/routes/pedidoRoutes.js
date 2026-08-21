const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');

// ==========================================
// 1. CRIAR PEDIDO E POPULAR INGRESSOS INDIVIDUAIS
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

    // Busca o evento
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
    let assentosDetalhes = [];

    // Processa os assentos se fornecidos
    if (assentosIds && assentosIds.length > 0) {
      valorTotal = Number(evento.preco) * assentosIds.length;
      for (const assentoId of assentosIds) {
        const [ass] = await connection.execute('SELECT * FROM assentos WHERE id = ?', [assentoId]);
        const nomeAssento = ass.length > 0 ? (ass[0].codigo_assento || ass[0].numero || assentoId) : assentoId;
        
        assentosDetalhes.push({
          id: assentoId,
          nome: nomeAssento
        });

        // Ocupa o assento na tabela de assentos
        await connection.execute('UPDATE assentos SET status = ? WHERE id = ?', ['OCUPADO', assentoId]);
      }
    } else {
      // Caso seja entrada sem assento marcado (ex: Pista)
      assentosDetalhes.push({ id: null, nome: 'Pista' });
    }

    // 1. GRAVA A TRANSAÇÃO GERAL EM 'PEDIDOS'
    const pedidoId = crypto.randomUUID();
    const qrCodePedidoPai = crypto.randomBytes(16).toString('hex').toUpperCase();
    const resumoAssentos = assentosDetalhes.map(a => a.nome).join(', ');

    await connection.execute(
      `INSERT INTO pedidos (id, usuario_id, evento_id, valor_total, assentos, status, qr_code, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMADO', ?, NOW(), NOW())`,
      [pedidoId, usuarioId, eventoId, valorTotal, resumoAssentos, qrCodePedidoPai]
    );

    // 2. GRAVA CADA INGRESSO INDIVIDUAL EM 'INGRESSOS'
    const ingressosGerados = [];

    for (const itemAssento of assentosDetalhes) {
      const ingressoId = crypto.randomUUID();
      const qrCodeHashUnico = crypto.randomBytes(16).toString('hex').toUpperCase();

      await connection.execute(
        `INSERT INTO ingressos (
          id, pedido_id, cliente_id, evento_id, assento_id, qr_code_hash, status, criado_em, atualizado_em
         ) VALUES (?, ?, ?, ?, ?, ?, 'DISPONIVEL', NOW(), NOW())`,
        [ingressoId, pedidoId, usuarioId, eventoId, itemAssento.nome, qrCodeHashUnico]
      );

      ingressosGerados.push({
        ingressoId,
        assento: itemAssento.nome,
        qrCode: qrCodeHashUnico
      });
    }

    await connection.commit();

    return res.status(201).json({
      mensagem: '🎉 Pagamento aprovado! Compra realizada com sucesso.',
      pedidoId,
      ingressos: ingressosGerados
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
// 2. LISTAR INGRESSOS INDIVIDUAIS DO USUÁRIO
// GET /api/pedidos
// ==========================================
router.get('/', autenticarToken, async (req, res) => {
  const usuarioId = req.usuario?.id || req.usuario?.cliente_id || req.cliente?.id;

  if (!usuarioId) {
    return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
  }

  try {
    // Prioriza a busca por cada ingresso individual da tabela INGRESSOS
    const [ingressos] = await db.query(`
      SELECT 
        i.id,
        i.pedido_id,
        i.cliente_id,
        i.evento_id,
        i.assento_id AS assentos,
        i.qr_code_hash,
        i.status,
        i.criado_em,
        e.titulo,
        e.data_evento,
        e.local,
        e.imagem_url,
        COALESCE(e.preco, 0) AS valor_total
      FROM ingressos i
      INNER JOIN eventos e ON i.evento_id = e.id
      WHERE i.cliente_id = ? AND i.status != 'CANCELADO'
      ORDER BY i.criado_em DESC
    `, [usuarioId]);

    // Fallback: se houver pedidos antigos criados antes da migration sem registro em 'ingressos'
    if (ingressos.length === 0) {
      const [pedidosAntigos] = await db.query(`
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

      return res.json(pedidosAntigos);
    }

    return res.json(ingressos);
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
    // 1. Procura primeiro na tabela 'ingressos'
    const [ingressos] = await db.query(
      'SELECT id FROM ingressos WHERE id = ? AND cliente_id = ? AND status = ?',
      [ticketId, usuarioId, 'DISPONIVEL']
    );

    // 2. Se não achar, procura em 'pedidos' (compatibilidade legado)
    const [pedidos] = await db.query(
      'SELECT id FROM pedidos WHERE id = ? AND usuario_id = ? AND status = ?',
      [ticketId, usuarioId, 'CONFIRMADO']
    );

    if (ingressos.length === 0 && pedidos.length === 0) {
      return res.status(403).json({ mensagem: 'Você não tem permissão para compartilhar este ingresso ou ele já foi utilizado.' });
    }

    const tokenTransferencia = crypto.randomBytes(16).toString('hex');
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (ingressos.length > 0) {
      await db.query(
        'UPDATE ingressos SET token_transferencia = ?, token_expira_em = ? WHERE id = ?',
        [tokenTransferencia, expiraEm, ticketId]
      );
    } else {
      await db.query(
        'UPDATE pedidos SET token_transferencia = ?, token_expira_em = ? WHERE id = ?',
        [tokenTransferencia, expiraEm, ticketId]
      );
    }

    return res.json({ tokenTransferencia });
  } catch (error) {
    console.error('ERRO DETALHADO em /gerar-link-transferencia:', error);
    return res.status(500).json({ mensagem: 'Erro no servidor ao gerar o link de transferência.' });
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

    // 1. Busca primeiro em 'ingressos'
    const [ingressos] = await connection.query(
      `SELECT * FROM ingressos WHERE token_transferencia = ? AND token_expira_em > NOW()`,
      [tokenLimpo]
    );

    // 2. Busca em 'pedidos' caso seja item antigo
    const [pedidos] = await connection.query(
      `SELECT * FROM pedidos WHERE token_transferencia = ? AND token_expira_em > NOW()`,
      [tokenLimpo]
    );

    if (ingressos.length === 0 && pedidos.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        mensagem: 'O link de transferência é inválido, já foi utilizado ou expirou (validade de 24h).' 
      });
    }

    const item = ingressos[0] || pedidos[0];
    const ehIngressoIndividual = ingressos.length > 0;

    if ((item.cliente_id || item.usuario_id) === novoClienteId) {
      await connection.rollback();
      return res.status(400).json({ mensagem: 'Este ingresso já pertence à sua conta!' });
    }

    const novoQrCodeHash = crypto.randomBytes(16).toString('hex').toUpperCase();

    if (ehIngressoIndividual) {
      await connection.query(
        `UPDATE ingressos 
         SET cliente_id = ?, 
             qr_code_hash = ?, 
             token_transferencia = NULL, 
             token_expira_em = NULL 
         WHERE id = ?`,
        [novoClienteId, novoQrCodeHash, item.id]
      );
    } else {
      await connection.query(
        `UPDATE pedidos 
         SET usuario_id = ?, 
             qr_code = ?, 
             token_transferencia = NULL, 
             token_expira_em = NULL 
         WHERE id = ?`,
        [novoClienteId, novoQrCodeHash, item.id]
      );
    }

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
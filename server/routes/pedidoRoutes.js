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
  const usuarioId = req.usuario?.id || req.usuario?.cliente_id || req.cliente?.id;

  if (!eventoId) {
    return res.status(400).json({ mensagem: 'O ID do evento é obrigatório.' });
  }

  // 💳 SIMULAÇÃO DE GATEWAY DE PAGAMENTO
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

    // 3. Insere o pedido no banco de dados
    await connection.execute(
      `INSERT INTO pedidos (id, usuario_id, evento_id, valor_total, assentos, status, qr_code)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMADO', ?)`,
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
  // Pega o ID do usuário autenticado no token (ex: '16742a5f-a84b-4472-98ac-80482ceaec5b')
  const usuarioId = req.usuario?.id || req.usuario?.cliente_id || req.cliente?.id;

  if (!usuarioId) {
    return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
  }

  try {
    // 1️⃣ Busca compras diretas na tabela 'pedidos'
    // Usa 'usuario_id', 'qr_code' e 'criado_em' que existem no Print 2
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

    // 2️⃣ Busca ingressos recebidos/transferidos na tabela 'ingressos'
    // Usa 'cliente_id' e 'qr_code_hash' (sem 'criado_em') que existem no Print 1
    const [ingressos] = await db.query(`
      SELECT 
        i.id,
        i.pedido_id,
        i.cliente_id,
        i.evento_id,
        i.qr_code_hash,
        i.token_compartilhamento,
        i.status,
        e.titulo,
        e.data_evento,
        e.local,
        e.imagem_url,
        COALESCE(e.preco, 0) AS valor_total
      FROM ingressos i
      INNER JOIN eventos e ON i.evento_id = e.id
      WHERE i.cliente_id = ? AND i.status != 'CANCELADO'
    `, [usuarioId]).catch(() => [[]]);

    // 3️⃣ Remove duplicatas (se um pedido já estiver listado via tabela pedidos)
    const idsJaIncluidos = new Set(pedidos.map(p => String(p.id)));

    const ingressosAdicionais = ingressos.filter(i => 
      !idsJaIncluidos.has(String(i.id)) && 
      !idsJaIncluidos.has(String(i.pedido_id))
    );

    // 4️⃣ Une as duas listas
    const resultadoFinal = [...pedidos, ...ingressosAdicionais];

    return res.json(resultadoFinal);

  } catch (error) {
    console.error('Erro ao buscar ingressos do usuário:', error);
    return res.status(500).json({ mensagem: 'Erro interno ao buscar seus ingressos.' });
  }
});

// ==========================================
// 3. TRANSFERIR INGRESSO
// POST /api/pedidos/transferir
// ==========================================
router.post('/transferir', autenticarToken, async (req, res) => {
  const { codigo } = req.body;
  const novoClienteId = req.usuario?.id || req.usuario?.cliente_id || req.cliente?.id;

  if (!codigo) {
    return res.status(400).json({ mensagem: 'Informe o link ou código do ingresso.' });
  }

  const codigoLimpo = codigo.trim().split('/').pop();

  try {
    const [rowsIngressos] = await db.query(
      `SELECT * FROM ingressos WHERE token_compartilhamento = ? OR qr_code_hash = ? OR id = ?`,
      [codigoLimpo, codigoLimpo, codigoLimpo]
    );

    const [rowsPedidos] = await db.query(
      `SELECT * FROM pedidos WHERE id = ? OR qr_code = ?`,
      [codigoLimpo, codigoLimpo]
    );

    if (rowsIngressos.length === 0 && rowsPedidos.length === 0) {
      return res.status(404).json({ mensagem: 'Ingresso não encontrado ou código inválido.' });
    }

    const item = rowsIngressos[0] || rowsPedidos[0];

    if (item.cliente_id === novoClienteId || item.usuario_id === novoClienteId) {
      return res.status(400).json({ mensagem: 'Este ingresso já pertence à sua conta!' });
    }

    await db.query(
      `UPDATE ingressos SET cliente_id = ? WHERE token_compartilhamento = ? OR qr_code_hash = ? OR id = ?`,
      [novoClienteId, codigoLimpo, codigoLimpo, codigoLimpo]
    ).catch(() => {});

    await db.query(
      `UPDATE pedidos SET usuario_id = ? WHERE id = ? OR qr_code = ?`,
      [novoClienteId, codigoLimpo, codigoLimpo]
    ).catch(() => {});

    return res.json({ mensagem: '🎉 Ingresso transferido para a sua conta com sucesso!' });

  } catch (error) {
    console.error('Erro ao transferir ingresso:', error);
    return res.status(500).json({ mensagem: 'Erro interno ao processar a transferência do ingresso.' });
  }
});

// ==========================================
// 4. VER INGRESSO COMPARTILHADO
// GET /api/pedidos/compartilhado/:codigo
// ==========================================
router.get('/compartilhado/:codigo', async (req, res) => {
  const { codigo } = req.params;
  const codigoLimpo = codigo.trim().split('/').pop();

  try {
    const [rows] = await db.query(`
      SELECT 
        i.id,
        i.token_compartilhamento AS token,
        i.qr_code_hash AS qrCodeHash,
        i.assento_id AS assentoId,
        e.titulo AS eventoTitulo,
        e.data_evento AS dataEvento,
        e.local,
        c.nome AS titular
      FROM ingressos i
      LEFT JOIN eventos e ON i.evento_id = e.id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE i.token_compartilhamento = ? OR i.id = ? OR i.qr_code_hash = ?
    `, [codigoLimpo, codigoLimpo, codigoLimpo]);

    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Ingresso não encontrado ou inválido.' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar ingresso compartilhado:', error);
    return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
  }
});

module.exports = router;
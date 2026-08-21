const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');

// ==========================================
// VALIDAR / LER QR CODE NA PORTARIA
// POST /api/portaria/validar
// ==========================================
router.post('/validar', autenticarToken, async (req, res) => {
  if (req.usuario && !['PORTARIA', 'ORGANIZADOR'].includes(req.usuario.papel)) {
    return res.status(403).json({ 
      status: 'INVALIDO',
      mensagem: 'Acesso negado. Apenas usuários do perfil Portaria ou Organizador podem validar ingressos.' 
    });
  }

  const input = req.body.hash || req.body.qrCode || req.body.codigo || req.body.qr_code;
  const eventoIdPortaria = req.body.eventoId || req.body.evento_id;

  if (!input || !input.trim()) {
    return res.status(400).json({ 
      status: 'INVALIDO',
      mensagem: 'O Hash/QR Code é obrigatório para validação.' 
    });
  }

  const codigoLimpo = input.trim();

  try {
    const [pedidos] = await db.execute(
      `SELECT 
        p.id AS pedido_id,
        p.evento_id,
        p.status AS pedido_status,
        p.qr_code AS qr_code_hash,
        p.assentos,
        p.validado_em,
        e.titulo AS evento_titulo,
        e.data_evento,
        e.local,
        u.nome AS cliente_nome,
        u.email AS cliente_email
      FROM pedidos p
      JOIN eventos e ON p.evento_id = e.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.qr_code = ? 
         OR p.id = ? 
         OR p.qr_code LIKE ?`,
      [codigoLimpo, codigoLimpo, `${codigoLimpo}%`]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({
        valido: false,
        status: 'INVALIDO',
        mensagem: '❌ INGRESSO INVÁLIDO! Código não encontrado no sistema.'
      });
    }

    const pedido = pedidos[0];

    if (eventoIdPortaria && String(pedido.evento_id) !== String(eventoIdPortaria)) {
      return res.status(400).json({
        valido: false,
        status: 'EVENTO_ERRADO',
        mensagem: `⚠️ EVENTO ERRADO! Este ingresso pertence ao evento "${pedido.evento_titulo}".`,
        ingresso: pedido
      });
    }

    if (pedido.pedido_status === 'UTILIZADO') {
      return res.status(400).json({
        valido: false,
        status: 'JA_UTILIZADO',
        mensagem: `⚠️ ATENÇÃO: Este ingresso JÁ FOI UTILIZADO! (Validado em: ${pedido.validado_em})`,
        ingresso: pedido
      });
    }

    if (pedido.pedido_status === 'CANCELADO') {
      return res.status(400).json({
        valido: false,
        status: 'INVALIDO',
        mensagem: '⛔ INGRESSO CANCELADO! Entrada não permitida.',
        ingresso: pedido
      });
    }

    const dataHoraAtual = new Date();
    await db.query(
      'UPDATE pedidos SET status = ?, validado_em = ?, atualizado_em = ? WHERE id = ?',
      ['UTILIZADO', dataHoraAtual, dataHoraAtual, pedido.pedido_id]
    );

    return res.json({
      valido: true,
      status: 'VALIDO',
      mensagem: '✅ ENTRADA LIBERADA! Bom evento/filme.',
      ingresso: {
        ...pedido,
        pedido_status: 'UTILIZADO',
        validado_em: dataHoraAtual
      }
    });

  } catch (error) {
    console.error('Erro na validação da portaria:', error);
    return res.status(500).json({ 
      status: 'INVALIDO',
      mensagem: 'Erro ao processar a validação na portaria.' 
    });
  }
});

module.exports = router;
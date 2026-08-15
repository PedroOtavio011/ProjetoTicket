const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');

// ==========================================
// VALIDAR / LER QR CODE NA PORTARIA
// POST /api/portaria/validar
// ==========================================
router.post('/validar', autenticarToken, async (req, res) => {
  // Aceita qualquer nome de parâmetro enviado pelo frontend
  const input = req.body.hash || req.body.qrCode || req.body.codigo || req.body.qr_code;

  if (!input || !input.trim()) {
    return res.status(400).json({ mensagem: 'O Hash/QR Code é obrigatório para validação.' });
  }

  const codigoLimpo = input.trim();

  try {
    // Busca flexível: aceita id exato, id parcial (ex: 9AB13FF1) ou QR Code
    const [pedidos] = await db.execute(
      `SELECT 
        p.id,
        p.status,
        p.assentos,
        p.valor_total,
        p.qr_code,
        e.titulo AS evento_titulo,
        e.data_evento,
        e.local,
        u.nome AS cliente_nome,
        u.email AS cliente_email
       FROM pedidos p
       JOIN eventos e ON p.evento_id = e.id
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.qr_code = ? 
          OR p.id = ? 
          OR p.id LIKE ? 
          OR p.qr_code LIKE ?`,
      [codigoLimpo, codigoLimpo, `${codigoLimpo}%`, `%${codigoLimpo}%`]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({
        valido: false,
        mensagem: '❌ INGRESSO NÃO ENCONTRADO! Verifique o código e tente novamente.'
      });
    }

    const pedido = pedidos[0];

    // Se já foi utilizado
    if (pedido.status === 'UTILIZADO') {
      return res.status(400).json({
        valido: false,
        mensagem: '⚠️ ATENÇÃO: Este ingresso JÁ FOI UTILIZADO para entrada!',
        pedido
      });
    }

    // Se estiver cancelado
    if (pedido.status === 'CANCELADO') {
      return res.status(400).json({
        valido: false,
        mensagem: '⛔ INGRESSO CANCELADO! Entrada não permitida.',
        pedido
      });
    }

    // Marca como UTILIZADO no banco de dados
    await db.execute('UPDATE pedidos SET status = "UTILIZADO" WHERE id = ?', [pedido.id]);

    return res.json({
      valido: true,
      mensagem: '✅ ENTRADA LIBERADA! Bom filme.',
      pedido: {
        ...pedido,
        status: 'UTILIZADO'
      }
    });

  } catch (error) {
    console.error('Erro na validação da portaria:', error);
    res.status(500).json({ mensagem: 'Erro ao processar a validação na portaria.' });
  }
});

module.exports = router;
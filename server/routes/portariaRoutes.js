const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');


// VALIDAR / LER QR CODE NA PORTARIA
// POST /api/portaria/validar

router.post('/validar', autenticarToken, async (req, res) => {
  // Opcional: Garante que apenas PORTARIA ou ORGANIZADOR possam validar
  if (req.usuario && !['PORTARIA', 'ORGANIZADOR'].includes(req.usuario.papel)) {
    return res.status(403).json({ 
      status: 'INVALIDO',
      mensagem: 'Acesso negado. Apenas usuários do perfil Portaria ou Organizador podem validar ingressos.' 
    });
  }

  // Aceita qualquer nome de parâmetro enviado pelo frontend
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
    // Busca flexível: inclui p.evento_id para podermos verificar se é o evento certo
    const [pedidos] = await db.execute(
      `SELECT 
        p.id,
        p.evento_id,
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

    // 1. INGRESSO NÃO ENCONTRADO (INVÁLIDO)
    if (pedidos.length === 0) {
      return res.status(404).json({
        valido: false,
        status: 'INVALIDO',
        mensagem: '❌ INGRESSO INVÁLIDO! Código não encontrado no sistema.'
      });
    }

    const pedido = pedidos[0];

    // 2. EVENTO ERRADO (O ingresso é de outro show/filme)
    if (eventoIdPortaria && String(pedido.evento_id) !== String(eventoIdPortaria)) {
      return res.status(400).json({
        valido: false,
        status: 'EVENTO_ERRADO',
        mensagem: `⚠️ EVENTO ERRADO! Este ingresso pertence ao evento "${pedido.evento_titulo}".`,
        pedido
      });
    }

    // 3. JÁ UTILIZADO
    if (pedido.status === 'UTILIZADO') {
      return res.status(400).json({
        valido: false,
        status: 'JA_UTILIZADO',
        mensagem: '⚠️ ATENÇÃO: Este ingresso JÁ FOI UTILIZADO para entrada!',
        pedido
      });
    }

    // 4. CANCELADO (Informa como Inválido)
    if (pedido.status === 'CANCELADO') {
      return res.status(400).json({
        valido: false,
        status: 'INVALIDO',
        mensagem: '⛔ INGRESSO CANCELADO! Entrada não permitida.',
        pedido
      });
    }

    // 5. INGRESSO VÁLIDO -> Marca como UTILIZADO no Banco de Dados
    await connection.execute('UPDATE pedidos SET status = ? WHERE id = ?', ['UTILIZADO', id]);

    return res.json({
      valido: true,
      status: 'VALIDO',
      mensagem: '✅ ENTRADA LIBERADA! Bom evento/filme.',
      pedido: {
        ...pedido,
        status: 'UTILIZADO'
      }
    });

  } catch (error) {
    console.error('Erro na validação da portaria:', error);
    res.status(500).json({ 
      status: 'INVALIDO',
      mensagem: 'Erro ao processar a validação na portaria.' 
    });
  }
});

module.exports = router;
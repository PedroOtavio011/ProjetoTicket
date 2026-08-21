const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');

// VALIDAR / LER QR CODE NA PORTARIA
// POST /api/portaria/validar
router.post('/validar', autenticarToken, async (req, res) => {
  // Garante permissões (Apenas PORTARIA ou ORGANIZADOR)
  if (req.usuario && !['PORTARIA', 'ORGANIZADOR'].includes(req.usuario.papel)) {
    return res.status(403).json({ 
      status: 'INVALIDO',
      mensagem: 'Acesso negado. Apenas usuários do perfil Portaria ou Organizador podem validar ingressos.' 
    });
  }

  // Recebe o hash e o evento selecionado
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
    // Busca na tabela INGRESSOS com JOIN na pedidos, eventos e usuarios
    const [ingressos] = await db.execute(
      `SELECT 
        i.id AS ingresso_id,
        i.evento_id,
        i.status AS ingresso_status,
        i.qr_code_hash,
        i.validado_em,
        p.id AS pedido_id,
        p.status AS pedido_status,
        p.assentos,
        e.titulo AS evento_titulo,
        e.data_evento,
        e.local,
        u.nome AS cliente_nome,
        u.email AS cliente_email
       FROM ingressos i
       JOIN pedidos p ON i.pedido_id = p.id
       JOIN eventos e ON i.evento_id = e.id
       LEFT JOIN usuarios u ON i.cliente_id = u.id OR p.usuario_id = u.id
       WHERE i.qr_code_hash = ? 
          OR i.id = ? 
          OR i.qr_code_hash LIKE ?`,
      [codigoLimpo, codigoLimpo, `%${codigoLimpo}%`]
    );

    // 1. INGRESSO NÃO ENCONTRADO
    if (ingressos.length === 0) {
      return res.status(404).json({
        valido: false,
        status: 'INVALIDO',
        mensagem: '❌ INGRESSO INVÁLIDO! Código não encontrado no sistema.'
      });
    }

    const ingresso = ingressos[0];

    // 2. EVENTO ERRADO
    if (eventoIdPortaria && String(ingresso.evento_id) !== String(eventoIdPortaria)) {
      return res.status(400).json({
        valido: false,
        status: 'EVENTO_ERRADO',
        mensagem: `⚠️ EVENTO ERRADO! Este ingresso pertence ao evento "${ingresso.evento_titulo}".`,
        ingresso
      });
    }

    // 3. JÁ UTILIZADO
    if (ingresso.ingresso_status === 'UTILIZADO') {
      return res.status(400).json({
        valido: false,
        status: 'JA_UTILIZADO',
        mensagem: `⚠️ ATENÇÃO: Este ingresso JÁ FOI UTILIZADO! (Validado em: ${ingresso.validado_em})`,
        ingresso
      });
    }

    // 4. CANCELADO OU PEDIDO NÃO PAGO
    if (ingresso.ingresso_status === 'CANCELADO' || ingresso.pedido_status === 'CANCELADO') {
      return res.status(400).json({
        valido: false,
        status: 'INVALIDO',
        mensagem: '⛔ INGRESSO CANCELADO! Entrada não permitida.',
        ingresso
      });
    }

    // 5. VALIDAÇÃO SUCEDIDA: Atualiza APENAS a tabela de INGRESSOS
    const dataHoraAtual = new Date();
    await db.query(
      'UPDATE ingressos SET status = ?, validado_em = ?, atualizado_em = ? WHERE id = ?',
      ['UTILIZADO', dataHoraAtual, dataHoraAtual, ingresso.ingresso_id]
    );

    return res.json({
      valido: true,
      status: 'VALIDO',
      mensagem: '✅ ENTRADA LIBERADA! Bom evento/filme.',
      ingresso: {
        ...ingresso,
        ingresso_status: 'UTILIZADO',
        validado_em: dataHoraAtual
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
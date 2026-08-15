const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { autenticarToken, autorizarPapel } = require('../middlewares/authMiddleware');

// ==========================================
// 1. INTEGRAÇÃO COM A API EXTERNA (TMDb - Filmes)
// GET /api/eventos/tmdb/buscar?query=Batman
// ==========================================
router.get('/tmdb/buscar', autenticarToken, autorizarPapel('ORGANIZADOR'), async (req, res) => {
  const { query } = req.query;
  const apiKey = process.env.TMDB_API_KEY;

  if (!query) {
    return res.status(400).json({ mensagem: 'Informe um termo de busca.' });
  }

  try {
    // Se não houver API key configurada no .env, devolvemos um mock
    if (!apiKey || apiKey === 'sua_chave_tmdb_aqui') {
      return res.json({
        origem: 'MOCK (Sem chave TMDb)',
        resultados: [
          {
            idExterno: '550',
            titulo: 'Clube da Luta (Mock)',
            descricao: 'Um homem deprimido encontra um saboeiro extrovertido.',
            imagemUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
          },
          {
            idExterno: '155',
            titulo: 'Batman: O Cavaleiro das Trevas (Mock)',
            descricao: 'Batman enfrenta o Coringa em Gotham City.',
            imagemUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg'
          }
        ]
      });
    }

    // Chamada real para a API do TMDb
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    const resultados = (data.results || []).slice(0, 8).map(filme => ({
      idExterno: String(filme.id),
      titulo: filme.title,
      descricao: filme.overview,
      imagemUrl: filme.poster_path 
        ? `https://image.tmdb.org/t/p/w500${filme.poster_path}` 
        : null
    }));

    res.json({ origem: 'TMDB', resultados });
  } catch (error) {
    console.error('Erro TMDb:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar filmes no TMDb.' });
  }
});

// ==========================================
// 2. CRIAÇÃO DE EVENTO (Apenas ORGANIZADOR)
// POST /api/eventos
// ==========================================
router.post('/', autenticarToken, autorizarPapel('ORGANIZADOR'), async (req, res) => {
  const {
    titulo,
    descricao,
    imagemUrl,
    idExterno,
    fonteExterna,
    dataEvento,
    local,
    capacidade,
    preco,
    tipo // 'COM_ASSENTO' ou 'PISTA'
  } = req.body;

  if (!titulo || !dataEvento || !local || !capacidade || !preco || !tipo) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos obrigatórios.' });
  }

  // Validação e conversão segura de data
  const dataObjeto = new Date(dataEvento);
  if (isNaN(dataObjeto.getTime())) {
    return res.status(400).json({ mensagem: 'Data e hora informadas são inválidas.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const eventoId = crypto.randomUUID();

    // 1. Insere o evento no banco
    await connection.execute(
      `INSERT INTO eventos (id, titulo, descricao, imagem_url, id_externo, fonte_externa, data_evento, local, capacidade, preco, tipo, organizador_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventoId,
        titulo,
        descricao || null,
        imagemUrl || null,
        idExterno || null,
        fonteExterna || 'TMDB',
        dataObjeto,
        local,
        capacidade,
        preco,
        tipo,
        req.usuario.id
      ]
    );

    // 2. Se o evento for COM_ASSENTO, gera os assentos automaticamente (ex: A1 até A10, B1 até B10)
    if (tipo === 'COM_ASSENTO') {
      const fileiras = ['A', 'B', 'C', 'D', 'E'];
      const assentosPorFileira = Math.ceil(capacidade / fileiras.length);
      let criados = 0;

      for (const fileira of fileiras) {
        for (let num = 1; num <= assentosPorFileira; num++) {
          if (criados >= capacidade) break;
          const codigoAssento = `${fileira}${num}`;
          await connection.execute(
            `INSERT INTO assentos (id, evento_id, codigo_assento, status) VALUES (?, ?, ?, 'DISPONIVEL')`,
            [crypto.randomUUID(), eventoId, codigoAssento]
          );
          criados++;
        }
      }
    }

    await connection.commit();

    res.status(201).json({
      mensagem: 'Evento publicado com sucesso!',
      eventoId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar evento:', error);
    res.status(500).json({ mensagem: 'Erro ao criar evento.' });
  } finally {
    connection.release();
  }
});

// ==========================================
// 3. LISTAGEM DE EVENTOS (Público)
// GET /api/eventos
// ==========================================
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT e.*, u.nome AS nome_organizador 
       FROM eventos e
       JOIN usuarios u ON e.organizador_id = u.id
       ORDER BY e.data_evento ASC`
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar eventos:', error);
    res.status(500).json({ mensagem: 'Erro ao listar eventos.' });
  }
});

// ==========================================
// 4. DETALHES DO EVENTO
// GET /api/eventos/:id
// ==========================================
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [eventos] = await db.execute(
      `SELECT e.*, u.nome AS nome_organizador 
       FROM eventos e
       JOIN usuarios u ON e.organizador_id = u.id
       WHERE e.id = ?`,
      [id]
    );

    if (eventos.length === 0) {
      return res.status(404).json({ mensagem: 'Evento não encontrado.' });
    }

    const evento = eventos[0];

    // Se for do tipo COM_ASSENTO, carrega a lista de assentos
    if (evento.tipo === 'COM_ASSENTO') {
      const [assentos] = await db.execute(
        `SELECT id, codigo_assento, codigo_assento AS numero, status FROM assentos WHERE evento_id = ? ORDER BY codigo_assento ASC`,
        [id]
      );
      evento.assentos = assentos;
    }

    res.json(evento);
  } catch (error) {
    console.error('Erro ao buscar evento:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar detalhes do evento.' });
  }
});

// ==========================================
// 5. MAPA DE ASSENTOS DO EVENTO (Com Auto-Geração para eventos antigos)
// GET /api/eventos/:id/assentos
// ==========================================
router.get('/:id/assentos', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Busca assentos existentes
    const [assentos] = await db.execute(
      `SELECT id, codigo_assento, codigo_assento AS numero, status FROM assentos WHERE evento_id = ? ORDER BY codigo_assento ASC`,
      [id]
    );

    if (assentos.length > 0) {
      return res.json(assentos);
    }

    // 2. Se não houver assentos, verifica se o evento existe
    const [eventos] = await db.execute(`SELECT * FROM eventos WHERE id = ?`, [id]);
    if (eventos.length === 0) {
      return res.status(404).json({ mensagem: 'Evento não encontrado.' });
    }

    const evento = eventos[0];

    // Se o evento não exige assentos (ex: Pista), retorna array vazio
    if (evento.tipo !== 'COM_ASSENTO') {
      return res.json([]);
    }

    // 3. Auto-geração de assentos caso o evento seja COM_ASSENTO e não possua registros
    const capacidade = evento.capacidade || 10;
    const fileiras = ['A', 'B', 'C', 'D', 'E'];
    const assentosPorFileira = Math.ceil(capacidade / fileiras.length);
    let criados = 0;

    for (const fileira of fileiras) {
      for (let num = 1; num <= assentosPorFileira; num++) {
        if (criados >= capacidade) break;
        const codigoAssento = `${fileira}${num}`;
        await db.execute(
          `INSERT INTO assentos (id, evento_id, codigo_assento, status) VALUES (?, ?, ?, 'DISPONIVEL')`,
          [crypto.randomUUID(), id, codigoAssento]
        );
        criados++;
      }
    }

    // 4. Retorna os novos assentos criados
    const [novosAssentos] = await db.execute(
      `SELECT id, codigo_assento, codigo_assento AS numero, status FROM assentos WHERE evento_id = ? ORDER BY codigo_assento ASC`,
      [id]
    );

    res.json(novosAssentos);
  } catch (error) {
    console.error('Erro ao buscar/gerar assentos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar assentos do evento.' });
  }
});

module.exports = router;
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Calendar, MapPin, Ticket, Search, PlusCircle, Film } from 'lucide-react';

export default function Home() {
  const { usuario } = useContext(AuthContext);
  const navigate = useNavigate();

  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estados para Organizador (busca no TMDb e criação)
  const [buscaTmdb, setBuscaTmdb] = useState('');
  const [filmesTmdb, setFilmesTmdb] = useState([]);
  const [buscandoTmdb, setBuscandoTmdb] = useState(false);
  const [mostrarModalNovo, setMostrarModalNovo] = useState(false);

  // Form de novo evento
  const [novoEvento, setNovoEvento] = useState({
    titulo: '',
    descricao: '',
    imagemUrl: '',
    dataEvento: '',
    local: 'Cinema Elite - Sala 1',
    capacidade: 10,
    preco: 35.00,
    tipo: 'COM_ASSENTO'
  });

  useEffect(() => {
    carregarEventos();
  }, []);

  const carregarEventos = async () => {
    try {
      setCarregando(true);
      const res = await api.get('/eventos');
      setEventos(res.data);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    } finally {
      setCarregando(false);
    }
  };

  const pesquisarTmdb = async (e) => {
    e.preventDefault();
    if (!buscaTmdb.trim()) return;
    try {
      setBuscandoTmdb(true);
      const res = await api.get(`/eventos/tmdb/buscar?query=${encodeURIComponent(buscaTmdb)}`);
      setFilmesTmdb(res.data);
    } catch (err) {
      console.error('Erro ao buscar filmes:', err);
    } finally {
      setBuscandoTmdb(false);
    }
  };

  const selecionarFilmeTmdb = (filme) => {
    setNovoEvento({
      ...novoEvento,
      titulo: filme.titulo,
      descricao: filme.sinopse || 'Sessão Especial de Cinema',
      imagemUrl: filme.imagemUrl,
      idExterno: String(filme.id),
      fonteExterna: 'TMDB'
    });
    setFilmesTmdb([]);
    setBuscaTmdb('');
  };

  const handleCriarEvento = async (e) => {
    e.preventDefault();
    try {
      await api.post('/eventos', novoEvento);
      alert('Evento cadastrado com sucesso!');
      setMostrarModalNovo(false);
      carregarEventos();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao criar evento.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Banner de Boas-Vindas */}
      <header style={styles.hero}>
        <h1 style={styles.heroTitle}>Sessões & Espetáculos em Destaque</h1>
        <p style={styles.heroSubtitle}>Escolha seu evento, selecione seus assentos em tempo real e garanta seu ingresso QR Code.</p>

        {usuario?.papel === 'ORGANIZADOR' && (
          <button onClick={() => setMostrarModalNovo(!mostrarModalNovo)} style={styles.addBtn}>
            <PlusCircle size={20} /> Cadastrar Novo Evento
          </button>
        )}
      </header>

      {/* Painel do Organizador (Se ativado) */}
      {mostrarModalNovo && usuario?.papel === 'ORGANIZADOR' && (
        <section style={styles.modalSection}>
          <h2 style={styles.sectionTitle}><Film size={22} /> Cadastrar Nova Sessão</h2>
          
          {/* Busca TMDB */}
          <form onSubmit={pesquisarTmdb} style={styles.searchBox}>
            <input
              type="text"
              placeholder="Pesquisar filme no catálogo (TMDb)... ex: Batman"
              value={buscaTmdb}
              onChange={(e) => setBuscaTmdb(e.target.value)}
              style={styles.searchInput}
            />
            <button type="submit" style={styles.searchBtn}>
              <Search size={18} /> {buscandoTmdb ? 'Buscando...' : 'Buscar Filme'}
            </button>
          </form>

          {/* Resultados da busca TMDB */}
          {filmesTmdb.length > 0 && (
            <div style={styles.tmdbResults}>
              <p style={{ color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Clique em um filme para preencher automaticamente:</p>
              <div style={styles.tmdbGrid}>
                {filmesTmdb.map((f) => (
                  <div key={f.id} onClick={() => selecionarFilmeTmdb(f)} style={styles.tmdbCard}>
                    <img src={f.imagemUrl} alt={f.titulo} style={styles.tmdbImg} />
                    <span style={styles.tmdbText}>{f.titulo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulário do Evento */}
          <form onSubmit={handleCriarEvento} style={styles.formGrid}>
            <input
              type="text"
              placeholder="Título do Evento"
              value={novoEvento.titulo}
              onChange={(e) => setNovoEvento({ ...novoEvento, titulo: e.target.value })}
              required
              style={styles.input}
            />
            <input
              type="text"
              placeholder="URL da Imagem de Capa"
              value={novoEvento.imagemUrl}
              onChange={(e) => setNovoEvento({ ...novoEvento, imagemUrl: e.target.value })}
              required
              style={styles.input}
            />
            <input
              type="datetime-local"
              value={novoEvento.dataEvento}
              onChange={(e) => setNovoEvento({ ...novoEvento, dataEvento: e.target.value })}
              required
              style={styles.input}
            />
            <input
              type="text"
              placeholder="Local"
              value={novoEvento.local}
              onChange={(e) => setNovoEvento({ ...novoEvento, local: e.target.value })}
              required
              style={styles.input}
            />
            <input
              type="number"
              placeholder="Capacidade (Ex: 10 assentos)"
              value={novoEvento.capacidade}
              onChange={(e) => setNovoEvento({ ...novoEvento, capacidade: Number(e.target.value) })}
              required
              style={styles.input}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Preço (R$)"
              value={novoEvento.preco}
              onChange={(e) => setNovoEvento({ ...novoEvento, preco: Number(e.target.value) })}
              required
              style={styles.input}
            />
            <select
              value={novoEvento.tipo}
              onChange={(e) => setNovoEvento({ ...novoEvento, tipo: e.target.value })}
              style={styles.input}
            >
              <option value="COM_ASSENTO">Marcado (Com Assentos)</option>
              <option value="PISTA">Pista Livre</option>
            </select>

            <button type="submit" style={styles.submitBtn}>Salvar e Criar Assentos</button>
          </form>
        </section>
      )}

      {/* Listagem de Eventos */}
      {carregando ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Carregando eventos...</div>
      ) : eventos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Nenhum evento disponível no momento.</div>
      ) : (
        <div style={styles.grid}>
          {eventos.map((ev) => (
            <div key={ev.id} style={styles.card}>
              <div style={styles.imgWrapper}>
                <img src={ev.imagem_url || ev.imagemUrl} alt={ev.titulo} style={styles.cardImg} />
                <span style={styles.badge}>{ev.tipo === 'COM_ASSENTO' ? 'Lugar Marcado' : 'Pista'}</span>
              </div>
              <div style={styles.cardContent}>
                <h3 style={styles.cardTitle}>{ev.titulo}</h3>
                <p style={styles.cardInfo}>
                  <Calendar size={15} color="#e11d48" /> {new Date(ev.data_evento || ev.dataEvento).toLocaleString('pt-BR')}
                </p>
                <p style={styles.cardInfo}>
                  <MapPin size={15} color="#e11d48" /> {ev.local}
                </p>
                <div style={styles.cardFooter}>
                  <span style={styles.price}>
                    R$ {Number(ev.preco).toFixed(2)}
                  </span>
                  <button onClick={() => navigate(`/evento/${ev.id}`)} style={styles.buyBtn}>
                    <Ticket size={16} /> Comprar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem',
  },
  hero: {
    marginBottom: '2rem',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: '2rem',
    color: '#fff',
    marginBottom: '0.5rem',
  },
  heroSubtitle: {
    color: '#94a3b8',
    marginBottom: '1.5rem',
  },
  addBtn: {
    backgroundColor: '#059669',
    color: '#fff',
    padding: '0.6rem 1.2rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
  },
  modalSection: {
    backgroundColor: '#1e293b',
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '2rem',
    border: '1px solid #334155',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '1.2rem',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  searchBox: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  searchInput: {
    flex: 1,
    padding: '0.6rem',
    borderRadius: '6px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#fff',
  },
  searchBtn: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    padding: '0.6rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  tmdbResults: {
    marginBottom: '1rem',
  },
  tmdbGrid: {
    display: 'flex',
    gap: '0.8rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
  },
  tmdbCard: {
    minWidth: '100px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  tmdbImg: {
    width: '100px',
    height: '140px',
    objectFit: 'cover',
    borderRadius: '6px',
  },
  tmdbText: {
    fontSize: '0.75rem',
    color: '#cbd5e1',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.8rem',
  },
  input: {
    padding: '0.6rem',
    borderRadius: '6px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#fff',
  },
  submitBtn: {
    gridColumn: '1 / -1',
    backgroundColor: '#e11d48',
    color: '#fff',
    padding: '0.75rem',
    marginTop: '0.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
  },
  imgWrapper: {
    position: 'relative',
    height: '320px',
  },
  cardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  badge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    color: '#f43f5e',
    fontSize: '0.75rem',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  cardContent: {
    padding: '1.2rem',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: '1.1rem',
    marginBottom: '0.8rem',
  },
  cardInfo: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginBottom: '0.4rem',
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #334155',
  },
  price: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#10b981',
  },
  buyBtn: {
    backgroundColor: '#e11d48',
    color: '#fff',
    padding: '0.5rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
};
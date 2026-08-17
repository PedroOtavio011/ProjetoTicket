import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { 
  Calendar, 
  MapPin, 
  PlusCircle, 
  Search, 
  DollarSign, 
  Clock, 
  Trash2, 
  Eye,
  Ban,
  Filter,
  X
} from 'lucide-react';

export default function Home() {
  const { usuario } = useContext(AuthContext);
  const navigate = useNavigate();

  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [filtroData, setFiltroData] = useState('');

  const [buscaTmdb, setBuscaTmdb] = useState('');
  const [titulo, setTitulo] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [local, setLocal] = useState('Cinema Elite - Sala 1');
  const [capacidade, setCapacidade] = useState('10');
  const [preco, setPreco] = useState('35');
  const [tipo, setTipo] = useState('COM_ASSENTO');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarEventos();
  }, []);

  const carregarEventos = async () => {
    try {
      setCarregando(true);
      const res = await api.get('/eventos');
      setEventos(res.data || []);
    } catch (err) {
      alert('Erro ao carregar lista de eventos.');
    } finally {
      setCarregando(false);
    }
  };

  const handleBuscarTmdb = async () => {
    if (!buscaTmdb) return alert('Digite o nome de um filme para buscar.');
    try {
      const res = await api.get(`/tmdb/buscar?query=${encodeURIComponent(buscaTmdb)}`);
      if (res.data && res.data.length > 0) {
        const filme = res.data[0];
        setTitulo(filme.title || filme.titulo);
        setImagemUrl(filme.poster_path ? `https://image.tmdb.org/t/p/w500${filme.poster_path}` : filme.imagem_url);
      } else {
        alert('Nenhum filme encontrado no TMDB.');
      }
    } catch (err) {
      alert('Erro ao buscar filme no TMDB.');
    }
  };

  const handleCriarEvento = async (e) => {
    e.preventDefault();
    if (!titulo || !dataEvento || !preco) {
      return alert('Preencha os campos obrigatórios!');
    }

    try {
      setSalvando(true);
      const payload = {
        titulo,
        imagemUrl,
        dataEvento,
        local,
        capacidade: Number(capacidade),
        preco: parseFloat(preco),
        tipo
      };

      await api.post('/eventos', payload);
      alert('Evento cadastrado com sucesso!');
      setMostrarForm(false);
      setTitulo('');
      setImagemUrl('');
      setDataEvento('');
      carregarEventos();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao cadastrar evento.');
    } finally {
      setSalvando(false);
    }
  };

  const handleEditarPreco = async (id, precoAtual) => {
    const novoPreco = prompt('Informe o novo preço do ingresso (R$):', precoAtual);
    if (novoPreco === null) return;
    
    const valorNum = parseFloat(novoPreco);
    if (isNaN(valorNum) || valorNum <= 0) {
      return alert('Valor inválido!');
    }

    try {
      await api.put(`/eventos/${id}/preco`, { preco: valorNum });
      alert('Preço atualizado com sucesso!');
      carregarEventos();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao atualizar preço.');
    }
  };

  const handleAdiarEvento = async (id) => {
    const novaData = prompt('Informe a nova data e hora (Formato: YYYY-MM-DDTHH:mm, ex: 2026-12-25T20:00):');
    if (!novaData) return;

    try {
      await api.put(`/eventos/${id}/adiar`, { novaData });
      alert('Data do evento alterada com sucesso!');
      carregarEventos();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao reagendar evento.');
    }
  };

  const handleCancelarEvento = async (id, tituloEvento) => {
    const confirmar = window.confirm(`Tem certeza que deseja marcar o evento "${tituloEvento}" como CANCELADO?`);
    if (!confirmar) return;

    try {
      await api.delete(`/eventos/${id}/cancelar`);
      alert('Evento cancelado com sucesso!');
      carregarEventos();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao cancelar evento.');
    }
  };

  const eventosFiltrados = eventos.filter((ev) => {
    const statusAtual = ev.status === 'CANCELADO' ? 'CANCELADO' : 'ATIVO';

    if (filtroStatus !== 'TODOS' && statusAtual !== filtroStatus) {
      return false;
    }

    if (filtroData) {
      const dataIso = new Date(ev.data_evento || ev.dataEvento).toISOString().split('T')[0];
      if (dataIso !== filtroData) {
        return false;
      }
    }

    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Sessões & Espetáculos em Destaque</h1>
        <p style={styles.heroSub}>
          Escolha seu evento, selecione seus assentos em tempo real e garanta seu ingresso QR Code.
        </p>

        {usuario && usuario.papel === 'ORGANIZADOR' && (
          <button 
            onClick={() => setMostrarForm(!mostrarForm)} 
            style={styles.btnToggleForm}
          >
            <PlusCircle size={18} />
            {mostrarForm ? 'Fechar Formulário' : 'Cadastrar Novo Evento'}
          </button>
        )}
      </div>

      {mostrarForm && usuario?.papel === 'ORGANIZADOR' && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>🎬 Cadastrar Nova Sessão</h3>
          
          <div style={styles.tmdbBox}>
            <input
              type="text"
              placeholder="Pesquisar filme no catálogo (TMDB)... ex: Batman"
              value={buscaTmdb}
              onChange={(e) => setBuscaTmdb(e.target.value)}
              style={styles.input}
            />
            <button type="button" onClick={handleBuscarTmdb} style={styles.btnTmdb}>
              <Search size={16} /> Buscar Filme
            </button>
          </div>

          <form onSubmit={handleCriarEvento} style={styles.formGrid}>
            <input
              type="text"
              placeholder="Título do Evento *"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="url"
              placeholder="URL da Imagem de Capa"
              value={imagemUrl}
              onChange={(e) => setImagemUrl(e.target.value)}
              style={styles.input}
            />
            <input
              type="datetime-local"
              value={dataEvento}
              onChange={(e) => setDataEvento(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Local"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              style={styles.input}
            />
            <input
              type="number"
              placeholder="Capacidade"
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              style={styles.input}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Preço (R$)"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              style={styles.input}
              required
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={styles.select}
            >
              <option value="COM_ASSENTO">Marcado (Com Assentos)</option>
              <option value="SEM_ASSENTO">Pista Livre (Sem Assento)</option>
            </select>

            <button type="submit" disabled={salvando} style={styles.btnSubmit}>
              {salvando ? 'Salvando...' : 'Salvar e Criar Sessão'}
            </button>
          </form>
        </div>
      )}

      <div style={styles.filterCard}>
        <div style={styles.filterTitle}>
          <Filter size={18} color="#38bdf8" />
          <span>Filtrar Sessões</span>
        </div>

        <div style={styles.filterControls}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status:</label>
            <select 
              value={filtroStatus} 
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="TODOS">Todos os Status</option>
              <option value="ATIVO">Somente Ativos</option>
              <option value="CANCELADO">Somente Cancelados</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Data do Evento:</label>
            <div style={styles.dateWrapper}>
              <input 
                type="date" 
                value={filtroData} 
                onChange={(e) => setFiltroData(e.target.value)}
                style={styles.filterInput}
              />
              {filtroData && (
                <button 
                  onClick={() => setFiltroData('')} 
                  style={styles.btnClearFilter}
                  title="Limpar Data"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {carregando ? (
        <p style={styles.loading}>Carregando catálogo de eventos...</p>
      ) : eventosFiltrados.length === 0 ? (
        <p style={styles.empty}>Nenhum evento encontrado para os filtros selecionados.</p>
      ) : (
        <div style={styles.grid}>
          {eventosFiltrados.map((ev) => {
            const isCancelado = ev.status === 'CANCELADO';

            return (
              <div 
                key={ev.id} 
                style={{
                  ...styles.card,
                  opacity: isCancelado ? 0.75 : 1,
                  filter: isCancelado ? 'grayscale(0.3)' : 'none'
                }}
              >
                <div style={styles.imageContainer}>
                  <img 
                    src={ev.imagem_url || ev.imagemUrl || 'https://via.placeholder.com/300x400?text=Sem+Capa'} 
                    alt={ev.titulo} 
                    style={styles.cardImage} 
                  />
                  
                  {isCancelado ? (
                    <span style={styles.badgeCancelado}>
                      <Ban size={12} /> CANCELADO
                    </span>
                  ) : (
                    <span style={styles.badge}>
                      {ev.tipo === 'COM_ASSENTO' ? 'Lugar Marcado' : 'Pista Livre'}
                    </span>
                  )}
                </div>

                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{ev.titulo}</h3>
                  
                  <p style={styles.cardInfo}>
                    <Calendar size={15} color="#e11d48" />
                    {new Date(ev.data_evento || ev.dataEvento).toLocaleString('pt-BR')}
                  </p>
                  
                  <p style={styles.cardInfo}>
                    <MapPin size={15} color="#e11d48" />
                    {ev.local}
                  </p>

                  <div style={styles.priceRow}>
                    <span style={styles.priceLabel}>Ingresso:</span>
                    <span style={{
                      ...styles.priceValue,
                      textDecoration: isCancelado ? 'line-through' : 'none',
                      color: isCancelado ? '#94a3b8' : '#10b981'
                    }}>
                      R$ {Number(ev.preco).toFixed(2)}
                    </span>
                  </div>

                  {isCancelado ? (
                    <button disabled style={styles.btnDisabled}>
                      <Ban size={16} /> Evento Cancelado
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(`/evento/${ev.id}`)}
                      style={styles.btnComprar}
                    >
                      <Eye size={16} /> Ver Assentos e Comprar
                    </button>
                  )}

                  {usuario && usuario.papel === 'ORGANIZADOR' && (
                    <div style={styles.organizadorBox}>
                      <span style={styles.organizadorTag}>Painel do Organizador</span>
                      <div style={styles.organizadorActions}>
                        <button 
                          onClick={() => handleEditarPreco(ev.id, ev.preco)}
                          disabled={isCancelado}
                          style={{
                            ...styles.btnActionEdit,
                            opacity: isCancelado ? 0.5 : 1,
                            cursor: isCancelado ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <DollarSign size={14} /> Editar Preço
                        </button>

                        <button 
                          onClick={() => handleAdiarEvento(ev.id)}
                          disabled={isCancelado}
                          style={{
                            ...styles.btnActionAdiar,
                            opacity: isCancelado ? 0.5 : 1,
                            cursor: isCancelado ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <Clock size={14} /> Adiar
                        </button>

                        <button 
                          onClick={() => handleCancelarEvento(ev.id, ev.titulo)}
                          disabled={isCancelado}
                          style={{
                            ...styles.btnActionDelete,
                            opacity: isCancelado ? 0.5 : 1,
                            cursor: isCancelado ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <Trash2 size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  heroTitle: {
    color: '#fff',
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  heroSub: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    marginBottom: '1.5rem',
  },
  btnToggleForm: {
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem 1.4rem',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  formCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2.5rem',
  },
  formTitle: {
    color: '#fff',
    fontSize: '1.2rem',
    marginBottom: '1rem',
  },
  tmdbBox: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  btnTmdb: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    whiteSpace: 'nowrap',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.8rem',
  },
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.7rem',
    color: '#fff',
    outline: 'none',
    fontSize: '0.9rem',
    width: '100%',
  },
  select: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.7rem',
    color: '#fff',
    outline: 'none',
    fontSize: '0.9rem',
  },
  btnSubmit: {
    gridColumn: '1 / -1',
    backgroundColor: '#e11d48',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.8rem',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  filterCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '1rem 1.2rem',
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  filterTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '0.95rem',
  },
  filterControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.2rem',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filterLabel: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
  },
  filterSelect: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.5rem 0.8rem',
    color: '#fff',
    outline: 'none',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  dateWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  filterInput: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.45rem 0.8rem',
    color: '#fff',
    outline: 'none',
    fontSize: '0.85rem',
  },
  btnClearFilter: {
    backgroundColor: '#334155',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.45rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '3rem 0',
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '3rem 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease',
  },
  imageContainer: {
    position: 'relative',
    height: '320px',
    backgroundColor: '#0f172a',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  badge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    color: '#38bdf8',
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    backdropFilter: 'blur(4px)',
  },
  badgeCancelado: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#ef4444',
    color: '#fff',
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
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
    fontWeight: 'bold',
    marginBottom: '0.8rem',
  },
  cardInfo: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginBottom: '0.4rem',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.8rem',
    marginBottom: '1rem',
    paddingTop: '0.6rem',
    borderTop: '1px solid #334155',
  },
  priceLabel: {
    color: '#94a3b8',
    fontSize: '0.85rem',
  },
  priceValue: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  btnComprar: {
    backgroundColor: '#e11d48',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  },
  btnDisabled: {
    backgroundColor: '#334155',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    cursor: 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  },
  organizadorBox: {
    marginTop: '1rem',
    paddingTop: '0.8rem',
    borderTop: '1px dashed #f59e0b55',
    backgroundColor: '#0f172a55',
    borderRadius: '8px',
    padding: '0.6rem',
  },
  organizadorTag: {
    color: '#f59e0b',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'block',
    marginBottom: '0.5rem',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  organizadorActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.4rem',
  },
  btnActionEdit: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    border: '1px solid #38bdf8',
    borderRadius: '6px',
    padding: '0.4rem 0.2rem',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.2rem',
  },
  btnActionAdiar: {
    backgroundColor: '#1e293b',
    color: '#f59e0b',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    padding: '0.4rem 0.2rem',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.2rem',
  },
  btnActionDelete: {
    backgroundColor: '#1e293b',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    padding: '0.4rem 0.2rem',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.2rem',
  },
};
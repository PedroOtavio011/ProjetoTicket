import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { 
  Calendar, 
  MapPin, 
  Ticket, 
  ArrowLeft, 
  Settings, 
  DollarSign, 
  Clock, 
  Trash2,
  Check
} from 'lucide-react';

export default function EventoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useContext(AuthContext);

  const [evento, setEvento] = useState(null);
  const [assentos, setAssentos] = useState([]);
  const [assentosSelecionados, setAssentosSelecionados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [comprando, setComprando] = useState(false);

  // Estados do Painel do Organizador
  const [novoPreco, setNovoPreco] = useState('');
  const [novaData, setNovaData] = useState('');
  const [salvandoPreco, setSalvandoPreco] = useState(false);
  const [reagendando, setReagendando] = useState(false);

  useEffect(() => {
    carregarDetalhes();
  }, [id]);

  const carregarDetalhes = async () => {
    try {
      setCarregando(true);
      
      // 1. Busca dados do evento
      const resEvento = await api.get(`/eventos/${id}`);
      const dadosEvento = resEvento.data;
      setEvento(dadosEvento);
      setNovoPreco(dadosEvento.preco || '');

      // 2. Busca assentos do evento (se for do tipo COM_ASSENTO)
      if (dadosEvento.tipo === 'COM_ASSENTO') {
        try {
          const resAssentos = await api.get(`/eventos/${id}/assentos`);
          setAssentos(resAssentos.data || []);
        } catch (errAssentos) {
          console.error('Erro ao carregar assentos:', errAssentos);
          setAssentos([]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar evento:', err);
      alert('Não foi possível carregar as informações do evento.');
    } finally {
      setCarregando(false);
    }
  };

  // Alternar seleção de assentos
  const toggleAssento = (assento) => {
    if (assento.status === 'OCUPADO') return;

    if (assentosSelecionados.some(a => a.id === assento.id)) {
      setAssentosSelecionados(assentosSelecionados.filter(a => a.id !== assento.id));
    } else {
      setAssentosSelecionados([...assentosSelecionados, assento]);
    }
  };

  // Finalizar Compra de Ingressos
  const handleFinalizarCompra = async () => {
    if (!usuario) {
      alert('Você precisa estar logado para realizar uma compra!');
      return navigate('/login');
    }

    if (evento.tipo === 'COM_ASSENTO' && assentosSelecionados.length === 0) {
      return alert('Selecione ao menos um assento antes de continuar.');
    }

    try {
      setComprando(true);

      const payload = {
        eventoId: id,
        assentosIds: assentosSelecionados.map(a => a.id)
      };

      await api.post('/pedidos', payload);
      alert('🎉 Compra realizada com sucesso! Seu QR Code foi gerado.');
      navigate('/meus-ingressos');
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao processar compra.');
    } finally {
      setComprando(false);
    }
  };

  // ==========================================
  // FUNÇÕES EXCLUSIVAS DO ORGANIZADOR
  // ==========================================
  
  // 1. Alterar Preço
  const handleSalvarPreco = async () => {
    if (!novoPreco || parseFloat(novoPreco) <= 0) {
      return alert('Informe um preço válido.');
    }
    try {
      setSalvandoPreco(true);
      await api.put(`/eventos/${id}/preco`, { preco: parseFloat(novoPreco) });
      alert('✅ Preço do evento atualizado com sucesso!');
      carregarDetalhes();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao atualizar o preço.');
    } finally {
      setSalvandoPreco(false);
    }
  };

  // 2. Adiar / Reagendar Evento
  const handleAdiarEvento = async () => {
    if (!novaData) {
      return alert('Selecione a nova data e horário do evento.');
    }
    try {
      setReagendando(true);
      await api.put(`/eventos/${id}/adiar`, { novaData });
      alert('✅ Data do evento alterada com sucesso!');
      setNovaData('');
      carregarDetalhes();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao reagendar evento.');
    } finally {
      setReagendando(false);
    }
  };

  // 3. Cancelar Evento
  const handleCancelarEvento = async () => {
    const confirmacao = window.confirm(
      '⚠️ ATENÇÃO: Tem certeza que deseja CANCELAR e REMOVER este evento?\nEsta ação não poderá ser desfeita!'
    );

    if (confirmacao) {
      try {
        await api.delete(`/eventos/${id}/cancelar`);
        alert('⛔ Evento cancelado e removido do catálogo.');
        navigate('/');
      } catch (err) {
        alert(err.response?.data?.mensagem || 'Erro ao cancelar o evento.');
      }
    }
  };

  if (carregando) return <div style={{ color: '#fff', textAlign: 'center', padding: '4rem' }}>Carregando sessão...</div>;
  if (!evento) return <div style={{ color: '#fff', textAlign: 'center', padding: '4rem' }}>Evento não encontrado.</div>;

  const total = assentosSelecionados.length * Number(evento.preco);

  return (
    <div style={styles.container}>
      {/* Botão Voltar */}
      <button onClick={() => navigate('/')} style={styles.backBtn}>
        <ArrowLeft size={18} /> Voltar para o Catálogo
      </button>

      <div style={styles.content}>
        {/* Lado Esquerdo: Banner + Informações + Painel do Organizador */}
        <div style={styles.leftColumn}>
          <div style={styles.posterSection}>
            <img src={evento.imagem_url || evento.imagemUrl} alt={evento.titulo} style={styles.poster} />
            <h2 style={styles.title}>{evento.titulo}</h2>
            <p style={styles.info}>
              <Calendar size={16} color="#e11d48" /> 
              {new Date(evento.data_evento || evento.dataEvento).toLocaleString('pt-BR')}
            </p>
            <p style={styles.info}>
              <MapPin size={16} color="#e11d48" /> {evento.local}
            </p>
            <p style={styles.description}>{evento.descricao}</p>
          </div>

          {/* ⚙️ PAINEL DO ORGANIZADOR */}
          {usuario && usuario.papel === 'ORGANIZADOR' && (
            <div style={styles.painelOrganizador}>
              <div style={styles.painelHeader}>
                <Settings size={20} color="#f59e0b" />
                <h3 style={styles.painelTitle}>Gestão do Evento (Organizador)</h3>
              </div>

              {/* Editar Preço */}
              <div style={styles.controlBox}>
                <label style={styles.controlLabel}><DollarSign size={15} /> Editar Preço do Ingresso (R$)</label>
                <div style={styles.inputGroup}>
                  <input
                    type="number"
                    step="0.01"
                    value={novoPreco}
                    onChange={(e) => setNovoPreco(e.target.value)}
                    style={styles.inputControl}
                    placeholder="Ex: 35.00"
                  />
                  <button onClick={handleSalvarPreco} disabled={salvandoPreco} style={styles.btnSalvar}>
                    <Check size={16} /> {salvandoPreco ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>

              {/* Adiar / Reagendar */}
              <div style={styles.controlBox}>
                <label style={styles.controlLabel}><Clock size={15} /> Reagendar / Adiar Data</label>
                <div style={styles.inputGroup}>
                  <input
                    type="datetime-local"
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    style={styles.inputControl}
                  />
                  <button onClick={handleAdiarEvento} disabled={reagendando} style={styles.btnSalvar}>
                    <Check size={16} /> {reagendando ? 'Alterando...' : 'Reagendar'}
                  </button>
                </div>
              </div>

              {/* Cancelar Evento */}
              <div style={{ ...styles.controlBox, marginBottom: 0 }}>
                <label style={styles.controlLabel}>Ação Crítica</label>
                <button onClick={handleCancelarEvento} style={styles.btnCancelarEvento}>
                  <Trash2 size={16} /> Cancelar este Evento
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lado Direito: Mapa de Assentos / Checkout */}
        <div style={styles.seatsSection}>
          <h3 style={styles.subTitle}>
            {evento.tipo === 'COM_ASSENTO' ? '🍿 Selecione seus Assentos' : '🎟️ Garanta seu Ingresso'}
          </h3>

          {evento.tipo === 'COM_ASSENTO' ? (
            <>
              {/* Tela do Cinema */}
              <div style={styles.screenWrapper}>
                <div style={styles.screen}>TELA / PALCO</div>
              </div>

              {/* Legenda */}
              <div style={styles.legend}>
                <div style={styles.legendItem}><span style={{ ...styles.seatBox, backgroundColor: '#334155' }}></span> Livre</div>
                <div style={styles.legendItem}><span style={{ ...styles.seatBox, backgroundColor: '#10b981' }}></span> Selecionado</div>
                <div style={styles.legendItem}><span style={{ ...styles.seatBox, backgroundColor: '#ef4444' }}></span> Ocupado</div>
              </div>

              {/* Grid de Assentos */}
              {assentos.length === 0 ? (
                <div style={styles.emptySeatsAlert}>
                  Nenhum assento cadastrado para este evento.
                </div>
              ) : (
                <div style={styles.gridAssentos}>
                  {assentos.map((a) => {
                    const estaSelecionado = assentosSelecionados.some(s => s.id === a.id);
                    const estaOcupado = a.status === 'OCUPADO';

                    let bg = '#334155'; // Livre
                    if (estaOcupado) bg = '#ef4444'; // Ocupado
                    if (estaSelecionado) bg = '#10b981'; // Selecionado

                    return (
                      <button
                        key={a.id}
                        disabled={estaOcupado}
                        onClick={() => toggleAssento(a)}
                        style={{
                          ...styles.seatBtn,
                          backgroundColor: bg,
                          cursor: estaOcupado ? 'not-allowed' : 'pointer',
                          opacity: estaOcupado ? 0.5 : 1
                        }}
                      >
                        {a.codigo_assento || a.numero}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>
              Esta sessão possui entrada por ordem de chegada (Pista Livre).
            </p>
          )}

          {/* Resumo e Botão de Compra */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryRow}>
              <span>Qtd. Ingressos:</span>
              <strong>{evento.tipo === 'COM_ASSENTO' ? assentosSelecionados.length : 1}</strong>
            </div>
            {evento.tipo === 'COM_ASSENTO' && assentosSelecionados.length > 0 && (
              <div style={styles.summaryRow}>
                <span>Assentos:</span>
                <strong>{assentosSelecionados.map(a => a.codigo_assento || a.numero).join(', ')}</strong>
              </div>
            )}
            <div style={styles.summaryRow}>
              <span>Valor Total:</span>
              <strong style={{ fontSize: '1.4rem', color: '#10b981' }}>
                R$ {evento.tipo === 'COM_ASSENTO' ? total.toFixed(2) : Number(evento.preco).toFixed(2)}
              </strong>
            </div>

            <button
              onClick={handleFinalizarCompra}
              disabled={comprando || (evento.tipo === 'COM_ASSENTO' && assentos.length === 0)}
              style={{
                ...styles.checkoutBtn,
                opacity: (evento.tipo === 'COM_ASSENTO' && assentos.length === 0) ? 0.5 : 1
              }}
            >
              <Ticket size={18} /> {comprando ? 'Processando...' : 'Confirmar e Gerar QR Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem 1rem',
  },
  backBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2rem',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  posterSection: {
    backgroundColor: '#1e293b',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  poster: {
    width: '100%',
    maxHeight: '400px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  title: {
    color: '#fff',
    fontSize: '1.5rem',
    marginBottom: '0.8rem',
  },
  info: {
    color: '#cbd5e1',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    marginBottom: '0.4rem',
  },
  description: {
    color: '#94a3b8',
    marginTop: '1rem',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  painelOrganizador: {
    backgroundColor: '#0f172a',
    border: '1px solid #f59e0b55',
    borderRadius: '12px',
    padding: '1.2rem',
  },
  painelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '1.2rem',
    borderBottom: '1px solid #334155',
    paddingBottom: '0.6rem',
  },
  painelTitle: {
    color: '#f59e0b',
    fontSize: '1.05rem',
    fontWeight: 'bold',
  },
  controlBox: {
    marginBottom: '1rem',
  },
  controlLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: '#cbd5e1',
    fontSize: '0.85rem',
    marginBottom: '0.4rem',
  },
  inputGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  inputControl: {
    flex: 1,
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
  },
  btnSalvar: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.6rem 1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.85rem',
  },
  btnCancelarEvento: {
    width: '100%',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.7rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
  },
  seatsSection: {
    backgroundColor: '#1e293b',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
  },
  subTitle: {
    color: '#fff',
    fontSize: '1.2rem',
    marginBottom: '1.5rem',
  },
  screenWrapper: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  screen: {
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    padding: '0.3rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '0.8rem',
    boxShadow: '0 0 15px rgba(56, 189, 248, 0.5)',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  legendItem: {
    color: '#cbd5e1',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  seatBox: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    display: 'inline-block',
  },
  emptySeatsAlert: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '1.5rem',
    border: '1px dashed #334155',
    borderRadius: '8px',
    marginBottom: '1.5rem',
  },
  gridAssentos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.6rem',
    marginBottom: '2rem',
  },
  seatBtn: {
    padding: '0.6rem 0',
    borderRadius: '6px',
    border: 'none',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  summaryCard: {
    backgroundColor: '#0f172a',
    padding: '1.2rem',
    borderRadius: '8px',
    marginTop: 'auto',
    border: '1px solid #334155',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#cbd5e1',
    marginBottom: '0.6rem',
    fontSize: '0.95rem',
  },
  checkoutBtn: {
    width: '100%',
    backgroundColor: '#e11d48',
    color: '#fff',
    padding: '0.8rem',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
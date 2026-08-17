import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  Ticket, 
  Plus, 
  Minus, 
  Ban, 
  Check, 
  Settings,
  ShoppingBag
} from 'lucide-react';

export default function DetalhesEvento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useContext(AuthContext);

  const [evento, setEvento] = useState(null);
  const [assentos, setAssentos] = useState([]);
  const [assentosSelecionados, setAssentosSelecionados] = useState([]);
  const [quantidade, setQuantidade] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);

  // Estados para o Painel do Organizador
  const [novoPrecoInput, setNovoPrecoInput] = useState('');
  const [novaDataInput, setNovaDataInput] = useState('');
  const [salvandoOrganizador, setSalvandoOrganizador] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const resEvento = await api.get(`/eventos/${id}`);
      const dadosEvento = resEvento.data;
      setEvento(dadosEvento);
      setNovoPrecoInput(dadosEvento.preco || '');

      // Se o evento for de assentos numerados, carrega os assentos
      if (dadosEvento.tipo === 'COM_ASSENTO') {
        const resAssentos = await api.get(`/eventos/${id}/assentos`);
        setAssentos(resAssentos.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar evento:', err);
      alert('Erro ao carregar detalhes do evento.');
    } finally {
      setCarregando(false);
    }
  };

  // Alterna seleção de assentos numerados
  const handleToggleAssento = (assento) => {
    if (assento.status === 'OCUPADO' || assento.status === 'RESERVADO') return;

    const jaSelecionado = assentosSelecionados.some((a) => a.id === assento.id);
    if (jaSelecionado) {
      setAssentosSelecionados(assentosSelecionados.filter((a) => a.id !== assento.id));
    } else {
      setAssentosSelecionados([...assentosSelecionados, assento]);
    }
  };

  // Ações de Gestão do Organizador
  const handleSalvarPreco = async () => {
    const valorNum = parseFloat(novoPrecoInput);
    if (isNaN(valorNum) || valorNum <= 0) {
      return alert('Informe um preço válido!');
    }

    try {
      setSalvandoOrganizador(true);
      await api.put(`/eventos/${id}/preco`, { preco: valorNum });
      alert('Preço atualizado com sucesso!');
      carregarDados();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao atualizar preço.');
    } finally {
      setSalvandoOrganizador(false);
    }
  };

  const handleReagendarData = async () => {
    if (!novaDataInput) return alert('Selecione uma nova data e hora.');

    try {
      setSalvandoOrganizador(true);
      await api.put(`/eventos/${id}/adiar`, { novaData: novaDataInput });
      alert('Data alterada com sucesso!');
      carregarDados();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao reagendar data.');
    } finally {
      setSalvandoOrganizador(false);
    }
  };

  // Processa a Compra (Pista Livre ou Assentos)
  const handleComprar = async () => {
    if (!usuario) {
      alert('Você precisa estar logado para comprar ingressos.');
      return navigate('/login');
    }

    if (evento.status === 'CANCELADO') {
      return alert('Este evento foi cancelado e não está aceitando novas compras.');
    }

    try {
      setProcessando(true);
      const payload = { eventoId: evento.id };

      if (evento.tipo === 'COM_ASSENTO') {
        if (assentosSelecionados.length === 0) {
          return alert('Selecione ao menos um assento.');
        }
        payload.assentosIds = assentosSelecionados.map((a) => a.id);
        payload.quantidade = assentosSelecionados.length;
      } else {
        payload.quantidade = quantidade;
      }

      await api.post('/pedidos', payload);
      alert('Ingresso(s) garantido(s) com sucesso!');
      navigate('/meus-ingressos');
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao processar compra.');
    } finally {
      setProcessando(false);
    }
  };

  if (carregando) {
    return (
      <div style={styles.centered}>
        <p style={styles.loadingText}>Carregando detalhes do evento...</p>
      </div>
    );
  }

  if (!evento) {
    return (
      <div style={styles.centered}>
        <p style={styles.loadingText}>Evento não encontrado.</p>
        <button onClick={() => navigate('/')} style={styles.btnVoltar}>
          Voltar para o Catálogo
        </button>
      </div>
    );
  }

  const isCancelado = evento.status === 'CANCELADO';
  const isOrganizador = usuario?.papel === 'ORGANIZADOR';
  const valorUnitario = Number(evento.preco) || 0;
  const qtdTotal = evento.tipo === 'COM_ASSENTO' ? assentosSelecionados.length : quantidade;
  const valorTotal = (valorUnitario * qtdTotal).toFixed(2);

  return (
    <div style={styles.container}>
      {/* Botão de Voltar */}
      <button onClick={() => navigate('/')} style={styles.btnVoltar}>
        <ArrowLeft size={16} /> Voltar para o Catálogo
      </button>

      <div style={styles.grid}>
        {/* LADO ESQUERDO: DETALHES DO EVENTO & PAINEL DO ORGANIZADOR */}
        <div style={styles.colEsquerda}>
          {/* Card Principal do Evento */}
          <div style={styles.cardEvento}>
            <div style={styles.imageBox}>
              <img 
                src={evento.imagem_url || evento.imagemUrl || 'https://via.placeholder.com/500x500?text=Sem+Capa'} 
                alt={evento.titulo} 
                style={styles.image}
              />
              {isCancelado && (
                <div style={styles.badgeCancelado}>
                  <Ban size={14} /> EVENTO CANCELADO
                </div>
              )}
            </div>

            <div style={styles.cardInfo}>
              <h1 style={styles.titulo}>{evento.titulo}</h1>
              
              <div style={styles.infoRow}>
                <Calendar size={18} color="#e11d48" />
                <span>{new Date(evento.data_evento || evento.dataEvento).toLocaleString('pt-BR')}</span>
              </div>

              <div style={styles.infoRow}>
                <MapPin size={18} color="#e11d48" />
                <span>{evento.local}</span>
              </div>
            </div>
          </div>

          {/* Painel de Gestão do Organizador */}
          {isOrganizador && (
            <div style={styles.cardOrganizador}>
              <div style={styles.organizadorHeader}>
                <Settings size={18} color="#f59e0b" />
                <h3 style={styles.organizadorTitle}>Gestão do Evento (Organizador)</h3>
              </div>

              {/* Editar Preço */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <DollarSign size={14} color="#38bdf8" /> Editar Preço do Ingresso (R$)
                </label>
                <div style={styles.inputGroup}>
                  <input
                    type="number"
                    step="0.01"
                    value={novoPrecoInput}
                    onChange={(e) => setNovoPrecoInput(e.target.value)}
                    style={styles.input}
                    disabled={isCancelado || salvandoOrganizador}
                  />
                  <button 
                    onClick={handleSalvarPreco}
                    disabled={isCancelado || salvandoOrganizador}
                    style={styles.btnOrganizadorSave}
                  >
                    <Check size={16} /> Salvar
                  </button>
                </div>
              </div>

              {/* Reagendar / Adiar Data */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <Clock size={14} color="#f59e0b" /> Reagendar / Adiar Data
                </label>
                <div style={styles.inputGroup}>
                  <input
                    type="datetime-local"
                    value={novaDataInput}
                    onChange={(e) => setNovaDataInput(e.target.value)}
                    style={styles.input}
                    disabled={isCancelado || salvandoOrganizador}
                  />
                  <button 
                    onClick={handleReagendarData}
                    disabled={isCancelado || salvandoOrganizador}
                    style={styles.btnOrganizadorReagendar}
                  >
                    Reagendar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LADO DIREITO: COMPRA / SELEÇÃO (PISTA OU ASSENTOS) */}
        <div style={styles.cardCompra}>
          <h2 style={styles.sectionTitle}>
            <Ticket size={22} color="#e11d48" /> Garanta seu Ingresso
          </h2>

          {isCancelado ? (
            <div style={styles.bannerCanceladoBox}>
              <Ban size={32} color="#ef4444" />
              <h3>Vendas Encerradas</h3>
              <p>Este evento foi marcado como cancelado pelo organizador.</p>
            </div>
          ) : evento.tipo === 'SEM_ASSENTO' ? (
            /* CONTEÚDO PARA PISTA LIVRE */
            <div style={styles.pistaContainer}>
              <div style={styles.pistaBanner}>
                <div style={styles.pistaIconBox}>🎫</div>
                <div>
                  <h4 style={styles.pistaBannerTitle}>Setor: Pista Livre / Geral</h4>
                  <p style={styles.pistaBannerSub}>
                    Esta sessão possui entrada por ordem de chegada (Pista Livre).
                  </p>
                </div>
              </div>

              {/* Seletor de Quantidade */}
              <div style={styles.qtdBox}>
                <span style={styles.qtdLabel}>Quantidade de Ingressos:</span>
                <div style={styles.counterGroup}>
                  <button 
                    type="button"
                    onClick={() => setQuantidade((prev) => Math.max(1, prev - 1))}
                    style={styles.btnCounter}
                  >
                    <Minus size={16} />
                  </button>
                  <span style={styles.qtdValue}>{quantidade}</span>
                  <button 
                    type="button"
                    onClick={() => setQuantidade((prev) => Math.min(10, prev + 1))}
                    style={styles.btnCounter}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Resumo e Valor Total */}
              <div style={styles.resumoBox}>
                <div style={styles.resumoRow}>
                  <span>Preço Unitário:</span>
                  <span>R$ {valorUnitario.toFixed(2)}</span>
                </div>
                <div style={styles.resumoRowTotal}>
                  <span>Valor Total:</span>
                  <span style={styles.totalValue}>R$ {valorTotal}</span>
                </div>
              </div>

              {/* Botão de Finalizar */}
              <button 
                onClick={handleComprar}
                disabled={processando}
                style={styles.btnComprar}
              >
                <ShoppingBag size={18} />
                {processando ? 'Processando...' : `Garantir ${quantidade} Ingresso(s) • R$ ${valorTotal}`}
              </button>
            </div>
          ) : (
            /* CONTEÚDO PARA ASSENTOS MARCADOS */
            <div style={styles.assentosContainer}>
              <p style={styles.subtext}>Selecione seus assentos no mapa abaixo:</p>

              {/* Legenda dos Assentos */}
              <div style={styles.legenda}>
                <div style={styles.itemLegenda}>
                  <div style={{ ...styles.boxLegenda, backgroundColor: '#334155' }} />
                  <span>Livre</span>
                </div>
                <div style={styles.itemLegenda}>
                  <div style={{ ...styles.boxLegenda, backgroundColor: '#10b981' }} />
                  <span>Selecionado</span>
                </div>
                <div style={styles.itemLegenda}>
                  <div style={{ ...styles.boxLegenda, backgroundColor: '#ef4444' }} />
                  <span>Ocupado</span>
                </div>
              </div>

              {/* Grid de Assentos */}
              <div style={styles.gridAssentos}>
                {assentos.map((a) => {
                  const isSelecionado = assentosSelecionados.some((item) => item.id === a.id);
                  const isOcupado = a.status === 'OCUPADO' || a.status === 'RESERVADO';

                  let bg = '#334155';
                  if (isOcupado) bg = '#ef4444';
                  else if (isSelecionado) bg = '#10b981';

                  return (
                    <button
                      key={a.id}
                      disabled={isOcupado}
                      onClick={() => handleToggleAssento(a)}
                      style={{
                        ...styles.btnAssento,
                        backgroundColor: bg,
                        cursor: isOcupado ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {a.numero || a.codigo}
                    </button>
                  );
                })}
              </div>

              {/* Resumo dos Assentos */}
              <div style={styles.resumoBox}>
                <div style={styles.resumoRow}>
                  <span>Qtd. Assentos Selecionados:</span>
                  <span>{assentosSelecionados.length}</span>
                </div>
                <div style={styles.resumoRowTotal}>
                  <span>Valor Total:</span>
                  <span style={styles.totalValue}>R$ {valorTotal}</span>
                </div>
              </div>

              {/* Botão de Finalizar */}
              <button 
                onClick={handleComprar}
                disabled={processando || assentosSelecionados.length === 0}
                style={{
                  ...styles.btnComprar,
                  opacity: assentosSelecionados.length === 0 ? 0.6 : 1,
                  cursor: assentosSelecionados.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <ShoppingBag size={18} />
                {processando ? 'Processando...' : `Confirmar Assentos • R$ ${valorTotal}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem',
    color: '#fff',
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: '1.1rem',
  },
  btnVoltar: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginBottom: '1.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '2rem',
    alignItems: 'start',
  },
  colEsquerda: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  cardEvento: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  imageBox: {
    position: 'relative',
    width: '100%',
    maxHeight: '400px',
    backgroundColor: '#0f172a',
  },
  image: {
    width: '100%',
    height: '100%',
    maxHeight: '400px',
    objectFit: 'cover',
  },
  badgeCancelado: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: '#ef4444',
    color: '#fff',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  cardInfo: {
    padding: '1.5rem',
  },
  titulo: {
    fontSize: '1.6rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: '#fff',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    color: '#cbd5e1',
    fontSize: '0.95rem',
    marginBottom: '0.6rem',
  },
  cardOrganizador: {
    backgroundColor: '#1e293b',
    border: '1px solid #f59e0b55',
    borderRadius: '12px',
    padding: '1.2rem',
  },
  organizadorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    borderBottom: '1px solid #334155',
    paddingBottom: '0.6rem',
  },
  organizadorTitle: {
    color: '#f59e0b',
    fontSize: '1rem',
    fontWeight: 'bold',
    margin: 0,
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
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
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.6rem',
    color: '#fff',
    fontSize: '0.9rem',
    width: '100%',
    outline: 'none',
  },
  btnOrganizadorSave: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0 1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    whiteSpace: 'nowrap',
  },
  btnOrganizadorReagendar: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0 1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  cardCompra: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    marginBottom: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#fff',
  },
  bannerCanceladoBox: {
    textAlign: 'center',
    padding: '2.5rem 1rem',
    backgroundColor: '#0f172a',
    borderRadius: '10px',
    border: '1px solid #ef444455',
    color: '#cbd5e1',
  },
  pistaContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  pistaBanner: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  pistaIconBox: {
    fontSize: '1.8rem',
    backgroundColor: '#1e293b',
    padding: '0.5rem',
    borderRadius: '8px',
  },
  pistaBannerTitle: {
    color: '#fff',
    margin: '0 0 0.2rem 0',
    fontSize: '0.95rem',
    fontWeight: 'bold',
  },
  pistaBannerSub: {
    color: '#94a3b8',
    margin: 0,
    fontSize: '0.85rem',
  },
  qtdBox: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtdLabel: {
    color: '#cbd5e1',
    fontWeight: '500',
    fontSize: '0.9rem',
  },
  counterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  btnCounter: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtdValue: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    minWidth: '20px',
    textAlign: 'center',
  },
  resumoBox: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  resumoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
  resumoRowTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '1rem',
    borderTop: '1px solid #334155',
    paddingTop: '0.6rem',
  },
  totalValue: {
    color: '#10b981',
    fontSize: '1.3rem',
  },
  btnComprar: {
    backgroundColor: '#e11d48',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.9rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  assentosContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  subtext: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    margin: 0,
  },
  legenda: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: '0.6rem',
    borderRadius: '8px',
  },
  itemLegenda: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.8rem',
    color: '#cbd5e1',
  },
  boxLegenda: {
    width: '14px',
    height: '14px',
    borderRadius: '3px',
  },
  gridAssentos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(45px, 1fr))',
    gap: '0.5rem',
    maxHeight: '280px',
    overflowY: 'auto',
    padding: '0.5rem',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  btnAssento: {
    height: '42px',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
};
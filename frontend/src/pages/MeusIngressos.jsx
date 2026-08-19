import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Calendar, 
  MapPin, 
  Ticket, 
  ArrowLeft, 
  CheckCircle2, 
  Share2, 
  Check, 
  Download, 
  Link as LinkIcon,
  ShieldCheck,
  Loader2
} from 'lucide-react';

export default function MeusIngressos() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [copiadoId, setCopiadoId] = useState(null);
  const [gerandoLink, setGerandoLink] = useState(null);
  
  // Estado para o formulário de resgate
  const [linkInput, setLinkInput] = useState('');
  const [processandoResgate, setProcessandoResgate] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    carregarMeusIngressos();
  }, []);

  const carregarMeusIngressos = async () => {
    try {
      setCarregando(true);
      const res = await api.get('/pedidos');
      setPedidos(res.data || []);
    } catch (err) {
      console.error('Erro ao buscar ingressos:', err);
    } finally {
      setCarregando(false);
    }
  };

  // 🛡️ Solicita ao backend um token dinâmico e temporário (Válido por 24h)
  const handleCompartilhar = async (ticketId) => {
    try {
      setGerandoLink(ticketId);

      // Requisita token seguro de uso único
      const res = await api.post('/pedidos/gerar-link-transferencia', { ticketId });
      const { tokenTransferencia } = res.data;

      const linkDinamico = `${window.location.origin}/ingresso/resgatar/${tokenTransferencia}`;

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(linkDinamico);
      } else {
        const input = document.createElement('input');
        input.value = linkDinamico;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }

      setCopiadoId(ticketId);
      setTimeout(() => setCopiadoId(null), 4000);

    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao gerar link de transferência.';
      alert(`❌ ${msg}`);
    } finally {
      setGerandoLink(null);
    }
  };

  // 📥 Resgatar/Transferir ingresso
  const handleResgatarIngresso = async (e) => {
    e.preventDefault();
    if (!linkInput.trim()) {
      return alert('Por favor, cole o link ou o código de transferência.');
    }

    try {
      setProcessandoResgate(true);

      const codigoLimpo = linkInput.trim().split('/').pop();

      const res = await api.post('/pedidos/transferir', { 
        codigo: codigoLimpo 
      });

      alert(res.data.mensagem || '🎉 Ingresso resgatado com sucesso!');
      setLinkInput('');
      carregarMeusIngressos();

    } catch (err) {
      const msgErro = err.response?.data?.mensagem || 'Erro ao resgatar o ingresso.';
      alert(`❌ FALHA: ${msgErro}`);
    } finally {
      setProcessandoResgate(false);
    }
  };

  if (carregando) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: '#94a3b8' }}>Carregando seus ingressos seguros...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Cabeçalho */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🎟️ Meus Ingressos</h1>
          <p style={styles.subtitle}>
            Apresente na entrada do evento ou envie um link de transferência seguro de uso único.
          </p>
        </div>
        <button onClick={() => navigate('/')} style={styles.backBtn}>
          <ArrowLeft size={18} /> Explorar mais eventos
        </button>
      </div>

      {/* Painel de Resgate */}
      <div style={styles.resgateCard}>
        <div style={styles.resgateHeader}>
          <LinkIcon size={20} color="#38bdf8" />
          <h3 style={styles.resgateTitle}>Resgatar Ingresso Recebido</h3>
        </div>
        <p style={styles.resgateSub}>
          Recebeu um link de transferência? Cole-o abaixo para mover o ingresso para sua conta de forma segura:
        </p>

        <form onSubmit={handleResgatarIngresso} style={styles.resgateForm}>
          <input
            type="text"
            placeholder="Cole o link ou token de transferência aqui..."
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            style={styles.resgateInput}
          />
          <button 
            type="submit" 
            disabled={processandoResgate} 
            style={styles.btnResgatar}
          >
            <Download size={16} />
            {processandoResgate ? 'Processando...' : 'Resgatar Ingresso'}
          </button>
        </form>
      </div>

      {/* Lista de Ingressos */}
      {pedidos.length === 0 ? (
        <div style={styles.emptyState}>
          <Ticket size={56} color="#94a3b8" />
          <h3 style={{ color: '#fff', marginTop: '1rem', fontSize: '1.2rem' }}>
            Você ainda não possui ingressos nesta conta.
          </h3>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Garanta seu lugar nos próximos eventos ou resgate um ingresso recebido no campo acima!
          </p>
          <button onClick={() => navigate('/')} style={styles.catalogBtn}>
            Ver Programação
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {pedidos.map((p) => {
            const codigoIdentificador = p.qr_code_hash || p.qr_code || p.id;
            
            // Usando API externa apenas como fallback visual sem vazar dados críticos do usuário
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(codigoIdentificador)}`;
            const isCopiado = copiadoId === p.id;
            const isGerando = gerandoLink === p.id;

            return (
              <div key={p.id} style={styles.ticketCard}>
                {/* Badge de Status Seguro */}
                <div style={styles.statusBadge}>
                  <ShieldCheck size={14} color="#10b981" />
                  <span>{p.status || 'TICKET VALIDADE OK'}</span>
                </div>

                <div style={styles.cardContent}>
                  {/* Detalhes do Evento */}
                  <div style={styles.infoCol}>
                    <h2 style={styles.eventoTitulo}>{p.titulo || 'Sessão do Evento'}</h2>
                    
                    <p style={styles.infoText}>
                      <Calendar size={16} color="#e11d48" /> 
                      <span>
                        {p.data_evento 
                          ? new Date(p.data_evento).toLocaleString('pt-BR') 
                          : 'Data a confirmar'}
                      </span>
                    </p>
                    
                    <p style={styles.infoText}>
                      <MapPin size={16} color="#e11d48" /> 
                      <span>{p.local || 'Local não informado'}</span>
                    </p>

                    {p.assentos && (
                      <div style={styles.assentosBox}>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Assento(s) / Setor:</span>
                        <strong style={{ color: '#38bdf8', fontSize: '0.95rem', marginLeft: '0.4rem' }}>
                          {Array.isArray(p.assentos) ? p.assentos.join(', ') : p.assentos}
                        </strong>
                      </div>
                    )}

                    <div style={styles.priceRow}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Valor:</span>
                      <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>
                        R$ {Number(p.valor_total || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* QR Code de Entrada & Botão Seguro */}
                  <div style={styles.qrCol}>
                    <div style={styles.qrWrapper}>
                      <img src={qrUrl} alt="QR Code Ingresso" style={styles.qrImage} />
                    </div>
                    <span style={styles.qrCodeText}>
                      HASH: {String(codigoIdentificador).substring(0, 12).toUpperCase()}
                    </span>

                    <button
                      onClick={() => handleCompartilhar(p.id)}
                      disabled={isGerando}
                      style={isCopiado ? styles.btnShareSuccess : styles.btnShare}
                    >
                      {isGerando ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Gerando Link Seguro...
                        </>
                      ) : isCopiado ? (
                        <>
                          <Check size={16} /> Link Seguro Copiado! (24h)
                        </>
                      ) : (
                        <>
                          <Share2 size={16} /> Gerar Link de Transferência
                        </>
                      )}
                    </button>
                  </div>
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
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem 1rem',
    color: '#fff',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: '1rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #1e293b',
    borderTop: '4px solid #38bdf8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  title: {
    color: '#fff',
    fontSize: '1.8rem',
    margin: 0,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    marginTop: '0.3rem',
  },
  backBtn: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    border: '1px solid #334155',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  resgateCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #0284c755',
    borderRadius: '12px',
    padding: '1.2rem 1.5rem',
    marginBottom: '2rem',
  },
  resgateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.4rem',
  },
  resgateTitle: {
    color: '#38bdf8',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    margin: 0,
  },
  resgateSub: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  resgateForm: {
    display: 'flex',
    gap: '0.8rem',
    flexWrap: 'wrap',
  },
  resgateInput: {
    flex: 1,
    minWidth: '260px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.7rem 1rem',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
  },
  btnResgatar: {
    backgroundColor: '#0284c7',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem 1.2rem',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  emptyState: {
    backgroundColor: '#1e293b',
    padding: '4rem 2rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    textAlign: 'center',
  },
  catalogBtn: {
    backgroundColor: '#e11d48',
    color: '#fff',
    border: 'none',
    padding: '0.8rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  ticketCard: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '1px solid #334155',
    padding: '1.5rem',
    position: 'relative',
    overflow: 'hidden',
  },
  statusBadge: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    border: '1px solid #10b981',
    padding: '0.25rem 0.7rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  cardContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.5rem',
    alignItems: 'center',
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  eventoTitulo: {
    color: '#fff',
    fontSize: '1.4rem',
    margin: '0 0 0.4rem 0',
    paddingRight: '6rem',
  },
  infoText: {
    color: '#cbd5e1',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    margin: 0,
  },
  assentosBox: {
    marginTop: '0.4rem',
    backgroundColor: '#0f172a',
    padding: '0.5rem 0.8rem',
    borderRadius: '6px',
    display: 'inline-block',
    border: '1px solid #334155',
    alignSelf: 'flex-start',
  },
  priceRow: {
    marginTop: '0.4rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  qrCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: '1.2rem',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  qrWrapper: {
    backgroundColor: '#fff',
    padding: '0.6rem',
    borderRadius: '10px',
  },
  qrImage: {
    width: '140px',
    height: '140px',
    display: 'block',
  },
  qrCodeText: {
    color: '#94a3b8',
    fontSize: '0.75rem',
    marginTop: '0.6rem',
    marginBottom: '0.8rem',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
  },
  btnShare: {
    backgroundColor: '#0284c7',
    color: '#fff',
    border: 'none',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    width: '100%',
    justifyContent: 'center',
  },
  btnShareSuccess: {
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    width: '100%',
    justifyContent: 'center',
  },
};
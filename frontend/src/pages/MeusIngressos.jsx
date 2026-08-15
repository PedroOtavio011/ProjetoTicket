import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Calendar, MapPin, Ticket, QrCode, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function MeusIngressos() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
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

  if (carregando) {
    return (
      <div style={{ color: '#fff', textAlign: 'center', padding: '4rem' }}>
        Carregando seus ingressos...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Cabecalho */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🎟️ Meus Ingressos</h1>
          <p style={styles.subtitle}>Apresente o QR Code no celular na entrada do evento.</p>
        </div>
        <button onClick={() => navigate('/')} style={styles.backBtn}>
          <ArrowLeft size={18} /> Explorar mais eventos
        </button>
      </div>

      {/* Lista de Ingressos */}
      {pedidos.length === 0 ? (
        <div style={styles.emptyState}>
          <Ticket size={48} color="#94a3b8" />
          <h3 style={{ color: '#fff', marginTop: '1rem' }}>Você ainda não possui ingressos.</h3>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Garanta seu lugar nos próximos filmes do catálogo!</p>
          <button onClick={() => navigate('/')} style={styles.catalogBtn}>
            Ver Programação
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {pedidos.map((p) => {
            // Código/hash do QR Code do pedido
            const qrData = p.qr_code || p.id;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

            return (
              <div key={p.id} style={styles.ticketCard}>
                {/* Status Badge */}
                <div style={styles.statusBadge}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span>{p.status || 'CONFIRMADO'}</span>
                </div>

                <div style={styles.cardContent}>
                  {/* Detalhes do Filme / Evento */}
                  <div style={styles.infoCol}>
                    <h2 style={styles.eventoTitulo}>{p.titulo || p.evento_titulo || 'Sessão de Cinema'}</h2>
                    
                    <p style={styles.infoText}>
                      <Calendar size={16} color="#e11d48" /> 
                      {p.data_evento ? new Date(p.data_evento).toLocaleString('pt-BR') : 'Data não informada'}
                    </p>
                    
                    <p style={styles.infoText}>
                      <MapPin size={16} color="#e11d48" /> 
                      {p.local || 'Cinema Elite'}
                    </p>

                    {p.assentos && (
                      <div style={styles.assentosBox}>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Assento(s):</span>
                        <strong style={{ color: '#38bdf8', fontSize: '1rem', marginLeft: '0.4rem' }}>
                          {Array.isArray(p.assentos) ? p.assentos.join(', ') : p.assentos}
                        </strong>
                      </div>
                    )}

                    <div style={styles.priceRow}>
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Total Pago:</span>
                      <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>
                        R$ {Number(p.valor_total || p.total || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* Bloco do QR Code */}
                  <div style={styles.qrCol}>
                    <div style={styles.qrWrapper}>
                      <img src={qrUrl} alt="QR Code Ingresso" style={styles.qrImage} />
                    </div>
                    <span style={styles.qrCodeText}>ID: {String(p.id).substring(0, 8).toUpperCase()}</span>
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
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '2rem',
  },
  title: {
    color: '#fff',
    fontSize: '1.8rem',
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
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
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
    borderRadius: '6px',
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
    borderRadius: '12px',
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
    padding: '0.2rem 0.6rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  cardContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    alignItems: 'center',
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  eventoTitulo: {
    color: '#fff',
    fontSize: '1.4rem',
    marginBottom: '0.5rem',
  },
  infoText: {
    color: '#cbd5e1',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  assentosBox: {
    marginTop: '0.5rem',
    backgroundColor: '#0f172a',
    padding: '0.5rem 0.8rem',
    borderRadius: '6px',
    display: 'inline-block',
    border: '1px solid #334155',
  },
  priceRow: {
    marginTop: '0.5rem',
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
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid #334155',
  },
  qrWrapper: {
    backgroundColor: '#fff',
    padding: '0.5rem',
    borderRadius: '8px',
  },
  qrImage: {
    width: '140px',
    height: '140px',
    display: 'block',
  },
  qrCodeText: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    marginTop: '0.6rem',
    fontFamily: 'monospace',
  },
};
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react';
import api from '../services/api';
import { Ticket, Calendar, MapPin, User, CheckCircle, ArrowLeft, Share2 } from 'lucide-react';

export default function IngressoCompartilhado() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [ingresso, setIngresso] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarIngresso();
  }, [codigo]);

  const carregarIngresso = async () => {
    try {
      setCarregando(true);
      const res = await api.get(`/ingressos/compartilhado/${codigo}`);
      setIngresso(res.data);
    } catch (err) {
      setErro(err.response?.data?.mensagem || 'Ingresso não encontrado.');
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#94a3b8' }}>Carregando ingresso compartilhado...</p>
      </div>
    );
  }

  if (erro || !ingresso) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444', fontSize: '1.1rem' }}>❌ {erro}</p>
        <button onClick={() => navigate('/')} style={styles.btnVoltar}>
          Voltar para o Início
        </button>
      </div>
    );
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
    ingresso.codigoQr
  )}&size=200x200`;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/')} style={styles.btnVoltar}>
        <ArrowLeft size={16} /> Ir para o Catálogo
      </button>

      <div style={styles.ticketCard}>
        <div style={styles.badgeShare}>
          <Share2 size={16} /> Ingresso Compartilhado
        </div>

        <h1 style={styles.titulo}>{ingresso.eventoTitulo}</h1>

        <div style={styles.qrContainer}>
          <img src={qrCodeUrl} alt="QR Code Ingresso" style={styles.qrImage} />
          <span style={styles.codigoText}>{ingresso.codigoQr}</span>
        </div>

        <div style={styles.detalhesBox}>
          <div style={styles.infoRow}>
            <User size={18} color="#38bdf8" />
            <span>Titular: <strong>{ingresso.titular}</strong></span>
          </div>

          <div style={styles.infoRow}>
            <Calendar size={18} color="#e11d48" />
            <span>{new Date(ingresso.dataEvento).toLocaleString('pt-BR')}</span>
          </div>

          <div style={styles.infoRow}>
            <MapPin size={18} color="#e11d48" />
            <span>{ingresso.local}</span>
          </div>

          <div style={styles.infoRow}>
            <Ticket size={18} color="#f59e0b" />
            <span>Assento / Setor: <strong>{ingresso.assentos || 'Pista'}</strong></span>
          </div>

          <div style={styles.infoRow}>
            <CheckCircle size={18} color="#10b981" />
            <span>Status: <strong style={{ color: '#10b981' }}>{ingresso.status}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '500px',
    margin: '2rem auto',
    padding: '0 1rem',
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
  btnVoltar: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  ticketCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
  },
  badgeShare: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: '#0284c722',
    color: '#38bdf8',
    border: '1px solid #0284c755',
    padding: '0.4rem 0.8rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
  },
  titulo: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: '1rem',
    borderRadius: '12px',
    display: 'inline-block',
    marginBottom: '1.5rem',
  },
  qrImage: {
    width: '180px',
    height: '180px',
    display: 'block',
  },
  codigoText: {
    display: 'block',
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    marginTop: '0.5rem',
    fontFamily: 'monospace',
  },
  detalhesBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    textAlign: 'left',
    backgroundColor: '#0f172a',
    padding: '1rem',
    borderRadius: '10px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.9rem',
    color: '#cbd5e1',
  },
};
import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { QrCode, CheckCircle2, XCircle, AlertTriangle, User, Film, Calendar, MapPin, RefreshCw } from 'lucide-react';

export default function Portaria() {
  const [codigo, setCodigo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef(null);

  // Mantém o foco no campo de texto para facilitar o uso com leitor de código de barras
  useEffect(() => {
    inputRef.current?.focus();
  }, [resultado]);

  const handleValidar = async (e) => {
    e?.preventDefault();
    if (!codigo.trim()) return;

    try {
      setCarregando(true);
      setResultado(null);

      // Enviamos tanto 'hash' quanto 'qrCode' para garantir 100% de compatibilidade
      const res = await api.post('/portaria/validar', { 
        hash: codigo,
        qrCode: codigo,
        codigo: codigo 
      });

      setResultado({
        tipo: 'SUCESSO',
        mensagem: res.data.mensagem,
        pedido: res.data.pedido
      });
      setCodigo('');
    } catch (err) {
      setResultado({
        tipo: 'ERRO',
        mensagem: err.response?.data?.mensagem || 'Erro ao comunicar com o servidor.',
        pedido: err.response?.data?.pedido || null
      });
    } finally {
      setCarregando(false);
    }
  };

  const handleLimpar = () => {
    setResultado(null);
    setCodigo('');
    inputRef.current?.focus();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <QrCode size={36} color="#e11d48" />
        <div>
          <h1 style={styles.title}>🛡️ Validação da Portaria</h1>
          <p style={styles.subtitle}>Digite ou bipe o código do QR Code para autorizar a entrada.</p>
        </div>
      </div>

      {/* Formulário de Busca / Leitura */}
      <form onSubmit={handleValidar} style={styles.form}>
        <div style={styles.inputGroup}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ex: CINETICKET-A1B2C3D4... ou Cole o ID do Ingresso"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            style={styles.input}
            disabled={carregando}
          />
          <button type="submit" disabled={carregando || !codigo.trim()} style={styles.btnValidar}>
            {carregando ? 'Validando...' : 'Validar Ingresso'}
          </button>
        </div>
      </form>

      {/* Resultado da Validação */}
      {resultado && (
        <div style={{
          ...styles.resultCard,
          borderColor: resultado.tipo === 'SUCESSO' ? '#10b981' : '#ef4444',
          backgroundColor: resultado.tipo === 'SUCESSO' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'
        }}>
          {/* Banner do Status */}
          <div style={{
            ...styles.statusBanner,
            backgroundColor: resultado.tipo === 'SUCESSO' ? '#10b981' : '#ef4444'
          }}>
            {resultado.tipo === 'SUCESSO' ? (
              <CheckCircle2 size={24} color="#fff" />
            ) : (
              <XCircle size={24} color="#fff" />
            )}
            <span style={styles.statusText}>{resultado.mensagem}</span>
          </div>

          {/* Detalhes do Ingresso Lido */}
          {resultado.pedido && (
            <div style={styles.pedidoInfo}>
              <div style={styles.infoRow}>
                <User size={18} color="#94a3b8" />
                <span><strong>Cliente:</strong> {resultado.pedido.cliente_nome} ({resultado.pedido.cliente_email})</span>
              </div>
              <div style={styles.infoRow}>
                <Film size={18} color="#94a3b8" />
                <span><strong>Filme/Sessão:</strong> {resultado.pedido.evento_titulo}</span>
              </div>
              <div style={styles.infoRow}>
                <Calendar size={18} color="#94a3b8" />
                <span><strong>Data:</strong> {new Date(resultado.pedido.data_evento).toLocaleString('pt-BR')}</span>
              </div>
              <div style={styles.infoRow}>
                <MapPin size={18} color="#94a3b8" />
                <span><strong>Local e Assento:</strong> {resultado.pedido.local} - Assentos: <strong style={{ color: '#38bdf8' }}>{resultado.pedido.assentos}</strong></span>
              </div>
            </div>
          )}

          <button onClick={handleLimpar} style={styles.btnProximo}>
            <RefreshCw size={16} /> Próxima Validação
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem 1rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
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
  },
  form: {
    marginBottom: '2rem',
  },
  inputGroup: {
    display: 'flex',
    gap: '0.8rem',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: '280px',
    padding: '0.9rem 1.2rem',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
  },
  btnValidar: {
    backgroundColor: '#e11d48',
    color: '#fff',
    border: 'none',
    padding: '0.9rem 1.8rem',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  resultCard: {
    borderRadius: '12px',
    border: '2px solid',
    overflow: 'hidden',
    padding: '1.5rem',
  },
  statusBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 1.2rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '1.1rem',
  },
  pedidoInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    color: '#cbd5e1',
    backgroundColor: '#0f172a',
    padding: '1.2rem',
    borderRadius: '8px',
    border: '1px solid #334155',
    marginBottom: '1.5rem',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.95rem',
  },
  btnProximo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    backgroundColor: '#1e293b',
    color: '#fff',
    border: '1px solid #334155',
    padding: '0.8rem',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  QrCode, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  User, 
  Film, 
  Calendar, 
  MapPin, 
  RefreshCw, 
  StopCircle, 
  AlertTriangle,
  Info
} from 'lucide-react';

export default function Portaria() {
  const [eventos, setEventos] = useState([]);
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState('');
  
  const [codigo, setCodigo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [usarCamera, setUsarCamera] = useState(false);
  
  const inputRef = useRef(null);
  const scannerRef = useRef(null);

  // Carrega a lista de eventos disponíveis para a Portaria selecionar
  useEffect(() => {
    carregarEventos();
  }, []);

  const carregarEventos = async () => {
    try {
      const res = await api.get('/eventos');
      const lista = res.data || [];
      setEventos(lista);
      if (lista.length > 0) {
        setEventoSelecionadoId(lista[0].id); // Seleciona o primeiro por padrão
      }
    } catch (err) {
      console.error('Erro ao carregar lista de eventos:', err);
    }
  };

  useEffect(() => {
    if (!usarCamera) {
      inputRef.current?.focus();
    }
  }, [resultado, usarCamera]);

  // Efeito para inicializar/destruir o Leitor de QR Code por Câmera
  useEffect(() => {
    if (usarCamera) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          validarCodigo(decodedText);
          scanner.clear();
          setUsarCamera(false);
        },
        (error) => {
          // Ignora erros contínuos de varredura
        }
      );

      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch((err) => console.error("Erro ao fechar scanner:", err));
      };
    }
  }, [usarCamera]);

  const validarCodigo = async (codigoParaValidar) => {
    if (!codigoParaValidar || !codigoParaValidar.trim()) return;

    if (!eventoSelecionadoId) {
      alert('Por favor, selecione qual evento/filme está sendo verificado nesta portaria!');
      return;
    }

    try {
      setCarregando(true);
      setResultado(null);

      // Envia o código e o ID do evento selecionado na portaria
      const res = await api.post('/portaria/validar', { 
        hash: codigoParaValidar,
        qrCode: codigoParaValidar,
        codigo: codigoParaValidar,
        eventoId: eventoSelecionadoId 
      });

      setResultado({
        tipo: 'SUCESSO',
        status: res.data.status || 'VALIDO', // VALIDO
        mensagem: res.data.mensagem || 'Ingresso VÁLIDO! Entrada Liberada.',
        pedido: res.data.pedido
      });
      setCodigo('');
    } catch (err) {
      const statusErro = err.response?.data?.status || 'INVALIDO';
      const msgErro = err.response?.data?.mensagem || 'Erro ao comunicar com o servidor.';

      setResultado({
        tipo: 'ERRO',
        status: statusErro, // 'EVENTO_ERRADO', 'JA_UTILIZADO', 'INVALIDO'
        mensagem: msgErro,
        pedido: err.response?.data?.pedido || null
      });
    } finally {
      setCarregando(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    validarCodigo(codigo);
  };

  const handleLimpar = () => {
    setResultado(null);
    setCodigo('');
    if (!usarCamera) inputRef.current?.focus();
  };

  // Define cores e ícones específicos para cada um dos 4 status exigidos
  const getStatusStyle = (status, tipo) => {
    if (tipo === 'SUCESSO' || status === 'VALIDO') {
      return {
        bg: '#10b981',
        bgBox: 'rgba(16, 185, 129, 0.08)',
        border: '#10b981',
        icon: <CheckCircle2 size={28} color="#fff" />,
        tituloStatus: 'ENTRADA LIBERADA (VÁLIDO)'
      };
    }

    switch (status) {
      case 'EVENTO_ERRADO':
        return {
          bg: '#f59e0b', // Amarelo/Laranja para alerta de evento errado
          bgBox: 'rgba(245, 158, 11, 0.08)',
          border: '#f59e0b',
          icon: <AlertTriangle size={28} color="#fff" />,
          tituloStatus: 'EVENTO ERRADO'
        };
      case 'JA_UTILIZADO':
        return {
          bg: '#6366f1', // Roxo/Índigo para ingresso já usado
          bgBox: 'rgba(99, 102, 241, 0.08)',
          border: '#6366f1',
          icon: <Info size={28} color="#fff" />,
          tituloStatus: 'INGRESSO JÁ UTILIZADO'
        };
      case 'INVALIDO':
      default:
        return {
          bg: '#ef4444', // Vermelho para inválido/inexistente
          bgBox: 'rgba(239, 68, 68, 0.08)',
          border: '#ef4444',
          icon: <XCircle size={28} color="#fff" />,
          tituloStatus: 'INGRESSO INVÁLIDO'
        };
    }
  };

  const statusConfig = resultado ? getStatusStyle(resultado.status, resultado.tipo) : null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <QrCode size={36} color="#e11d48" />
        <div>
          <h1 style={styles.title}>🛡️ Validação de Portaria</h1>
          <p style={styles.subtitle}>Bipe com a Câmera ou Digite o Hash para autorizar a entrada.</p>
        </div>
      </div>

      {/* SELEÇÃO DO EVENTO / FILME DA PORTARIA */}
      <div style={styles.selectContainer}>
        <label style={styles.labelSelect}>
          <Film size={18} color="#e11d48" />
          <span>Selecione o Evento/Sessão desta Portaria:</span>
        </label>
        <select 
          value={eventoSelecionadoId} 
          onChange={(e) => {
            setEventoSelecionadoId(e.target.value);
            setResultado(null);
          }}
          style={styles.select}
        >
          {eventos.length === 0 && <option value="">Carregando eventos...</option>}
          {eventos.map((evt) => (
            <option key={evt.id} value={evt.id}>
              {evt.titulo} - {new Date(evt.data_evento || evt.dataEvento).toLocaleDateString('pt-BR')} ({evt.local})
            </option>
          ))}
        </select>
      </div>

      {/* Botão de Alternar Câmera / Manual */}
      <div style={styles.actionToolbar}>
        <button 
          onClick={() => setUsarCamera(!usarCamera)} 
          style={{ ...styles.btnCamera, backgroundColor: usarCamera ? '#dc2626' : '#2563eb' }}
        >
          {usarCamera ? <><StopCircle size={18} /> Fechar Câmera</> : <><Camera size={18} /> Escanear com Câmera</>}
        </button>
      </div>

      {/* ÁREA DA CÂMERA (QR Code Reader) */}
      {usarCamera && (
        <div style={styles.scannerWrapper}>
          <div id="reader" style={styles.reader}></div>
        </div>
      )}

      {/* FORMULÁRIO MANUAL */}
      {!usarCamera && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Cole a Hash ou Bipe o código do QR Code..."
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              style={styles.input}
              disabled={carregando || !eventoSelecionadoId}
            />
            <button 
              type="submit" 
              disabled={carregando || !codigo.trim() || !eventoSelecionadoId} 
              style={styles.btnValidar}
            >
              {carregando ? 'Validando...' : 'Validar Ingresso'}
            </button>
          </div>
        </form>
      )}

      {/* RESULTADO DA VALIDAÇÃO (4 STATUS: VÁLIDO, INVÁLIDO, JÁ UTILIZADO, EVENTO ERRADO) */}
      {resultado && statusConfig && (
        <div style={{
          ...styles.resultCard,
          borderColor: statusConfig.border,
          backgroundColor: statusConfig.bgBox
        }}>
          <div style={{
            ...styles.statusBanner,
            backgroundColor: statusConfig.bg
          }}>
            {statusConfig.icon}
            <div>
              <span style={styles.statusTitle}>{statusConfig.tituloStatus}</span>
              <p style={styles.statusText}>{resultado.mensagem}</p>
            </div>
          </div>

          {resultado.pedido && (
            <div style={styles.pedidoInfo}>
              <div style={styles.infoRow}>
                <User size={18} color="#94a3b8" /> 
                <span><strong>Cliente:</strong> {resultado.pedido.cliente_nome}</span>
              </div>
              <div style={styles.infoRow}>
                <Film size={18} color="#94a3b8" /> 
                <span><strong>Evento do Ingresso:</strong> {resultado.pedido.evento_titulo}</span>
              </div>
              <div style={styles.infoRow}>
                <Calendar size={18} color="#94a3b8" /> 
                <span><strong>Data:</strong> {new Date(resultado.pedido.data_evento).toLocaleString('pt-BR')}</span>
              </div>
              <div style={styles.infoRow}>
                <MapPin size={18} color="#94a3b8" /> 
                <span><strong>Local/Assentos:</strong> {resultado.pedido.local} {resultado.pedido.assentos ? `- Assento: ${resultado.pedido.assentos}` : ''}</span>
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
  container: { maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  title: { color: '#fff', fontSize: '1.8rem', margin: 0 },
  subtitle: { color: '#94a3b8', fontSize: '0.95rem', margin: '0.2rem 0 0 0' },
  
  selectContainer: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '1.2rem',
    marginBottom: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  labelSelect: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: '0.95rem',
  },
  select: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.8rem 1rem',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    cursor: 'pointer',
  },

  actionToolbar: { marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-start' },
  btnCamera: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', border: 'none', padding: '0.8rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  scannerWrapper: { backgroundColor: '#0f172a', border: '2px dashed #334155', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' },
  reader: { width: '100%', borderRadius: '8px', overflow: 'hidden' },
  form: { marginBottom: '2rem' },
  inputGroup: { display: 'flex', gap: '0.8rem', flexWrap: 'wrap' },
  input: { flex: 1, minWidth: '280px', padding: '0.9rem 1.2rem', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', fontSize: '1rem', outline: 'none' },
  btnValidar: { backgroundColor: '#e11d48', color: '#fff', border: 'none', padding: '0.9rem 1.8rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' },
  
  resultCard: { borderRadius: '12px', border: '2px solid', overflow: 'hidden', padding: '1.5rem' },
  statusBanner: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem', borderRadius: '8px', marginBottom: '1.5rem' },
  statusTitle: { color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', display: 'block' },
  statusText: { color: '#f1f5f9', fontSize: '0.95rem', margin: 0 },
  
  pedidoInfo: { display: 'flex', flexDirection: 'column', gap: '0.8rem', color: '#cbd5e1', backgroundColor: '#0f172a', padding: '1.2rem', borderRadius: '8px', border: '1px solid #334155', marginBottom: '1.5rem' },
  infoRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem' },
  btnProximo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '0.8rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};
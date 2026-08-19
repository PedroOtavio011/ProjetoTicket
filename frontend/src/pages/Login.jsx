import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  LogIn, 
  Mail, 
  Lock, 
  UserPlus, 
  Sparkles, 
  Loader2, 
  User, 
  Users, 
  Clapperboard, 
  Ticket 
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [loadingQuick, setLoadingQuick] = useState('');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Login manual do formulário
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !senha) {
      return alert('Preencha todos os campos!');
    }

    try {
      setCarregando(true);
      await login(email, senha);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao realizar login.');
    } finally {
      setCarregando(false);
    }
  };

  // ⚡ Atalho para preenchimento e login rápido em demonstrações
  const preencherQuickLogin = async (emailDigitado) => {
    const senhaPadrao = '123456';
    setLoadingQuick(emailDigitado);
    setEmail(emailDigitado);
    setSenha(senhaPadrao);

    try {
      setCarregando(true);
      await login(emailDigitado, senhaPadrao);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.mensagem || `Erro ao entrar com ${emailDigitado}`);
    } finally {
      setCarregando(false);
      setLoadingQuick('');
    }
  };

  const atalhosAtalhos = [
    { label: 'Cliente 1', email: 'cliente1@elite.com', icon: User, color: '#38bdf8' },
    { label: 'Cliente 2', email: 'cliente2@elite.com', icon: Users, color: '#a855f7' },
    { label: 'Organizador', email: 'organizador@elite.com', icon: Clapperboard, color: '#f59e0b' },
    { label: 'Portaria', email: 'portaria@elite.com', icon: Ticket, color: '#10b981' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* CABEÇALHO */}
        <div style={styles.header}>
          <div style={styles.iconBadge}>
            <LogIn size={28} color="#e11d48" />
          </div>
          <h2 style={styles.title}>Acessar Conta</h2>
          <p style={styles.subtitle}>Digite suas credenciais ou escolha um perfil de teste abaixo.</p>
        </div>

        {/* ⚡ ATALHOS PARA TESTE */}
        <div style={styles.quickSection}>
          <div style={styles.quickHeader}>
            <Sparkles size={14} color="#f59e0b" />
            <span style={styles.quickTitle}>Atalhos Rápidos de Teste</span>
          </div>
          
          <div style={styles.quickGrid}>
            {atalhosAtalhos.map((item) => {
              const Icone = item.icon;
              const isSelected = loadingQuick === item.email;

              return (
                <button
                  key={item.email}
                  type="button"
                  disabled={carregando}
                  onClick={() => preencherQuickLogin(item.email)}
                  style={styles.quickBtn}
                >
                  {isSelected ? (
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} color={item.color} />
                  ) : (
                    <Icone size={15} color={item.color} />
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FORMULÁRIO DE LOGIN */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>E-mail</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#64748b" />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#64748b" />
              <input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={carregando} style={styles.submitBtn}>
            {carregando ? (
              <span style={styles.loadingFlex}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Entrando...
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* LINK PARA CADASTRO DE NOVO USUÁRIO */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Ainda não tem uma conta?
          </p>
          <Link to="/cadastro" style={styles.signupLink}>
            <UserPlus size={16} /> Criar nova conta
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '88vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem 1rem',
  },
  card: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '2.2rem 2rem',
    width: '100%',
    maxWidth: '430px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  iconBadge: {
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    border: '1px solid rgba(225, 29, 72, 0.25)',
    borderRadius: '14px',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.8rem',
  },
  title: {
    color: '#f8fafc',
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    marginTop: '0.35rem',
    margin: '0.35rem 0 0 0',
  },
  quickSection: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '0.9rem',
    marginBottom: '1.5rem',
  },
  quickHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    marginBottom: '0.75rem',
  },
  quickTitle: {
    color: '#f59e0b',
    fontSize: '0.78rem',
    fontWeight: '700',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.6rem',
  },
  quickBtn: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.6rem 0.5rem',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    transition: 'all 0.15s ease-in-out',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    color: '#cbd5e1',
    fontSize: '0.82rem',
    fontWeight: '500',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '0.75rem 0.9rem',
  },
  input: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f8fafc',
    width: '100%',
    outline: 'none',
    fontSize: '0.92rem',
  },
  submitBtn: {
    backgroundColor: '#e11d48',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.85rem',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    marginTop: '0.4rem',
    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
  },
  loadingFlex: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  footer: {
    marginTop: '1.5rem',
    paddingTop: '1.2rem',
    borderTop: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: '0.88rem',
    margin: 0,
  },
  signupLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.9rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
};
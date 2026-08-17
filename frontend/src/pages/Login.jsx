import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

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
    const senhaPadrao = '123456'; // Senha cadastrada no script de seed do banco

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
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <LogIn size={32} color="#e11d48" />
          <h2 style={styles.title}>Entrar na Conta</h2>
        </div>

        {/* ⚡ ATALHOS PARA TESTE */}
        <div style={styles.quickSection}>
          <p style={styles.quickTitle}>⚡ Atalhos para Teste (Preenchimento Rápido):</p>
          <div style={styles.quickButtons}>
            <button
              type="button"
              onClick={() => preencherQuickLogin('cliente1@elite.com')}
              style={styles.quickBtn}
            >
              👤 Cliente
            </button>
            <button
              type="button"
              onClick={() => preencherQuickLogin('organizador@elite.com')}
              style={styles.quickBtn}
            >
              🎬 Organizador
            </button>
            <button
              type="button"
              onClick={() => preencherQuickLogin('portaria@elite.com')}
              style={styles.quickBtn}
            >
              🎟️ Portaria
            </button>
          </div>
        </div>

        {/* FORMULÁRIO DE LOGIN */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>E-mail</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#94a3b8" />
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
              <Lock size={18} color="#94a3b8" />
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
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* LINK PARA CADASTRO DE NOVO USUÁRIO */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Ainda não tem uma conta?{' '}
            <Link to="/cadastro" style={styles.signupLink}>
              <UserPlus size={16} /> Cadastre-se aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '85vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.2rem',
  },
  title: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  quickSection: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.8rem',
    marginBottom: '1.5rem',
  },
  quickTitle: {
    color: '#f59e0b',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    marginBottom: '0.6rem',
    textAlign: 'center',
  },
  quickButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  quickBtn: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '0.5rem 0.2rem',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    transition: 'all 0.2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.7rem 0.9rem',
  },
  input: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    width: '100%',
    outline: 'none',
    fontSize: '0.95rem',
  },
  submitBtn: {
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
  footer: {
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #334155',
    textAlign: 'center',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  signupLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
};
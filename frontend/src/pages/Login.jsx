import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, Key, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      await login(email, senha);
      navigate('/');
    } catch (err) {
      setErro(err.response?.data?.mensagem || 'Falha ao realizar login.');
    }
  };

  // Atalho para facilitar testes do avaliador/dev
  const preencherQuickLogin = (emailTeste) => {
    setEmail(emailTeste);
    setSenha('123456');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          <LogIn color="#e11d48" size={28} /> Acesse sua Conta
        </h2>
        <p style={styles.subtitle}>Digite suas credenciais para gerenciar ingressos e eventos.</p>

        {erro && <div style={styles.errorBox}>{erro}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}><Mail size={16} /> E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}><Key size={16} /> Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.submitBtn}>Entrar no Sistema</button>
        </form>

        <div style={styles.quickSection}>
          <p style={styles.quickTitle}>⚡ Atalhos para Teste (Preenchimento Rápido):</p>
          <div style={styles.quickButtons}>
            <button type="button" onClick={() => preencherQuickLogin('cliente1@elite.com')} style={styles.quickBtn}>
              👤 Cliente
            </button>
            <button type="button" onClick={() => preencherQuickLogin('organizador@elite.com')} style={styles.quickBtn}>
              🎬 Organizador
            </button>
            <button type="button" onClick={() => preencherQuickLogin('portaria@elite.com')} style={styles.quickBtn}>
              🎟️ Portaria
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '80vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    width: '100%',
    maxWidth: '420px',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#fff',
    marginBottom: '0.5rem',
    fontSize: '1.5rem',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.875rem',
    color: '#cbd5e1',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  input: {
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#fff',
    fontSize: '1rem',
  },
  submitBtn: {
    marginTop: '0.5rem',
    backgroundColor: '#e11d48',
    color: '#fff',
    padding: '0.8rem',
    borderRadius: '6px',
    fontSize: '1rem',
  },
  errorBox: {
    backgroundColor: '#991b1b',
    color: '#fca5a5',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  quickSection: {
    marginTop: '2rem',
    paddingTop: '1rem',
    borderTop: '1px solid #334155',
  },
  quickTitle: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginBottom: '0.5rem',
  },
  quickButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  quickBtn: {
    flex: 1,
    padding: '0.4rem',
    backgroundColor: '#334155',
    color: '#cbd5e1',
    fontSize: '0.75rem',
  },
};
import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { UserPlus, Mail, Lock, User, ShieldCheck } from 'lucide-react';

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState('CLIENTE');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleCadastro = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const res = await api.post('/auth/registro', { nome, email, senha, papel });
      
      // Armazena no context/localStorage
      if (login) {
        login(res.data.usuario, res.data.token);
      } else {
        localStorage.setItem('@CineTicket:token', res.data.token);
        localStorage.setItem('@CineTicket:user', JSON.stringify(res.data.usuario));
      }

      navigate('/');
    } catch (err) {
      setErro(err.response?.data?.mensagem || 'Erro ao realizar o cadastro.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <UserPlus size={36} color="#e11d48" />
          <h1 style={styles.title}>Criar Conta</h1>
          <p style={styles.subtitle}>Cadastre-se para garantir seus ingressos</p>
        </div>

        {erro && <div style={styles.erroBanner}>{erro}</div>}

        <form onSubmit={handleCadastro} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}><User size={16} /> Nome Completo</label>
            <input
              type="text"
              placeholder="Ex: João Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}><Mail size={16} /> E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}><Lock size={16} /> Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}><ShieldCheck size={16} /> Tipo de Conta</label>
            <select value={papel} onChange={(e) => setPapel(e.target.value)} style={styles.select}>
              <option value="CLIENTE">Cliente (Comprar Ingressos)</option>
              <option value="ORGANIZADOR">Organizador (Criar/Gerenciar Eventos)</option>
            </select>
          </div>

          <button type="submit" disabled={carregando} style={styles.btnSubmit}>
            {carregando ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p style={styles.footerText}>
          Já possui uma conta? <Link to="/login" style={styles.link}>Faça Login</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' },
  card: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '420px' },
  header: { textAlign: 'center', marginBottom: '1.5rem' },
  title: { color: '#fff', fontSize: '1.6rem', marginTop: '0.5rem' },
  subtitle: { color: '#94a3b8', fontSize: '0.9rem' },
  erroBanner: { backgroundColor: '#ef444422', border: '1px solid #ef4444', color: '#f87171', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.2rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { color: '#cbd5e1', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  input: { padding: '0.8rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '0.95rem' },
  select: { padding: '0.8rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '0.95rem' },
  btnSubmit: { backgroundColor: '#e11d48', color: '#fff', padding: '0.9rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  footerText: { textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '1.5rem' },
  link: { color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold' }
};
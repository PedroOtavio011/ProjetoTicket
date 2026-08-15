import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Ticket, LogOut, User, ShieldCheck, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const { usuario, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <Link to="/" style={styles.logo}>
          <Ticket color="#e11d48" size={28} />
          <span style={styles.logoText}>CineTicket <small style={styles.badgeText}>Elite</small></span>
        </Link>

        <div style={styles.links}>
          <Link to="/" style={styles.link}>Eventos</Link>

          {usuario && (
            <Link to="/meus-ingressos" style={styles.link}>Meus Ingressos</Link>
          )}

          {(usuario?.papel === 'ORGANIZADOR' || usuario?.papel === 'PORTARIA') && (
            <Link to="/portaria" style={{ ...styles.link, color: '#f59e0b' }}>
              <ShieldCheck size={18} style={{ marginRight: 4 }} /> Validação Portaria
            </Link>
          )}

          {usuario ? (
            <div style={styles.userSection}>
              <span style={styles.userName}>
                <User size={16} /> {usuario.nome} ({usuario.papel})
              </span>
              <button onClick={handleLogout} style={styles.logoutBtn} title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link to="/login" style={styles.loginBtn}>Entrar</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '1rem 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '1.25rem',
    color: '#fff',
  },
  logoText: {
    letterSpacing: '-0.5px',
  },
  badgeText: {
    fontSize: '0.75rem',
    backgroundColor: '#e11d48',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#fff',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  link: {
    color: '#cbd5e1',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: '#0f172a',
    padding: '0.4rem 0.8rem',
    borderRadius: '8px',
  },
  userName: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    padding: '4px',
    display: 'flex',
  },
  loginBtn: {
    backgroundColor: '#e11d48',
    color: '#fff',
    padding: '0.5rem 1.2rem',
    borderRadius: '6px',
    fontWeight: '600',
  },
};
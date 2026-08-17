import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro'; // 👈 Adicionado aqui!
import Home from './pages/Home';
import EventoDetalhes from './pages/EventoDetalhes';
import MeusIngressos from './pages/MeusIngressos';
import Portaria from './pages/Portaria';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/evento/:id" element={<EventoDetalhes />} />
          <Route path="/meus-ingressos" element={<MeusIngressos />} />
          <Route path="/portaria" element={<Portaria />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * Componente Wrapper para proteger rotas por Papéis (Roles)
 * @param {Array<string>} papeisPermitidos - Ex: ['ORGANIZADOR', 'PORTARIA']
 */
export default function RotaProtegida({ papeisPermitidos }) {
  const { usuario, carregando } = useContext(AuthContext);

  // Enquanto verifica o token no AuthContext, exibe estado de carregamento
  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: '#94a3b8' }}>
        <p>Verificando permissões de acesso...</p>
      </div>
    );
  }

  // 1. Se não estiver logado, redireciona para a tela de Login
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // 2. Se o papel do usuário NÃO estiver na lista de papéis permitidos, redireciona para a Home
  if (papeisPermitidos && !papeisPermitidos.includes(usuario.papel)) {
    alert(`Acesso negado. Seu perfil (${usuario.papel}) não tem permissão para acessar esta página.`);
    return <Navigate to="/" replace />;
  }

  // 3. Se passou em todas as verificações, libera o acesso à rota filha
  return <Outlet />;
}
import axios from 'axios';

const api = axios.create({
  // Pega a URL dinâmica do .env na Vercel ou usa o localhost como reserva
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

// Interceptor para injetar o Token JWT automaticamente se o usuário estiver logado
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
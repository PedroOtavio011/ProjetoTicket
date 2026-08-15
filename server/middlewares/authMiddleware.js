const jwt = require('jsonwebtoken');

function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ mensagem: 'Acesso negado: Token não fornecido.' });
  }

  try {
    const usuarioDecodificado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = usuarioDecodificado;
    next();
  } catch (error) {
    return res.status(403).json({ mensagem: 'Token inválido ou expirado.' });
  }
}

// Middleware para autorizar papéis específicos (ex: apenas ORGANIZADOR)
function autorizarPapel(...papeisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !papeisPermitidos.includes(req.usuario.papel)) {
      return res.status(403).json({ 
        mensagem: `Acesso negado. Requer perfil: ${papeisPermitidos.join(' ou ')}.` 
      });
    }
    next();
  };
}

module.exports = { autenticarToken, autorizarPapel };
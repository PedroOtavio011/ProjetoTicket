const mysql = require('mysql2/promise');
require('dotenv').config();

// Criação do Pool de Conexões do MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Teste inicial de conexão ao subir a aplicação
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexão com o banco MySQL estabelecida com sucesso!');
    connection.release();
  } catch (error) {
    console.error('❌ Erro ao conectar no MySQL:', error.message);
    console.error('👉 Verifique se o MySQL está rodando e se as credenciais do .env estão corretas.');
  }
})();

module.exports = pool;
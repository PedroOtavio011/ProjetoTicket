🎫 Elite Tickets — Plataforma de Eventos e IngressosPlataforma full-stack de publicação, compra, gestão e validação de ingressos em tempo real. O sistema integra a API do TMDb para consulta de filmes, oferece mapa interativo de assentos, realiza pagamentos simulados, gera ingressos com QR Code infalsificável, permite o compartilhamento por link e possui um módulo de portaria com leitor via câmera.
🌐 Links de DeployFrontend (Vercel): [https://seu-projeto.vercel.app](https://seu-projeto.vercel.app)Backend (Render): [https://sua-api.onrender.com](https://sua-api.onrender.com)🧠 Processo de Desenvolvimento e Uso de IAAtendendo às diretrizes da avaliação, a Inteligência Artificial (Google Gemini) foi utilizada estritamente como uma ferramenta copilota de produtividade.

O que foi 100% idealizado e direcionado por mim:Regras de Negócio & Arquitetura: Modelei o esquema relacional no MySQL (relacionamento entre usuarios, eventos, assentos, pedidos e ingressos), defini o controle transacional contra double booking e estruturei a autorização baseada em papéis (RBAC).  Design & UX (Anti-"AI Slop"): Para evitar interfaces genéricas, desenhei a interface do zero no React, priorizando a usabilidade do mapa de assentos e o painel responsivo da portaria.  Estratégias de Segurança: Implementação manual de Rate Limiting, criptografia e geração dos hashes únicos dos ingressos.  

Onde a IA atuou como Copilota:Apoio na depuração de erros assíncronos e tratamento de exceções no Axios.Refatoração sintática de rotinas do Express e validação de regras de concorrência.🏛️ Decisões de Arquitetura e Segurança1. Proteção com Rate LimitingPara evitar ataques de força bruta e abusos na API, integrei a biblioteca express-rate-limit:Login (/api/auth/login): Limite estrito de 5 tentativas a cada 15 minutos por IP contra ataques brute force.API Geral (/api): Limite de 100 requisições a cada 15 minutos por IP, prevenindo bot scalping no mapa de assentos e otimizando a cota da API do TMDb.  2. Autenticação e Gestão de Tokens (JWT + Strategy)A autenticação utiliza JSON Web Tokens (JWT) trafegados no cabeçalho Authorization: Bearer <token>:Por que localStorage + Headers em vez de Cookies HttpOnly? Com o Frontend na Vercel e o Backend no Render (domínios distintos), a política de cookies de terceiros (cross-site) exige SameSite=None; Secure, gerando bloqueios imprevisíveis em navegadores. O Bearer Token via Header elimina incompatibilidades de CORS e mantém a API 100% stateless.Tratamento de Expiracão: O Axios intercepta respostas 401 Unauthorized. Quando um token expira, o frontend limpa a sessão local e redireciona o usuário para o login com feedback imediato.3. QR Code Criptografado e Token de CompartilhamentoCada ingresso emitido gera um identificador único armazenado em qr_code_hash e um token_compartilhamento.  O QR Code renderizado na tela armazena esse hash seguro. Na portaria, ao escanear a imagem ou digitar o código, o backend atualiza o campo status para 'UTILIZADO' e grava a data em validado_em dentro de uma transação com lock, impedindo que o mesmo ingresso seja validado duas vezes.  4. Integridade de Reservas: Prevenção de Double BookingPara eventos do tipo COM_ASSENTO, a tabela assentos aplica a restrição única uk_evento_assento entre evento_id e codigo_assento. Tentativas simultâneas de compra para a mesma cadeira são rejeitadas diretamente no nível do banco.  

📂 Estrutura do ProjetoPlaintextProjetoTicket/
├── .env                  # Variáveis de ambiente da API / Backend
├── .gitignore
├── package.json          # Dependências do Backend (Express, Cors, Dotenv, Rate Limit, etc.)
├── package-lock.json
├── README.md
├── server/               # Servidor Node.js
│   ├── middlewares/      # Middlewares de autenticação e proteção
│   │   └── authMiddleware.js
│   ├── routes/           # Rotas da aplicação
│   │   ├── authRoutes.js
│   │   ├── eventoRoutes.js
│   │   ├── pedidoRoutes.js
│   │   └── portariaRoutes.js
│   ├── db.js             # Conexão MySQL
│   └── index.js          # Ponto de entrada do servidor
└── frontend/             # Aplicação React (Vite)
    ├── public/
    ├── src/
    │   ├── components/   # Componentes (Navbar, RotaProtegida)
    │   ├── pages/        # Páginas da aplicação
    │   └── services/     # Configuração do Axios (api.js)
    ├── .env              # VITE_API_URL
    ├── package.json
    └── vite.config.js


-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` varchar(36) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `papel` enum('ORGANIZADOR','CLIENTE','PORTARIA') NOT NULL DEFAULT 'CLIENTE',
  `criado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Eventos
CREATE TABLE IF NOT EXISTS `eventos` (
  `id` varchar(36) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `descricao` text,
  `imagem_url` varchar(500) DEFAULT NULL,
  `id_externo` varchar(255) DEFAULT NULL,
  `fonte_externa` varchar(50) DEFAULT NULL,
  `data_evento` datetime(3) NOT NULL,
  `local` varchar(255) NOT NULL,
  `capacidade` int NOT NULL,
  `preco` decimal(10,2) NOT NULL,
  `tipo` enum('COM_ASSENTO','SEM_ASSENTO') DEFAULT 'COM_ASSENTO',
  `organizador_id` varchar(36) NOT NULL,
  `status` varchar(20) DEFAULT 'ATIVO',
  `criado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `organizador_id` (`organizador_id`),
  CONSTRAINT `eventos_ibfk_1` FOREIGN KEY (`organizador_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Assentos
CREATE TABLE IF NOT EXISTS `assentos` (
  `id` varchar(36) NOT NULL,
  `evento_id` varchar(36) NOT NULL,
  `codigo_assento` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'DISPONIVEL',
  `criado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_evento_assento` (`evento_id`,`codigo_assento`),
  CONSTRAINT `assentos_ibfk_1` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS `pedidos` (
  `id` varchar(36) NOT NULL,
  `usuario_id` varchar(36) NOT NULL,
  `evento_id` varchar(36) NOT NULL,
  `valor_total` decimal(10,2) NOT NULL,
  `assentos` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'CONFIRMADO',
  `qr_code` varchar(255) DEFAULT NULL,
  `token_transferencia` varchar(255) DEFAULT NULL,
  `token_expira_em` datetime DEFAULT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `cliente_id` (`usuario_id`),
  KEY `evento_id` (`evento_id`),
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `pedidos_ibfk_2` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Ingressos
CREATE TABLE IF NOT EXISTS `ingressos` (
  `id` varchar(36) NOT NULL,
  `pedido_id` varchar(36) NOT NULL,
  `cliente_id` varchar(36) NOT NULL,
  `evento_id` varchar(36) NOT NULL,
  `assento_id` varchar(36) DEFAULT NULL,
  `qr_code_hash` varchar(500) NOT NULL,
  `token_compartilhamento` varchar(36) NOT NULL,
  `status` enum('VALIDO','UTILIZADO','CANCELADO') NOT NULL DEFAULT 'VALIDO',
  `validado_em` datetime(3) DEFAULT NULL,
  `token_transferencia` varchar(255) DEFAULT NULL,
  `token_expira_em` datetime DEFAULT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_code_hash` (`qr_code_hash`),
  UNIQUE KEY `token_compartilhamento` (`token_compartilhamento`),
  UNIQUE KEY `assento_id` (`assento_id`),
  KEY `pedido_id` (`pedido_id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `evento_id` (`evento_id`),
  CONSTRAINT `ingressos_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ingressos_ibfk_2` FOREIGN KEY (`cliente_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ingressos_ibfk_3` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ingressos_ibfk_4` FOREIGN KEY (`assento_id`) REFERENCES `assentos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- SEED DATA: USUÁRIOS E EVENTO DE TESTE
-- ========================================================

-- Usuários pré-cadastrados (Senha: 'senha123')
INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha`, `papel`) VALUES
('usr-org-00000000-0000-0000-000000000001', 'Organizador Master', 'organizador@elite.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGga31lW', 'ORGANIZADOR'),
('usr-cli-00000000-0000-0000-000000000001', 'Cliente Silva', 'cliente1@elite.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGga31lW', 'CLIENTE'),
('usr-cli-00000000-0000-0000-000000000002', 'Cliente Santos', 'cliente2@elite.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGga31lW', 'CLIENTE'),
('usr-por-00000000-0000-0000-000000000001', 'Agente Portaria', 'portaria@elite.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGga31lW', 'PORTARIA')
ON DUPLICATE KEY UPDATE `email`=`email`;

-- Evento de Teste Inicial
INSERT INTO `eventos` (`id`, `titulo`, `descricao`, `imagem_url`, `data_evento`, `local`, `capacidade`, `preco`, `tipo`, `organizador_id`, `status`) VALUES
('evt-001-00000000-0000-0000-000000000001', 'The Batman - Exibição Especial', 'Sessão exclusiva com mapa de assentos.', 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50A9223a130.jpg', '2026-10-15 20:00:00', 'Cinemark Hall 1', 50, 35.00, 'COM_ASSENTO', 'usr-org-00000000-0000-0000-000000000001', 'ATIVO')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Assentos do Evento
INSERT INTO `assentos` (`id`, `evento_id`, `codigo_assento`, `status`) VALUES
('ast-001-00000000-0000-0000-000000000001', 'evt-001-00000000-0000-0000-000000000001', 'A1', 'DISPONIVEL'),
('ast-002-00000000-0000-0000-000000000002', 'evt-001-00000000-0000-0000-000000000001', 'A2', 'DISPONIVEL'),
('ast-003-00000000-0000-0000-000000000003', 'evt-001-00000000-0000-0000-000000000001', 'A3', 'DISPONIVEL'),
('ast-004-00000000-0000-0000-000000000004', 'evt-001-00000000-0000-0000-000000000001', 'B1', 'DISPONIVEL'),
('ast-005-00000000-0000-0000-000000000005', 'evt-001-00000000-0000-0000-000000000001', 'B2', 'DISPONIVEL')
ON DUPLICATE KEY UPDATE `id`=`id`;

2. Configuração do Backend (Servidor)No terminal, estando na raiz do projeto (ProjetoTicket/):Bash# Instale as dependências da raiz/backend
npm install
Crie o arquivo .env na raiz do projeto (ProjetoTicket/.env):Snippet de códigoPORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASS=suasenha
DB_NAME=plataforma_eventos
JWT_SECRET=sua_chave_secreta_jwt
TMDB_API_KEY=sua_chave_api_tmdb
Inicie o servidor Express:Bashnpm run dev
# Ou: node server/index.js
3. Configuração do Frontend (React)Abra um segundo terminal e acesse a pasta frontend/:Bashcd frontend

# Instale as dependências do React
npm install
Crie o arquivo frontend/.env:Snippet de códigoVITE_API_URL=http://localhost:3001
Execute a aplicação:Bashnpm run dev
Acesse a interface no seu navegador: `
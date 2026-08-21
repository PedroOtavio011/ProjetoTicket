# 🎫 Elite Tickets — Plataforma de Eventos e Ingressos

🚀 PROJETO 100% HOSPEDADO EM NUVEM E PRONTO PARA AVALIAÇÃO!

Você não precisa baixar, configurar ou executar nada localmente.

Toda a aplicação — Frontend (Vercel), Backend API (Render) e Banco de Dados (MySQL Cloud) — está no ar e integrada. Basta acessar o link do projeto e utilizar os botões de atalho na tela de login ou as credenciais de teste abaixo.

---

## 🌐 Link de Deploy

* **Frontend (Vercel):** `projeto-ticket.vercel.app`

---

## 🧠 Processo de Desenvolvimento e Uso de IA
Atendendo às diretrizes do desafio, a Inteligência Artificial (Google Gemini) foi utilizada estrategicamente como uma ferramenta de aceleração e ganho de tempo, permitindo focar os esforços na engenharia do projeto, na qualidade do código e nas decisões técnicas.

🎯 Idealização, Arquitetura e Engenharia (100% Autoral):

Modelagem de Banco de Dados: Todo o esquema relacional no MySQL (usuarios, eventos, assentos, pedidos e ingressos) foi idealizado e estruturado por mim, definindo chaves, relacionamentos e integridade dos dados.

Regras de Negócio & Concorrência: Criação autoral de toda a lógica transacional contra double booking, controle de status dos ingressos e regras do fluxo completo de compra e validação na portaria.

Arquitetura de Segurança: Estruturação e implementação do controle de acesso por papéis (RBAC), proteção contra força bruta com Rate Limiting, autenticação via JWT e geração de hashes criptográficos para os QR Codes.

Design & UX: Construção da interface no React focando em usabilidade e agilidade no scanner mobile, mantendo uma identidade visual autêntica e evitando layouts genéricos ("AI Slop").

🤖 Onde a IA atuou como Copilota (Ganho de Tempo e Debugging):

Diagnóstico e Debugging: Apoio na identificação e correção rápida de erros assíncronos, conexões com o MySQL em nuvem, tratamento de exceções no Axios e ajustes de proxy/DNS na hospedagem.

Aceleração de Código: Geração de boilerplate repetitivo para rotas do Express, refatoração sintática e otimização na escrita de algoritmos pontuais.

☁️ Observação sobre a Hospedagem e Testes (Free Tier):

Como o projeto está hospedado em plataformas de infraestrutura gratuita (Render para o Backend e Aiven para o Banco de Dados MySQL), ambos os serviços entram em modo de hibernação/suspensão automática após um período de inatividade.

Caso encontre algum erro de conexão (500 Internal Error, ENOTFOUND ou timeout) no primeiro acesso, basta aguardar de 1 a 2 minutos para que as instâncias "acordem" e restabeleçam a comunicação.
---

## 🏛️ Decisões de Arquitetura e Segurança

### 1. Proteção com Rate Limiting

Para mitigar ataques de força bruta e sobrecarga de requisições, integrei o `express-rate-limit`:

* **Login (`/api/auth/login`):** Limite estrito de 5 tentativas a cada 15 minutos por IP para impedir ataques de força bruta.
* **API Geral (`/api`):** Limite de 100 requisições a cada 15 minutos por IP, prevenindo *bot scalping* no mapa de assentos e preservando a cota da API do TMDb.

### 2. Autenticação e Gestão de Tokens (JWT + Strategy)

A autenticação utiliza JSON Web Tokens (JWT) trafegados no cabeçalho `Authorization: Bearer <token>`:

* **Por que `localStorage` + Headers em vez de Cookies `HttpOnly`?** Com o Frontend na Vercel e o Backend no Render (domínios distintos), a política de cookies de terceiros (*cross-site*) exige `SameSite=None; Secure`, o que frequentemente gera bloqueios imprevisíveis em navegadores. O Bearer Token via Header elimina incompatibilidades de CORS e mantém a API 100% *stateless*.
* **Tratamento de Expiração:** O Axios intercepta respostas `401 Unauthorized`. Quando o token expira, o frontend limpa os dados locais e redireciona o usuário para reautenticação.

### 3. QR Code Criptografado e Token de Compartilhamento

* Cada ingresso gera um hash criptográfico único gravado em `qr_code_hash` e um `token_compartilhamento`[cite: 4].
* O QR Code renderizado na tela contém apenas essa identificação[cite: 4]. Na portaria, ao escanear a imagem ou digitar o código, o backend atualiza o status para `'UTILIZADO'` e grava a data em `validado_em` com suporte transacional[cite: 4], **impedindo que o mesmo ingresso seja validado duas vezes**.

### 4. Integridade de Reservas: Prevenção de *Double Booking*

Para eventos do tipo `COM_ASSENTO`[cite: 3], a tabela `assentos` aplica a restrição `uk_evento_assento` entre `evento_id` e `codigo_assento`. Tentativas simultâneas de compra para a mesma cadeira são bloqueadas na camada do banco de dados.

---

## 📂 Estrutura do Projeto

```text
ProjetoTicket/
├── .env                  # Variáveis de ambiente globais (Backend + Frontend)
├── .gitignore
├── package.json          # Dependências do Backend e scripts de inicialização
├── package-lock.json
├── README.md
├── server/               # Servidor Node.js
│   ├── middlewares/      # Middlewares de autenticação e proteção
│   │   └── authMiddleware.js
│   ├── routes/           # Rotas divididas por domínio
│   │   ├── authRoutes.js
│   │   ├── eventoRoutes.js
│   │   ├── pedidoRoutes.js
│   │   └── portariaRoutes.js
│   ├── db.js             # Conexão com banco de dados MySQL
│   └── index.js          # Ponto de entrada da API Express
└── frontend/             # Aplicação React (Vite)
    ├── public/
    ├── src/
    │   ├── components/   # Navbar, RotaProtegida, etc.
    │   ├── pages/        # Telas da aplicação
    │   └── services/     # Instância centralizada do Axios (api.js)
    ├── package.json
    └── vite.config.js
```
## 🛠️ Como Configurar e Executar o Projeto

### 1. Configuração do Banco de Dados MySQL

Abra seu client MySQL (Workbench, DBeaver, etc.) e execute o script SQL abaixo para estruturar a base `plataforma_eventos` e inserir os dados iniciais de teste:

```sql
CREATE DATABASE plataforma_eventos;
USE plataforma_eventos;

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` varchar(50) NOT NULL,
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
  `id` varchar(50) NOT NULL,
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
  `organizador_id` varchar(50) NOT NULL,
  `status` varchar(20) DEFAULT 'ATIVO',
  `criado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `organizador_id` (`organizador_id`),
  CONSTRAINT `eventos_ibfk_1` FOREIGN KEY (`organizador_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Assentos
CREATE TABLE IF NOT EXISTS `assentos` (
  `id` varchar(50) NOT NULL,
  `evento_id` varchar(50) NOT NULL,
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
  `id` varchar(50) NOT NULL,
  `usuario_id` varchar(50) NOT NULL,
  `evento_id` varchar(50) NOT NULL,
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
  `id` varchar(50) NOT NULL,
  `pedido_id` varchar(50) NOT NULL,
  `cliente_id` varchar(50) NOT NULL,
  `evento_id` varchar(50) NOT NULL,
  `assento_id` varchar(50) DEFAULT NULL,
  `qr_code_hash` varchar(500) NOT NULL,
  `token_compartilhamento` varchar(50) NOT NULL,
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

-- SEED DATA
INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha`, `papel`) VALUES
('usr-org-00000000-0000-0000-000000000001', 'Organizador Master', 'organizador@elite.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGga31lW', 'ORGANIZADOR'),
('usr-cli-00000000-0000-0000-000000000001', 'Cliente Silva', 'cliente1@elite.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGga31lW', 'CLIENTE'),
('usr-cli-00000000-0000-0000-000000000002', 'Cliente Santos', 'cliente2@elite.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGga31lW', 'CLIENTE'),
('usr-por-00000000-0000-0000-000000000001', 'Agente Portaria', 'portaria@elite.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGga31lW', 'PORTARIA')
ON DUPLICATE KEY UPDATE `email`=`email`;

INSERT INTO `eventos` (`id`, `titulo`, `descricao`, `imagem_url`, `data_evento`, `local`, `capacidade`, `preco`, `tipo`, `organizador_id`, `status`) VALUES
('evt-001-00000000-0000-0000-000000000001', 'The Batman - Exibição Especial', 'Sessão exclusiva com mapa de assentos.', 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50A9223a130.jpg', '2026-10-15 20:00:00', 'Cinemark Hall 1', 50, 35.00, 'COM_ASSENTO', 'usr-org-00000000-0000-0000-000000000001', 'ATIVO')
ON DUPLICATE KEY UPDATE `id`=`id`;

INSERT INTO `assentos` (`id`, `evento_id`, `codigo_assento`, `status`) VALUES
('ast-001-00000000-0000-0000-000000000001', 'evt-001-00000000-0000-0000-000000000001', 'A1', 'DISPONIVEL'),
('ast-002-00000000-0000-0000-000000000002', 'evt-001-00000000-0000-0000-000000000001', 'A2', 'DISPONIVEL'),
('ast-003-00000000-0000-0000-000000000003', 'evt-001-00000000-0000-0000-000000000001', 'A3', 'DISPONIVEL'),
('ast-004-00000000-0000-0000-000000000004', 'evt-001-00000000-0000-0000-000000000001', 'B1', 'DISPONIVEL'),
('ast-005-00000000-0000-0000-000000000005', 'evt-001-00000000-0000-0000-000000000001', 'B2', 'DISPONIVEL')
ON DUPLICATE KEY UPDATE `id`=`id`;

### ⚙️ Configuração do Arquivo `.env` Global

O arquivo **`.env`** deve ficar localizado no **diretório raiz do projeto** (`ProjetoTicket/.env`). Ele centraliza as variáveis do servidor backend e a URL de conexão consumida pelo Vite no frontend.

```text
ProjetoTicket/
├── .env  <-- [CRIE/EDITE O ARQUIVO AQUI]
├── package.json
├── server/
└── frontend/
```

Conteúdo do arquivo **`ProjetoTicket/.env`**:

```env
# Configurações do Servidor
PORT=3001

# Conexão com o Banco de Dados
DB_HOST=localhost
DB_USER=root
DB_PASS=suasenha
DB_NAME=plataforma_eventos

# Segredos e APIs Externas
JWT_SECRET=sua_chave_secreta_jwt
TMDB_API_KEY=sua_chave_api_tmdb

# Configuração do Frontend (Vite)
VITE_API_URL=http://localhost:3001
```

---

### 🚀 Executando o Projeto

**1. Executando o Backend (Servidor)**

No terminal principal, certifique-se de estar na **raiz do projeto** (`ProjetoTicket/`):

```bash
# Instale as dependências gerais do projeto
npm install

# Inicie a API Express em modo de desenvolvimento
npm run dev
```

**2. Executando o Frontend (React)**

Abra um **segundo terminal** e navegue para dentro da pasta do frontend (`ProjetoTicket/frontend/`):

```bash
# Entre na pasta do frontend
cd frontend

# Instale as dependências da aplicação React
npm install

# Inicie o servidor de desenvolvimento do Vite
npm run dev
```

Acesse a aplicação no seu navegador em: `http://localhost:5173`

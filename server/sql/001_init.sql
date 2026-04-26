-- =============================================================================
-- 001_init.sql
-- Script de inicialização da API Gestão de Chamados.
--
-- O QUE ESTE SCRIPT FAZ:
--   1) Cria a tabela `usuarios` (autenticação da API).
--   2) (Opcional) Cria índices úteis em `chamados`.
--
-- COMO EXECUTAR:
--   No DBeaver, conectado em `tickets_db`, abra uma aba SQL,
--   cole o conteúdo deste arquivo e execute (Alt+X ou botão "Executar SQL").
--
-- SEGURANÇA: este script é idempotente (CREATE TABLE IF NOT EXISTS).
-- Rodar mais de uma vez não causa erro nem perda de dados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela de usuários para login na API
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT(11) NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(100) NULL,
  papel VARCHAR(20) NOT NULL DEFAULT 'user',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_login DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Índices úteis em `chamados` (não obrigatórios, mas ajudam a performance)
-- -----------------------------------------------------------------------------
-- Os comandos abaixo podem dar erro "duplicate key" se rodar duas vezes.
-- Se preferir pular, comente as três linhas abaixo.
CREATE INDEX idx_chamados_status   ON chamados (status);
CREATE INDEX idx_chamados_data     ON chamados (data);
CREATE INDEX idx_chamados_filial   ON chamados (filial);

-- -----------------------------------------------------------------------------
-- IMPORTANTE: NÃO INSIRA O USUÁRIO ADMIN AQUI.
-- O hash bcrypt da senha será gerado pelo script Node:
--    cd server && npm run create-user
-- =============================================================================

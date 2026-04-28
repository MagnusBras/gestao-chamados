-- =============================================================================
-- 002_chamados_owner.sql
-- Adiciona coluna `criado_por` em `chamados` para permitir que cada usuário
-- enxergue apenas os chamados que ele mesmo criou (admin continua vendo tudo).
--
-- COMO EXECUTAR:
--   No DBeaver, conectado em `tickets_db`, abra uma aba SQL,
--   cole o conteúdo deste arquivo e execute (Alt+X).
--
-- IMPORTANTE: este script NÃO é totalmente idempotente. Se rodar duas vezes,
-- vai dar erro de "Duplicate column name", "Duplicate foreign key", etc. —
-- não causa perda de dados, é seguro ignorar a partir da segunda execução.
-- =============================================================================

-- Coluna nova: dono do chamado
ALTER TABLE chamados ADD COLUMN criado_por INT(11) NULL;

-- Foreign key: se o usuário for excluído, criado_por vira NULL (admin segue vendo)
ALTER TABLE chamados
  ADD CONSTRAINT fk_chamados_criado_por
  FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Índice para acelerar filtros por dono
CREATE INDEX idx_chamados_criado_por ON chamados (criado_por);

-- Atribui chamados existentes (sem dono) ao PRIMEIRO admin do sistema.
-- Você pode comentar estas duas linhas se preferir deixar os antigos órfãos
-- (apenas admin os enxerga, ninguém mais).
SET @admin_id := (SELECT id FROM usuarios WHERE papel = 'admin' ORDER BY id LIMIT 1);
UPDATE chamados SET criado_por = @admin_id WHERE criado_por IS NULL;

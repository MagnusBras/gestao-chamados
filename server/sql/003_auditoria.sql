-- =============================================================================
-- 003_auditoria.sql
-- Tabela de log/auditoria. Toda ação relevante na API gera uma linha aqui.
-- Permite ao admin ver quem fez o quê e quando.
--
-- COMO EXECUTAR:
--   No DBeaver, conectado em `tickets_db`, execute o conteúdo (Alt+X).
--
-- POLÍTICA DE RETENÇÃO (sugestão futura):
--   Para evitar que a tabela cresça indefinidamente, considere agendar:
--     DELETE FROM auditoria WHERE ts < (NOW() - INTERVAL 1 YEAR);
--   Para 2-5 usuários, dá pra deixar crescer livremente por anos antes
--   de virar problema de espaço.
-- =============================================================================

CREATE TABLE IF NOT EXISTS auditoria (
  id INT(11) NOT NULL AUTO_INCREMENT,
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT(11) NULL,                      -- pode ser NULL em login com usuário inexistente
  usuario_username VARCHAR(50) NULL,            -- snapshot no momento (sobrevive à exclusão do usuário)
  acao VARCHAR(50) NOT NULL,                    -- ex: AUTH_LOGIN_OK, CHAMADO_EDITAR
  recurso VARCHAR(50) NULL,                     -- ex: chamado, usuario, auth
  recurso_id INT(11) NULL,                      -- id do recurso afetado
  detalhes TEXT NULL,                           -- JSON com payload, motivo, etc.
  ip VARCHAR(45) NULL,                          -- IPv4 ou IPv6
  PRIMARY KEY (id),
  KEY idx_auditoria_ts (ts),
  KEY idx_auditoria_usuario (usuario_id),
  KEY idx_auditoria_acao (acao),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

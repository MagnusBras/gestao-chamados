import pool from "./db.js";
import type { Request } from "express";

type AuditOptions = {
  recurso?: string;
  recursoId?: number;
  detalhes?: unknown;
  // Para casos onde req.user ainda não existe (ex: rota de login).
  usuarioId?: number | null;
  usuarioUsername?: string | null;
};

/**
 * Registra um evento na tabela `auditoria`.
 * Esta função NUNCA lança erro: falha de log não derruba a operação principal.
 *
 * Uso típico (rota autenticada):
 *   await audit(req, "CHAMADO_EDITAR", { recurso: "chamado", recursoId: id, detalhes: c });
 *
 * Uso atípico (rota de login, antes de ter req.user):
 *   await audit(req, "AUTH_LOGIN_OK", {
 *     usuarioId: user.id,
 *     usuarioUsername: user.username,
 *     recurso: "auth",
 *     recursoId: user.id,
 *   });
 */
export async function audit(
  req: Request | null,
  acao: string,
  opts: AuditOptions = {}
): Promise<void> {
  const usuarioId =
    opts.usuarioId !== undefined ? opts.usuarioId : req?.user?.id ?? null;
  const usuarioUsername =
    opts.usuarioUsername !== undefined
      ? opts.usuarioUsername
      : req?.user?.username ?? null;
  const ip = req?.ip ?? null;

  try {
    await pool.query(
      `INSERT INTO auditoria
        (usuario_id, usuario_username, acao, recurso, recurso_id, detalhes, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        usuarioUsername,
        acao,
        opts.recurso ?? null,
        opts.recursoId ?? null,
        opts.detalhes !== undefined ? JSON.stringify(opts.detalhes) : null,
        ip,
      ]
    );
  } catch (err) {
    // Falha de auditoria nunca derruba a operação principal.
    console.warn(`[audit] Falha ao registrar ${acao}:`, err);
  }
}

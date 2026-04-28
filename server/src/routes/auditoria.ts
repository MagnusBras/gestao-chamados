import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import pool from "../db.js";

const router = Router();

interface AuditoriaRow extends RowDataPacket {
  id: number;
  ts: string;
  usuario_id: number | null;
  usuario_username: string | null;
  acao: string;
  recurso: string | null;
  recurso_id: number | null;
  detalhes: string | null;
  ip: string | null;
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

// GET /api/auditoria?limit=100&offset=0&acao=CHAMADO_EDITAR&usuarioId=2
router.get("/", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const acao = typeof req.query.acao === "string" ? req.query.acao : null;
  const usuarioId =
    req.query.usuarioId != null ? Number(req.query.usuarioId) : null;

  const where: string[] = [];
  const params: unknown[] = [];
  if (acao) {
    where.push("acao = ?");
    params.push(acao);
  }
  if (Number.isFinite(usuarioId) && usuarioId! > 0) {
    where.push("usuario_id = ?");
    params.push(usuarioId);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const [rows] = await pool.query<AuditoriaRow[]>(
      `SELECT id, ts, usuario_id, usuario_username, acao, recurso, recurso_id, detalhes, ip
       FROM auditoria
       ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        ts: r.ts,
        usuarioId: r.usuario_id,
        usuarioUsername: r.usuario_username,
        acao: r.acao,
        recurso: r.recurso,
        recursoId: r.recurso_id,
        detalhes: r.detalhes ? safeParseJson(r.detalhes) : null,
        ip: r.ip,
      }))
    );
  } catch (err) {
    console.error("[auditoria] GET:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;

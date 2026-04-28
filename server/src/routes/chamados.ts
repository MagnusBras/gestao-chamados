import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../db.js";
import { chamadoSchema } from "../schemas.js";
import { audit } from "../auditoria.js";

const router = Router();

interface ChamadoRow extends RowDataPacket {
  id: number;
  oc: string | null;
  filial: string | null;
  tecnico: string | null;
  numero_chamado: string | null;
  data: string | null;
  fornecedor: string | null;
  valor_oc: string | null;
  status: string | null;
  criado_por: number | null;
  criado_por_username: string | null;
}

// Mapeia linha do banco (snake_case + JOIN) para o formato da API (camelCase)
function dbRowToChamado(row: ChamadoRow) {
  return {
    id: row.id,
    oc: row.oc,
    filial: row.filial,
    tecnico: row.tecnico,
    numeroChamado: row.numero_chamado,
    data: row.data,
    fornecedor: row.fornecedor,
    valorOC: row.valor_oc != null ? Number(row.valor_oc) : null,
    status: row.status,
    criadoPor: row.criado_por,
    criadoPorUsername: row.criado_por_username,
  };
}

const SELECT_COLS = `
  c.id, c.oc, c.filial, c.tecnico, c.numero_chamado, c.data, c.fornecedor,
  c.valor_oc, c.status, c.criado_por,
  u.username AS criado_por_username
`.trim();

const FROM_JOIN = "FROM chamados c LEFT JOIN usuarios u ON u.id = c.criado_por";

// GET /api/chamados — lista (admin vê tudo; user só os próprios)
router.get("/", async (req, res) => {
  const isAdmin = req.user!.papel === "admin";
  try {
    const sql = isAdmin
      ? `SELECT ${SELECT_COLS} ${FROM_JOIN} ORDER BY c.id DESC`
      : `SELECT ${SELECT_COLS} ${FROM_JOIN} WHERE c.criado_por = ? ORDER BY c.id DESC`;
    const params = isAdmin ? [] : [req.user!.id];
    const [rows] = await pool.query<ChamadoRow[]>(sql, params);
    res.json(rows.map(dbRowToChamado));
  } catch (err) {
    console.error("[chamados] GET:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/chamados/:id — busca um (com check de dono)
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  const isAdmin = req.user!.papel === "admin";
  try {
    const sql = isAdmin
      ? `SELECT ${SELECT_COLS} ${FROM_JOIN} WHERE c.id = ?`
      : `SELECT ${SELECT_COLS} ${FROM_JOIN} WHERE c.id = ? AND c.criado_por = ?`;
    const params = isAdmin ? [id] : [id, req.user!.id];
    const [rows] = await pool.query<ChamadoRow[]>(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Chamado não encontrado" });
    }
    res.json(dbRowToChamado(rows[0]));
  } catch (err) {
    console.error("[chamados] GET /:id:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/chamados — cria (criado_por = usuário logado)
router.post("/", async (req, res) => {
  const parsed = chamadoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Entrada inválida",
      details: parsed.error.flatten(),
    });
  }
  const c = parsed.data;
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO chamados
        (oc, filial, tecnico, numero_chamado, data, fornecedor, valor_oc, status, criado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.oc ?? null,
        c.filial ?? null,
        c.tecnico ?? null,
        c.numeroChamado ?? null,
        c.data ?? null,
        c.fornecedor ?? null,
        c.valorOC ?? null,
        c.status ?? null,
        req.user!.id,
      ]
    );
    const [rows] = await pool.query<ChamadoRow[]>(
      `SELECT ${SELECT_COLS} ${FROM_JOIN} WHERE c.id = ?`,
      [result.insertId]
    );
    await audit(req, "CHAMADO_CRIAR", {
      recurso: "chamado",
      recursoId: result.insertId,
      detalhes: c,
    });
    res.status(201).json(dbRowToChamado(rows[0]));
  } catch (err) {
    console.error("[chamados] POST:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PATCH /api/chamados/:id — atualiza parcial (com check de dono)
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  const parsed = chamadoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Entrada inválida",
      details: parsed.error.flatten(),
    });
  }
  const c = parsed.data;
  const isAdmin = req.user!.papel === "admin";

  const fieldMap: Record<string, string> = {
    oc: "oc",
    filial: "filial",
    tecnico: "tecnico",
    numeroChamado: "numero_chamado",
    data: "data",
    fornecedor: "fornecedor",
    valorOC: "valor_oc",
    status: "status",
  };

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in c) {
      sets.push(`${col} = ?`);
      values.push((c as Record<string, unknown>)[key] ?? null);
    }
  }
  if (sets.length === 0) {
    return res.status(400).json({ error: "Nada para atualizar" });
  }

  // Cláusula WHERE com check de dono (admin pula o check)
  const whereOwner = isAdmin ? "" : " AND criado_por = ?";
  const updateParams = isAdmin
    ? [...values, id]
    : [...values, id, req.user!.id];

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE chamados SET ${sets.join(", ")} WHERE id = ?${whereOwner}`,
      updateParams
    );
    if (result.affectedRows === 0) {
      // Pode ser que o chamado não exista OU não seja do usuário —
      // retornamos 404 nos dois casos para não vazar existência.
      return res.status(404).json({ error: "Chamado não encontrado" });
    }
    const [rows] = await pool.query<ChamadoRow[]>(
      `SELECT ${SELECT_COLS} ${FROM_JOIN} WHERE c.id = ?`,
      [id]
    );
    await audit(req, "CHAMADO_EDITAR", {
      recurso: "chamado",
      recursoId: id,
      detalhes: c,
    });
    res.json(dbRowToChamado(rows[0]));
  } catch (err) {
    console.error("[chamados] PATCH:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/chamados/:id — remove (com check de dono)
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  const isAdmin = req.user!.papel === "admin";
  const whereOwner = isAdmin ? "" : " AND criado_por = ?";
  const params = isAdmin ? [id] : [id, req.user!.id];

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM chamados WHERE id = ?${whereOwner}`,
      params
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Chamado não encontrado" });
    }
    await audit(req, "CHAMADO_EXCLUIR", {
      recurso: "chamado",
      recursoId: id,
    });
    res.status(204).send();
  } catch (err) {
    console.error("[chamados] DELETE:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;

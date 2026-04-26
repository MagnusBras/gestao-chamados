import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../db.js";
import { chamadoSchema } from "../schemas.js";

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
}

// Mapeia linha do banco (snake_case) para o formato da API (camelCase)
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
  };
}

const SELECT_COLS =
  "id, oc, filial, tecnico, numero_chamado, data, fornecedor, valor_oc, status";

// GET /api/chamados — lista todos
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query<ChamadoRow[]>(
      `SELECT ${SELECT_COLS} FROM chamados ORDER BY id DESC`
    );
    res.json(rows.map(dbRowToChamado));
  } catch (err) {
    console.error("[chamados] GET:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/chamados/:id — busca um
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    const [rows] = await pool.query<ChamadoRow[]>(
      `SELECT ${SELECT_COLS} FROM chamados WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Chamado não encontrado" });
    }
    res.json(dbRowToChamado(rows[0]));
  } catch (err) {
    console.error("[chamados] GET /:id:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/chamados — cria um
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
      `INSERT INTO chamados (oc, filial, tecnico, numero_chamado, data, fornecedor, valor_oc, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.oc ?? null,
        c.filial ?? null,
        c.tecnico ?? null,
        c.numeroChamado ?? null,
        c.data ?? null,
        c.fornecedor ?? null,
        c.valorOC ?? null,
        c.status ?? null,
      ]
    );
    const [rows] = await pool.query<ChamadoRow[]>(
      `SELECT ${SELECT_COLS} FROM chamados WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(dbRowToChamado(rows[0]));
  } catch (err) {
    console.error("[chamados] POST:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PATCH /api/chamados/:id — atualiza parcial
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

  // Mapa camelCase → snake_case
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
  values.push(id);

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE chamados SET ${sets.join(", ")} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Chamado não encontrado" });
    }
    const [rows] = await pool.query<ChamadoRow[]>(
      `SELECT ${SELECT_COLS} FROM chamados WHERE id = ?`,
      [id]
    );
    res.json(dbRowToChamado(rows[0]));
  } catch (err) {
    console.error("[chamados] PATCH:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/chamados/:id — remove
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM chamados WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Chamado não encontrado" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("[chamados] DELETE:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;

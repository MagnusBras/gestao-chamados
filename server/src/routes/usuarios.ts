import { Router } from "express";
import bcrypt from "bcryptjs";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../db.js";
import {
  usuarioCreateSchema,
  usuarioUpdateSchema,
  senhaUpdateSchema,
} from "../schemas.js";

const router = Router();

interface UsuarioRow extends RowDataPacket {
  id: number;
  username: string;
  nome: string | null;
  papel: string;
  ativo: number;
  criado_em: string;
  ultimo_login: string | null;
}

const SELECT_COLS =
  "id, username, nome, papel, ativo, criado_em, ultimo_login";

function rowToUsuario(row: UsuarioRow) {
  return {
    id: row.id,
    username: row.username,
    nome: row.nome,
    papel: row.papel,
    ativo: row.ativo === 1,
    criadoEm: row.criado_em,
    ultimoLogin: row.ultimo_login,
  };
}

// GET /api/usuarios — lista todos
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query<UsuarioRow[]>(
      `SELECT ${SELECT_COLS} FROM usuarios ORDER BY id ASC`
    );
    res.json(rows.map(rowToUsuario));
  } catch (err) {
    console.error("[usuarios] GET:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/usuarios — cria novo
router.post("/", async (req, res) => {
  const parsed = usuarioCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Entrada inválida",
      details: parsed.error.flatten(),
    });
  }
  const { username, password, nome, papel } = parsed.data;
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO usuarios (username, password_hash, nome, papel) VALUES (?, ?, ?, ?)",
      [username, hash, nome ?? null, papel]
    );
    const [rows] = await pool.query<UsuarioRow[]>(
      `SELECT ${SELECT_COLS} FROM usuarios WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(rowToUsuario(rows[0]));
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Username já existe" });
    }
    console.error("[usuarios] POST:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PATCH /api/usuarios/:id — atualiza nome / papel / ativo
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  // Proteção: admin não pode alterar a si mesmo (evita auto-rebaixar e perder acesso)
  if (id === req.user!.id) {
    return res.status(400).json({
      error:
        "Você não pode alterar seu próprio papel/status. Use outra conta admin.",
    });
  }

  const parsed = usuarioUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Entrada inválida",
      details: parsed.error.flatten(),
    });
  }
  const data = parsed.data;

  const sets: string[] = [];
  const values: unknown[] = [];
  if ("nome" in data) {
    sets.push("nome = ?");
    values.push(data.nome ?? null);
  }
  if ("papel" in data) {
    sets.push("papel = ?");
    values.push(data.papel);
  }
  if ("ativo" in data) {
    sets.push("ativo = ?");
    values.push(data.ativo ? 1 : 0);
  }
  if (sets.length === 0) {
    return res.status(400).json({ error: "Nada para atualizar" });
  }
  values.push(id);

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE usuarios SET ${sets.join(", ")} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    const [rows] = await pool.query<UsuarioRow[]>(
      `SELECT ${SELECT_COLS} FROM usuarios WHERE id = ?`,
      [id]
    );
    res.json(rowToUsuario(rows[0]));
  } catch (err) {
    console.error("[usuarios] PATCH:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PATCH /api/usuarios/:id/senha — admin reseta a senha de um usuário
router.patch("/:id/senha", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  const parsed = senhaUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Entrada inválida",
      details: parsed.error.flatten(),
    });
  }
  try {
    const hash = await bcrypt.hash(parsed.data.password, 10);
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE usuarios SET password_hash = ? WHERE id = ?",
      [hash, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[usuarios] PATCH senha:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/usuarios/:id — remove usuário
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  // Proteção: admin não pode excluir a si mesmo
  if (id === req.user!.id) {
    return res.status(400).json({ error: "Você não pode excluir a si mesmo" });
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM usuarios WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("[usuarios] DELETE:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;

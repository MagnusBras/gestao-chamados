import { Router } from "express";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import pool from "../db.js";
import { loginSchema } from "../schemas.js";
import { signToken } from "../auth.js";

const router = Router();

interface UsuarioRow extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
  papel: string;
  ativo: number;
}

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Entrada inválida",
      details: parsed.error.flatten(),
    });
  }
  const { username, password } = parsed.data;

  try {
    const [rows] = await pool.query<UsuarioRow[]>(
      "SELECT id, username, password_hash, papel, ativo FROM usuarios WHERE username = ? LIMIT 1",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }
    const user = rows[0];
    if (!user.ativo) {
      return res.status(401).json({ error: "Usuário desativado" });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }

    // Atualiza ultimo_login em background (não bloqueia a resposta)
    pool
      .query("UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?", [user.id])
      .catch((err) => console.warn("[auth] Falha ao atualizar ultimo_login:", err));

    const token = signToken({
      id: user.id,
      username: user.username,
      papel: user.papel,
    });
    res.json({
      token,
      user: { id: user.id, username: user.username, papel: user.papel },
    });
  } catch (err) {
    console.error("[auth] Erro no login:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;

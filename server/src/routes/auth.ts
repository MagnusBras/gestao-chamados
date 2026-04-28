import { Router } from "express";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import pool from "../db.js";
import { loginSchema } from "../schemas.js";
import { signToken } from "../auth.js";
import { audit } from "../auditoria.js";

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
      await audit(req, "AUTH_LOGIN_FALHA", {
        detalhes: { username, motivo: "usuario_nao_existe" },
      });
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }
    const user = rows[0];
    if (!user.ativo) {
      await audit(req, "AUTH_LOGIN_FALHA", {
        usuarioId: user.id,
        usuarioUsername: user.username,
        detalhes: { motivo: "usuario_inativo" },
      });
      return res.status(401).json({ error: "Usuário desativado" });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      await audit(req, "AUTH_LOGIN_FALHA", {
        usuarioId: user.id,
        usuarioUsername: user.username,
        detalhes: { motivo: "senha_invalida" },
      });
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }

    // Atualiza ultimo_login em background
    pool
      .query("UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?", [user.id])
      .catch((err) => console.warn("[auth] Falha ao atualizar ultimo_login:", err));

    await audit(req, "AUTH_LOGIN_OK", {
      usuarioId: user.id,
      usuarioUsername: user.username,
      recurso: "auth",
      recursoId: user.id,
    });

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

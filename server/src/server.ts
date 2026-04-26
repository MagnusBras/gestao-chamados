import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./db.js";
import authRoutes from "./routes/auth.js";
import chamadosRoutes from "./routes/chamados.js";
import usuariosRoutes from "./routes/usuarios.js";
import { requireAuth, requireAdmin } from "./auth.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());

// Healthcheck — retorna 200 se a API subiu E conseguiu falar com o MySQL.
app.get("/api/health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok, NOW() AS now_db");
    res.json({ api: "ok", db: "ok", details: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[health] Falha ao consultar o banco:", message);
    res.status(500).json({ api: "ok", db: "error", error: message });
  }
});

app.get("/", (_req, res) => {
  res.json({
    name: "gestao-chamados-api",
    status: "running",
    health: "/api/health",
  });
});

// Rotas públicas (não exigem token)
app.use("/api/auth", authRoutes);

// Rotas protegidas (exigem JWT no header Authorization: Bearer <token>)
app.use("/api/chamados", requireAuth, chamadosRoutes);
app.get("/api/me", requireAuth, (req, res) => res.json({ user: req.user }));

// Rotas de gestão de usuários (admin-only)
app.use("/api/usuarios", requireAuth, requireAdmin, usuariosRoutes);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`API gestão-chamados rodando em http://localhost:${PORT}`);
  console.log(`Healthcheck: http://localhost:${PORT}/api/health`);
});

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pool from "./db.js";
import authRoutes from "./routes/auth.js";
import chamadosRoutes from "./routes/chamados.js";
import usuariosRoutes from "./routes/usuarios.js";
import auditoriaRoutes from "./routes/auditoria.js";
import { requireAuth, requireAdmin } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());

// ============================================================================
// Rotas da API
// ============================================================================

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

// Rotas públicas (não exigem token)
app.use("/api/auth", authRoutes);

// Rotas protegidas (exigem JWT no header Authorization: Bearer <token>)
app.use("/api/chamados", requireAuth, chamadosRoutes);
app.get("/api/me", requireAuth, (req, res) => res.json({ user: req.user }));

// Rotas de gestão de usuários (admin-only)
app.use("/api/usuarios", requireAuth, requireAdmin, usuariosRoutes);

// Rota de auditoria/log (admin-only)
app.use("/api/auditoria", requireAuth, requireAdmin, auditoriaRoutes);

// 404 explícito para rotas /api/* não conhecidas (evita cair no SPA fallback)
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Endpoint não encontrado" });
});

// ============================================================================
// Frontend estático (em produção / Docker)
// ============================================================================
// Procura o build do Vite em ../../dist (relativo a server/src/server.ts).
// Pode ser sobrescrito com a variável de ambiente FRONTEND_DIST.
const frontendDist =
  process.env.FRONTEND_DIST ?? path.resolve(__dirname, "../../dist");

if (existsSync(frontendDist)) {
  console.log(`[server] Servindo frontend estático de: ${frontendDist}`);
  app.use(express.static(frontendDist));
  // SPA fallback: qualquer GET não-API retorna index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  // Modo dev — frontend é servido pelo Vite separadamente.
  app.get("/", (_req, res) => {
    res.json({
      name: "gestao-chamados-api",
      status: "running",
      health: "/api/health",
      hint: "Frontend não encontrado em " + frontendDist + " (modo dev?)",
    });
  });
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`API gestão-chamados rodando em http://localhost:${PORT}`);
  console.log(`Healthcheck: http://localhost:${PORT}/api/health`);
});

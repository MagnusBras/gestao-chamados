/**
 * Script CLI para criar usuários da API.
 *
 * Uso: a partir da pasta `server/`:
 *    npm run create-user
 *
 * O script vai pedir username, nome (opcional), senha e papel (admin/user).
 *
 * NOTA: a senha é exibida em texto claro enquanto você digita (limitação simples
 * de Windows + Node). Para produção, considere usar uma ferramenta dedicada.
 */
import "dotenv/config";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import type { ResultSetHeader } from "mysql2";
import pool from "../src/db.js";

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log("=== Criar novo usuário ===\n");

  const username = (await rl.question("Username: ")).trim();
  if (!username) {
    console.error("\n❌ Username é obrigatório.");
    process.exit(1);
  }

  const nomeRaw = (await rl.question("Nome completo (opcional): ")).trim();
  const nome = nomeRaw || null;

  const password = await rl.question("Senha (mínimo 6 caracteres): ");
  if (password.length < 6) {
    console.error("\n❌ Senha muito curta.");
    process.exit(1);
  }

  const papelRaw = (await rl.question("Papel (admin/user) [user]: ")).trim();
  const papel = papelRaw || "user";
  if (!["admin", "user"].includes(papel)) {
    console.error("\n❌ Papel deve ser 'admin' ou 'user'.");
    process.exit(1);
  }

  rl.close();

  console.log("\nGerando hash da senha...");
  const hash = await bcrypt.hash(password, 10);

  try {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO usuarios (username, password_hash, nome, papel) VALUES (?, ?, ?, ?)",
      [username, hash, nome, papel]
    );
    console.log(
      `\n✅ Usuário '${username}' criado com sucesso (id=${result.insertId}, papel=${papel}).`
    );
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "ER_DUP_ENTRY") {
      console.error(`\n❌ Usuário '${username}' já existe no banco.`);
    } else {
      console.error("\n❌ Erro ao criar usuário:", e.message ?? err);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});

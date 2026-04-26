import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  console.error(
    "[db] Variáveis de ambiente faltando. Confira o arquivo server/.env (use .env.example como referência)."
  );
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Mantém DATE como "YYYY-MM-DD" em vez de objeto Date — facilita conversão
  dateStrings: true,
});

export default pool;

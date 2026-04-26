import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

if (!JWT_SECRET) {
  console.error("[auth] JWT_SECRET não configurado em .env. Encerrando.");
  process.exit(1);
}

export type AuthUser = {
  id: number;
  username: string;
  papel: string;
};

export function signToken(user: AuthUser): string {
  // jwt.sign aceita string como expiresIn ('8h', '1d', etc.)
  return jwt.sign(user, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token ausente" });
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

// Use SEMPRE depois de requireAuth na cadeia de middlewares.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  if (req.user.papel !== "admin") {
    return res.status(403).json({ error: "Apenas administradores" });
  }
  next();
}

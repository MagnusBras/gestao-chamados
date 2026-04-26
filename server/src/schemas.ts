import { z } from "zod";

const STATUS_VALUES = ["Aprovado", "Pendente", "Recusado"] as const;

// String opcional, com trim e limite de tamanho
const optionalString = (max: number) =>
  z.string().trim().max(max).optional().nullable();

// Aceita "dd/mm/aaaa", "YYYY-MM-DD", "" (empty), null ou undefined
// Sempre retorna "YYYY-MM-DD" ou null
const optionalDate = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return null;
    if (typeof val !== "string") return val;
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split("/");
      return `${y}-${m}-${d}`;
    }
    return trimmed;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar em dd/mm/aaaa ou YYYY-MM-DD")
    .nullable()
    .optional()
);

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username obrigatório"),
  password: z.string().min(1, "Senha obrigatória"),
});

export const chamadoSchema = z.object({
  oc: optionalString(50),
  filial: optionalString(100),
  tecnico: optionalString(100),
  numeroChamado: optionalString(50),
  data: optionalDate,
  fornecedor: optionalString(100),
  valorOC: z.number().nullable().optional(),
  status: z.enum(STATUS_VALUES).nullable().optional(),
});

// ============================================================================
// Schemas de gestão de usuários (admin-only)
// ============================================================================

export const usuarioCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username obrigatório")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, underline ou hífen"),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
  nome: z.string().trim().max(100).nullable().optional(),
  papel: z.enum(["admin", "user"]).default("user"),
});

export const usuarioUpdateSchema = z.object({
  nome: z.string().trim().max(100).nullable().optional(),
  papel: z.enum(["admin", "user"]).optional(),
  ativo: z.boolean().optional(),
});

export const senhaUpdateSchema = z.object({
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChamadoInput = z.infer<typeof chamadoSchema>;
export type UsuarioCreateInput = z.infer<typeof usuarioCreateSchema>;
export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>;

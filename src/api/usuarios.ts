import { api } from "./client";

export type Papel = "admin" | "user";

export type Usuario = {
  id: number;
  username: string;
  nome: string | null;
  papel: Papel;
  ativo: boolean;
  criadoEm: string;
  ultimoLogin: string | null;
};

export type UsuarioCreateInput = {
  username: string;
  password: string;
  nome?: string | null;
  papel?: Papel;
};

export type UsuarioUpdateInput = {
  nome?: string | null;
  papel?: Papel;
  ativo?: boolean;
};

export const usuariosApi = {
  list: (token: string) => api.get<Usuario[]>("/api/usuarios", token),
  create: (data: UsuarioCreateInput, token: string) =>
    api.post<Usuario>("/api/usuarios", data, token),
  update: (id: number, data: UsuarioUpdateInput, token: string) =>
    api.patch<Usuario>(`/api/usuarios/${id}`, data, token),
  setPassword: (id: number, password: string, token: string) =>
    api.patch<{ ok: true }>(`/api/usuarios/${id}/senha`, { password }, token),
  remove: (id: number, token: string) =>
    api.del<void>(`/api/usuarios/${id}`, token),
};

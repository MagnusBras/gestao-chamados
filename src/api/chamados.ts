import { api } from "./client";

export type Status = "Aprovado" | "Pendente" | "Recusado";

// Formato que a API retorna/aceita (camelCase, data em YYYY-MM-DD ou dd/mm/aaaa)
export type ChamadoApi = {
  id: number;
  oc: string | null;
  filial: string | null;
  tecnico: string | null;
  numeroChamado: string | null;
  data: string | null;
  fornecedor: string | null;
  valorOC: number | null;
  status: Status | null;
  // Definidos pelo servidor (não enviados em PATCH/POST)
  criadoPor: number | null;
  criadoPorUsername: string | null;
};

export type ChamadoInput = Omit<Partial<ChamadoApi>, "id">;

export const chamadosApi = {
  list: (token: string) => api.get<ChamadoApi[]>("/api/chamados", token),
  create: (data: ChamadoInput, token: string) =>
    api.post<ChamadoApi>("/api/chamados", data, token),
  update: (id: number, data: ChamadoInput, token: string) =>
    api.patch<ChamadoApi>(`/api/chamados/${id}`, data, token),
  remove: (id: number, token: string) =>
    api.del<void>(`/api/chamados/${id}`, token),
};

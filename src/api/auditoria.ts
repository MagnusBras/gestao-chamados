import { api } from "./client";

export type EventoAuditoria = {
  id: number;
  ts: string; // "2026-04-28 01:48:00"
  usuarioId: number | null;
  usuarioUsername: string | null;
  acao: string;
  recurso: string | null;
  recursoId: number | null;
  detalhes: unknown | null;
  ip: string | null;
};

export type ListAuditoriaOptions = {
  limit?: number;
  offset?: number;
  acao?: string;
  usuarioId?: number;
};

export const auditoriaApi = {
  list: (token: string, opts: ListAuditoriaOptions = {}) => {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.offset != null) params.set("offset", String(opts.offset));
    if (opts.acao) params.set("acao", opts.acao);
    if (opts.usuarioId != null) params.set("usuarioId", String(opts.usuarioId));
    const qs = params.toString();
    return api.get<EventoAuditoria[]>(
      `/api/auditoria${qs ? `?${qs}` : ""}`,
      token
    );
  },
};

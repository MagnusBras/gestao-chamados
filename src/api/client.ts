// Camada genérica de chamadas HTTP para a API.
// Todas as funções de domínio (auth, chamados, usuarios) chamam isto.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export type ApiError = {
  error: string;
  details?: unknown;
};

export class HttpError extends Error {
  constructor(
    public status: number,
    public payload: ApiError
  ) {
    super(payload.error || `HTTP ${status}`);
  }
}

type RequestOptions = RequestInit & { token?: string | null };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    ...((headers as Record<string, string>) ?? {}),
  };
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }
  if (rest.body && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders });

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    throw new HttpError(
      res.status,
      typeof body === "object" ? body : { error: String(body) }
    );
  }

  return body as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: "GET", token }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), token }),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), token }),
  del: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: "DELETE", token }),
};

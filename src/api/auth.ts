import { api } from "./client";

export type User = {
  id: number;
  username: string;
  papel: "admin" | "user";
};

export type LoginResponse = {
  token: string;
  user: User;
};

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { username, password }),
  me: (token: string) => api.get<{ user: User }>("/api/me", token),
};

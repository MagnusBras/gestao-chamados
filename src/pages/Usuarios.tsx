import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import {
  usuariosApi,
  type Usuario,
  type Papel,
} from "../api/usuarios";
import { HttpError } from "../api/client";
import PasswordInput from "../components/PasswordInput";

export default function Usuarios() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form de criação
  const [newUsername, setNewUsername] = useState("");
  const [newNome, setNewNome] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPapel, setNewPapel] = useState<Papel>("user");
  const [creating, setCreating] = useState(false);

  // Modal de troca de senha
  const [resetForId, setResetForId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  function loadUsers() {
    if (!token) return;
    setLoading(true);
    setError(null);
    usuariosApi
      .list(token)
      .then(setUsers)
      .catch((err: unknown) => {
        const msg =
          err instanceof HttpError ? err.payload.error : "Erro ao carregar usuários";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (creating || !token) return;
    setCreating(true);
    setError(null);
    try {
      const created = await usuariosApi.create(
        {
          username: newUsername.trim(),
          password: newPassword,
          nome: newNome.trim() || null,
          papel: newPapel,
        },
        token
      );
      setUsers((prev) => [...prev, created]);
      setNewUsername("");
      setNewNome("");
      setNewPassword("");
      setNewPapel("user");
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.payload.error : "Erro ao criar usuário";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function togglePapel(u: Usuario) {
    if (!token) return;
    if (u.id === currentUser?.id) return;
    const novoPapel: Papel = u.papel === "admin" ? "user" : "admin";
    try {
      const updated = await usuariosApi.update(u.id, { papel: novoPapel }, token);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.payload.error : "Erro ao atualizar";
      setError(msg);
    }
  }

  async function toggleAtivo(u: Usuario) {
    if (!token) return;
    if (u.id === currentUser?.id) return;
    try {
      const updated = await usuariosApi.update(u.id, { ativo: !u.ativo }, token);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.payload.error : "Erro ao atualizar";
      setError(msg);
    }
  }

  async function handleDelete(u: Usuario) {
    if (!token) return;
    if (u.id === currentUser?.id) return;
    if (!confirm(`Excluir o usuário "${u.username}"? Essa ação é irreversível.`)) return;
    try {
      await usuariosApi.remove(u.id, token);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.payload.error : "Erro ao excluir";
      setError(msg);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (resetting || !token || resetForId == null) return;
    setResetting(true);
    setError(null);
    try {
      await usuariosApi.setPassword(resetForId, resetPassword, token);
      setResetForId(null);
      setResetPassword("");
      alert("Senha redefinida com sucesso.");
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.payload.error : "Erro ao redefinir senha";
      setError(msg);
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#cbd5e1" }}>
        Carregando usuários...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(220, 38, 38, 0.18)",
            border: "1px solid rgba(220, 38, 38, 0.4)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Form de criação */}
      <form
        onSubmit={handleCreate}
        style={{
          ...glassPanel(),
          padding: 16,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 140px 140px",
          gap: 10,
          alignItems: "end",
        }}
      >
        <div style={{ gridColumn: "1 / -1", fontWeight: 900, fontSize: 18 }}>
          Criar novo usuário
        </div>
        <Field label="Username">
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
            placeholder="ex.: joao.silva"
            style={inputStyle}
          />
        </Field>
        <Field label="Nome completo (opcional)">
          <input
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            placeholder="ex.: João Silva"
            style={inputStyle}
          />
        </Field>
        <Field label="Senha (mín. 6)">
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            required
            minLength={6}
            style={inputStyle}
          />
        </Field>
        <Field label="Papel">
          <select
            value={newPapel}
            onChange={(e) => setNewPapel(e.target.value as Papel)}
            style={inputStyle}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </Field>
        <button
          type="submit"
          disabled={creating || !newUsername || newPassword.length < 6}
          style={{
            background: creating ? "#475569" : "#16a34a",
            border: "none",
            color: "white",
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 800,
            cursor: creating ? "not-allowed" : "pointer",
            height: 42,
          }}
        >
          {creating ? "Criando..." : "Criar"}
        </button>
      </form>

      {/* Tabela */}
      <div style={{ ...glassPanel(), overflow: "hidden" }}>
        <div
          style={{
            background:
              "linear-gradient(90deg, rgba(255, 117, 4, 0.92), rgb(192, 179, 11), rgba(255, 117, 4, 0.92))",
            padding: 14,
            fontWeight: 900,
            fontSize: 22,
            textAlign: "center",
          }}
        >
          Usuários
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(2,6,23,0.35)", color: "#cbd5e1" }}>
                {["ID", "USERNAME", "NOME", "PAPEL", "ATIVO", "ÚLTIMO LOGIN", "AÇÕES"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "12px",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === currentUser?.id;
                return (
                  <tr key={u.id} style={{ borderTop: "1px solid rgba(75,85,99,0.25)" }}>
                    <td style={{ padding: 10 }}>{u.id}</td>
                    <td style={{ padding: 10, fontWeight: 700 }}>
                      {u.username} {isMe && <Tag color="#86efac">você</Tag>}
                    </td>
                    <td style={{ padding: 10, color: "#cbd5e1" }}>{u.nome ?? "—"}</td>
                    <td style={{ padding: 10 }}>
                      <Tag color={u.papel === "admin" ? "#fcd34d" : "#cbd5e1"}>
                        {u.papel}
                      </Tag>
                    </td>
                    <td style={{ padding: 10 }}>
                      <Tag color={u.ativo ? "#86efac" : "#fca5a5"}>
                        {u.ativo ? "ativo" : "inativo"}
                      </Tag>
                    </td>
                    <td style={{ padding: 10, color: "#9ca3af", fontSize: 12 }}>
                      {u.ultimoLogin ?? "nunca"}
                    </td>
                    <td style={{ padding: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <ActionBtn
                        onClick={() => togglePapel(u)}
                        disabled={isMe}
                        title={isMe ? "Não pode alterar a si mesmo" : "Alternar papel"}
                      >
                        {u.papel === "admin" ? "→ user" : "→ admin"}
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => toggleAtivo(u)}
                        disabled={isMe}
                        title={isMe ? "Não pode alterar a si mesmo" : "Ativar/desativar"}
                      >
                        {u.ativo ? "Desativar" : "Ativar"}
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => {
                          setResetForId(u.id);
                          setResetPassword("");
                        }}
                        title="Redefinir senha"
                      >
                        Senha
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => handleDelete(u)}
                        disabled={isMe}
                        title={isMe ? "Não pode excluir a si mesmo" : "Excluir"}
                        danger
                      >
                        Excluir
                      </ActionBtn>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: "#9399a2" }}>
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de redefinir senha */}
      {resetForId !== null && (
        <div
          onClick={() => setResetForId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleResetPassword}
            style={{
              ...glassPanel(),
              padding: 20,
              width: "90%",
              maxWidth: 400,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              Redefinir senha do usuário
            </div>
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>
              Usuário: <b>{users.find((u) => u.id === resetForId)?.username}</b>
            </div>
            <Field label="Nova senha (mín. 6)">
              <PasswordInput
                value={resetPassword}
                onChange={setResetPassword}
                required
                minLength={6}
                autoFocus
                style={inputStyle}
              />
            </Field>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setResetForId(null)}
                style={btnSecondaryStyle}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={resetting || resetPassword.length < 6}
                style={{
                  ...btnPrimaryStyle,
                  cursor: resetting ? "not-allowed" : "pointer",
                }}
              >
                {resetting ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#cbd5e1" }}>{label}</span>
      {children}
    </label>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        background: "rgba(0,0,0,0.25)",
        border: `1px solid ${color}55`,
        color,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: disabled
          ? "rgba(75,85,99,0.4)"
          : danger
          ? "rgba(220,38,38,0.25)"
          : "rgba(2,6,23,0.55)",
        border: `1px solid ${danger ? "rgba(220,38,38,0.5)" : "rgba(75,85,99,0.35)"}`,
        color: disabled ? "#94a3b8" : danger ? "#fecaca" : "#e5e7eb",
        padding: "6px 10px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function glassPanel(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(10, 12, 16, 0.45)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  };
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#e5e7eb",
  outline: "none",
  fontSize: 14,
  height: 42,
  boxSizing: "border-box",
};

const btnPrimaryStyle: React.CSSProperties = {
  background: "#16a34a",
  border: "none",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const btnSecondaryStyle: React.CSSProperties = {
  background: "rgba(2,6,23,0.55)",
  border: "1px solid rgba(75,85,99,0.35)",
  color: "#e5e7eb",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 700,
  cursor: "pointer",
};

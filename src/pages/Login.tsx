import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { HttpError } from "../api/client";
import PasswordInput from "../components/PasswordInput";
import fundo from "../assets/fundo.jpg";
import logoNovaEra from "../assets/logo.png";
import reguaMarcas from "../assets/regua_marcas.png";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.payload.error || "Falha no login");
      } else {
        setError("Não foi possível conectar à API. Verifique se ela está rodando.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundImage: `linear-gradient(rgba(182, 100, 23, 0.56), rgba(4,8,20,0.93)), url(${fundo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo Nova Era — topo */}
      <div
        style={{
          padding: "32px 20px 8px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <img
          src={logoNovaEra}
          alt="Nova Era"
          style={{
            maxHeight: 220,
            width: "auto",
            filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.55))",
          }}
        />
      </div>

      {/* Formulário central */}
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          padding: 20,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 28,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(10, 12, 16, 0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              Gestão de Chamados
            </div>
            <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>
              Faça login para continuar
            </div>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#cbd5e1" }}>Usuário</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#cbd5e1" }}>Senha</span>
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </label>

          {error && (
            <div
              style={{
                padding: "10px 12px",
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

          <button
            type="submit"
            disabled={submitting || !username || !password}
            style={{
              background: submitting ? "#475569" : "#16a34a",
              border: "none",
              color: "white",
              padding: "12px 14px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 15,
              cursor: submitting ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>

          <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
            A criação de novos usuários é feita por um administrador, dentro do
            sistema.
          </div>
        </form>
      </div>

      {/* Régua de marcas — rodapé */}
      <div
        style={{
          padding: "12px 20px 24px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <img
          src={reguaMarcas}
          alt="Marcas do grupo"
          style={{
            maxWidth: "100%",
            width: "auto",
            maxHeight: 90,
            filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.55))",
          }}
        />
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#e5e7eb",
  outline: "none",
  fontSize: 14,
};

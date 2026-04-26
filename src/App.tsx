import { useState } from "react";
import { AuthProvider, useAuth } from "./auth";
import Login from "./pages/Login";
import Chamados from "./pages/Chamados";
import Usuarios from "./pages/Usuarios";
import fundo from "./assets/fundo.jpg";

type Page = "chamados" | "usuarios";

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "#cbd5e1",
          background: "#0f172a",
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!user) return <Login />;

  return <Layout />;
}

function Layout() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState<Page>("chamados");
  const isAdmin = user?.papel === "admin";

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
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1900,
          margin: "0 auto",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 32, fontWeight: 900 }}>
              Sistema de Gestão de Chamados
            </div>
            <div style={{ fontSize: 14, color: "#dde3ed" }}>
              Gerencie ordens de compra, técnicos e status dos chamados
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: 4,
              borderRadius: 12,
              background: "rgba(2,6,23,0.55)",
              border: "1px solid rgba(75,85,99,0.35)",
            }}
          >
            <Tab active={page === "chamados"} onClick={() => setPage("chamados")}>
              Chamados
            </Tab>
            {isAdmin && (
              <Tab
                active={page === "usuarios"}
                onClick={() => setPage("usuarios")}
              >
                Usuários
              </Tab>
            )}
          </div>

          {/* User box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 12,
              background: "rgba(2,6,23,0.55)",
              border: "1px solid rgba(75,85,99,0.35)",
            }}
          >
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>
              <div style={{ fontWeight: 800, color: "#e5e7eb" }}>{user?.username}</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>{user?.papel}</div>
            </div>
            <button
              onClick={logout}
              style={{
                background: "rgba(220, 38, 38, 0.25)",
                border: "1px solid rgba(220, 38, 38, 0.5)",
                color: "#fecaca",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sair
            </button>
          </div>
        </div>

        {/* Page content */}
        {page === "chamados" && <Chamados />}
        {page === "usuarios" && isAdmin && <Usuarios />}
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(255,117,4,0.85)" : "transparent",
        border: "none",
        color: active ? "white" : "#cbd5e1",
        padding: "8px 16px",
        borderRadius: 8,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

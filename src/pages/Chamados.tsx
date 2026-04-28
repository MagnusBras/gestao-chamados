import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useAuth } from "../auth";
import { chamadosApi, type ChamadoApi, type Status } from "../api/chamados";
import { HttpError } from "../api/client";

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_LIST: Status[] = ["Aprovado", "Pendente", "Recusado"];
const FORNECEDORES_PADRAO = [
  "MD TECH",
  "WS TECH",
  "JJ FERREIRA",
  "NOVA ERA",
  "TG FOODS",
];
const TECNICOS_PADRAO = ["João Silva", "Maria Santos", "Pedro Costa"];

type SaveStatus = "idle" | "salvando" | "salvo" | "erro";

// "2026-04-26" → "26/04/2026"
function dbToDisplayDate(d: string | null): string {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

// Converte data de cada chamado para dd/mm/aaaa (formato interno do front)
function normalizeFromApi(c: ChamadoApi): ChamadoApi {
  return { ...c, data: dbToDisplayDate(c.data) };
}

export default function Chamados() {
  const { token, user } = useAuth();
  const isAdmin = user?.papel === "admin";
  const [rows, setRows] = useState<ChamadoApi[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Controle de autosave por linha
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const pendingPatchesRef = useRef<Map<number, Partial<ChamadoApi>>>(new Map());
  const inFlightRef = useRef<Set<number>>(new Set());

  // Carrega ao montar
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    chamadosApi
      .list(token)
      .then((data) => {
        if (!cancelled) setRows(data.map(normalizeFromApi));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof HttpError ? err.payload.error : "Erro ao carregar chamados";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Limpa timers ao desmontar (faz flush implícito? não, descarta — usuário deve aguardar)
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  function refreshSaveStatus() {
    if (
      timersRef.current.size === 0 &&
      pendingPatchesRef.current.size === 0 &&
      inFlightRef.current.size === 0
    ) {
      setSaveStatus((prev) => (prev === "erro" ? "erro" : "salvo"));
    }
  }

  async function doSave(id: number) {
    const patch = pendingPatchesRef.current.get(id);
    if (!patch) {
      refreshSaveStatus();
      return;
    }
    pendingPatchesRef.current.delete(id);
    timersRef.current.delete(id);
    inFlightRef.current.add(id);
    try {
      const updated = await chamadosApi.update(id, patch, token!);
      const normalized = normalizeFromApi(updated);
      setRows((prev) => prev.map((r) => (r.id === id ? normalized : r)));
    } catch (err) {
      console.error("[chamados] save:", err);
      setSaveStatus("erro");
      // Recoloca o patch na fila para o usuário ver os dados não salvos
      pendingPatchesRef.current.set(id, patch);
    } finally {
      inFlightRef.current.delete(id);
      refreshSaveStatus();
    }
  }

  function scheduleSave(id: number, partial: Partial<ChamadoApi>) {
    const current = pendingPatchesRef.current.get(id) ?? {};
    pendingPatchesRef.current.set(id, { ...current, ...partial });

    const existing = timersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => doSave(id), 600);
    timersRef.current.set(id, t);
    setSaveStatus("salvando");
  }

  function updateRow<K extends keyof ChamadoApi>(
    idx: number,
    key: K,
    value: ChamadoApi[K]
  ) {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
      const row = next[idx];
      if (row.id) {
        scheduleSave(row.id, { [key]: value } as Partial<ChamadoApi>);
      }
      return next;
    });
  }

  async function addRow() {
    if (creating || !token) return;
    setCreating(true);
    setError(null);
    try {
      const created = await chamadosApi.create({ status: "Pendente" }, token);
      setRows((prev) => [normalizeFromApi(created), ...prev]);
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.payload.error : "Erro ao criar chamado";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function removeRow(idx: number) {
    const row = rows[idx];
    if (!row?.id || !token) return;
    if (!confirm("Excluir este chamado?")) return;
    try {
      await chamadosApi.remove(row.id, token);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      // Cancela qualquer save pendente desse id
      const t = timersRef.current.get(row.id);
      if (t) clearTimeout(t);
      timersRef.current.delete(row.id);
      pendingPatchesRef.current.delete(row.id);
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.payload.error : "Erro ao excluir chamado";
      setError(msg);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.oc,
        r.filial,
        r.tecnico,
        r.numeroChamado,
        r.data,
        r.fornecedor,
        r.valorOC != null ? String(r.valorOC) : "",
        r.status,
        r.criadoPorUsername,
      ]
        .map((v) => v ?? "")
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const total = useMemo(
    () => filtered.reduce((acc, r) => acc + (Number(r.valorOC) || 0), 0),
    [filtered]
  );

  const counts = useMemo(() => {
    const base: Record<Status, number> = { Aprovado: 0, Pendente: 0, Recusado: 0 };
    for (const r of filtered) {
      if (r.status && r.status in base) base[r.status] += 1;
    }
    return base;
  }, [filtered]);

  const fornecedoresLista = useMemo(() => {
    const digitados = rows.map((r) => r.fornecedor ?? "").filter(Boolean);
    return Array.from(new Set([...FORNECEDORES_PADRAO, ...digitados]));
  }, [rows]);

  const tecnicosLista = useMemo(() => {
    const digitados = rows.map((r) => r.tecnico ?? "").filter(Boolean);
    return Array.from(new Set([...TECNICOS_PADRAO, ...digitados]));
  }, [rows]);

  const pieData = useMemo(
    () => ({
      labels: STATUS_LIST,
      datasets: [
        {
          data: STATUS_LIST.map((s) => counts[s]),
          backgroundColor: ["#16a34a", "#f59e0b", "#dc2626"],
          borderWidth: 0,
        },
      ],
    }),
    [counts]
  );

  function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        OC: r.oc,
        Filial: r.filial,
        Técnico: r.tecnico,
        "Nº Chamado": r.numeroChamado,
        Data: r.data,
        Fornecedor: r.fornecedor,
        "Valor OC": r.valorOC,
        Status: r.status,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chamados");
    XLSX.writeFile(wb, "chamados.xlsx");
  }

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#cbd5e1" }}>
        Carregando chamados...
      </div>
    );
  }

  return (
    <>
      {/* Indicador de status de salvamento + erro global */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por OC, Filial, Técnico, Nº Chamado, Data ou Status..."
          style={{
            flex: "1 1 620px",
            minWidth: 280,
            background: "rgba(17, 24, 39, 0.6)",
            border: "1px solid rgb(179, 169, 169)",
            borderRadius: 15,
            padding: "12px 14px",
            outline: "none",
            color: "#e9f0ff",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        />
        <SaveBadge status={saveStatus} />
        <button
          onClick={exportToExcel}
          style={{
            background: "#16a34a",
            border: "none",
            color: "white",
            padding: "12px 14px",
            borderRadius: 12,
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Exportar para Excel
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(220, 38, 38, 0.18)",
            border: "1px solid rgba(220, 38, 38, 0.4)",
            color: "#fecaca",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Tabela */}
        <div style={{ ...glassPanel(), overflow: "hidden" }}>
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(255, 117, 4, 0.92), rgb(192, 179, 11),  rgba(255, 117, 4, 0.92)",
              padding: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div
              style={{ fontWeight: 900, fontSize: 28, flex: 1, textAlign: "center" }}
            >
              Planilha de Chamados
            </div>
            <button
              onClick={addRow}
              disabled={creating}
              style={{
                background: "rgba(2,6,23,0.55)",
                border: "1px solid rgba(75,85,99,0.35)",
                color: "#e5e7eb",
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 900,
                cursor: creating ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                opacity: creating ? 0.6 : 1,
              }}
            >
              {creating ? "Adicionando..." : "+ Adicionar Linha"}
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(2,6,23,0.35)", color: "#cbd5e1" }}>
                  {[
                    "OC",
                    "FILIAL",
                    "TÉCNICO",
                    "Nº CHAMADO",
                    "DATA",
                    "FORNECEDOR",
                    "VALOR OC",
                    "STATUS",
                    ...(isAdmin ? ["CRIADO POR"] : []),
                    "AÇÕES",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "12px 12px",
                        fontSize: 12,
                        letterSpacing: 0.2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((r, idx) => {
                  const realIdx = rows.findIndex((row) => row.id === r.id);
                  return (
                    <tr
                      key={r.id}
                      style={{ borderTop: "1px solid rgba(75,85,99,0.25)" }}
                    >
                      <td style={{ padding: 10 }}>
                        <input
                          value={r.oc ?? ""}
                          onChange={(e) => updateRow(realIdx, "oc", e.target.value)}
                          style={cellInput(80)}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <input
                          value={r.filial ?? ""}
                          onChange={(e) =>
                            updateRow(realIdx, "filial", e.target.value)
                          }
                          style={cellInput(70)}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <input
                          list="tecnicos"
                          value={r.tecnico ?? ""}
                          onChange={(e) =>
                            updateRow(realIdx, "tecnico", e.target.value)
                          }
                          style={cellInput(160)}
                          placeholder="Técnico..."
                        />
                        <datalist id="tecnicos">
                          {tecnicosLista.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                      </td>
                      <td style={{ padding: 10 }}>
                        <input
                          value={r.numeroChamado ?? ""}
                          onChange={(e) =>
                            updateRow(realIdx, "numeroChamado", e.target.value)
                          }
                          style={cellInput(110)}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <input
                          value={r.data ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            let formatted = raw;
                            if (raw.length > 2) {
                              formatted = raw.slice(0, 2) + "/" + raw.slice(2);
                            }
                            if (raw.length > 4) {
                              formatted =
                                raw.slice(0, 2) +
                                "/" +
                                raw.slice(2, 4) +
                                "/" +
                                raw.slice(4, 8);
                            }
                            updateRow(realIdx, "data", formatted);
                          }}
                          maxLength={10}
                          placeholder="dd/mm/aaaa"
                          style={cellInput(120)}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <div style={{ position: "relative" }}>
                          <input
                            list={`fornecedores-${idx}`}
                            value={r.fornecedor ?? ""}
                            onChange={(e) =>
                              updateRow(realIdx, "fornecedor", e.target.value)
                            }
                            style={cellInput(160)}
                            placeholder="Fornecedor..."
                          />
                          <datalist id={`fornecedores-${idx}`}>
                            {fornecedoresLista.map((f) => (
                              <option key={f} value={f} />
                            ))}
                          </datalist>
                        </div>
                      </td>
                      <td style={{ padding: 10 }}>
                        <input
                          value={new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(r.valorOC ?? 0)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            const numeric = Number(raw) / 100;
                            updateRow(realIdx, "valorOC", numeric);
                          }}
                          style={cellInput(140)}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <select
                          value={r.status ?? "Pendente"}
                          onChange={(e) =>
                            updateRow(realIdx, "status", e.target.value as Status)
                          }
                          style={cellSelect(130)}
                        >
                          <option value="Aprovado">Aprovado</option>
                          <option value="Pendente">Pendente</option>
                          <option value="Recusado">Recusado</option>
                        </select>
                      </td>
                      {isAdmin && (
                        <td
                          style={{
                            padding: 10,
                            color: "#cbd5e1",
                            fontSize: 13,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.criadoPorUsername ?? "—"}
                        </td>
                      )}
                      <td style={{ padding: 10 }}>
                        <button
                          onClick={() => removeRow(realIdx)}
                          title="Excluir"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#fd1b1b",
                            cursor: "pointer",
                            fontSize: 25,
                          }}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} style={{ padding: 18, color: "#9399a2" }}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Painel direito */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card()}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>Total Gasto</div>
                <div style={{ marginTop: 10, fontSize: 30, fontWeight: 950 }}>
                  {formatBRL(total)}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#ffffff" }}>
                  Soma de todas as Ordens de Compra
                </div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: "rgba(34,197,94,0.18)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  display: "grid",
                  placeItems: "center",
                  color: "#86efac",
                  fontWeight: 900,
                }}
              >
                $
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 12,
                background: "rgba(16,185,129,0.18)",
                border: "1px solid rgba(16,185,129,0.18)",
                padding: "10px 12px",
                color: "#d1fae5",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              ↗ {filtered.length} registros no total
            </div>
          </div>

          <div style={card()}>
            <div style={{ fontWeight: 900 }}>Distribuição de Status</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
              Total de Registros: {filtered.length}
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 13 }}>
              <Line label="Aprovado" value={counts.Aprovado} dot="#16a34a" />
              <Line label="Pendente" value={counts.Pendente} dot="#f59e0b" />
              <Line label="Recusado" value={counts.Recusado} dot="#dc2626" />
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 16,
                background: "rgba(2,6,23,0.35)",
                border: "1px solid rgba(75,85,99,0.25)",
                padding: 12,
              }}
            >
              <Pie
                data={pieData}
                options={{ plugins: { legend: { position: "bottom" } } }}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 22 }} />
    </>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map = {
    salvando: { text: "Salvando...", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
    salvo: { text: "Tudo salvo", color: "#86efac", bg: "rgba(34,197,94,0.15)" },
    erro: { text: "Erro ao salvar", color: "#fecaca", bg: "rgba(220,38,38,0.18)" },
  } as const;
  const cfg = map[status];
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.text}
    </div>
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

function card(): React.CSSProperties {
  return { ...glassPanel(), padding: 14 };
}

function cellInput(width: number): React.CSSProperties {
  return {
    width,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 10,
    padding: "8px 10px",
    color: "#e5e7eb",
    outline: "none",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };
}

function cellSelect(width: number): React.CSSProperties {
  return cellInput(width);
}

function Line({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: dot,
            display: "inline-block",
          }}
        />
        <span style={{ color: "#e5e7eb" }}>{label}</span>
      </div>
      <span style={{ color: "#cbd5e1", fontWeight: 800 }}>{value}</span>
    </div>
  );
}

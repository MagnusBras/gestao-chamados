import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import fundo from "./assets/fundo.jpg";

ChartJS.register(ArcElement, Tooltip, Legend);

type Status = "Aprovado" | "Pendente" | "Recusado";

type Chamado = {
  oc: string;
  filial: string;
  tecnico: string;
  numeroChamado: string;
  data: string; // dd/mm/aaaa
  fornecedor: string;
  valorOC: number;
  status: Status;
};

const STATUS_LIST: Status[] = ["Aprovado", "Pendente", "Recusado"];
const FORNECEDORES_PADRAO = [
  "MD TECH",
  "WS TECH",
  "JJ FERREIRA",
  "NOVA ERA",
  "TG FOODS",
];

const TECNICOS_PADRAO = [
  "João Silva",
  "Maria Santos",
  "Pedro Costa",
];

const emptyRow: Chamado = {
  oc: "OC-",
  filial: "",
  tecnico: "",
  numeroChamado: "",
  data: "",
  fornecedor: "",
  valorOC: 0,
  status: "Pendente",
};

export default function App() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Chamado[]>([emptyRow]);

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
        String(r.valorOC),
        r.status,
      ]
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
  for (const r of filtered) base[r.status] += 1;
  return base;
}, [filtered]);

const fornecedoresLista = useMemo(() => {
  const digitados = rows.map((r) => r.fornecedor).filter(Boolean);
  return Array.from(new Set([...FORNECEDORES_PADRAO, ...digitados]));
}, [rows]);

const tecnicosLista = useMemo(() => {
  const digitados = rows.map((r) => r.tecnico).filter(Boolean);
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

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        oc: "OC-",
        filial: "",
        tecnico: "",
        numeroChamado: "",
        data: "",
        fornecedor: "",
        valorOC: 0,
        status: "Pendente",
      },
    ]);
  };

  const updateRow = <K extends keyof Chamado>(
    idx: number,
    key: K,
    value: Chamado[K]
  ) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    );
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        OC: r.oc,
        Filial: r.filial,
        "Técnico": r.tecnico,
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
  };

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div
  style={{
    minHeight: "100vh",
    width: "100%",
    backgroundImage: `
  linear-gradient(rgba(182, 100, 23, 0.56), rgba(4,8,20,0.93)),
  url(${fundo})
`,
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
    margin: "0 auto",   // centraliza
    padding: 24,
    boxSizing: "border-box",
  }}
>        {/* Header */}

        <div
  style={{
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
  }}
>
  {/* bloco central que ocupa a largura e centraliza de verdade */}
  <div
    style={{
      flex: 1,
      display: "grid",
      justifyItems: "center", // centraliza o conteúdo
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 40, fontWeight: 900 }}>
      Sistema de Gestão de Chamados
    </div>
    <div style={{ fontSize: 20, color: "#dde3ed" }}>
      Gerencie ordens de compra, técnicos e status dos chamados
    </div>
  </div>
</div>

        {/* Search + Export */}
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

        {/* Grid */}
       <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 420px",
    gap: 16,
    alignItems: "start",
  }}
>
          {/* Table */}
          <div
  style={{
    ...glassPanel(),
    overflow: "hidden",
  }}
>
            <div
              style={{
                background:"linear-gradient(90deg, rgba(255, 117, 4, 0.92), rgb(192, 179, 11),  rgba(255, 117, 4, 0.92)",
                padding: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div
  style={{
    fontWeight: 900,
    fontSize: 28,
    flex: 1,
    textAlign: "center",
  }}

>Planilha de Chamados</div>
              <button
                onClick={addRow}
                style={{
                  background: "rgba(2,6,23,0.55)",
                  border: "1px solid rgba(75,85,99,0.35)",
                  color: "#e5e7eb",
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap",                
                }}
              >
                + Adicionar Linha
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(2,6,23,0.35)", color: "#cbd5e1" }}>
                    {["OC", "FILIAL", "TÉCNICO", "Nº CHAMADO", "DATA", "FORNECEDOR", "VALOR OC", "STATUS", "AÇÕES"].map(
                      (h) => (
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
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={idx} style={{ borderTop: "1px solid rgba(75,85,99,0.25)" }}>
                      <td style={{ padding: 10 }}>
                        <input
                          value={r.oc}
                          onChange={(e) => updateRow(idx, "oc", e.target.value)}
                          style={cellInput(80)}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <input
                          value={r.filial}
                          onChange={(e) => updateRow(idx, "filial", e.target.value)}
                          style={cellInput(70)}
                        />
                      </td>

                     <td style={{ padding: 10 }}>
                    <input
                      list="tecnicos"
                      value={r.tecnico}
                      onChange={(e) => updateRow(idx, "tecnico", e.target.value)}
                      style={cellInput(160)}
                      placeholder="Técnico..."
                    />

                    <datalist id="tecnicos">
                      {tecnicosLista.map((t: string) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </td>

                      <td style={{ padding: 10 }}>
                        <input
                          value={r.numeroChamado}
                          onChange={(e) => updateRow(idx, "numeroChamado", e.target.value)}
                          style={cellInput(110)}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <input
                        value={r.data}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, ""); // remove tudo que não for número

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

                          updateRow(idx, "data", formatted);
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
      value={r.fornecedor}
      onChange={(e) => updateRow(idx, "fornecedor", e.target.value)}
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
                          }).format(r.valorOC)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            const numeric = Number(raw) / 100;
                            updateRow(idx, "valorOC", numeric);
                          }}
                          style={cellInput(140)}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <select
                          value={r.status}
                          onChange={(e) => updateRow(idx, "status", e.target.value as Status)}
                          style={cellSelect(130)}
                        >
                          <option value="Aprovado">Aprovado</option>
                          <option value="Pendente">Pendente</option>
                          <option value="Recusado">Recusado</option>
                        </select>
                      </td>
                      <td style={{ padding: 10 }}>
                        <button
                          onClick={() => removeRow(idx)}
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
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: 18, color: "#9399a2" } }>
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Total */}
            <div style={card()}>
                
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
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

            {/* Status */}
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
                <Pie data={pieData} options={{ plugins: { legend: { position: "bottom" } } }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 22 }} />
      </div>
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
  return {
    ...glassPanel(),
    padding: 14,
  };
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

function Line({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: dot, display: "inline-block" }} />
        <span style={{ color: "#e5e7eb" }}>{label}</span>
      </div>
      <span style={{ color: "#cbd5e1", fontWeight: 800 }}>{value}</span>
    </div>
  );
}
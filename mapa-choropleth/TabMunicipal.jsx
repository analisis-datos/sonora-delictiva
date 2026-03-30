// src/components/TabMunicipal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Pestaña "Municipal" del dashboard.
// Combina el mapa choropleth con un sidebar de ranking y filtros propios.
//
// Props:
//   dataMunicipal – Array de filas del CSV sonora_municipal.csv
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import MapaChoropleth from "./MapaChoropleth";
import { useMapData } from "../hooks/useMapData";

// ── Icono de tendencia ───────────────────────────────────────────────────────
const Tendencia = ({ valor }) => {
  if (valor > 10) return <span className="text-red-400 text-xs">▲ alto</span>;
  if (valor < -10) return <span className="text-green-400 text-xs">▼ bajo</span>;
  return <span className="text-yellow-400 text-xs">→ estable</span>;
};

// ── Barra mini ───────────────────────────────────────────────────────────────
const BarraMini = ({ porcentaje, color = "#4f72ff" }) => (
  <div className="w-full h-1 rounded-full mt-1" style={{ background: "#1e2235" }}>
    <div
      className="h-1 rounded-full transition-all duration-500"
      style={{ width: `${Math.min(porcentaje, 100)}%`, background: color }}
    />
  </div>
);

// ── Colores del ranking ──────────────────────────────────────────────────────
const COLOR_RANK = ["#e74c3c", "#e07010", "#e8b020", "#4f72ff", "#8892b0"];
const colorRank  = (i) => COLOR_RANK[Math.min(i, COLOR_RANK.length - 1)];

export default function TabMunicipal({ dataMunicipal = [] }) {
  const [año, setAño]       = useState("");
  const [delito, setDelito] = useState("");
  const [munSel, setMunSel] = useState(null);
  const [topN, setTopN]     = useState(15);

  const { totalesPorMun, ranking, totalEstado, maxMun, años, delitos } =
    useMapData(dataMunicipal, año || null, delito || null);

  // Datos del municipio seleccionado desde el mapa
  const munData = munSel ? { municipio: munSel, total: totalesPorMun[munSel] || 0 } : null;

  return (
    <div className="space-y-5">

      {/* ── Filtros ── */}
      <div
        className="flex flex-wrap gap-4 items-end rounded-2xl p-4"
        style={{ background: "#1a1d27", border: "1px solid #2e3250" }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Año</label>
          <select
            value={año}
            onChange={(e) => setAño(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none"
            style={{ background: "#0d1117", border: "1px solid #2e3250" }}
          >
            <option value="">Todos</option>
            {años.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-48">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Tipo de delito</label>
          <select
            value={delito}
            onChange={(e) => setDelito(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none"
            style={{ background: "#0d1117", border: "1px solid #2e3250" }}
          >
            <option value="">Todos los delitos</option>
            {delitos.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Top municipios</label>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none"
            style={{ background: "#0d1117", border: "1px solid #2e3250" }}
          >
            {[10, 15, 20, 30, 72].map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>
        </div>

        {(año || delito) && (
          <button
            onClick={() => { setAño(""); setDelito(""); }}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
            style={{ border: "1px solid #2e3250" }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* ── KPIs rápidos ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total carpetas",
            value: totalEstado.toLocaleString("es-MX"),
            sub: [año, delito].filter(Boolean).join(" · ") || "todos los filtros",
          },
          {
            label: "Municipio más afectado",
            value: maxMun?.municipio ?? "—",
            sub: maxMun ? `${maxMun.total.toLocaleString()} carpetas` : "",
            color: "#e74c3c",
          },
          {
            label: "Municipios con registro",
            value: Object.keys(totalesPorMun).length,
            sub: "de 72 municipios de Sonora",
          },
        ].map((k, i) => (
          <div
            key={i}
            className="rounded-2xl p-4"
            style={{ background: "#1a1d27", border: "1px solid #2e3250" }}
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{k.label}</p>
            <p className="text-xl font-bold text-white" style={{ color: k.color }}>
              {k.value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Mapa + Sidebar ── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 320px" }}>

        {/* Mapa */}
        <MapaChoropleth
          data={dataMunicipal}
          año={año || null}
          delito={delito || null}
          onMunSelect={setMunSel}
        />

        {/* Sidebar ranking */}
        <div
          className="rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "#1a1d27",
            border: "1px solid #2e3250",
            maxHeight: 520,
          }}
        >
          {/* Header sidebar */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #2e3250" }}
          >
            <p className="text-sm font-semibold text-white">
              Ranking de municipios
            </p>
            <span className="text-xs text-gray-500">{ranking.length} registros</span>
          </div>

          {/* Panel del municipio seleccionado */}
          {munData && (
            <div
              className="mx-3 mt-3 rounded-xl p-3"
              style={{ background: "#0d1117", border: "1px solid #4f72ff44" }}
            >
              <p className="text-xs text-blue-400 mb-0.5">📍 Seleccionado en mapa</p>
              <p className="text-white font-bold text-sm">{munData.municipio}</p>
              <p className="text-blue-300 text-sm">
                {munData.total.toLocaleString("es-MX")} carpetas
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                {totalEstado > 0
                  ? `${((munData.total / totalEstado) * 100).toFixed(1)}% del total estatal`
                  : ""}
              </p>
            </div>
          )}

          {/* Lista scrollable */}
          <div className="overflow-y-auto flex-1 px-3 py-2">
            {ranking.slice(0, topN).map((r, i) => (
              <div
                key={r.municipio}
                onClick={() => setMunSel(r.municipio)}
                className="py-2.5 cursor-pointer rounded-lg px-2 transition-colors"
                style={{
                  borderBottom: "1px solid #1e2235",
                  background: munSel === r.municipio ? "#1a2545" : "transparent",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-xs font-bold w-5 text-center shrink-0"
                      style={{ color: colorRank(i) }}
                    >
                      {r.rank}
                    </span>
                    <span className="text-sm text-gray-200 truncate">{r.municipio}</span>
                  </div>
                  <span className="text-sm font-semibold text-white shrink-0">
                    {r.total.toLocaleString("es-MX")}
                  </span>
                </div>
                <div className="ml-7">
                  <BarraMini porcentaje={r.porcentaje} color={colorRank(i)} />
                  <p className="text-xs text-gray-600 mt-0.5">
                    {r.porcentaje.toFixed(1)}% del total
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer con export */}
          <div
            className="px-4 py-2.5 flex justify-end"
            style={{ borderTop: "1px solid #2e3250" }}
          >
            <button
              onClick={() => {
                const csv = [
                  "Rank,Municipio,Carpetas,Porcentaje",
                  ...ranking.map((r) =>
                    `${r.rank},"${r.municipio}",${r.total},${r.porcentaje.toFixed(2)}`
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href     = url;
                a.download = `ranking_municipal_sonora${año ? "_" + año : ""}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: "#0d1117",
                border: "1px solid #2e3250",
                color: "#8892b0",
              }}
            >
              ↓ Exportar ranking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

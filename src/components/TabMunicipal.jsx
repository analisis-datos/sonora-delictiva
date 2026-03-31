// src/components/TabMunicipal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Pestaña "Municipal" del dashboard.
// Features: mapa choropleth, ranking, toggle tasa/absoluto, comparador.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import MapaChoropleth from "./MapaChoropleth";
import ComparadorMunicipios from "./ComparadorMunicipios";
import { useMapData } from "../hooks/useMapData";
import { useTasaPoblacion } from "../hooks/useTasaPoblacion";

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

export default function TabMunicipal({
  dataMunicipal = [],
  filtAnno,
  filtDelito,
  filtMunicipio,
  setFiltMunicipio,
  tipoUnidad = "carpetas"
}) {
  const [topN, setTopN]           = useState(15);
  const [modoVista, setModoVista] = useState("absoluto"); // "absoluto" | "tasa"
  const [verComparador, setVerComparador] = useState(false);

  const { totalesPorMun, ranking, totalEstado, maxMun } =
    useMapData(dataMunicipal, filtAnno || null, filtDelito || null);

  const { tasasPor100k, pobCargada } = useTasaPoblacion(totalesPorMun);

  // Si el modo es tasa, recalcular el ranking
  const rankingMostrado = useMemo(() => {
    if (modoVista === "tasa" && pobCargada) {
      return Object.entries(tasasPor100k)
        .filter(([, t]) => t !== null)
        .sort(([, a], [, b]) => b - a)
        .map(([municipio, tasa], i) => ({
          municipio,
          total: tasa,
          porcentaje: (tasa / Math.max(...Object.values(tasasPor100k).filter(Boolean))) * 100,
          rank: i + 1,
        }));
    }
    return ranking;
  }, [modoVista, pobCargada, tasasPor100k, ranking]);

  const valoresMapa = modoVista === "tasa" && pobCargada ? tasasPor100k : totalesPorMun;

  // KPI del municipio seleccionado
  const munData = filtMunicipio
    ? { municipio: filtMunicipio, total: totalesPorMun[filtMunicipio] || 0 }
    : null;

  const unidadLabel = modoVista === "tasa" ? "por 100k hab." : tipoUnidad.toLowerCase();

  return (
    <div className="space-y-5">

      {/* ── KPIs rápidos + toggle ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1">
          {[
            {
              label: `Total ${tipoUnidad}`,
              value: totalEstado.toLocaleString("es-MX"),
              sub: [filtAnno, filtDelito].filter(Boolean).join(" · ") || "todos los filtros",
            },
            {
              label: "Municipio más afectado",
              value: modoVista === "tasa" && pobCargada
                ? rankingMostrado[0]?.municipio ?? "—"
                : maxMun?.municipio ?? "—",
              sub: modoVista === "tasa" && pobCargada
                ? `${rankingMostrado[0]?.total?.toFixed(1)} por 100k`
                : maxMun ? `${maxMun.total.toLocaleString()} ${tipoUnidad.toLowerCase()}` : "",
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
              <p className="text-xl font-bold text-white line-clamp-1" style={{ color: k.color }}>
                {k.value}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Controles de vista */}
        <div className="flex gap-2 self-end sm:self-auto shrink-0">
          {/* Toggle absoluto/tasa */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #2e3250" }}>
            {["absoluto", "tasa"].map(modo => (
              <button
                key={modo}
                onClick={() => setModoVista(modo)}
                disabled={modo === "tasa" && !pobCargada}
                className="px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                style={{
                  background: modoVista === modo ? "#4f72ff" : "#1a1d27",
                  color: modoVista === modo ? "#fff" : "#8892b0",
                }}
                title={modo === "tasa" ? "Tasa por 100,000 habitantes (Censo 2020)" : "Valores absolutos"}
              >
                {modo === "absoluto" ? "Total" : "Por 100k"}
              </button>
            ))}
          </div>

          {/* Toggle comparador */}
          <button
            onClick={() => setVerComparador(v => !v)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              background: verComparador ? "#2a3a60" : "#1a1d27",
              border: "1px solid #2e3250",
              color: verComparador ? "#4f72ff" : "#8892b0",
            }}
          >
            ⇄ Comparar
          </button>
        </div>
      </div>

      {/* ── Mapa + Sidebar ── */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_320px]">

        {/* Mapa */}
        <MapaChoropleth
          data={dataMunicipal}
          año={filtAnno || null}
          delito={filtDelito || null}
          onMunSelect={setFiltMunicipio}
          selectedMun={filtMunicipio}
          tipoUnidad={modoVista === "tasa" ? "por 100k hab." : tipoUnidad}
          valoresExternos={modoVista === "tasa" && pobCargada ? tasasPor100k : null}
        />

        {/* Sidebar ranking */}
        <div
          className="rounded-2xl overflow-hidden flex flex-col lg:max-h-[520px]"
          style={{ background: "#1a1d27", border: "1px solid #2e3250" }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #2e3250" }}>
            <div>
              <p className="text-sm font-semibold text-white">Ranking</p>
              <p className="text-xs text-gray-500">{rankingMostrado.length} reg. · {unidadLabel}</p>
            </div>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="rounded bg-[#0d1117] px-2 py-1 text-xs text-gray-400 focus:outline-none"
              style={{ border: "1px solid #2e3250" }}
            >
              {[10, 15, 20, 30, 72].map(n => (
                <option key={n} value={n}>Top {n}</option>
              ))}
            </select>
          </div>

          {/* Municipio seleccionado */}
          {munData && (
            <div className="mx-3 mt-3 rounded-xl p-3" style={{ background: "#0d1117", border: "1px solid #4f72ff44" }}>
              <p className="text-xs text-blue-400 mb-0.5">📍 Seleccionado en mapa</p>
              <p className="text-white font-bold text-sm">{munData.municipio}</p>
              <p className="text-blue-300 text-sm">
                {modoVista === "tasa" && pobCargada
                  ? `${tasasPor100k[munData.municipio]?.toFixed(1) ?? "—"} por 100k hab.`
                  : `${munData.total.toLocaleString("es-MX")} ${tipoUnidad.toLowerCase()}`
                }
              </p>
              {totalEstado > 0 && modoVista === "absoluto" && (
                <p className="text-gray-500 text-xs mt-0.5">
                  {((munData.total / totalEstado) * 100).toFixed(1)}% del total estatal
                </p>
              )}
            </div>
          )}

          {/* Lista scrollable */}
          <div className="overflow-y-auto flex-1 px-3 py-2">
            {rankingMostrado.slice(0, topN).map((r, i) => (
              <div
                key={r.municipio}
                onClick={() => setFiltMunicipio(r.municipio)}
                className="py-2.5 cursor-pointer rounded-lg px-2 transition-colors"
                style={{
                  borderBottom: "1px solid #1e2235",
                  background: filtMunicipio === r.municipio ? "#1a2545" : "transparent",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold w-5 text-center shrink-0" style={{ color: colorRank(i) }}>
                      {r.rank}
                    </span>
                    <span className="text-sm text-gray-200 truncate">{r.municipio}</span>
                  </div>
                  <span className="text-sm font-semibold text-white shrink-0">
                    {modoVista === "tasa"
                      ? `${Number(r.total).toFixed(1)}`
                      : Number(r.total).toLocaleString("es-MX")
                    }
                  </span>
                </div>
                <div className="ml-7">
                  <BarraMini porcentaje={r.porcentaje} color={colorRank(i)} />
                </div>
              </div>
            ))}
          </div>

          {/* Footer con export */}
          <div className="px-4 py-2.5 flex justify-end" style={{ borderTop: "1px solid #2e3250" }}>
            <button
              onClick={() => {
                const csv = [
                  `Rank,Municipio,${modoVista === "tasa" ? "Tasa_100k" : tipoUnidad},Porcentaje`,
                  ...rankingMostrado.map(r =>
                    `${r.rank},"${r.municipio}",${modoVista === "tasa" ? r.total.toFixed(1) : r.total},${r.porcentaje.toFixed(2)}`
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href     = url;
                a.download = `ranking_${tipoUnidad.toLowerCase()}_${modoVista}_sonora${filtAnno ? "_" + filtAnno : ""}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:text-white"
              style={{ background: "#0d1117", border: "1px solid #2e3250", color: "#8892b0" }}
            >
              ↓ Exportar ranking
            </button>
          </div>
        </div>
      </div>

      {/* ── Comparador de Municipios ── */}
      {verComparador && (
        <ComparadorMunicipios
          data={dataMunicipal}
          munis={[...new Set(dataMunicipal.map(r => r.Municipio).filter(Boolean))].sort()}
          filtAnno={filtAnno}
          filtDelito={filtDelito}
        />
      )}
    </div>
  );
}

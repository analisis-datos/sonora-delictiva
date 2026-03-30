// src/hooks/useMapData.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook que prepara y memoriza los datos del CSV municipal
// en el formato que necesita MapaChoropleth.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";

/**
 * Calcula el ranking de municipios y estadísticas del mapa.
 *
 * @param {Array}       data   – Filas del CSV sonora_municipal.csv (ya parseado)
 * @param {string|null} año    – Filtro de año, e.g. "2024". null = todos.
 * @param {string|null} delito – Filtro de tipo de delito. null = todos.
 * @returns {{
 *   totalesPorMun: Object,   // { Hermosillo: 1234, Cajeme: 890, ... }
 *   ranking: Array,          // [{ municipio, total, porcentaje, rank }, ...]
 *   totalEstado: number,
 *   maxMun: { municipio, total } | null,
 *   años: string[],
 *   delitos: string[],
 * }}
 */
export function useMapData(data = [], año = null, delito = null) {
  return useMemo(() => {
    // ── Filtrar ──
    let fil = data;
    if (año)    fil = fil.filter((r) => String(r["Año"]) === String(año));
    if (delito) fil = fil.filter((r) => r["Subtipo de delito"] === delito);

    // ── Agrupar por municipio ──
    const totalesPorMun = {};
    fil.forEach((r) => {
      const mun = r["Municipio"];
      if (mun) {
        totalesPorMun[mun] = (totalesPorMun[mun] || 0) + (Number(r["Valor"]) || 0);
      }
    });

    // ── Ranking ──
    const totalEstado = Object.values(totalesPorMun).reduce((s, v) => s + v, 0);
    const ranking = Object.entries(totalesPorMun)
      .map(([municipio, total], i) => ({
        municipio,
        total,
        porcentaje: totalEstado > 0 ? (total / totalEstado) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const maxMun = ranking[0] ?? null;

    // ── Opciones de filtro ──
    const años   = [...new Set(data.map((r) => String(r["Año"])))].sort();
    const delitos = [...new Set(data.map((r) => r["Subtipo de delito"]).filter(Boolean))].sort();

    return { totalesPorMun, ranking, totalEstado, maxMun, años, delitos };
  }, [data, año, delito]);
}

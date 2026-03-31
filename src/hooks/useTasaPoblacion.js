// src/hooks/useTasaPoblacion.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook que carga el CSV de población municipal y calcula tasas por 100k hab.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';

/**
 * @param {Object} totalesPorMun  – { Hermosillo: 1234, Cajeme: 890, ... }
 * @returns {{
 *   tasasPor100k:    Object,   // { Hermosillo: 131.8, Cajeme: 184.6, ... }
 *   pobCargada:      boolean,
 *   poblacionPorMun: Object,   // { Hermosillo: 936263, ... }
 * }}
 */
export function useTasaPoblacion(totalesPorMun) {
  const [poblacionRaw, setPoblacionRaw] = useState([]);

  useEffect(() => {
    Papa.parse('data/sonora_poblacion.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (r) => setPoblacionRaw(r.data),
    });
  }, []);

  const poblacionPorMun = useMemo(() => {
    const map = {};
    poblacionRaw.forEach(row => {
      if (row.Municipio && row.Poblacion2020) {
        map[row.Municipio] = row.Poblacion2020;
      }
    });
    return map;
  }, [poblacionRaw]);

  const tasasPor100k = useMemo(() => {
    const result = {};
    Object.entries(totalesPorMun).forEach(([mun, total]) => {
      const pob = poblacionPorMun[mun];
      result[mun] = pob ? Math.round((total / pob) * 100000 * 10) / 10 : null;
    });
    return result;
  }, [totalesPorMun, poblacionPorMun]);

  return {
    tasasPor100k,
    pobCargada: Object.keys(poblacionPorMun).length > 0,
    poblacionPorMun,
  };
}

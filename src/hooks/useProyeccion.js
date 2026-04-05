// src/hooks/useProyeccion.js
import { useMemo } from 'react';

export function useProyeccion(data = [], mesesProyeccion = 6) {
  return useMemo(() => {
    // 1. Agrupar por mes
    const map = {};
    data.forEach(r => {
      const fecha = r['Fecha'];
      if(fecha) {
        map[fecha] = (map[fecha] || 0) + (Number(r.Valor) || 0);
      }
    });
    
    let historico = Object.entries(map)
      .map(([Fecha, Valor]) => ({ Fecha, Valor }))
      .sort((a, b) => a.Fecha > b.Fecha ? 1 : -1);

    // Trim trailing zeros validly (last months with incomplete 0s)
    let last = historico.length - 1;
    while (last >= 0 && historico[last].Valor === 0) last--;
    if(last >= 0) historico = historico.slice(0, last + 1);

    // Usaremos máximo los últimos 24 meses para hacer la regresión más responsiva a la tendencia actual
    const recentHistory = historico.slice(-24);
    const n = recentHistory.length;
    
    if (n < 2) return { historico, proyeccion: [], tendenciaGral: 'estable', slope: 0 };

    // Regresión lineal simple: y = mx + b
    const xVals = Array.from({length: n}, (_, i) => i);
    const yVals = recentHistory.map(d => d.Valor);
    
    const sumX = xVals.reduce((a,b) => a+b, 0);
    const sumY = yVals.reduce((a,b) => a+b, 0);
    const sumXY = xVals.reduce((a, _, i) => a + xVals[i]*yVals[i], 0);
    const sumXX = xVals.reduce((a, x) => a + x*x, 0);

    const mDenominator = (n * sumXX - sumX * sumX);
    const m = mDenominator === 0 ? 0 : (n * sumXY - sumX * sumY) / mDenominator;
    const b = (sumY - m * sumX) / n;

    // Generar proyección
    const proyeccion = [];
    const lastDatePart = historico[historico.length-1].Fecha.split('-');
    // Asegurar parseo local seguro estableciendo dia "02"
    const lastDate = new Date(`${lastDatePart[0]}-${lastDatePart[1]}-02T00:00:00`); 
    
    for (let i = 1; i <= mesesProyeccion; i++) {
       const targetX = n - 1 + i;
       const val = Math.max(0, Math.round(m * targetX + b));
       
       const d = new Date(lastDate);
       d.setMonth(d.getMonth() + i);
       const mes = String(d.getMonth() + 1).padStart(2, '0');
       const projFecha = `${d.getFullYear()}-${mes}`;
       
       proyeccion.push({ Fecha: projFecha, Valor: val });
    }

    // Clasificar pendiente
    const maxVal = Math.max(...recentHistory.map(r => r.Valor)) || 1;
    const percentageSlope = m / maxVal; // Pendiente relativa
    const tendenciaGral = percentageSlope > 0.05 ? 'alza' : percentageSlope < -0.05 ? 'baja' : 'estable';

    return { historico, proyeccion, tendenciaGral, slope: m };
  }, [data, mesesProyeccion]);
}

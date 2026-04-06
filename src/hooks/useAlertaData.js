import { useMemo } from 'react';

/**
 * Agrupa y suma la incidencia delictiva por mes (YYYY-MM).
 */
const agruparPorFecha = (data) => {
  const map = {};
  data.forEach(r => {
    // Manejar casos donde la fecha viene en diferentes formatos
    const f = r.Fecha;
    if (!f) return;
    
    if (!map[f]) {
      const partes = f.split('-');
      map[f] = { 
        Fecha: f, 
        Valor: 0, 
        Año: r.Año || (partes.length > 0 ? partes[0] : ''),
        Mes: r.Mes || (partes.length > 1 ? partes[1] : '')
      };
    }
    map[f].Valor += Number(r.Valor) || 0;
  });
  const arr = Object.values(map).sort((a, b) => a.Fecha > b.Fecha ? 1 : -1);
  let last = arr.length - 1;
  while (last >= 0 && arr[last].Valor === 0) last--;
  return last >= 0 ? arr.slice(0, last + 1) : arr;
};

/**
 * Hook para procesar los datos de alerta temprana considerando la ruptura
 * metodológica entre 2015-2025 y 2026.
 */
export function useAlertaData(dataEstatal, dataHistorica) {
  return useMemo(() => {
    // Si no hay datos, devolvemos estado default
    if (!dataEstatal || !dataHistorica || dataHistorica.length === 0) {
      return { listo: false };
    }

    const histAgrupado = agruparPorFecha(dataHistorica);
    const recAgrupado = agruparPorFecha(dataEstatal);

    if (histAgrupado.length === 0) return { listo: false };

    // ==========================================
    // 1. ANÁLISIS DE ESTACIONALIDAD (2015-2025)
    // ==========================================
    const porMes = {};
    const conteoMes = {};
    let sumHistUltimos3Anos = 0; // Usado para nivel base reciente
    let countHistUltimos3Anos = 0;

    histAgrupado.forEach(d => {
      // Intentamos extraer el mes, asumiendo formato YYYY-MM
      const partes = d.Fecha.split('-');
      if(partes.length < 2) return;
      const m = partes[1];
      const y = parseInt(partes[0], 10);
      
      porMes[m] = (porMes[m] || 0) + d.Valor;
      conteoMes[m] = (conteoMes[m] || 0) + 1;

      // Tomamos los últimos 3 años (2023, 2024, 2025) para sacar un promedio base reciente
      if (y >= 2023) {
        sumHistUltimos3Anos += d.Valor;
        countHistUltimos3Anos += 1;
      }
    });

    // Promedio global reciente (últimos 3 años, más representativo que los últimos 10)
    const promBaseReciente = countHistUltimos3Anos > 0 ? sumHistUltimos3Anos / countHistUltimos3Anos : 1;

    const promediosMensualesHist = {};
    let promGlobalHistorico = 0;
    const meses = Object.keys(porMes);
    meses.forEach(m => {
      promediosMensualesHist[m] = porMes[m] / conteoMes[m];
      promGlobalHistorico += promediosMensualesHist[m];
    });
    promGlobalHistorico = promGlobalHistorico / meses.length;

    // Índice estacional promedio (cuánto se desvía cada mes de la media global anual)
    const indicesEstacionales = {};
    meses.forEach(m => {
      // Normalizamos el divisor para evitar divisiones por 0
      indicesEstacionales[m] = promGlobalHistorico > 0 ? (promediosMensualesHist[m] / promGlobalHistorico) : 1;
    });

    // ==========================================
    // 2. RUPTURA METODOLÓGICA Y RATIO (2026)
    // ==========================================
    
    // Extraemos meses detectados en la nueva metodología
    const meses2026 = recAgrupado.map(d => {
      const p = d.Fecha.split('-');
      return p.length > 1 ? p[1] : null;
    }).filter(Boolean);

    let sum2026 = 0;
    let sumHistMismosMeses = 0; // Usando el promedio de ESOS meses en la historia reciente (últimos 3 años)
    
    // Calculamos el ratio metodológico empírico basado en los meses de transición
    recAgrupado.forEach(d => {
      sum2026 += d.Valor;
      const m = d.Fecha.split('-')[1];
      // Buscamos cuánto era lo NORMAL en ese mes históricamente
      sumHistMismosMeses += promediosMensualesHist[m] || promGlobalHistorico;
    });

    // Ratio de cambio metodológico: ¿La nueva contabilidad cuenta más o menos delitos?
    const factorMetodologico = (sumHistMismosMeses > 0 && sum2026 > 0) ? (sum2026 / sumHistMismosMeses) : 1;
    
    // Nivel base "desestacionalizado" inferido para 2026 
    const isSuficiente = recAgrupado.length >= 6;
    let nivelBase2026 = promGlobalHistorico;
    
    if (recAgrupado.length > 0) {
      // Dividimos la media observada entre la media del índice estacional de los meses observados
      const mediaObservada2026 = sum2026 / recAgrupado.length;
      const mediaIndiceObservado = meses2026.reduce((acc, m) => acc + (indicesEstacionales[m] || 1), 0) / recAgrupado.length;
      nivelBase2026 = mediaObservada2026 / (mediaIndiceObservado > 0 ? mediaIndiceObservado : 1);
    } else {
      // Si no tenemos datos 2026 aún (ej. filtros que lo vacían), extrapolamos desde la base reciente
      nivelBase2026 = promBaseReciente;
    }

    // ==========================================
    // 3. PROYECCIÓN CON BANDAS DE INCERTIDUMBRE
    // ==========================================
    const proyeccion = [];
    const numMesesProy = 6;
    
    // Determinar desde dónde proyectar
    let lastDate = recAgrupado.length > 0 ? recAgrupado[recAgrupado.length - 1].Fecha : (histAgrupado.length > 0 ? histAgrupado[histAgrupado.length - 1].Fecha : '2025-12');
    let [lastYear, lastMonth] = lastDate.split('-').map(Number);
    if(isNaN(lastYear)) lastYear = new Date().getFullYear();
    if(isNaN(lastMonth)) lastMonth = new Date().getMonth() + 1;

    for (let i = 1; i <= numMesesProy; i++) {
        let m = lastMonth + i;
        let y = lastYear;
        while (m > 12) {
            m -= 12;
            y += 1;
        }
        const strM = m.toString().padStart(2, '0');
        const idx = indicesEstacionales[strM] || 1;
        
        // Aplicamos el índice estacional al nivel base estimado de la nueva metodología
        const valorBaseProyectado = nivelBase2026 * idx; 
        
        // La incertidumbre es inversamente proporcional a la cantidad de datos en la nueva metodología
        // Si solo tenemos 2 meses, la incertidumbre inicial es alta (ej. 20%) y crece con el horizonte de proyección (+5% por mes)
        const incertidumbreBase = isSuficiente ? 0.05 : 0.20; 
        const incertidumbre = incertidumbreBase + (i * 0.05);

        proyeccion.push({
            Fecha: `${y}-${strM}`,
            Valor: Math.round(valorBaseProyectado),
            Pesimista: Math.round(valorBaseProyectado * (1 + incertidumbre)), // Intervalo superior (más delitos = pesimista)
            Optimista: Math.round(valorBaseProyectado * (1 - incertidumbre))  // Intervalo inferior (menos delitos = optimista)
        });
    }

    // ==========================================
    // 4. DIAGNÓSTICOS PARA LA UI
    // ==========================================
    
    // ¿Cuánto es la variación bruta explicada por la metodología vs el patrón histórico puro?
    const variacionMetodologiaPorcentaje = (factorMetodologico - 1) * 100;
    
    // Meses de mayor riesgo histórico (top 2 meses con mayor índice estacional)
    const mesesNombres = { '01':'Ene', '02':'Feb', '03':'Mar', '04':'Abr', '05':'May', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Sep', '10':'Oct', '11':'Nov', '12':'Dic' };
    const mesesRiesgoHistorico = Object.keys(indicesEstacionales)
        .sort((a,b) => indicesEstacionales[b] - indicesEstacionales[a])
        .slice(0, 2)
        .map(m => ({ mes: mesesNombres[m] || m, indice: indicesEstacionales[m] }));

    return {
      listo: true,
      historico: histAgrupado,
      reciente: recAgrupado,
      proyeccion,
      
      metricas: {
        factorMetodologico,
        variacionMetodologiaPorcentaje,
        mesesRiesgoHistorico,
        datos2026Insuficientes: !isSuficiente,
        nivelBaseDeseastacionalizado: nivelBase2026,
        mesLista: meses2026
      },
      indicesEstacionales
    };
  }, [dataEstatal, dataHistorica]);
}

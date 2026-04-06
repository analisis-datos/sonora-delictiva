import React, { useMemo, Suspense, lazy } from 'react';
import { useAlertaData } from '../hooks/useAlertaData';

const Plot = lazy(() => import('react-plotly.js').then(m => ({ default: m.default?.default || m.default || m })));

const FallbackLoader = () => (
  <div className="flex justify-center items-center py-20 text-[var(--color-dash-muted)]">
    <span className="text-sm tracking-widest uppercase">Cargando Módulo...</span>
  </div>
);

const LAYOUT_BASE = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  font: { family: 'Inter, system-ui, sans-serif', color: '#8892b0', size: 11 },
  margin: { t: 30, r: 16, b: 40, l: 50 },
  legend: { font: { size: 10 }, bgcolor: 'rgba(0,0,0,0)', orientation: 'h', y: -0.2 },
  xaxis: { gridcolor: '#2e3250', zerolinecolor: '#2e3250', color: '#8892b0', type: 'category' },
  yaxis: { gridcolor: '#2e3250', zerolinecolor: '#2e3250', color: '#8892b0', rangemode: 'tozero' },
  hovermode: 'x unified',
  hoverlabel: { bgcolor: '#1a1d27', bordercolor: '#4f72ff', font: { color: '#e8eaf6' } },
};

const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

export default function TabAlertaTemprana({ dataEstatal, dataHistorica }) {
  const { listo, historico, reciente, proyeccion, metricas, indicesEstacionales } = useAlertaData(dataEstatal, dataHistorica);

  const tracesMain = useMemo(() => {
    if (!listo) return [];
    
    // Trace 0: Datos Históricos (Crudos) - Puntos semitransparentes
    const traceHistRaw = {
      x: historico.map(r => r.Fecha),
      y: historico.map(r => r.Valor),
      type: 'scatter',
      mode: 'markers',
      name: 'Datos Históricos (Crudos)',
      marker: { color: 'rgba(79, 114, 255, 0.25)', size: 5 },
      showlegend: false,
    };

    // Trace 1: Serie histórica completa (2015-2025) - Media Móvil 3m
    const movAvg = historico.map((h, i, arr) => {
      if (i < 2) return null;
      return (arr[i].Valor + arr[i-1].Valor + arr[i-2].Valor) / 3;
    });

    const traceHist = {
      x: historico.map(r => r.Fecha),
      y: movAvg,
      type: 'scatter',
      mode: 'lines',
      name: 'Tendencia Histórica (MA 3m)',
      line: { color: '#4f72ff', width: 2, shape: 'spline' },
      opacity: 0.8
    };

    // Trace 2: Datos Recientes 2026 (Nueva Metodología) - Color Destacado y Puntos sólidos si son pocos
    const traceRec = {
      x: reciente.map(r => r.Fecha),
      y: reciente.map(r => r.Valor),
      type: 'scatter',
      mode: reciente.length <= 2 ? 'markers+lines' : 'lines',
      name: 'Datos 2026 (Nueva Metodología)',
      line: { color: '#ff6b6b', width: 3 },
      marker: { size: 8, color: '#ff6b6b' }
    };

    if (!proyeccion || proyeccion.length === 0) return [traceHist, traceRec];

    // Conectar el último punto de 2026 con el inicio de la proyección
    const lastReciente = reciente.length > 0 ? reciente[reciente.length - 1] : (historico.length > 0 ? historico[historico.length - 1] : null);
    
    const xProj = lastReciente ? [lastReciente.Fecha, ...proyeccion.map(r => r.Fecha)] : proyeccion.map(r => r.Fecha);
    
    const traceProj = {
      x: xProj,
      y: lastReciente ? [lastReciente.Valor, ...proyeccion.map(r => r.Valor)] : proyeccion.map(r => r.Valor),
      type: 'scatter',
      mode: 'lines',
      name: 'Proyección Escenario Base',
      line: { color: '#f9ca24', width: 2, dash: 'dot' }
    };

    // Bandas de confianza
    const traceUpperBound = {
      x: xProj,
      y: lastReciente ? [lastReciente.Valor, ...proyeccion.map(r => r.Pesimista)] : proyeccion.map(r => r.Pesimista),
      type: 'scatter',
      mode: 'lines',
      line: { width: 0 },
      showlegend: false,
      hoverinfo: 'skip'
    };

    const traceLowerBound = {
      x: xProj,
      y: lastReciente ? [lastReciente.Valor, ...proyeccion.map(r => r.Optimista)] : proyeccion.map(r => r.Optimista),
      type: 'scatter',
      mode: 'lines',
      fill: 'tonexty',
      fillcolor: 'rgba(249, 202, 36, 0.15)', // amarillo semitransparente
      line: { width: 0 },
      name: 'Banda de Confianza (Incertidumbre)'
    };

    return [traceHistRaw, traceHist, traceRec, traceUpperBound, traceLowerBound, traceProj];
  }, [listo, historico, reciente, proyeccion]);

  const traceEstacionalidad = useMemo(() => {
    if(!indicesEstacionales) return [];
    const meses = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const mesesNombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    
    const yVal = meses.map(m => (indicesEstacionales[m] || 1) * 100);
    
    return [{
      x: mesesNombres,
      y: yVal,
      type: 'bar',
      marker: {
        color: yVal.map(v => v > 100 ? '#ff6b6b' : '#4f72ff'), // Rojo si está por encima del promedio anual
        opacity: 0.8
      },
      name: 'Índice Estacional (%)'
    }];
  }, [indicesEstacionales]);

  if (!listo) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-gray-400 border border-gray-700/50">
        <p className="text-xl mb-2">⚠️ Esperando datos cruzados</p>
        <p className="text-sm">Se requieren datos tanto de la metodología historíca como de la nueva para el análisis de ruptura.</p>
      </div>
    );
  }

  // Cálculos de colores y KPIs
  const variacionDisplay = metricas.variacionMetodologiaPorcentaje;
  const isAltMet = variacionDisplay > 0;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      
      {/* Disclaimer de la Nueva Metodología */}
      {metricas.datos2026Insuficientes && (
        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-xl p-4 flex gap-4 items-start shadow-inner">
          <div className="text-yellow-400 text-2xl mt-1">⚠️</div>
          <div>
            <h4 className="text-yellow-400 font-bold mb-1 uppercase tracking-wide text-sm">Aviso de Ruptura Metodológica en SESNSP</h4>
            <p className="text-sm text-yellow-200/80 mb-2">
              A partir de enero de 2026, el SESNSP implementó una <strong>nueva metodología de registro</strong>. La serie histórica (2015-2025) y los datos actuales (2026+) <strong>no son directamente comparables</strong> sin ajuste estadístico. 
            </p>
            <p className="text-xs text-yellow-200/60">
              Actualmente operamos con un alto nivel de incertidumbre (bandas de confianza anchas) al contar con solo {reciente.length} mes(es) de datos bajo el nuevo esquema. La confiabilidad del modelo predictivo mejorará sustancialmente tras 6 meses continuos de la nueva serie temporal.
            </p>
          </div>
        </div>
      )}

      {/* Grid de KPIs Inteligentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ratio Metodológico */}
        <div className="glass rounded-xl p-5 border-l-4" style={{borderLeftColor: isAltMet ? '#ff6b6b' : '#43e97b'}}>
            <p className="text-xs uppercase tracking-wide text-[var(--color-dash-muted)] mb-2">Efecto Metodológico</p>
            <p className={`text-2xl font-bold ${isAltMet ? 'text-red-400' : 'text-green-400'}`}>
               {variacionDisplay > 0 ? '+' : ''}{variacionDisplay.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-2 opacity-80 leading-tight">
               Comparativa de volumen esperado en estos mismos meses {isAltMet ? '(Aumento base)' : '(Caída base)'}.
            </p>
        </div>
        
        {/* Patrón de Nivel Base 2026 */}
        <div className="glass rounded-xl p-5 hover:border-gray-500 transition-colors">
            <p className="text-xs uppercase tracking-wide text-[var(--color-dash-muted)] mb-2">Nivel Base 2026</p>
            <p className="text-2xl font-bold text-white">{Math.round(metricas.nivelBaseDeseastacionalizado).toLocaleString()}</p>
            <p className="text-xs text-[var(--color-dash-muted)] mt-2 opacity-80 leading-tight">
               Promedio mensual subyacente estimado (desestacionalizado).
            </p>
        </div>

        {/* Riesgo Estacional */}
        <div className="glass rounded-xl p-5 hover:border-gray-500 transition-colors">
            <p className="text-xs uppercase tracking-wide text-[var(--color-dash-muted)] mb-2">Meses Críticos</p>
            <div className="flex gap-2">
                {metricas.mesesRiesgoHistorico.map((m, i) => (
                    <span key={i} className="px-2 py-1 bg-red-900/30 text-red-300 border border-red-700/50 rounded-md text-sm font-bold">
                        {m.mes} ({(m.indice*100).toFixed(0)}%)
                    </span>
                ))}
            </div>
            <p className="text-xs text-[var(--color-dash-muted)] mt-2 opacity-80 leading-tight">
               Meses históricamente más violentos.
            </p>
        </div>

        {/* Proyección Cierre */}
        <div className="glass rounded-xl p-5 hover:border-gray-500 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 blur-[1px] text-4xl">🎯</div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-dash-muted)] mb-2">Escenario Pesimista 3m</p>
            <p className="text-2xl font-bold text-[#f9ca24]">
              {proyeccion.length >= 3 ? proyeccion[2].Pesimista.toLocaleString() : 'N/A'}
            </p>
            <p className="text-xs text-[var(--color-dash-muted)] mt-2 opacity-80 leading-tight">
              Tope estimado en {proyeccion.length >= 3 ? proyeccion[2].Fecha : ''} por ajuste metodológico.
            </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfica Principal de Ruptura (2/3) */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-xl relative">
          <h3 className="text-sm font-medium text-white mb-2 tracking-wide uppercase flex items-center justify-between">
            Serie Interrumpida y Proyección Ajustada
            <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-1 rounded-full">Modelo Compuesto</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4">La línea vertical demarca la transición a las nuevas reglas operativas SIS. Nótese el cambio de régimen en volúmenes.</p>
          
          <div className="w-full h-[400px]">
            <Suspense fallback={<FallbackLoader />}>
              <Plot
                data={tracesMain}
                layout={{ 
                  ...LAYOUT_BASE,
                  shapes: [{
                    type: 'line',
                    x0: '2026-01-01', x1: '2026-01-01', y0: 0, y1: 1, yref: 'paper',
                    line: { color: '#ff6b6b', width: 1, dash: 'dashdot' }
                  }],
                  annotations: [{
                    x: '2026-01-01', y: 1, yref: 'paper',
                    text: 'Ruptura<br>Metodológica',
                    showarrow: true, arrowhead: 2, ax: -40, ay: -20,
                    font: { color: '#ff6b6b', size: 10 }
                  }]
                }}
                config={PLOTLY_CONFIG}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
              />
            </Suspense>
          </div>
        </div>

        {/* Gráfica de Estacionalidad Histórica (1/3) */}
        <div className="glass rounded-2xl p-6 shadow-xl content-start flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium text-white mb-2 tracking-wide uppercase">Patrón de Estacionalidad Anual</h3>
            <p className="text-xs text-gray-500 mb-4">Comportamiento intra-anual histórico. (Promedio = 100%). Este patrón se transfiere a la proyección independientemente del cambio de unidad de medida.</p>
          </div>
          
          <div className="w-full h-[300px]">
            <Suspense fallback={<FallbackLoader />}>
              <Plot
                data={traceEstacionalidad}
                layout={{
                  ...LAYOUT_BASE, 
                  margin: { t: 10, r: 10, b: 30, l: 40 },
                  yaxis: { ...LAYOUT_BASE.yaxis, title: 'Índice Base 100' },
                  shapes: [{
                    type: 'line',
                    x0: -0.5, x1: 11.5, y0: 100, y1: 100,
                    line: { color: '#a29bfe', width: 1, dash: 'dot' }
                  }]
                }}
                config={PLOTLY_CONFIG}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
              />
            </Suspense>
          </div>

          <div className="mt-4 p-3 bg-blue-900/10 border border-blue-900/50 rounded-lg">
            <h5 className="text-xs text-blue-400 font-bold mb-1">Estrategia Estadística:</h5>
            <p className="text-[10px] text-gray-400 leading-relaxed text-justify">
              Se preserva el patrón armónico interanual (estacionalidad) calculado con 10 años de historia. 
              Sin embargo, el <strong>intercepto</strong> y <strong>magnitud general base</strong> se ajustan utilizando el volumen observado post-ruptura.
              Las bandas crecen al 5% sistemático por horizonte dadas las deficiencias de anclaje inicial.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

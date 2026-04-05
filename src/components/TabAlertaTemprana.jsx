// src/components/TabAlertaTemprana.jsx
import React, { useMemo, Suspense, lazy } from 'react';
import { useProyeccion } from '../hooks/useProyeccion';

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
  legend: { font: { size: 10 }, bgcolor: 'rgba(0,0,0,0)' },
  xaxis: { gridcolor: '#2e3250', zerolinecolor: '#2e3250', color: '#8892b0' },
  yaxis: { gridcolor: '#2e3250', zerolinecolor: '#2e3250', color: '#8892b0', rangemode: 'tozero' },
  hovermode: 'x unified',
  hoverlabel: { bgcolor: '#1a1d27', bordercolor: '#4f72ff', font: { color: '#e8eaf6' } },
};

const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

export default function TabAlertaTemprana({ df }) {
  const { historico, proyeccion, tendenciaGral, slope } = useProyeccion(df, 6);

  const traces = useMemo(() => {
    if(!historico || historico.length === 0) return [];
    
    const traceHist = {
      x: historico.map(r => r.Fecha),
      y: historico.map(r => r.Valor),
      type: 'scatter',
      mode: 'lines',
      name: 'Histórico',
      line: { color: '#4f72ff', width: 2 }
    };

    if (proyeccion.length === 0) return [traceHist];

    const xProj = [historico[historico.length - 1]?.Fecha, ...proyeccion.map(r => r.Fecha)];
    const yProj = [historico[historico.length - 1]?.Valor, ...proyeccion.map(r => r.Valor)];

    const traceProj = {
      x: xProj,
      y: yProj,
      type: 'scatter',
      mode: 'lines',
      name: 'Proyección (6 meses)',
      line: { color: '#f9ca24', width: 2, dash: 'dot' }
    };

    return [traceHist, traceProj];
  }, [historico, proyeccion]);

  if (!historico || historico.length < 2) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-gray-400 border border-gray-700/50">
        <p className="text-xl mb-2">⚠️ Historial Insuficiente</p>
        <p className="text-sm">No hay suficientes datos consecutivos bajo el filtro actual (mínimo 2) para generar una proyección o dibujar tendencia.</p>
      </div>
    );
  }

  const textColor = tendenciaGral === 'alza' ? 'text-red-400' : tendenciaGral === 'baja' ? 'text-green-400' : 'text-blue-400';
  const labelTendencia = tendenciaGral === 'alza' ? '📈 Tendencia al alza' : tendenciaGral === 'baja' ? '📉 Tendencia a la baja' : '➡️ Tendencia estable';
  const colorMap = { alza: '#ff6b6b', baja: '#43e97b', estable: '#4f72ff' };

  const mesCritico = useMemo(() => {
      if(!proyeccion || proyeccion.length === 0) return null;
      let maxObj = proyeccion[0];
      proyeccion.forEach(p => {
          if (p.Valor > maxObj.Valor) maxObj = p;
      });
      return maxObj;
  }, [proyeccion]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 border-l-4" style={{borderLeftColor: colorMap[tendenciaGral]}}>
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Diagnóstico Reciente</p>
            <p className={`text-xl font-bold ${textColor}`}>{labelTendencia}</p>
            <p className="text-xs text-gray-400 mt-2 opacity-80">Var. prom: {slope > 0 ? '+' : ''}{slope?.toFixed(1)} casos/mes</p>
        </div>
        
        <div className="glass rounded-xl p-5 hover:border-gray-500 transition-colors">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Último Mes Registrado</p>
            <p className="text-2xl font-bold text-white">{historico[historico.length - 1]?.Valor?.toLocaleString() ?? 0}</p>
            <p className="text-xs text-[var(--color-dash-muted)] mt-2 opacity-80">{historico[historico.length - 1]?.Fecha ?? 'N/A'}</p>
        </div>

        <div className="glass rounded-xl p-5 hover:border-gray-500 transition-colors">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Proyección a 6 meses</p>
            <p className="text-2xl font-bold text-white">{proyeccion[proyeccion.length - 1]?.Valor?.toLocaleString() ?? 0}</p>
            <p className="text-xs text-[var(--color-dash-muted)] mt-2 opacity-80">Esperado para {proyeccion[proyeccion.length - 1]?.Fecha ?? 'N/A'}</p>
        </div>

        <div className="glass rounded-xl p-5 hover:border-gray-500 transition-colors">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Mes Mayor Riesgo Proy.</p>
            <p className="text-2xl font-bold text-red-400">{mesCritico?.Valor?.toLocaleString() ?? 0}</p>
            <p className="text-xs text-[var(--color-dash-muted)] mt-2 opacity-80">{mesCritico?.Fecha ?? 'N/A'}</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-medium text-[var(--color-dash-muted)] mb-4 tracking-wide uppercase">Modelo de Proyección Criminológica (Lineal)</h3>
        <div className="w-full h-[400px]">
          <Suspense fallback={<FallbackLoader />}>
            <Plot
              data={traces}
              layout={{ ...LAYOUT_BASE, autosize: true, margin: { t: 10, r: 10, b:40, l: 50 }, xaxis: { ...LAYOUT_BASE.xaxis, type: 'category' } }}
              config={PLOTLY_CONFIG}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler
              role="img"
              aria-label="Proyección estadística lineal de alerta temprana sobre tendencia de delitos"
            />
          </Suspense>
        </div>
        <div className="mt-4 text-xs text-gray-500 bg-[#1a1d27] p-3 rounded-lg border border-[#2e3250]">
            <strong>Nota metodológica:</strong> Este módulo de alerta temprana utiliza un modelo de regresión lineal simple basado en la serie histórica reciente (últimos 24 meses).
            Sirve para identificar la dirección de la trayectoria delictiva asumiendo que las condiciones subyacentes se mantienen constantes.
            Las proyecciones son puramente estimativas retrospectivas, no predictivas absolutas.
        </div>
      </div>

    </div>
  );
}

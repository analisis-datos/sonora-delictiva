import React, { useMemo, Suspense, lazy } from 'react';
import DetailModal from '../DetailModal';

const Plot = lazy(() => import('react-plotly.js').then(m => ({ default: m.default?.default || m.default || m })));

function agrupar(arr, keys, valKey = 'Valor') {
  const map = {};
  arr.forEach(r => {
    const k = keys.map(key => r[key]).join('||');
    map[k] = (map[k] || 0) + (Number(r[valKey]) || 0);
  });
  return Object.entries(map).map(([k, v]) => {
    const obj = { Valor: v };
    k.split('||').forEach((val, i) => { obj[keys[i]] = val; });
    return obj;
  });
}

function sumaTotal(arr) {
  return arr.reduce((s, r) => s + (Number(r.Valor) || 0), 0);
}

export default function TotalCarpetasModal({ isOpen, onClose, df, tasaCambio, porFechaData, onFilterDelito }) {
  const topDelitos = useMemo(() => {
    const agrupado = agrupar(df, ['Subtipo de delito']);
    agrupado.sort((a,b) => b.Valor - a.Valor);
    const tot = sumaTotal(df);
    return agrupado.slice(0, 5).map(r => ({...r, pct: tot > 0 ? (r.Valor/tot)*100 : 0}));
  }, [df]);

  const trace = useMemo(() => {
    const recent = porFechaData.slice(-12);
    return [{
      x: recent.map(r => r.Fecha),
      y: recent.map(r => r.Valor),
      type: 'scatter', mode: 'lines+markers', name: 'Carpetas', line: { color: '#4f72ff', width: 3 }, fill: 'tozeroy', fillcolor: 'rgba(79,114,255,0.1)'
    }];
  }, [porFechaData]);

  return (
    <DetailModal isOpen={isOpen} onClose={onClose} title="Análisis: Total de Carpetas" size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
         <div className="glass bg-[#1e2235]/50 p-6 rounded-xl text-center border-blue-500/20 border">
            <p className="text-sm text-gray-400 uppercase tracking-widest mb-2 font-semibold">Acumulado en el Periodo</p>
            <p className="text-4xl font-bold text-white">{sumaTotal(df).toLocaleString('es-MX')}</p>
         </div>
         <div className="glass bg-[#1e2235]/50 p-6 rounded-xl text-center border-gray-700/50 border">
            <p className="text-sm text-gray-400 uppercase tracking-widest mb-2 font-semibold">Variación Mensual (MoM)</p>
            <p className={`text-4xl font-bold ${tasaCambio > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {tasaCambio > 0 ? '+' : ''}{tasaCambio?.toFixed(1) || 0}%
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="glass p-5 rounded-xl border border-gray-700/50 h-[320px] flex flex-col">
            <h3 className="text-sm text-gray-400 uppercase font-bold mb-2">Evolución (Últimos 12 meses)</h3>
            <div className="flex-1 min-h-0 w-full relative">
              <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center">Cargando...</div>}>
                  <Plot data={trace} layout={{ paper_bgcolor:'transparent', plot_bgcolor:'transparent', margin:{l:40, r:10, t:10, b:40}, font:{color:'#8892b0'}, xaxis:{type: 'category', gridcolor:'#2e3250'}, yaxis:{gridcolor:'#2e3250'}, hovermode: 'x unified' }} style={{width:'100%', height:'100%'}} config={{displayModeBar:false, responsive:true}}/>
              </Suspense>
            </div>
         </div>
         <div className="glass p-5 rounded-xl border border-gray-700/50 h-[320px] flex flex-col">
            <h3 className="text-sm text-gray-400 uppercase font-bold mb-4">Top 5 Delitos Concurrentes</h3>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {topDelitos.map((d, i) => (
                <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-blue-600/20 p-2.5 rounded-lg border border-transparent hover:border-blue-500/50 transition-colors" onClick={() => { onFilterDelito(d['Subtipo de delito']); onClose(); }}>
                  <span className="text-sm font-medium text-gray-200 truncate pr-4">{d['Subtipo de delito']}</span>
                  <div className="flex items-center gap-4 text-sm whitespace-nowrap">
                    <span className="font-bold text-white">{d.Valor.toLocaleString('es-MX')}</span>
                    <span className="text-gray-500 font-mono w-12 text-right bg-black/20 px-1 rounded">{d.pct.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-400 mt-4 text-center font-medium">⬆ Haz clic en un delito para profundizar</p>
         </div>
      </div>
    </DetailModal>
  );
}

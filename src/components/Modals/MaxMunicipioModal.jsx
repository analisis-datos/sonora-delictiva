import React, { useMemo, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
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

export default function MaxMunicipioModal({ isOpen, onClose, df, municipioNombre, porMun, onFilterMunicipio }) {
  
  const subDf = useMemo(() => df.filter(r => r.Municipio === municipioNombre), [df, municipioNombre]);
  
  const topDelitos = useMemo(() => {
    const agrupado = agrupar(subDf, ['Subtipo de delito']).sort((a,b) => b.Valor - a.Valor);
    const tot = sumaTotal(subDf);
    return agrupado.slice(0, 10).map(r => ({...r, pct: tot > 0 ? (r.Valor/tot)*100 : 0}));
  }, [subDf]);

  const tracesEvolucion = useMemo(() => {
    const histLocal = agrupar(subDf, ['Fecha']).sort((a,b) => a.Fecha > b.Fecha ? 1 : -1);
    const histEstatal = agrupar(df, ['Fecha']).sort((a,b) => a.Fecha > b.Fecha ? 1 : -1);
    
    // Normalizar a porcentajes relativos o usar doble eje? Usaremos valores absolutos por simplicidad,
    // o calcularemos un promedio si los valores difieren demasiado. 
    // Lo ideal es dejar dual lines con secundary Y axis.
    return [
      {
        x: histEstatal.map(r => r.Fecha),
        y: histEstatal.map(r => r.Valor),
        type: 'scatter', mode: 'lines', name: 'Estatal', line: { color: '#8892b0', width: 2, dash: 'dot' },
        yaxis: 'y2'
      },
      {
        x: histLocal.map(r => r.Fecha),
        y: histLocal.map(r => r.Valor),
        type: 'scatter', mode: 'lines', name: municipioNombre, line: { color: '#fd79a8', width: 3 },
      }
    ];
  }, [subDf, df, municipioNombre]);

  return (
    <DetailModal isOpen={isOpen} onClose={onClose} title={`Radiografía: ${municipioNombre}`} size="lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex gap-4">
          <div className="glass px-6 py-4 rounded-xl border border-pink-500/20 bg-pink-900/10">
            <p className="text-4xl font-bold text-pink-400">{porMun?.Valor?.toLocaleString('es-MX') || 0}</p>
            <p className="text-sm text-gray-400 mt-1 uppercase tracking-wide font-medium">Incidentes Locales</p>
          </div>
          <div className="glass px-6 py-4 rounded-xl border border-gray-700/50">
            <p className="text-4xl font-bold text-gray-300">{df.length > 0 ? ((porMun?.Valor || 0) / sumaTotal(df) * 100).toFixed(1) : 0}%</p>
            <p className="text-sm text-gray-400 mt-1 uppercase tracking-wide font-medium">Del Total Sonorense</p>
          </div>
        </div>
        <button onClick={() => { onFilterMunicipio(municipioNombre); onClose(); }} className="px-5 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-pink-900/50">
          Enfocar Municipio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="glass p-5 rounded-xl h-[320px] flex flex-col border border-gray-700/50">
            <h3 className="text-sm text-gray-400 uppercase font-bold mb-2">Dinámica {municipioNombre} vs Estado</h3>
            <div className="flex-1 w-full min-h-0 relative">
              <Suspense fallback={<div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><Loader2 size={40} className="animate-spin text-[#fd79a8]" /><span className="text-[#fd79a8] font-medium text-sm tracking-wide">Cargando dinámica municipal...</span></div>}>
                  <Plot 
                    data={tracesEvolucion} 
                    layout={{ 
                      paper_bgcolor:'transparent', plot_bgcolor:'transparent', margin:{l:40, r:40, t:10, b:40}, font:{color:'#8892b0'}, 
                      xaxis:{type: 'category', gridcolor:'#2e3250'}, 
                      yaxis:{gridcolor:'#2e3250', title: 'Local'},
                      yaxis2: { overlaying: 'y', side: 'right', showgrid: false, title: 'Estatal' },
                      legend: { orientation: 'h', y: -0.2 }
                    }} 
                    style={{width:'100%', height:'100%'}} 
                    config={{displayModeBar:false, responsive:true}}
                    role="img"
                    aria-label="Gráfica dual: Comparativa de incidencia del municipio vs promedio estatal"
                  />
              </Suspense>
            </div>
         </div>
         <div className="glass p-5 rounded-xl flex flex-col h-[320px] border border-gray-700/50">
            <h3 className="text-sm text-gray-400 uppercase font-bold mb-4">Top 10 Delitos Locales</h3>
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <table className="w-full text-sm">
                <caption className="sr-only">Tabla: Top 10 delitos locales en {municipioNombre}</caption>
                <thead className="border-b border-gray-700">
                  <tr>
                    <th scope="col" className="text-left text-xs uppercase font-bold text-gray-400 py-2">Ranking</th>
                    <th scope="col" className="text-left text-xs uppercase font-bold text-gray-400 py-2">Delito</th>
                    <th scope="col" className="text-right text-xs uppercase font-bold text-gray-400 py-2">Casos</th>
                    <th scope="col" className="text-right text-xs uppercase font-bold text-gray-400 py-2">Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {topDelitos.map((d, i) => (
                    <tr key={i} className="border-b border-gray-700/30 hover:bg-[#1e2235] transition-colors">
                      <td className="text-left py-2 text-xs font-bold text-gray-500">{i+1}</td>
                      <td className="text-left py-2 text-gray-200 font-medium">{d['Subtipo de delito']}</td>
                      <td className="text-right py-2 font-bold text-white">{d.Valor.toLocaleString('es-MX')}</td>
                      <td className="text-right py-2 text-gray-500 font-mono">
                         <span className="bg-black/30 px-2 py-1 rounded">{d.pct.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </div>
      </div>
    </DetailModal>
  );
}

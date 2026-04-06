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

export default function PrincipalDelitoModal({ isOpen, onClose, df, delitoNombre, porDelito, onFilterDelito }) {
  
  const subDf = useMemo(() => df.filter(r => r['Subtipo de delito'] === delitoNombre), [df, delitoNombre]);
  
  const topMunicipios = useMemo(() => {
    const agrupado = agrupar(subDf, ['Municipio']).sort((a,b) => b.Valor - a.Valor);
    const tot = sumaTotal(subDf);
    return agrupado.slice(0, 10).map(r => ({...r, pct: tot > 0 ? (r.Valor/tot)*100 : 0}));
  }, [subDf]);

  const traceEvolucion = useMemo(() => {
    const hist = agrupar(subDf, ['Fecha']).sort((a,b) => a.Fecha > b.Fecha ? 1 : -1);
    return [{
      x: hist.map(r => r.Fecha),
      y: hist.map(r => r.Valor),
      type: 'scatter', mode: 'lines', name: delitoNombre, line: { color: '#e07010', width: 3 }
    }];
  }, [subDf, delitoNombre]);

  return (
    <DetailModal isOpen={isOpen} onClose={onClose} title={`Análisis Delictivo: ${delitoNombre}`} size="lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="glass px-6 py-4 rounded-xl border border-orange-500/20 bg-orange-900/10">
          <p className="text-4xl font-bold text-orange-400">{porDelito?.Valor?.toLocaleString('es-MX') || 0}</p>
          <p className="text-sm text-gray-400 mt-1 uppercase tracking-wide font-medium">Casos Históricos Registrados</p>
        </div>
        <button onClick={() => { onFilterDelito(delitoNombre); onClose(); }} className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-orange-900/50">
          Fijar Vista en este Delito
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="glass p-5 rounded-xl h-[320px] flex flex-col border border-gray-700/50">
            <h3 className="text-sm text-gray-400 uppercase font-bold mb-2">Evolución Regional Global</h3>
            <div className="flex-1 w-full min-h-0 relative">
              <Suspense fallback={<div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><Loader2 size={40} className="animate-spin text-[#e07010]" /><span className="text-[#e07010] font-medium text-sm tracking-wide">Cargando análisis del delito...</span></div>}>
                  <Plot 
                    data={traceEvolucion} 
                    layout={{ paper_bgcolor:'transparent', plot_bgcolor:'transparent', margin:{l:40, r:10, t:10, b:40}, font:{color:'#8892b0'}, xaxis:{type: 'category', gridcolor:'#2e3250'}, yaxis:{gridcolor:'#2e3250'} }} 
                    style={{width:'100%', height:'100%'}} 
                    config={{displayModeBar:false, responsive:true}}
                    role="img"
                    aria-label="Gráfica temporal: Evolución del delito seleccionado a nivel estatal"
                  />
              </Suspense>
            </div>
         </div>
         <div className="glass p-5 rounded-xl flex flex-col h-[320px] border border-gray-700/50">
            <h3 className="text-sm text-gray-400 uppercase font-bold mb-4">Top 10 Municipios Afectados</h3>
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <table className="w-full text-sm">
                <caption className="sr-only">Tabla: Top 10 municipios más afectados por el delito seleccionado</caption>
                <thead className="border-b border-gray-700">
                  <tr>
                    <th scope="col" className="text-left text-xs uppercase font-bold text-gray-400 py-2">Ranking</th>
                    <th scope="col" className="text-left text-xs uppercase font-bold text-gray-400 py-2">Municipio</th>
                    <th scope="col" className="text-right text-xs uppercase font-bold text-gray-400 py-2">Casos</th>
                    <th scope="col" className="text-right text-xs uppercase font-bold text-gray-400 py-2">Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {topMunicipios.map((d, i) => (
                    <tr key={i} className="border-b border-gray-700/30 hover:bg-[#1e2235] transition-colors">
                      <td className="text-left py-2 text-xs font-bold text-gray-500">{i+1}</td>
                      <td className="text-left py-2 text-gray-200 font-medium">{d.Municipio}</td>
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

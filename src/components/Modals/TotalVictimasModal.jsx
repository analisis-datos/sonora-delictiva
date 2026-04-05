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

export default function TotalVictimasModal({ isOpen, onClose, dfV, df, totalVictimas, setActiveTab }) {
  
  const totalCarpetas = sumaTotal(df);
  const ratio = totalCarpetas > 0 ? (totalVictimas / totalCarpetas) : 0;

  const { topDelitos, pieTraces } = useMemo(() => {
    const agrupado = agrupar(dfV, ['Subtipo de delito']).sort((a,b) => b.Valor - a.Valor).slice(0,8);
    
    // Calcular ratio para cada delito
    const ratios = agrupado.map(d => {
      const carpetasSub = sumaTotal(df.filter(r => r['Subtipo de delito'] === d['Subtipo de delito']));
      const ratioLocal = carpetasSub > 0 ? (d.Valor / carpetasSub) : 0;
      return { ...d, ratio: ratioLocal };
    });

    const pieTraces = [{
      labels: ratios.map(r => r['Subtipo de delito']),
      values: ratios.map(r => r.Valor),
      type: 'pie',
      hole: 0.5,
      textinfo: 'percent',
      marker: { colors: ['#4f72ff','#ff6b6b','#43e97b','#f9ca24','#a29bfe','#fd79a8','#00cec9','#e17055'] }
    }];

    return { topDelitos: ratios, pieTraces };
  }, [dfV, df]);

  return (
    <DetailModal isOpen={isOpen} onClose={onClose} title="Análisis: Demografía de Víctimas" size="lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex gap-4">
          <div className="glass px-6 py-4 rounded-xl border border-emerald-500/20 bg-emerald-900/10">
            <p className="text-4xl font-bold text-emerald-400">{totalVictimas.toLocaleString('es-MX')}</p>
            <p className="text-sm text-gray-400 mt-1 uppercase tracking-wide font-medium">Víctimas Afectadas</p>
          </div>
          <div className="glass px-6 py-4 rounded-xl border border-gray-700/50">
            <p className="text-4xl font-bold text-white">{ratio.toFixed(2)}</p>
            <p className="text-sm text-gray-400 mt-1 uppercase tracking-wide font-medium">Víctimas por Carpeta</p>
          </div>
        </div>
        <button onClick={() => { setActiveTab(2); onClose(); }} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-emerald-900/50">
          Explorar Dashboard de Víctimas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="glass p-5 rounded-xl h-[320px] flex flex-col border border-gray-700/50">
            <h3 className="text-sm text-gray-400 uppercase font-bold mb-2">Composición por Delito</h3>
            <div className="flex-1 w-full min-h-0 relative">
              <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center">Cargando...</div>}>
                  <Plot 
                    data={pieTraces} 
                    layout={{ paper_bgcolor:'transparent', plot_bgcolor:'transparent', margin:{l:10, r:10, t:10, b:10}, font:{color:'#8892b0'}, showlegend: false }} 
                    style={{width:'100%', height:'100%'}} config={{displayModeBar:false, responsive:true}}/>
              </Suspense>
            </div>
         </div>
         <div className="glass p-5 rounded-xl flex flex-col h-[320px] border border-gray-700/50">
            <h3 className="text-sm text-gray-400 uppercase font-bold mb-4">Top Delitos (Volumen vs Ratio)</h3>
            <div className="space-y-2.5 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {topDelitos.map((d, i) => (
                <div key={i} className="bg-[#1e2235] p-2.5 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-200 font-medium truncate">{d['Subtipo de delito']}</span>
                    <span className="font-bold text-white">{d.Valor.toLocaleString('es-MX')} vict.</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Ratio de gravedad:</span>
                    <span className={`font-mono px-1 rounded ${d.ratio > 1.5 ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                      {d.ratio.toFixed(2)} por caso
                    </span>
                  </div>
                </div>
              ))}
            </div>
         </div>
      </div>
    </DetailModal>
  );
}

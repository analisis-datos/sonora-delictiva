// src/components/TabVictimas.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Pestaña "Víctimas" — demografía por sexo/edad, evolución, choropleth y ranking.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import PlotlyComponent from 'react-plotly.js';
import TabMunicipal from './TabMunicipal';

const Plot = PlotlyComponent.default || PlotlyComponent;

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const ALTO_IMPACTO = [
  'Homicidio doloso','Feminicidio','Secuestro','Extorsión',
  'Robo de vehículo automotor','Robo a casa habitación',
  'Robo a negocio','Robo a transeúnte en vía pública',
  'Violación simple','Lesiones dolosas','Narcomenudeo',
];

const COLORES = [
  '#4f72ff','#ff6b6b','#43e97b','#f9ca24',
  '#a29bfe','#fd79a8','#00cec9','#e17055',
  '#74b9ff','#55efc4','#fdcb6e','#6c5ce7'
];

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

const Card = ({ children, title, colSpan = false }) => (
  <div className={`glass rounded-2xl p-6 shadow-xl transition-all duration-300 hover:border-blue-500/50 ${colSpan ? 'col-span-full' : ''}`}>
    {title && <h3 className="text-sm font-medium text-[var(--color-dash-muted)] mb-4 tracking-wide uppercase">{title}</h3>}
    {children}
  </div>
);

function sumaTotal(arr) {
  return arr.reduce((s, r) => s + (Number(r.Valor) || 0), 0);
}

function agrupar(arr, keys) {
  const map = {};
  arr.forEach(r => {
    const k = keys.map(key => r[key]).join('||');
    map[k] = (map[k] || 0) + (Number(r['Valor']) || 0);
  });
  return Object.entries(map).map(([k, v]) => {
    const obj = { Valor: v };
    k.split('||').forEach((val, i) => { obj[keys[i]] = val; });
    return obj;
  });
}

export default function TabVictimas({
  dfV,
  victimasData,
  filtAnno,
  filtDelito,
  filtMunicipio,
  setFiltMunicipio,
}) {
  // Evolución total
  const porFechaV = useMemo(() => {
    const full = agrupar(dfV, ['Fecha']).sort((a, b) => a.Fecha > b.Fecha ? 1 : -1);
    let last = full.length - 1;
    while (last >= 0 && full[last].Valor === 0) last--;
    return last >= 0 ? full.slice(0, last + 1) : full;
  }, [dfV]);

  // Barras por tipo de delito
  const tracesAnualV = useMemo(() => {
    const anos = [...new Set(dfV.map(r => String(r['Año'])))].sort();
    return ALTO_IMPACTO.map((delito, i) => {
      const sub = dfV.filter(r => (r['Subtipo de delito'] || r['Tipo de delito'] || '').includes(delito.split(' ')[0]));
      const yVals = anos.map(a => sumaTotal(sub.filter(r => String(r['Año']) === a)));
      return { name: delito, x: anos, y: yVals, type: 'bar', marker: { color: COLORES[i % COLORES.length] } };
    }).filter(t => t.y.some(v => v > 0));
  }, [dfV]);

  // Heatmap
  const { annosHeatV, pivotV } = useMemo(() => {
    const pivot = {};
    dfV.forEach(r => {
      if (!r.Fecha) return;
      const anno = r.Fecha.slice(0, 4);
      const mes  = parseInt(r.Fecha.slice(5, 7)) - 1;
      if (!pivot[anno]) pivot[anno] = Array(12).fill(0);
      pivot[anno][mes] += Number(r.Valor) || 0;
    });
    return { annosHeatV: Object.keys(pivot).sort(), pivotV: pivot };
  }, [dfV]);

  // Por sexo
  const { tracesSexoTrend, totalXSexo, totalXEdad } = useMemo(() => {
    const vicXSexo = agrupar(dfV, ['Fecha', 'Sexo']).sort((a, b) => a.Fecha > b.Fecha ? 1 : -1);
    const fechasV  = [...new Set(vicXSexo.map(r => r.Fecha))].sort();
    let last = fechasV.length - 1;
    while (last >= 0 && sumaTotal(vicXSexo.filter(r => r.Fecha === fechasV[last])) === 0) last--;
    const fechasTrimmed = last >= 0 ? fechasV.slice(0, last + 1) : fechasV;

    const sexoTraces = ['Hombre', 'Mujer', 'No identificado'].map((sexo, i) => {
      const yVals = fechasTrimmed.map(f => {
        const found = vicXSexo.find(r => r.Fecha === f && r.Sexo === sexo);
        return found ? found.Valor : 0;
      });
      return { x: fechasTrimmed, y: yVals, type: 'scatter', mode: 'lines', name: sexo,
               line: { color: i === 0 ? '#4f72ff' : i === 1 ? '#ff6b6b' : '#a29bfe', width: 2 } };
    });

    return {
      tracesSexoTrend: sexoTraces,
      totalXSexo: agrupar(dfV, ['Sexo']).filter(r => r.Valor > 0),
      totalXEdad: agrupar(dfV, ['Rango de edad']).sort((a, b) => a.Valor - b.Valor),
    };
  }, [dfV]);

  // Municipios
  const { rankingMunV, tracesTop5V } = useMemo(() => {
    const ranking = agrupar(dfV, ['Municipio']).sort((a, b) => b.Valor - a.Valor).slice(0, 15);
    const top5 = ranking.slice(0, 5).map(r => r.Municipio);
    const traces = top5.map((mun, i) => {
      const sub = dfV.filter(r => r.Municipio === mun);
      const byFecha = agrupar(sub, ['Fecha']).sort((a, b) => a.Fecha > b.Fecha ? 1 : -1);
      let lnz = byFecha.length - 1;
      while (lnz >= 0 && byFecha[lnz].Valor === 0) lnz--;
      const trimmed = lnz >= 0 ? byFecha.slice(0, lnz + 1) : byFecha;
      return { name: mun, x: trimmed.map(r => r.Fecha), y: trimmed.map(r => r.Valor),
               type: 'scatter', mode: 'lines+markers', line: { color: COLORES[i % COLORES.length], width: 2 } };
    });
    return { rankingMunV: ranking, tracesTop5V: traces };
  }, [dfV]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">

      {/* Mapa Interactivo Víctimas */}
      <TabMunicipal
        dataMunicipal={victimasData}
        filtAnno={filtAnno}
        filtDelito={filtDelito}
        filtMunicipio={filtMunicipio}
        setFiltMunicipio={setFiltMunicipio}
        tipoUnidad="Víctimas"
      />

      <hr className="border-gray-800 my-2" />

      {/* Tendencias Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Evolución total de Víctimas" colSpan>
          <div className="w-full h-[320px]">
            <Plot
              data={[{ x: porFechaV.map(r => r.Fecha), y: porFechaV.map(r => r.Valor),
                       type: 'scatter', mode: 'lines', fill: 'tozeroy',
                       fillcolor: 'rgba(79,114,255,0.12)', line: { color: '#4f72ff', width: 2 } }]}
              layout={{ ...LAYOUT_BASE, autosize: true, margin: { t:10,r:10,b:40,l:50 }, xaxis: { ...LAYOUT_BASE.xaxis, type:'category' } }}
              config={PLOTLY_CONFIG} style={{ width:'100%', height:'100%' }} useResizeHandler
            />
          </div>
        </Card>
        <Card title="Total por tipo de delito">
          <div className="w-full h-[320px]">
            <Plot data={tracesAnualV}
              layout={{ ...LAYOUT_BASE, autosize: true, barmode:'stack', showlegend:false, margin:{t:10,r:10,b:40,l:50}, xaxis:{...LAYOUT_BASE.xaxis, type:'category'} }}
              config={PLOTLY_CONFIG} style={{ width:'100%', height:'100%' }} useResizeHandler />
          </div>
        </Card>
        <Card title="Heatmap Mensual (Víctimas)">
          <div className="w-full h-[320px]">
            <Plot
              data={[{ z: annosHeatV.map(a => pivotV[a]), x: MESES, y: annosHeatV,
                       type: 'heatmap', colorscale: 'YlOrRd', showscale: false, reversescale: true }]}
              layout={{ ...LAYOUT_BASE, autosize:true, margin:{t:10,r:10,b:40,l:50}, yaxis:{...LAYOUT_BASE.yaxis, type:'category', autorange:'reversed'} }}
              config={PLOTLY_CONFIG} style={{ width:'100%', height:'100%' }} useResizeHandler
            />
          </div>
        </Card>
      </div>

      <hr className="border-gray-800 my-4" />

      {/* Análisis Demográfico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Evolución Demográfica por Sexo" colSpan>
          <div className="w-full h-[320px]">
            <Plot
              data={tracesSexoTrend.filter(t => t.y.some(v => v > 0))}
              layout={{ ...LAYOUT_BASE, autosize:true, margin:{t:10,r:10,b:40,l:50}, xaxis:{...LAYOUT_BASE.xaxis, type:'category'}, legend:{ orientation:'h', y:-0.2 } }}
              config={PLOTLY_CONFIG} style={{ width:'100%', height:'100%' }} useResizeHandler
            />
          </div>
        </Card>
        <Card title="Proporción por Sexo">
          <div className="w-full h-[320px]">
            <Plot
              data={[{ labels: totalXSexo.map(r => r.Sexo), values: totalXSexo.map(r => r.Valor),
                       type: 'pie', hole: 0.6, marker:{ colors:['#4f72ff','#ff6b6b','#a29bfe'] }, textinfo:'label+percent' }]}
              layout={{ ...LAYOUT_BASE, autosize:true, margin:{t:20,r:20,b:20,l:20}, showlegend:false }}
              config={PLOTLY_CONFIG} style={{ width:'100%', height:'100%' }} useResizeHandler
            />
          </div>
        </Card>
        <Card title="Grupos de Edad Afectados">
          <div className="w-full h-[320px]">
            <Plot
              data={[{ y: totalXEdad.map(r => r['Rango de edad'] || 'N/A'), x: totalXEdad.map(r => r.Valor),
                       type:'bar', orientation:'h', marker:{ color:'#00cec9' } }]}
              layout={{ ...LAYOUT_BASE, autosize:true, margin:{ l:140, r:20, t:10, b:40 }, yaxis:{...LAYOUT_BASE.yaxis, type:'category'} }}
              config={PLOTLY_CONFIG} style={{ width:'100%', height:'100%' }} useResizeHandler
            />
          </div>
        </Card>
      </div>

      <hr className="border-gray-800 my-4" />

      {/* Análisis Geográfico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Top Municipios (Total Víctimas)">
          <div className="w-full h-[350px]">
            <Plot
              data={[{ y: rankingMunV.map(r => r.Municipio).reverse(), x: rankingMunV.map(r => r.Valor).reverse(),
                       type:'bar', orientation:'h', marker:{ color:'#4f72ff' } }]}
              layout={{ ...LAYOUT_BASE, autosize:true, margin:{ l:130, r:20, t:10, b:40 }, yaxis:{...LAYOUT_BASE.yaxis, type:'category'} }}
              config={PLOTLY_CONFIG} style={{ width:'100%', height:'100%' }} useResizeHandler
            />
          </div>
        </Card>
        <Card title="Evolución Mensual: Top 5 Municipios">
          <div className="w-full h-[350px]">
            <Plot
              data={tracesTop5V.filter(t => t.y.some(v => v > 0))}
              layout={{ ...LAYOUT_BASE, autosize:true, margin:{t:10,r:10,b:40,l:50}, xaxis:{...LAYOUT_BASE.xaxis, type:'category'}, legend:{ orientation:'h', y:-0.2 } }}
              config={PLOTLY_CONFIG} style={{ width:'100%', height:'100%' }} useResizeHandler
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

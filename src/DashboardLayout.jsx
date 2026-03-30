import React, { useState, useMemo } from 'react';
import { LayoutDashboard, MapPin, Users, Settings2, ShieldAlert, BadgeInfo, Download, Info } from 'lucide-react';
import Papa from 'papaparse';
import PlotlyComponent from 'react-plotly.js';
import TabMunicipal from './components/TabMunicipal';
const Plot = PlotlyComponent.default || PlotlyComponent;

// ---- Constants and Helpers ----
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
  <div className={`glass rounded-2xl p-6 shadow-xl transition-all duration-300 hover:border-blue-500/50 hover:shadow-blue-900/20 ${colSpan ? 'col-span-full' : ''}`}>
    {title && <h3 className="text-sm font-medium text-[var(--color-dash-muted)] mb-4 tracking-wide uppercase">{title}</h3>}
    {children}
  </div>
);

// ---- Aggregation functions ----
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

export default function DashboardLayout({ data }) {
  const { estatal, municipal, victimas } = data;

  const [filtAnno, setFiltAnno] = useState('');
  const [filtDelito, setFiltDelito] = useState('');
  const [filtMunicipio, setFiltMunicipio] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // Filtros disponibles
  const annos = useMemo(() => [...new Set(estatal.map(r => r['Año']))].sort(), [estatal]);
  const delitos = useMemo(() => [...new Set(estatal.map(r => r['Subtipo de delito']))].filter(Boolean).sort(), [estatal]);
  const munis = useMemo(() => [...new Set(municipal.map(r => r['Municipio']))].filter(Boolean).sort(), [municipal]);

  const fechas = useMemo(() => estatal.map(r => r.Fecha).filter(Boolean).sort(), [estatal]);
  const periodoText = fechas.length ? `${fechas[0].slice(0,7)} → ${fechas[fechas.length-1].slice(0,7)}` : 'Sin datos';

  // Datos Filtrados
  const df = useMemo(() => {
    // Si hay municipio, usamos el dataset municipal para hacer drill-down. Si no, usamos el estatal por velocidad.
    let d = filtMunicipio ? municipal : estatal;
    if (filtAnno) d = d.filter(r => String(r['Año']) === filtAnno);
    if (filtDelito) d = d.filter(r => r['Subtipo de delito'] === filtDelito);
    if (filtMunicipio) d = d.filter(r => r['Municipio'] === filtMunicipio);
    return d;
  }, [estatal, municipal, filtAnno, filtDelito, filtMunicipio]);

  const dfM = useMemo(() => {
    let d = municipal;
    if (filtAnno) d = d.filter(r => String(r['Año']) === filtAnno);
    if (filtDelito) d = d.filter(r => r['Subtipo de delito'] === filtDelito);
    if (filtMunicipio) d = d.filter(r => r['Municipio'] === filtMunicipio);
    return d;
  }, [municipal, filtAnno, filtDelito, filtMunicipio]);

  const dfV = useMemo(() => {
    let d = victimas;
    if (filtAnno) d = d.filter(r => String(r['Año']) === filtAnno);
    if (filtDelito) d = d.filter(r => r['Subtipo de delito'] === filtDelito);
    if (filtMunicipio) d = d.filter(r => r['Municipio'] === filtMunicipio);
    return d;
  }, [victimas, filtAnno, filtDelito, filtMunicipio]);

  // KPIs
  const totalCarpetas = sumaTotal(df);
  const porAnno = agrupar(estatal, ['Año']).sort((a,b) => b.Valor - a.Valor)[0] || {};
  const porMun = agrupar(dfM, ['Municipio']).sort((a,b) => b.Valor - a.Valor)[0] || {};
  const porDelito = agrupar(df, ['Subtipo de delito']).sort((a,b) => b.Valor - a.Valor)[0] || {};
  
  // Clean dates for KPIs
  const porFechaDataFull = agrupar(df, ['Fecha']).sort((a,b) => a.Fecha > b.Fecha ? 1 : -1);
  let lastNZ = porFechaDataFull.length - 1;
  while(lastNZ >= 0 && porFechaDataFull[lastNZ].Valor === 0) lastNZ--;
  const porFecha = lastNZ >= 0 ? porFechaDataFull.slice(0, lastNZ + 1) : [];

  // MoM KPI
  let tasaCambio = null;
  let labelTasa = "S/D";
  if (porFecha.length >= 2) {
    const last = porFecha[porFecha.length - 1].Valor;
    const prev = porFecha[porFecha.length - 2].Valor;
    if (prev > 0) {
      tasaCambio = (((last - prev) / prev) * 100);
      labelTasa = tasaCambio > 0 ? `+${tasaCambio.toFixed(1)}%` : `${tasaCambio.toFixed(1)}%`;
    }
  }

  // Victimas
  const totalVictimas = sumaTotal(dfV);

  // Renders de Pestañas
  const renderTendencias = () => {
    // Evolución mensual
    const porFechaDataFull = agrupar(df, ['Fecha']).sort((a,b) => a.Fecha > b.Fecha ? 1 : -1);
    let lastNonZero = porFechaDataFull.length - 1;
    while(lastNonZero >= 0 && porFechaDataFull[lastNonZero].Valor === 0) lastNonZero--;
    const porFechaData = lastNonZero >= 0 ? porFechaDataFull.slice(0, lastNonZero + 1) : porFechaDataFull;
    
    // Anual apilado
    const dfAnnos = [...new Set(df.map(r => String(r['Año'])))].sort();
    const tracesAnual = ALTO_IMPACTO.map((delito, i) => {
      const sub = df.filter(r => (r['Subtipo de delito'] || r['Tipo de delito'] || '').includes(delito.split(' ')[0]));
      const yVals = dfAnnos.map(a => sumaTotal(sub.filter(r => String(r['Año']) === a)));
      return {
        name: delito, x: dfAnnos, y: yVals, type: 'bar',
        marker: { color: COLORES[i % COLORES.length] }
      };
    }).filter(t => t.y.some(v => v > 0));

    // Heatmap
    const pivot = {};
    df.forEach(r => {
      if (!r.Fecha) return;
      const anno = r.Fecha.slice(0,4);
      const mes  = parseInt(r.Fecha.slice(5,7)) - 1;
      if (!pivot[anno]) pivot[anno] = Array(12).fill(0);
      pivot[anno][mes] += Number(r.Valor) || 0;
    });
    const annosHeat = Object.keys(pivot).sort();

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-500">
        <Card title="Evolución mensual de carpetas" colSpan>
          <div className="w-full h-[320px]">
            <Plot
              data={[{
                x: porFechaData.map(r => r.Fecha),
                y: porFechaData.map(r => r.Valor),
                type: 'scatter', mode: 'lines',
                fill: 'tozeroy', fillcolor: 'rgba(79,114,255,0.12)',
                line: { color: '#4f72ff', width: 2 }
              }]}
              layout={{ ...LAYOUT_BASE, autosize: true, margin: { t: 10, r: 10, b: 40, l: 50 }, xaxis: { ...LAYOUT_BASE.xaxis, type: 'category' } }}
              config={PLOTLY_CONFIG}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler
            />
          </div>
        </Card>
        <Card title="Total por tipo de delito">
          <div className="w-full h-[320px]">
            <Plot
              data={tracesAnual}
              layout={{ ...LAYOUT_BASE, autosize: true, barmode: 'stack', showlegend: false, margin: { t: 10, r: 10, b: 40, l: 50 }, xaxis: { ...LAYOUT_BASE.xaxis, type: 'category' } }}
              config={PLOTLY_CONFIG}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler
            />
          </div>
        </Card>
        <Card title="Heatmap Mensual">
          <div className="w-full h-[320px]">
            <Plot
              data={[{
                z: annosHeat.map(a => pivot[a]), x: MESES, y: annosHeat,
                type: 'heatmap', colorscale: 'YlOrRd', showscale: false, reversescale: true
              }]}
              layout={{ ...LAYOUT_BASE, autosize: true, margin: { t: 10, r: 10, b: 40, l: 50 }, yaxis: { ...LAYOUT_BASE.yaxis, type: 'category', autorange: 'reversed' } }}
              config={PLOTLY_CONFIG}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler
            />
          </div>
        </Card>
      </div>
    );
  };

  const renderMunicipal = () => {
    const porMun15 = agrupar(dfM, ['Municipio']).sort((a,b) => b.Valor - a.Valor).slice(0, 15).reverse();
    const top5 = [...porMun15].reverse().slice(0,5).map(r => r.Municipio);
    const traces5 = top5.map((mun, i) => {
      const sub = agrupar(dfM.filter(r => r.Municipio === mun), ['Fecha']).sort((a,b) => a.Fecha > b.Fecha ? 1 : -1);
      
      let lastNonZero = sub.length - 1;
      while(lastNonZero >= 0 && sub[lastNonZero].Valor === 0) lastNonZero--;
      const trimmedSub = lastNonZero >= 0 ? sub.slice(0, lastNonZero + 1) : sub;

      return { x: trimmedSub.map(r => r.Fecha), y: trimmedSub.map(r => r.Valor), type: 'scatter', mode: 'lines', name: mun, line: { color: COLORES[i], width: 2 } };
    });

    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <TabMunicipal 
          dataMunicipal={municipal}
          filtAnno={filtAnno}
          filtDelito={filtDelito}
          filtMunicipio={filtMunicipio}
          setFiltMunicipio={setFiltMunicipio}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[var(--color-dash-border)] border-dashed">
          <Card title="Evolución Top 5">
             <div className="w-full h-[400px]">
               <Plot
                 data={traces5}
                 layout={{ ...LAYOUT_BASE, autosize: true, legend: { orientation: 'h', y: -0.2 }, margin: { t: 10, r: 10, b: 80, l: 50 }, xaxis: { ...LAYOUT_BASE.xaxis, type: 'category' } }}
                 config={PLOTLY_CONFIG}
                 style={{ width: '100%', height: '100%' }}
                 useResizeHandler
               />
             </div>
          </Card>
          <Card title="Top 15 Municipios">
             <div className="w-full h-[400px]">
               <Plot
                data={[{ x: porMun15.map(r => r.Valor), y: porMun15.map(r => r.Municipio), type: 'bar', orientation: 'h', marker: { color: '#ff6b6b' } }]}
                layout={{ ...LAYOUT_BASE, autosize: true, margin: { l: 120, r: 20, t: 10, b: 40 }, yaxis: { ...LAYOUT_BASE.yaxis, type: 'category' } }}
                config={PLOTLY_CONFIG}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
               />
             </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderVictimas = () => {
    // ---- GRAFICAS GLOBALES (TENDENCIAS) PARA VÍCTIMAS ----
    const porFechaDataFull = agrupar(dfV, ['Fecha']).sort((a,b) => a.Fecha > b.Fecha ? 1 : -1);
    let lastNZ = porFechaDataFull.length - 1;
    while(lastNZ >= 0 && porFechaDataFull[lastNZ].Valor === 0) lastNZ--;
    const porFechaV = lastNZ >= 0 ? porFechaDataFull.slice(0, lastNZ + 1) : porFechaDataFull;
    
    const dfAnnos = [...new Set(dfV.map(r => String(r['Año'])))].sort();
    const tracesAnualV = ALTO_IMPACTO.map((delito, i) => {
      const sub = dfV.filter(r => (r['Subtipo de delito'] || r['Tipo de delito'] || '').includes(delito.split(' ')[0]));
      const yVals = dfAnnos.map(a => sumaTotal(sub.filter(r => String(r['Año']) === a)));
      return { name: delito, x: dfAnnos, y: yVals, type: 'bar', marker: { color: COLORES[i % COLORES.length] } };
    }).filter(t => t.y.some(v => v > 0));

    const pivotV = {};
    dfV.forEach(r => {
      if (!r.Fecha) return;
      const anno = r.Fecha.slice(0,4);
      const mes  = parseInt(r.Fecha.slice(5,7)) - 1;
      if (!pivotV[anno]) pivotV[anno] = Array(12).fill(0);
      pivotV[anno][mes] += Number(r.Valor) || 0;
    });
    const annosHeatV = Object.keys(pivotV).sort();

    // ---- GRAFICAS ESPECÍFICAS DE VÍCTIMAS (SEXO/EDAD) ----
    const vicXSexo = agrupar(dfV, ['Fecha', 'Sexo']).sort((a,b) => a.Fecha > b.Fecha ? 1 : -1);
    const fechasV = [...new Set(vicXSexo.map(r => r.Fecha))].sort();
    let lastNonZero = fechasV.length - 1;
    while(lastNonZero >= 0 && sumaTotal(vicXSexo.filter(r => r.Fecha === fechasV[lastNonZero])) === 0) lastNonZero--;
    const fechasVTrimmed = lastNonZero >= 0 ? fechasV.slice(0, lastNonZero + 1) : fechasV;

    const tracesSexoTrend = ['Hombre', 'Mujer', 'No identificado'].map((sexo, i) => {
      const yVals = fechasVTrimmed.map(f => {
         const found = vicXSexo.find(r => r.Fecha === f && r.Sexo === sexo);
         return found ? found.Valor : 0;
      });
      return { x: fechasVTrimmed, y: yVals, type: 'scatter', mode: 'lines', name: sexo, line: { color: i===0?'#4f72ff':i===1?'#ff6b6b':'#a29bfe', width: 2 } };
    });

    const totalXSexo = agrupar(dfV, ['Sexo']).filter(r => r.Valor > 0);
    const totalXEdad = agrupar(dfV, ['Rango de edad']).sort((a,b) => a.Valor - b.Valor);

    // ---- GRAFICAS MUNICIPIOS PARA VÍCTIMAS ----
    const rankingMunV = agrupar(dfV, ['Municipio']).sort((a,b) => b.Valor - a.Valor).slice(0, 15);
    const top5MunV = rankingMunV.slice(0, 5).map(r => r.Municipio);
    
    const tracesTop5V = top5MunV.map((mun, i) => {
      const sub = dfV.filter(r => r.Municipio === mun);
      const subFecha = agrupar(sub, ['Fecha']).sort((a,b) => a.Fecha > b.Fecha ? 1 : -1);
      let lnz = subFecha.length - 1;
      while(lnz >= 0 && subFecha[lnz].Valor === 0) lnz--;
      const trimmed = lnz >= 0 ? subFecha.slice(0, lnz + 1) : subFecha;
      
      return {
        name: mun, x: trimmed.map(r => r.Fecha), y: trimmed.map(r => r.Valor),
        type: 'scatter', mode: 'lines+markers', line: { color: COLORES[i % COLORES.length], width: 2 }
      };
    });

    return (
      <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
        
        {/* ── Mapa Interactivo Víctimas ── */}
        <TabMunicipal 
          dataMunicipal={victimas}
          filtAnno={filtAnno}
          filtDelito={filtDelito}
          filtMunicipio={filtMunicipio}
          setFiltMunicipio={setFiltMunicipio}
          tipoUnidad="Víctimas"
        />
        
        <hr className="border-gray-800 my-2" />

        {/* Fila 1: Tendencias Generales de Víctimas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Evolución total de Víctimas" colSpan>
            <div className="w-full h-[320px]">
              <Plot
                data={[{ x: porFechaV.map(r => r.Fecha), y: porFechaV.map(r => r.Valor), type: 'scatter', mode: 'lines', fill: 'tozeroy', fillcolor: 'rgba(79,114,255,0.12)', line: { color: '#4f72ff', width: 2 } }]}
                layout={{...LAYOUT_BASE, autosize: true, margin: {t:10,r:10,b:40,l:50}, xaxis: {...LAYOUT_BASE.xaxis, type:'category'}}} config={PLOTLY_CONFIG} style={{width:'100%',height:'100%'}} useResizeHandler />
            </div>
          </Card>
          <Card title="Total por tipo de delito">
            <div className="w-full h-[320px]">
              <Plot data={tracesAnualV} layout={{...LAYOUT_BASE, autosize: true, barmode: 'stack', showlegend: false, margin: {t:10,r:10,b:40,l:50}, xaxis: {...LAYOUT_BASE.xaxis, type:'category'}}} config={PLOTLY_CONFIG} style={{width:'100%',height:'100%'}} useResizeHandler />
            </div>
          </Card>
          <Card title="Heatmap Mensual (Víctimas)">
            <div className="w-full h-[320px]">
              <Plot
                data={[{ z: annosHeatV.map(a => pivotV[a]), x: MESES, y: annosHeatV, type: 'heatmap', colorscale: 'YlOrRd', showscale: false, reversescale: true }]}
                layout={{...LAYOUT_BASE, autosize: true, margin: {t:10,r:10,b:40,l:50}, yaxis: {...LAYOUT_BASE.yaxis, type: 'category', autorange: 'reversed'}}} config={PLOTLY_CONFIG} style={{width:'100%',height:'100%'}} useResizeHandler />
            </div>
          </Card>
        </div>

        <hr className="border-gray-800 my-4" />

        {/* Fila 2: Análisis Demográfico */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Evolución Demográfica por Sexo" colSpan>
             <div className="w-full h-[320px]">
               <Plot data={tracesSexoTrend.filter(t => t.y.some(v => v > 0))} layout={{...LAYOUT_BASE, autosize: true, margin: {t:10,r:10,b:40,l:50}, xaxis: {...LAYOUT_BASE.xaxis, type:'category'}, legend: { orientation: 'h', y: -0.2 }}} config={PLOTLY_CONFIG} style={{width:'100%',height:'100%'}} useResizeHandler />
             </div>
          </Card>
          <Card title="Proporción por Sexo">
             <div className="w-full h-[320px]">
               <Plot data={[{ labels: totalXSexo.map(r=>r.Sexo), values: totalXSexo.map(r=>r.Valor), type: 'pie', hole: 0.6, marker: { colors: ['#4f72ff', '#ff6b6b', '#a29bfe'] }, textinfo: 'label+percent' }]} layout={{...LAYOUT_BASE, autosize: true, margin: {t:20,r:20,b:20,l:20}, showlegend: false}} config={PLOTLY_CONFIG} style={{width:'100%',height:'100%'}} useResizeHandler />
             </div>
          </Card>
          <Card title="Grupos de Edad Afectados">
             <div className="w-full h-[320px]">
               <Plot data={[{ y: totalXEdad.map(r=>r['Rango de edad'] || 'N/A'), x: totalXEdad.map(r=>r.Valor), type: 'bar', orientation: 'h', marker: { color: '#00cec9' } }]} layout={{...LAYOUT_BASE, autosize: true, margin: {l: 140, r: 20, t: 10, b: 40}, yaxis: {...LAYOUT_BASE.yaxis, type: 'category'}}} config={PLOTLY_CONFIG} style={{width:'100%',height:'100%'}} useResizeHandler />
             </div>
          </Card>
        </div>

        <hr className="border-gray-800 my-4" />

        {/* Fila 3: Análisis Geográfico (Municipios) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Top Municipios (Total Víctimas)">
            <div className="w-full h-[350px]">
              <Plot 
                data={[{
                  y: rankingMunV.map(r => r.Municipio).reverse(),
                  x: rankingMunV.map(r => r.Valor).reverse(),
                  type: 'bar', orientation: 'h', marker: { color: '#4f72ff' }
                }]}
                layout={{...LAYOUT_BASE, autosize: true, margin: {l: 130, r: 20, t: 10, b: 40}, yaxis: {...LAYOUT_BASE.yaxis, type:'category'}}} config={PLOTLY_CONFIG} style={{width:'100%',height:'100%'}} useResizeHandler />
            </div>
          </Card>
          <Card title="Evolución Mensual: Top 5 Municipios">
            <div className="w-full h-[350px]">
              <Plot data={tracesTop5V.filter(t => t.y.some(v => v > 0))} layout={{...LAYOUT_BASE, autosize: true, margin: {t:10,r:10,b:40,l:50}, xaxis: {...LAYOUT_BASE.xaxis, type:'category'}, legend: { orientation: 'h', y: -0.2 }}} config={PLOTLY_CONFIG} style={{width:'100%',height:'100%'}} useResizeHandler />
            </div>
          </Card>
        </div>

      </div>
    );
  };

  const tabs = [
    { label: 'Tendencias', icon: <LayoutDashboard size={18} />, render: renderTendencias },
    { label: 'Municipal', icon: <MapPin size={18} />, render: renderMunicipal },
    { label: 'Víctimas', icon: <Users size={18} />, render: renderVictimas },
  ];

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--color-dash-border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Incidencia Delictiva <span className="text-blue-500">Sonora</span></h1>
              <p className="text-sm text-[var(--color-dash-muted)] flex items-center gap-1 cursor-help" title="Contabiliza las Carpetas de Investigación iniciadas formamente, así como un aproximado de víctimas adscritas a las mismas. Datos abiertos proveídos por el Gobierno Mexicano.">
                Datos Inteligentes SESNSP <Info size={14} className="opacity-70 hover:text-blue-400 transition-colors" />
              </p>
            </div>
          </div>
          <div className="flex gap-3 text-xs font-mono">
            <Badge text="Abierto" />
            <Badge text={periodoText} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Filters */}
        <div className="glass rounded-2xl p-5 flex flex-wrap gap-5 items-end mb-8 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 w-full sm:w-auto font-medium text-gray-300">
            <Settings2 size={18} /> Filtros:
          </div>
          <FilterSelect label="Año" value={filtAnno} onChange={setFiltAnno} options={annos} />
          <FilterSelect label="Delito" value={filtDelito} onChange={setFiltDelito} options={delitos} />
          <FilterSelect label="Municipio" value={filtMunicipio} onChange={setFiltMunicipio} options={munis} />
          
          <div className="flex-1 sm:flex-none flex items-end justify-end ml-auto">
            <button
               onClick={() => {
                 const dataset = activeTab === 2 ? dfV : df;
                 const csv = Papa.unparse(dataset);
                 const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                 const link = document.createElement('a');
                 link.href = URL.createObjectURL(blob);
                 link.download = `Sonora_${activeTab===2?'Victimas':'Carpetas'}_${Date.now()}.csv`;
                 document.body.appendChild(link); link.click(); document.body.removeChild(link);
               }}
               className="flex items-center gap-2 px-4 py-2 bg-[#2a2e3d]/80 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-sm font-medium transition-all shadow-lg"
               title="Descarga la matriz de datos con los filtros exactos aplicados de manera local."
            >
               <Download size={16} /> Descargar Vista (CSV)
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <KpiBox label="Total Carpetas" value={totalCarpetas.toLocaleString('es-MX')} />
          <KpiBox label="Variación Mensual" value={labelTasa} sub={tasaCambio !== null ? (tasaCambio > 0 ? "Aumento vs mes anterior" : "Descenso vs mes anterior") : "Insuficiente"} color={tasaCambio > 0 ? "text-red-400" : tasaCambio < 0 ? "text-green-400" : "text-blue-400"} />
          <KpiBox label="Total Víctimas" value={totalVictimas.toLocaleString('es-MX')} sub="Registradas en el periodo" />
          <KpiBox label="Principal Delito" value={porDelito['Subtipo de delito']?.split(' ')[0]} sub={`${porDelito.Valor?.toLocaleString()} casos`} />
          <KpiBox label="Max Municipio" value={porMun.Municipio} sub={`${porMun.Valor?.toLocaleString()} casos`} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800 mb-6">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-medium transition-all
                ${activeTab === idx 
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10' 
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content con Empty States Handling */}
        { (activeTab !== 2 && totalCarpetas === 0) || (activeTab === 2 && totalVictimas === 0) ? (
            <div className="glass rounded-2xl p-16 text-center text-[var(--color-dash-muted)] animate-in fade-in duration-500 flex flex-col items-center">
               <ShieldAlert size={56} className="mb-6 opacity-30 text-gray-500" />
               <h3 className="text-xl font-bold text-gray-300 mb-2">Sin Incidentes Registrados</h3>
               <p className="max-w-md mx-auto text-sm leading-relaxed">
                  La combinación de filtros (Periodo, Municipio y Subtipo de Delito) no produjo absolutamente ningún registro en las bases oficiales del SESNSP.
               </p>
               <button 
                  onClick={() => { setFiltAnno(''); setFiltDelito(''); setFiltMunicipio(''); }} 
                  className="mt-6 px-6 py-2.5 bg-[#1a1c23] hover:bg-[#252836] text-sm text-gray-300 rounded-lg border border-gray-700 transition-colors shadow-sm"
               >
                  Limpiar Todos los Filtros
               </button>
            </div>
        ) : (
            tabs[activeTab].render()
        )}

      </main>
    </div>
  );
}

const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="flex-1 min-w-[200px]">
    <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>
    <select 
      value={value} 
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#1a1d27] border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
    >
      <option value="">Todos</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const KpiBox = ({ label, value, sub, color }) => (
  <div className="glass rounded-xl p-5 hover:border-gray-500 transition-colors">
    <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{label}</div>
    <div className={`text-2xl font-bold leading-none truncate mb-1 ${color || 'text-white'}`} title={value}>{value || '—'}</div>
    {sub && <div className="text-xs text-[var(--color-dash-muted)] opacity-80">{sub}</div>}
  </div>
);

const Badge = ({ text }) => (
  <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400 flex items-center gap-1.5 shadow-inner">
     <BadgeInfo size={14} className="text-gray-500" />
     {text}
  </span>
);

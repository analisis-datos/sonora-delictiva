// src/DashboardLayout.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Orquestador principal del dashboard.
// Solo maneja: estado de filtros, KPIs globales, tabs y layout del header.
// Toda la lógica de renders vive en sus componentes dedicados.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { LayoutDashboard, MapPin, Users, Settings2, ShieldAlert, BadgeInfo, Download, Info } from 'lucide-react';
import Papa from 'papaparse';
import PlotlyComponent from 'react-plotly.js';
import TabMunicipal  from './components/TabMunicipal';
import TabTendencias from './components/TabTendencias';
import TabVictimas   from './components/TabVictimas';
import { useFilterState } from './hooks/useFilterState';

const Plot = PlotlyComponent.default || PlotlyComponent;

// ── Constantes ───────────────────────────────────────────────────────────────
const COLORES = [
  '#4f72ff','#ff6b6b','#43e97b','#f9ca24',
  '#a29bfe','#fd79a8','#00cec9','#e17055',
  '#74b9ff','#55efc4','#fdcb6e','#6c5ce7'
];

// ── Utilidades de agregación ─────────────────────────────────────────────────
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

// ── Componentes UI locales ───────────────────────────────────────────────────
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
    <div
      className={`text-xl font-bold leading-snug mb-1 line-clamp-2 ${color || 'text-white'}`}
      title={typeof value === 'string' ? value : undefined}
    >
      {value ?? '—'}
    </div>
    {sub && <div className="text-xs text-[var(--color-dash-muted)] opacity-80">{sub}</div>}
  </div>
);

const Badge = ({ text }) => (
  <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400 flex items-center gap-1.5 shadow-inner text-xs font-mono">
    <BadgeInfo size={14} className="text-gray-500" />
    {text}
  </span>
);

// ── Componente principal ─────────────────────────────────────────────────────
export default function DashboardLayout({ data }) {
  const { meta = {}, estatal, municipal, victimas } = data;

  // Filtros sincronizados con la URL
  const [filtAnno,     setFiltAnno]     = useFilterState('año', '');
  const [filtDelito,   setFiltDelito]   = useFilterState('delito', '');
  const [filtMunicipio, setFiltMunicipio] = useFilterState('municipio', '');
  const [activeTab,    setActiveTab]    = useState(0);

  // Opciones de filtros
  const annos   = useMemo(() => [...new Set(estatal.map(r => r['Año']))].sort(), [estatal]);
  const delitos = useMemo(() => [...new Set(estatal.map(r => r['Subtipo de delito']))].filter(Boolean).sort(), [estatal]);
  const munis   = useMemo(() => [...new Set(municipal.map(r => r['Municipio']))].filter(Boolean).sort(), [municipal]);

  // Período desde meta.json
  const periodoText = meta.periodo_inicio && meta.periodo_fin
    ? `${meta.periodo_inicio.slice(0, 7)} → ${meta.periodo_fin.slice(0, 7)}`
    : 'Sin datos';

  // Datasets filtrados
  const df = useMemo(() => {
    let d = filtMunicipio ? municipal : estatal;
    if (filtAnno)      d = d.filter(r => String(r['Año']) === filtAnno);
    if (filtDelito)    d = d.filter(r => r['Subtipo de delito'] === filtDelito);
    if (filtMunicipio) d = d.filter(r => r['Municipio'] === filtMunicipio);
    return d;
  }, [estatal, municipal, filtAnno, filtDelito, filtMunicipio]);

  const dfM = useMemo(() => {
    let d = municipal;
    if (filtAnno)      d = d.filter(r => String(r['Año']) === filtAnno);
    if (filtDelito)    d = d.filter(r => r['Subtipo de delito'] === filtDelito);
    if (filtMunicipio) d = d.filter(r => r['Municipio'] === filtMunicipio);
    return d;
  }, [municipal, filtAnno, filtDelito, filtMunicipio]);

  const dfV = useMemo(() => {
    let d = victimas;
    if (filtAnno)      d = d.filter(r => String(r['Año']) === filtAnno);
    if (filtDelito)    d = d.filter(r => r['Subtipo de delito'] === filtDelito);
    if (filtMunicipio) d = d.filter(r => r['Municipio'] === filtMunicipio);
    return d;
  }, [victimas, filtAnno, filtDelito, filtMunicipio]);

  // KPIs
  const totalCarpetas  = sumaTotal(df);
  const totalVictimas  = sumaTotal(dfV);
  const porDelito      = agrupar(df, ['Subtipo de delito']).sort((a, b) => b.Valor - a.Valor)[0] || {};
  const porMun         = agrupar(dfM, ['Municipio']).sort((a, b) => b.Valor - a.Valor)[0] || {};

  const porFechaData = useMemo(() => {
    const full = agrupar(df, ['Fecha']).sort((a, b) => a.Fecha > b.Fecha ? 1 : -1);
    let last = full.length - 1;
    while (last >= 0 && full[last].Valor === 0) last--;
    return last >= 0 ? full.slice(0, last + 1) : full;
  }, [df]);

  const { tasaCambio, labelTasa } = useMemo(() => {
    if (porFechaData.length < 2) return { tasaCambio: null, labelTasa: 'S/D' };
    const last = porFechaData[porFechaData.length - 1].Valor;
    const prev = porFechaData[porFechaData.length - 2].Valor;
    if (prev <= 0) return { tasaCambio: null, labelTasa: 'S/D' };
    const tc = ((last - prev) / prev) * 100;
    return { tasaCambio: tc, labelTasa: tc > 0 ? `+${tc.toFixed(1)}%` : `${tc.toFixed(1)}%` };
  }, [porFechaData]);

  // Tabs
  const tabs = [
    { label: 'Tendencias', icon: <LayoutDashboard size={18} /> },
    { label: 'Municipal',  icon: <MapPin size={18} /> },
    { label: 'Víctimas',   icon: <Users size={18} /> },
  ];

  const renderContent = () => {
    if ((activeTab !== 2 && totalCarpetas === 0) || (activeTab === 2 && totalVictimas === 0)) {
      return (
        <div className="glass rounded-2xl p-16 text-center text-[var(--color-dash-muted)] animate-in fade-in duration-500 flex flex-col items-center">
          <ShieldAlert size={56} className="mb-6 opacity-30 text-gray-500" />
          <h3 className="text-xl font-bold text-gray-300 mb-2">Sin Incidentes Registrados</h3>
          <p className="max-w-md mx-auto text-sm leading-relaxed">
            La combinación de filtros no produjo registros en las bases oficiales del SESNSP.
          </p>
          <button
            onClick={() => { setFiltAnno(''); setFiltDelito(''); setFiltMunicipio(''); }}
            className="mt-6 px-6 py-2.5 bg-[#1a1c23] hover:bg-[#252836] text-sm text-gray-300 rounded-lg border border-gray-700 transition-colors shadow-sm"
          >
            Limpiar Todos los Filtros
          </button>
        </div>
      );
    }
    if (activeTab === 0) return <TabTendencias df={df} />;
    if (activeTab === 1) return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <TabMunicipal
          dataMunicipal={municipal}
          filtAnno={filtAnno}
          filtDelito={filtDelito}
          filtMunicipio={filtMunicipio}
          setFiltMunicipio={setFiltMunicipio}
        />
        {/* Top 5 evolución + Top 15 municipios */}
        <TabTendenciasM dfM={dfM} munis={munis} />
      </div>
    );
    if (activeTab === 2) return (
      <TabVictimas
        dfV={dfV}
        victimasData={victimas}
        filtAnno={filtAnno}
        filtDelito={filtDelito}
        filtMunicipio={filtMunicipio}
        setFiltMunicipio={setFiltMunicipio}
      />
    );
  };

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
              <h1 className="text-2xl font-bold tracking-tight">
                Incidencia Delictiva <span className="text-blue-500">Sonora</span>
              </h1>
              <p className="text-sm text-[var(--color-dash-muted)] flex items-center gap-1 cursor-help"
                 title="Carpetas de Investigación + víctimas. Datos abiertos SESNSP.">
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

        {/* Filtros */}
        <div className="glass rounded-2xl p-5 flex flex-wrap gap-5 items-end mb-8 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 w-full sm:w-auto font-medium text-gray-300">
            <Settings2 size={18} /> Filtros:
          </div>
          <FilterSelect label="Año"       value={filtAnno}      onChange={setFiltAnno}      options={annos} />
          <FilterSelect label="Delito"    value={filtDelito}    onChange={setFiltDelito}    options={delitos} />
          <FilterSelect label="Municipio" value={filtMunicipio} onChange={setFiltMunicipio} options={munis} />

          <div className="flex-1 sm:flex-none flex items-end justify-end ml-auto">
            <button
              onClick={() => {
                const dataset = activeTab === 2 ? dfV : df;
                const csv  = Papa.unparse(dataset);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href  = URL.createObjectURL(blob);
                link.download = `Sonora_${activeTab === 2 ? 'Victimas' : 'Carpetas'}_${Date.now()}.csv`;
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2a2e3d]/80 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-sm font-medium transition-all shadow-lg"
              title="Descarga la matriz de datos con los filtros exactos aplicados."
            >
              <Download size={16} /> Descargar Vista (CSV)
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <KpiBox label="Total Carpetas"    value={totalCarpetas.toLocaleString('es-MX')} />
          <KpiBox label="Variación Mensual" value={labelTasa}
            sub={tasaCambio !== null ? (tasaCambio > 0 ? 'Aumento vs mes anterior' : 'Descenso vs mes anterior') : 'Insuficiente'}
            color={tasaCambio > 0 ? 'text-red-400' : tasaCambio < 0 ? 'text-green-400' : 'text-blue-400'} />
          <KpiBox label="Total Víctimas"    value={totalVictimas.toLocaleString('es-MX')} sub="Registradas en el periodo" />
          <KpiBox label="Principal Delito"  value={porDelito['Subtipo de delito']}         sub={`${porDelito.Valor?.toLocaleString('es-MX')} casos`} />
          <KpiBox label="Max Municipio"     value={porMun.Municipio}                       sub={`${porMun.Valor?.toLocaleString('es-MX')} casos`} />
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
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {renderContent()}

      </main>
    </div>
  );
}

// ── Sub-componente inline: gráficas de municipios en tab Municipal ───────────
function TabTendenciasM({ dfM, munis }) {
  const LAYOUT_BASE = {
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, system-ui, sans-serif', color: '#8892b0', size: 11 },
    legend: { font: { size: 10 }, bgcolor: 'rgba(0,0,0,0)' },
    xaxis: { gridcolor: '#2e3250', zerolinecolor: '#2e3250', color: '#8892b0' },
    yaxis: { gridcolor: '#2e3250', zerolinecolor: '#2e3250', color: '#8892b0', rangemode: 'tozero' },
    hovermode: 'x unified',
    hoverlabel: { bgcolor: '#1a1d27', bordercolor: '#4f72ff', font: { color: '#e8eaf6' } },
  };
  const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };
  const COLORES_LOCAL = ['#4f72ff','#ff6b6b','#43e97b','#f9ca24','#a29bfe'];

  const porMun15 = useMemo(() =>
    agrupar(dfM, ['Municipio']).sort((a, b) => b.Valor - a.Valor).slice(0, 15).reverse(),
    [dfM]
  );

  const top5 = useMemo(() =>
    [...porMun15].reverse().slice(0, 5).map(r => r.Municipio),
    [porMun15]
  );

  const traces5 = useMemo(() =>
    top5.map((mun, i) => {
      const sub = agrupar(dfM.filter(r => r.Municipio === mun), ['Fecha'])
        .sort((a, b) => a.Fecha > b.Fecha ? 1 : -1);
      let last = sub.length - 1;
      while (last >= 0 && sub[last].Valor === 0) last--;
      const trimmed = last >= 0 ? sub.slice(0, last + 1) : sub;
      return { x: trimmed.map(r => r.Fecha), y: trimmed.map(r => r.Valor),
               type: 'scatter', mode: 'lines', name: mun, line: { color: COLORES_LOCAL[i], width: 2 } };
    }),
    [dfM, top5]
  );

  const Card = ({ children, title }) => (
    <div className="glass rounded-2xl p-6 shadow-xl transition-all duration-300 hover:border-blue-500/50">
      {title && <h3 className="text-sm font-medium text-[var(--color-dash-muted)] mb-4 tracking-wide uppercase">{title}</h3>}
      {children}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[var(--color-dash-border)] border-dashed">
      <Card title="Evolución Top 5">
        <div className="w-full h-[400px]">
          <PlotlyComponent
            data={traces5}
            layout={{ ...LAYOUT_BASE, autosize: true, legend: { orientation: 'h', y: -0.2 }, margin: { t:10, r:10, b:80, l:50 }, xaxis: { ...LAYOUT_BASE.xaxis, type: 'category' } }}
            config={PLOTLY_CONFIG}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
          />
        </div>
      </Card>
      <Card title="Top 15 Municipios">
        <div className="w-full h-[400px]">
          <PlotlyComponent
            data={[{ x: porMun15.map(r => r.Valor), y: porMun15.map(r => r.Municipio), type: 'bar', orientation: 'h', marker: { color: '#ff6b6b' } }]}
            layout={{ ...LAYOUT_BASE, autosize: true, margin: { l:120, r:20, t:10, b:40 }, yaxis: { ...LAYOUT_BASE.yaxis, type: 'category' } }}
            config={PLOTLY_CONFIG}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
          />
        </div>
      </Card>
    </div>
  );
}

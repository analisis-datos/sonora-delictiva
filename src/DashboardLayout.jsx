// src/DashboardLayout.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Orquestador principal del dashboard.
// Solo maneja: estado de filtros, KPIs globales, tabs y layout del header.
// Toda la lógica de renders vive en sus componentes dedicados.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { LayoutDashboard, MapPin, Users, Settings2, ShieldAlert, BadgeInfo, Download, Info, Loader2, BellRing, Share2, Check, TrendingUp, TrendingDown } from 'lucide-react';
import Papa from 'papaparse';
import { Toaster, toast } from 'react-hot-toast';
import { useFilterState } from './hooks/useFilterState';
import { useTasaPoblacion } from './hooks/useTasaPoblacion';
import DataQualityIndicator from './components/DataQualityIndicator';

const Plot = lazy(() => import('react-plotly.js').then(m => ({ default: m.default?.default || m.default || m })));
const TabMunicipal = lazy(() => import('./components/TabMunicipal'));
const TabTendencias = lazy(() => import('./components/TabTendencias'));
const TabVictimas = lazy(() => import('./components/TabVictimas'));
const TabAlertaTemprana = lazy(() => import('./components/TabAlertaTemprana'));

const TotalCarpetasModal = lazy(() => import(/* webpackChunkName: "modal-carpetas" */ './components/Modals/TotalCarpetasModal'));
const PrincipalDelitoModal = lazy(() => import(/* webpackChunkName: "modal-delito" */ './components/Modals/PrincipalDelitoModal'));
const MaxMunicipioModal = lazy(() => import(/* webpackChunkName: "modal-municipio" */ './components/Modals/MaxMunicipioModal'));
const TotalVictimasModal = lazy(() => import(/* webpackChunkName: "modal-victimas" */ './components/Modals/TotalVictimasModal'));

const FallbackLoader = ({ title = "Cargando Módulo" }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="relative w-12 h-12">
      <Loader2 size={40} className="animate-spin text-blue-400" />
    </div>
    <div className="text-center">
      <p className="text-sm text-gray-300 font-medium">{title}</p>
      <p className="text-xs text-gray-500 mt-1">Por favor espera...</p>
    </div>
  </div>
);

// ── Constantes ───────────────────────────────────────────────────────────────
const COLORES = [
  '#4f72ff','#ff6b6b','#43e97b','#f9ca24',
  '#a29bfe','#fd79a8','#00cec9','#e17055',
  '#74b9ff','#55efc4','#fdcb6e','#6c5ce7'
];

// ── Utilidades de agregación ─────────────────────────────────────────────────
function agrupar(arr, keys, valKey = 'Valor') {
  try {
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
  } catch (error) {
    console.error("Error agrupando datos:", error);
    return [];
  }
}

function sumaTotal(arr) {
  try {
    return arr.reduce((s, r) => s + (Number(r.Valor) || 0), 0);
  } catch (error) {
    console.error("Error sumando datos totales:", error);
    return 0;
  }
}

// ── Componentes UI locales ───────────────────────────────────────────────────
const FilterSelect = ({ label, value, onChange, options, isMultiple }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);
  const idPrefix = label.toLowerCase().replace(/\s+/g, '-');
  
  React.useEffect(() => {
    if (!isMultiple) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMultiple]);

  if (isMultiple) {
    const selectedValues = value ? value.split(',') : [];

    const handleToggle = (opt) => {
      let newSelected;
      if (selectedValues.includes(opt)) {
        newSelected = selectedValues.filter(o => o !== opt);
      } else {
        newSelected = [...selectedValues, opt];
      }
      onChange(newSelected.join(','));
    };

    const handleClear = (e) => {
      e.stopPropagation();
      onChange('');
    };

    return (
      <div className="flex-1 min-w-[200px]" ref={dropdownRef}>
        <label id={`label-${idPrefix}`} className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5 font-medium">{label}</label>
        <div className="relative">
          <button
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={`label-${idPrefix}`}
            onClick={() => setIsOpen(!isOpen)}
            className="w-full text-left bg-[#1a1d27] border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:ring-2 focus:border-blue-500 outline-none transition-all flex justify-between items-center"
          >
            <span className="truncate pr-2 select-none text-gray-200">
              {selectedValues.length === 0 ? "Todos" : selectedValues.join(', ')}
            </span>
            <div className="flex gap-2 items-center">
              {selectedValues.length > 0 && (
                  <div onClick={handleClear} role="button" aria-label="Limpiar selección" tabIndex={0} className="text-gray-400 hover:text-white flex items-center justify-center p-0.5 rounded-full hover:bg-gray-700 transition cursor-pointer">✕</div>
              )}
              <span className="text-gray-500 text-[10px]">▼</span>
            </div>
          </button>
          
          {isOpen && (
            <div role="listbox" aria-multiselectable="true" className="absolute top-full left-0 w-full mt-2 bg-[#1a1d27] border border-gray-700 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar">
              <div className="p-1">
                 {options.map(o => {
                  const optStr = String(o);
                  return (
                  <label key={optStr} role="option" aria-selected={selectedValues.includes(optStr)} className="flex items-center px-3 py-2 hover:bg-[#2e3250] rounded-md cursor-pointer text-sm text-gray-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(optStr)}
                      onChange={() => handleToggle(optStr)}
                      className="mr-3 w-4 h-4 rounded border-gray-600 bg-gray-800 accent-blue-500 cursor-pointer"
                      tabIndex={-1}
                    />
                    {optStr}
                  </label>
                )})}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-[200px]">
      <label htmlFor={`filter-${idPrefix}`} className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5 font-medium">{label}</label>
      <select
        id={`filter-${idPrefix}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={`Filtrar por ${label}`}
        className="w-full bg-[#1a1d27] border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
      >
        <option value="">Todos</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
};

const Sparkline = ({ data, color = "#4f72ff" }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible ml-auto opacity-70">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const KpiBox = ({ label, value, sub, color, trendData, trendColor, size = 'small', highlight = false, onClick }) => {
  const isLarge = size === 'large';
  const bgClass = highlight ? 'bg-blue-900/20 border-blue-700/50' : 'glass hover:border-gray-500';
  const clickClass = onClick ? 'cursor-pointer hover:border-blue-500 transform hover:-translate-y-1' : '';
  return (
    <div onClick={onClick} className={`${bgClass} ${clickClass} rounded-xl p-5 transition-all duration-300 flex flex-col justify-between h-full shadow-lg`}>
      <div>
        <div className={`${isLarge ? 'text-sm' : 'text-xs'} uppercase tracking-wide text-gray-500 mb-2 font-medium`}>{label}</div>
        <div
          className={`${isLarge ? 'text-4xl' : 'text-2xl'} font-bold leading-snug mb-1 line-clamp-2 ${color || 'text-white'}`}
          title={typeof value === 'string' ? value : undefined}
        >
          {value ?? '—'}
        </div>
      </div>
      <div className="flex items-end justify-between mt-2 pt-1 h-7">
        <div className={`${isLarge ? 'text-sm' : 'text-xs'} text-[var(--color-dash-muted)] opacity-80`}>{sub}</div>
        {trendData && <Sparkline data={trendData} color={trendColor || "#4f72ff"} />}
      </div>
    </div>
  );
};

const Badge = ({ text, icon, color = 'text-gray-400', bg = 'bg-gray-800', border = 'border-gray-700' }) => (
  <span className={`px-3 py-1.5 ${bg} border ${border} rounded-full ${color} flex items-center gap-1.5 shadow-inner text-xs font-mono whitespace-nowrap`}>
    {icon && <span className="opacity-70">{icon}</span>}
    {text}
  </span>
);

// ── Componente principal ─────────────────────────────────────────────────────
const GlosarioModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="glass bg-[#1a1d27] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">Glosario de Términos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        <div className="space-y-4 text-sm text-gray-300">
          <div><strong className="text-blue-400">Carpeta:</strong> Unidad de investigación abierta por la Fiscalía. Puede involucrar uno o múltiples delitos y víctimas.</div>
          <div><strong className="text-blue-400">Víctimas:</strong> Número de personas afectadas individualmente. Solo aplica para ciertos delitos.</div>
          <div><strong className="text-blue-400">Delito:</strong> Tipificación jurídica del acto ilícito según el SESNSP.</div>
          <div><strong className="text-blue-400">Municipio:</strong> Demarcación territorial donde ocurrió el hecho.</div>
        </div>
      </div>
    </div>
  );
};

const InsightCard = ({ porFechaData, onDrillDown }) => {
  const n = porFechaData.length;
  if(n < 2) return null;
  const last = porFechaData[n-1].Valor;
  const prev = porFechaData[n-2].Valor;
  if(prev === 0) return null;
  const ratio = (last - prev) / prev;
  if(Math.abs(ratio) < 0.3) return null;

  const isUp = ratio > 0;
  return (
    <div className={`mb-6 p-4 rounded-xl flex items-center justify-between border ${isUp ? 'bg-red-900/20 border-red-700/50' : 'bg-green-900/20 border-green-700/50'}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isUp ? '⚠️' : '🎉'}</span>
        {isUp && <TrendingUp size={20} className="text-red-400" />}
        {!isUp && <TrendingDown size={20} className="text-green-400" />}
        <div>
          <h4 className={`text-sm font-bold ${isUp ? 'text-red-400' : 'text-green-400'} uppercase tracking-wider`}>
            {isUp ? 'Alerta de Tendencia' : 'Tendencia Positiva'}
          </h4>
          <p className="text-sm text-gray-300">
            Variación del {Math.abs(ratio*100).toFixed(1)}% {isUp ? 'aumentó' : 'disminuyó'} respecto al mes anterior.
          </p>
        </div>
      </div>
      <button onClick={onDrillDown} className="px-4 py-2 bg-[#1a1d27] border border-gray-600 rounded-lg text-sm text-white hover:bg-gray-700 transition">
        Ver Análisis →
      </button>
    </div>
  );
};

const ExportMenu = ({ df, dfV, activeTab, filtAnno, filtDelito, filtMunicipio }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Cerrar al clickear fuera
  useEffect(() => {
    const handleOutsideClick = () => setIsOpen(false);
    if (isOpen) document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  const getDataset = () => activeTab === 2 ? dfV : df;

  const handleExportCSV = () => {
    const dataset = getDataset();
    const csv = Papa.unparse(dataset);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Sonora_${activeTab === 2 ? 'Victimas' : 'Carpetas'}_${Date.now()}.csv`;
    link.click();
    setIsOpen(false);
  };

  const handleExportJSON = () => {
    const dataset = getDataset();
    const payload = {
      metadata: {
        titulo: "Sonora Delictiva - Datos Filtrados",
        filtros: {
          año: filtAnno || "Todos",
          delito: filtDelito || "Todos",
          municipio: filtMunicipio || "Todos"
        },
        fecha_exportacion: new Date().toISOString(),
        total_registros: dataset.length,
        fuente: "Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública (SESNSP)"
      },
      data: dataset
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Sonora_Dataset_${Date.now()}.json`;
    link.click();
    setIsOpen(false);
  };

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[#2a2e3d]/80 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-sm font-medium transition-all shadow-lg min-w-[140px] justify-center"
      >
        <Download size={16} /> Exportar <span className="text-[10px] opacity-70 ml-1">▼</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1a1d27] border border-gray-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95">
          <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2e3250] hover:text-white transition-colors">
            📄 Formato CSV
          </button>
          <button onClick={handleExportJSON} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2e3250] hover:text-white transition-colors">
            {`{ }`} Formato JSON
          </button>
        </div>
      )}
    </div>
  );
};

export default function DashboardLayout({ data }) {
  if (!data?.estatal || !data?.municipal || !data?.victimas) {
      throw new Error("Datos vitales ausentes en el JSON base.");
  }
  const { meta = {}, estatal, municipal, victimas } = data;

  // Filtros sincronizados con la URL
  const [filtAnno,     setFiltAnno]     = useFilterState('año', '2026');
  const [filtDelito,   setFiltDelito]   = useFilterState('delito', '');
  const [filtMunicipio, setFiltMunicipio] = useFilterState('municipio', '');
  const [activeTab,    setActiveTab]    = useState(0);
  const [copied,       setCopied]       = useState(false);
  const [detailModal,  setDetailModal]  = useState({ type: null, isOpen: false });
  const [glosarioOpen, setGlosarioOpen] = useState(false);

  // Diferir carga de Plotly 2 segundos (permite render inicial rápido)
  const [plotlyReady, setPlotlyReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPlotlyReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // FASE 3 Toast Notification On Filter Change
  useEffect(() => {
    if (filtAnno || filtDelito || filtMunicipio) {
      toast(`Filtros: ${[filtAnno, filtDelito, filtMunicipio].filter(Boolean).join(' · ')}`, {
        style: { background: '#1a1d27', color: '#fff', border: '1px solid #4f72ff' },
        icon: '🔍'
      });
    }
  }, [filtAnno, filtDelito, filtMunicipio]);

  const { poblacionPorMun, pobCargada } = useTasaPoblacion({});
  const pobTotalSonora = useMemo(() => {
    return Object.values(poblacionPorMun).reduce((s, v) => s + (Number(v) || 0), 0);
  }, [poblacionPorMun]);

  // Opciones de filtros
  const annos   = useMemo(() => [...new Set(estatal.map(r => r['Año']))].sort(), [estatal]);
  const delitos = useMemo(() => [...new Set(estatal.map(r => r['Subtipo de delito']))].filter(Boolean).sort(), [estatal]);
  const munis   = useMemo(() => [...new Set(municipal.map(r => r['Municipio']))].filter(Boolean).sort(), [municipal]);

  // Período desde meta.json
  const periodoText = meta.periodo_inicio && meta.periodo_fin
    ? `${meta.periodo_inicio.slice(0, 7)} → ${meta.periodo_fin.slice(0, 7)}`
    : 'Sin datos';

  // Fecha/hora de última actualización formateada
  const actualizadoText = useMemo(() => {
    if (!meta.generado_en) return 'Sin fecha';
    const d = new Date(meta.generado_en);
    const fecha = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    const hora  = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} ${hora}`;
  }, [meta.generado_en]);

  // Datasets filtrados
  const df = useMemo(() => {
    let d = filtMunicipio ? municipal : estatal;
    if (filtAnno) {
      const annos = filtAnno.split(',');
      d = d.filter(r => annos.includes(String(r['Año'])));
    }
    if (filtDelito)    d = d.filter(r => r['Subtipo de delito'] === filtDelito);
    if (filtMunicipio) d = d.filter(r => r['Municipio'] === filtMunicipio);
    return d;
  }, [estatal, municipal, filtAnno, filtDelito, filtMunicipio]);

  const dfM = useMemo(() => {
    let d = municipal;
    if (filtAnno) {
      const annos = filtAnno.split(',');
      d = d.filter(r => annos.includes(String(r['Año'])));
    }
    if (filtDelito)    d = d.filter(r => r['Subtipo de delito'] === filtDelito);
    if (filtMunicipio) d = d.filter(r => r['Municipio'] === filtMunicipio);
    return d;
  }, [municipal, filtAnno, filtDelito, filtMunicipio]);

  const dfV = useMemo(() => {
    let d = victimas;
    if (filtAnno) {
      const annos = filtAnno.split(',');
      d = d.filter(r => annos.includes(String(r['Año'])));
    }
    if (filtDelito)    d = d.filter(r => r['Subtipo de delito'] === filtDelito);
    if (filtMunicipio) d = d.filter(r => r['Municipio'] === filtMunicipio);
    return d;
  }, [victimas, filtAnno, filtDelito, filtMunicipio]);

  const dfNoAnno = useMemo(() => {
    // Para la proyección estadística, NUNCA filtramos por año
    // porque necesitamos la historia completa para calcular la estacionalidad
    let d = filtMunicipio ? municipal : estatal;
    if (filtDelito)    d = d.filter(r => r['Subtipo de delito'] === filtDelito);
    if (filtMunicipio) d = d.filter(r => r['Municipio'] === filtMunicipio);
    return d;
  }, [estatal, municipal, filtDelito, filtMunicipio]);

  // KPIs
  const totalCarpetas  = sumaTotal(df);
  const totalVictimas  = sumaTotal(dfV);
  
  const trendVictimas = useMemo(() => {
    const full = agrupar(dfV, ['Fecha']).sort((a, b) => a.Fecha > b.Fecha ? 1 : -1);
    let last = full.length - 1;
    while (last >= 0 && full[last].Valor === 0) last--;
    return last >= 0 ? full.slice(0, last + 1).map(r => r.Valor) : full.map(r => r.Valor);
  }, [dfV]);

  const tasaGlobal = useMemo(() => {
    if (!pobCargada || pobTotalSonora === 0 || totalCarpetas === 0) return null;
    return ((totalCarpetas / pobTotalSonora) * 100000).toFixed(1);
  }, [pobCargada, pobTotalSonora, totalCarpetas]);
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
    { label: 'Alerta Temprana', icon: <BellRing size={18} /> },
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
        <TabTendenciasM dfM={dfM} munis={munis} plotlyReady={plotlyReady} />
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
    if (activeTab === 3) return (
      <TabAlertaTemprana 
        dataEstatal={dfNoAnno.filter(d => Number(d.Fecha?.substring(0, 4) || d['Año']) >= 2026)} 
        dataHistorica={dfNoAnno.filter(d => Number(d.Fecha?.substring(0, 4) || d['Año']) <= 2025)} 
      />
    );
  };

  return (
    <div className="min-h-screen pb-16">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded focus:font-bold"
      >
        Ir al contenido principal
      </a>
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
          <div className="flex flex-wrap gap-2">
            <Badge
              text={periodoText}
              icon="📅"
              color="text-blue-300"
              bg="bg-blue-900/30"
              border="border-blue-700/50"
            />
            <Badge
              text={`Actualizado: ${actualizadoText}`}
              icon="🔄"
              color={Math.floor((new Date() - new Date(meta.generado_en)) / 86400000) < 15 ? "text-emerald-300" : Math.floor((new Date() - new Date(meta.generado_en)) / 86400000) < 45 ? "text-yellow-300" : "text-red-300"}
              bg={Math.floor((new Date() - new Date(meta.generado_en)) / 86400000) < 15 ? "bg-emerald-900/20" : Math.floor((new Date() - new Date(meta.generado_en)) / 86400000) < 45 ? "bg-yellow-900/20" : "bg-red-900/20"}
              border={Math.floor((new Date() - new Date(meta.generado_en)) / 86400000) < 15 ? "border-emerald-700/40" : Math.floor((new Date() - new Date(meta.generado_en)) / 86400000) < 45 ? "border-yellow-700/40" : "border-red-700/40"}
            />
            <button onClick={() => setGlosarioOpen(true)} className="hover:opacity-80 transition-opacity">
              <Badge text="Glosario" icon="📖" color="text-violet-300" bg="bg-violet-900/20" border="border-violet-700/40" />
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* InsightCard Anomalía */}
        <InsightCard porFechaData={porFechaData} onDrillDown={() => setActiveTab(3)} />

        {/* Data Quality Indicator */}
        <DataQualityIndicator meta={meta} estatal={estatal} municipal={municipal} />

        {/* Filtros */}
        <div className="glass rounded-2xl p-5 flex flex-wrap gap-5 items-end mb-8 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 w-full sm:w-auto font-medium text-gray-300">
            <Settings2 size={18} /> Filtros:
          </div>
          <FilterSelect label="Año"       value={filtAnno || ''}      onChange={setFiltAnno}      options={annos} isMultiple={true} />
          <FilterSelect label="Delito"    value={filtDelito}    onChange={setFiltDelito}    options={delitos} />
          <FilterSelect label="Municipio" value={filtMunicipio} onChange={setFiltMunicipio} options={munis} />

          <div className="flex-1 sm:flex-none flex items-center justify-end ml-auto gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2a2e3d]/80 hover:bg-[#353b4d] text-[var(--color-dash-muted)] hover:text-white border border-[var(--color-dash-border)] rounded-lg text-sm font-medium transition-all shadow-sm relative min-w-[150px] justify-center"
              title="Copiar URL con los filtros actuales"
            >
              {copied ? <><Check size={16} className="text-emerald-400"/> Copiado</> : <><Share2 size={16} /> Compartir Vista</>}
            </button>
            <ExportMenu df={df} dfV={dfV} activeTab={activeTab} filtAnno={filtAnno} filtDelito={filtDelito} filtMunicipio={filtMunicipio} />
          </div>
        </div>

        {/* Chips de filtros activos */}
        {(filtAnno || filtDelito || filtMunicipio) && (
          <div className="flex flex-wrap items-center gap-2 mb-6 px-1 animate-in fade-in">
            <span className="text-xs text-gray-400 uppercase tracking-wider mr-2 bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700">
              {Number(!!filtAnno) + Number(!!filtDelito) + Number(!!filtMunicipio)} filtro(s) activo(s)
            </span>
            {filtAnno && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-900/30 text-blue-300 border border-blue-700/50 rounded-full text-xs font-medium shadow-sm">
                📅 {filtAnno}
                <button onClick={() => setFiltAnno('')} className="text-blue-200 hover:text-white transition-colors ml-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-800/50">&times;</button>
              </span>
            )}
            {filtDelito && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-900/30 text-blue-300 border border-blue-700/50 rounded-full text-xs font-medium shadow-sm">
                🔪 {filtDelito}
                <button onClick={() => setFiltDelito('')} className="text-blue-200 hover:text-white transition-colors ml-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-800/50">&times;</button>
              </span>
            )}
            {filtMunicipio && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-900/30 text-blue-300 border border-blue-700/50 rounded-full text-xs font-medium shadow-sm">
                📍 {filtMunicipio}
                <button onClick={() => setFiltMunicipio('')} className="text-blue-200 hover:text-white transition-colors ml-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-800/50">&times;</button>
              </span>
            )}
            <button 
              onClick={() => { setFiltAnno(''); setFiltDelito(''); setFiltMunicipio(''); }}
              className="text-xs text-gray-500 hover:text-gray-300 underline mx-2 transition-colors"
            >
              Limpiar todo
            </button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 mb-8">
          <div className="col-span-2 lg:col-span-4">
            <KpiBox label="Total Carpetas" value={totalCarpetas.toLocaleString('es-MX')} trendData={porFechaData.map(r => r.Valor)} trendColor="#4f72ff" size="large" highlight={true} onClick={() => setDetailModal({type: 'carpetas', isOpen: true})} />
          </div>
          <div className="col-span-1 lg:col-span-2">
            <KpiBox label="Tasa Estatal" value={tasaGlobal ? tasaGlobal : '—'} sub="Por 100k hab." trendData={tasaGlobal ? porFechaData.map(r => r.Valor) : null} trendColor="#a29bfe" color="text-violet-400" />
          </div>
          <div className="col-span-1 lg:col-span-2">
            <KpiBox label="Variación" value={labelTasa}
              sub={tasaCambio !== null ? (tasaCambio > 0 ? 'vs mes anterior' : 'vs mes anterior') : 'Insuficiente'}
              color={tasaCambio > 0 ? 'text-red-400' : tasaCambio < 0 ? 'text-green-400' : 'text-blue-400'} />
          </div>
          <div className="col-span-1 lg:col-span-2">
            <KpiBox label="Total Víctimas" value={totalVictimas.toLocaleString('es-MX')} trendData={trendVictimas} trendColor="#43e97b" color="text-emerald-400" onClick={() => setDetailModal({type: 'victimas', isOpen: true})} />
          </div>
          <div className="col-span-1 lg:col-span-2">
            <KpiBox label="Principal Delito" value={porDelito['Subtipo de delito']} sub={`${porDelito.Valor?.toLocaleString('es-MX')} casos`} color="text-orange-400" onClick={() => setDetailModal({type: 'delito', isOpen: true})} />
          </div>
          <div className="col-span-2 lg:col-span-2">
            <KpiBox label="Max Municipio" value={porMun.Municipio} sub={`${porMun.Valor?.toLocaleString('es-MX')} casos`} color="text-pink-400" onClick={() => setDetailModal({type: 'municipio', isOpen: true})}/>
          </div>
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

        {plotlyReady ? (
          <Suspense fallback={<FallbackLoader />}>
            {renderContent()}
          </Suspense>
        ) : (
          <FallbackLoader title="Cargando Visualizaciones..." />
        )}

      </main>

      {/* Live region para notificaciones de cambios */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {filtAnno && `Filtro de año: ${filtAnno}`}
        {filtDelito && `Filtro de delito: ${filtDelito}`}
        {filtMunicipio && `Filtro de municipio: ${filtMunicipio}`}
      </div>

      <Toaster position="bottom-right" />
      <GlosarioModal isOpen={glosarioOpen} onClose={() => setGlosarioOpen(false)} />
      
      <Suspense fallback={null}>
        {detailModal.type === 'carpetas' && <TotalCarpetasModal isOpen={detailModal.isOpen} onClose={() => setDetailModal({type: null, isOpen: false})} df={df} tasaCambio={tasaCambio} porFechaData={porFechaData} onFilterDelito={setFiltDelito} />}
        {detailModal.type === 'delito' && <PrincipalDelitoModal isOpen={detailModal.isOpen} onClose={() => setDetailModal({type: null, isOpen: false})} df={df} delitoNombre={porDelito['Subtipo de delito']} porDelito={porDelito} onFilterDelito={setFiltDelito} />}
        {detailModal.type === 'municipio' && <MaxMunicipioModal isOpen={detailModal.isOpen} onClose={() => setDetailModal({type: null, isOpen: false})} df={dfM} municipioNombre={porMun.Municipio} porMun={porMun} onFilterMunicipio={setFiltMunicipio} />}
        {detailModal.type === 'victimas' && <TotalVictimasModal isOpen={detailModal.isOpen} onClose={() => setDetailModal({type: null, isOpen: false})} dfV={dfV} df={df} totalVictimas={totalVictimas} setActiveTab={setActiveTab} />}
      </Suspense>
    </div>
  );
}

// ── Sub-componente inline: gráficas de municipios en tab Municipal ───────────
function TabTendenciasM({ dfM, munis, plotlyReady }) {
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

  const rankingM = useMemo(() =>
    agrupar(dfM, ['Municipio']).sort((a, b) => b.Valor - a.Valor),
    [dfM]
  );

  const top5 = useMemo(() =>
    [...rankingM].slice(0, 5).map(r => r.Municipio),
    [rankingM]
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
          {plotlyReady ? (
            <Suspense fallback={<FallbackLoader />}>
              <Plot
                data={traces5}
                layout={{ ...LAYOUT_BASE, autosize: true, legend: { orientation: 'h', y: -0.2 }, margin: { t:10, r:10, b:80, l:50 }, xaxis: { ...LAYOUT_BASE.xaxis, type: 'category' } }}
                config={PLOTLY_CONFIG}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
                aria-label="Gráfica de líneas: Evolución temporal de los 5 municipios con mayor incidencia delictiva en los últimos 12 meses" role="img"
              />
            </Suspense>
          ) : (
            <FallbackLoader title="Cargando Visualizaciones..." />
          )}
        </div>
      </Card>
      <Card title="Listado de Municipios (Ranking Completo)">
        <div className="w-full h-[400px] border border-gray-700/50 rounded-lg overflow-y-auto bg-[#1e2235]">
           <table className="w-full">
             <caption className="sr-only">Tabla: Top municipios ordenados por incidencia delictiva</caption>
             <thead className="border-b border-gray-700">
               <tr>
                 <th scope="col" className="text-left text-xs uppercase font-bold text-gray-400 py-2 px-3 sticky top-0 bg-[#1e2235]">Ranking</th>
                 <th scope="col" className="text-left text-xs uppercase font-bold text-gray-400 py-2 px-3 sticky top-0 bg-[#1e2235]">Municipio</th>
                 <th scope="col" className="text-right text-xs uppercase font-bold text-gray-400 py-2 px-3 sticky top-0 bg-[#1e2235]">Casos</th>
               </tr>
             </thead>
             <tbody>
               {rankingM.map((fila, index) => (
                 <tr key={fila.Municipio} className={`border-b border-gray-700/30 hover:bg-[#2e3250] transition-colors ${index % 2 === 0 ? 'bg-[#1a1d27]/50' : 'bg-[#1e2235]/50'}`}>
                   <td className="text-left text-xs text-gray-500 font-mono py-2 px-3 w-12">{index + 1}</td>
                   <td className="text-left text-sm text-gray-200 py-2 px-3 truncate max-w-[150px]">{fila.Municipio}</td>
                   <td className="text-right text-sm font-bold text-white py-2 px-3 tracking-wider">{fila.Valor.toLocaleString('es-MX')}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </Card>
    </div>
  );
}

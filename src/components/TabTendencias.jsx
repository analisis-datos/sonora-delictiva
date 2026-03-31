// src/components/TabTendencias.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Pestaña "Tendencias" — evolución mensual, heatmap y barras por tipo de delito.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import PlotlyComponent from 'react-plotly.js';

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

// ── Detección de anomalías (μ + umbralSigma * σ) ────────────────────
 function detectarAnomalias(series, umbralSigma = 2) {
  if (series.length < 4) return [];
  const vals = series.map(r => r.Valor);
  const media = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((s, v) => s + (v - media) ** 2, 0) / vals.length);
  if (std === 0) return [];
  return series.filter(r => Math.abs(r.Valor - media) > umbralSigma * std);
}

// ── Índice de riesgo ponderado por gravedad ───────────────────────
 const PESOS_DELITO = {
  'Homicidio doloso': 10, 'Feminicidio': 10, 'Secuestro': 9,
  'Extorsión': 8, 'Violación simple': 8, 'Narcomenudeo': 6,
  'Robo de vehículo automotor': 5, 'Robo a casa habitación': 4,
  'Robo a negocio': 4, 'Robo a transeúnte en vía pública': 4, 'Lesiones dolosas': 3,
};
const PESO_DEFAULT = 1;

function calcularIndiceRiesgo(df) {
  const porMun = {};
  df.forEach(r => {
    const mun = r['Municipio'];
    if (!mun) return;
    const peso = PESOS_DELITO[r['Subtipo de delito']] || PESO_DEFAULT;
    porMun[mun] = (porMun[mun] || 0) + (Number(r.Valor) || 0) * peso;
  });
  const entries = Object.entries(porMun).sort(([, a], [, b]) => b - a);
  const max = entries[0]?.[1] || 1;
  return entries.map(([mun, score], i) => ({
    municipio: mun, score, scoreNorm: Math.round((score / max) * 100), rank: i + 1
  }));
}

export default function TabTendencias({ df }) {
  const porFechaData = useMemo(() => {
    const full = agrupar(df, ['Fecha']).sort((a, b) => a.Fecha > b.Fecha ? 1 : -1);
    let last = full.length - 1;
    while (last >= 0 && full[last].Valor === 0) last--;
    return last >= 0 ? full.slice(0, last + 1) : full;
  }, [df]);

  const { dfAnos, tracesAnual } = useMemo(() => {
    const anos = [...new Set(df.map(r => String(r['Año'])))].sort();
    const traces = ALTO_IMPACTO.map((delito, i) => {
      const sub = df.filter(r => (r['Subtipo de delito'] || r['Tipo de delito'] || '').includes(delito.split(' ')[0]));
      const yVals = anos.map(a => sumaTotal(sub.filter(r => String(r['Año']) === a)));
      return { name: delito, x: anos, y: yVals, type: 'bar', marker: { color: COLORES[i % COLORES.length] } };
    }).filter(t => t.y.some(v => v > 0));
    return { dfAnos: anos, tracesAnual: traces };
  }, [df]);

  const { annosHeat, pivotData } = useMemo(() => {
    const pivot = {};
    df.forEach(r => {
      if (!r.Fecha) return;
      const anno = r.Fecha.slice(0, 4);
      const mes  = parseInt(r.Fecha.slice(5, 7)) - 1;
      if (!pivot[anno]) pivot[anno] = Array(12).fill(0);
      pivot[anno][mes] += Number(r.Valor) || 0;
    });
    const anos = Object.keys(pivot).sort();
    return { annosHeat: anos, pivotData: pivot };
  }, [df]);

  // Anomalías en la serie temporal
  const anomalias = useMemo(() => detectarAnomalias(porFechaData, 2), [porFechaData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-500">
      <Card title="Evolución mensual de carpetas" colSpan>
        <div className="w-full h-[320px]">
          <Plot
            data={[
              {
                x: porFechaData.map(r => r.Fecha),
                y: porFechaData.map(r => r.Valor),
                type: 'scatter', mode: 'lines',
                name: 'Carpetas',
                fill: 'tozeroy', fillcolor: 'rgba(79,114,255,0.12)',
                line: { color: '#4f72ff', width: 2 }
              },
              anomalias.length > 0 && {
                x: anomalias.map(r => r.Fecha),
                y: anomalias.map(r => r.Valor),
                type: 'scatter', mode: 'markers',
                name: 'Anomalía (>2σ)',
                marker: { color: '#ff6b6b', size: 10, symbol: 'diamond',
                          line: { color: '#ffffff55', width: 1 } },
              }
            ].filter(Boolean)}
            layout={{ ...LAYOUT_BASE, autosize: true, margin: { t: 10, r: 10, b: 40, l: 50 }, xaxis: { ...LAYOUT_BASE.xaxis, type: 'category' } }}
            config={PLOTLY_CONFIG}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
          />
        </div>
        {anomalias.length > 0 && (
          <p className="text-xs text-red-400 mt-2 opacity-80">
            ◆ {anomalias.length} mes{anomalias.length > 1 ? 'es' : ''} con actividad atípica detectado{anomalias.length > 1 ? 's' : ''} ({'>'}2 desv. estándar)
          </p>
        )}
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
              z: annosHeat.map(a => pivotData[a]), x: MESES, y: annosHeat,
              type: 'heatmap', colorscale: 'YlOrRd', showscale: false, reversescale: true
            }]}
            layout={{ ...LAYOUT_BASE, autosize: true, margin: { t: 10, r: 10, b: 40, l: 50 }, yaxis: { ...LAYOUT_BASE.yaxis, type: 'category', autorange: 'reversed' } }}
            config={PLOTLY_CONFIG}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
          />
        </div>
      </Card>

      <IndiceRiesgoCard df={df} />
    </div>
  );
}

// ── Card de índice de riesgo ponderado ──────────────────────────────
function IndiceRiesgoCard({ df }) {
  const ranking = useMemo(() => calcularIndiceRiesgo(df).slice(0, 10), [df]);
  if (!ranking.length) return null;
  const RISK_COLORS = [
    '#e74c3c','#e07010','#e07010','#e8b020','#e8b020',
    '#4f72ff','#4f72ff','#4f72ff','#8892b0','#8892b0',
  ];
  return (
    <div className="glass rounded-2xl p-6 shadow-xl col-span-full">
      <h3 className="text-sm font-medium text-[var(--color-dash-muted)] mb-4 tracking-wide uppercase">
        Índice de Riesgo Ponderado — Top 10 Municipios
        <span className="ml-2 text-xs text-gray-600 normal-case">(homicidio×10, feminicidio×10, secuestro×9, extorsión×8...)</span>
      </h3>
      <div className="space-y-2">
        {ranking.map((r, i) => (
          <div key={r.municipio} className="flex items-center gap-3">
            <span className="text-xs font-bold w-5 text-center shrink-0" style={{ color: RISK_COLORS[i] }}>{r.rank}</span>
            <span className="text-sm text-gray-300 w-36 shrink-0 truncate">{r.municipio}</span>
            <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: '#1e2235' }}>
              <div
                className="h-4 rounded-full transition-all duration-700"
                style={{ width: `${r.scoreNorm}%`, background: RISK_COLORS[i] }}
              />
            </div>
            <span className="text-xs text-gray-500 w-14 text-right shrink-0">
              {r.score.toLocaleString('es-MX')} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

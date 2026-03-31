// src/components/ComparadorMunicipios.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Panel comparador de dos municipios con evolución temporal y barras de delitos.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import PlotlyComponent from 'react-plotly.js';

const Plot = PlotlyComponent.default || PlotlyComponent;

const ALTO_IMPACTO = [
  'Homicidio doloso','Feminicidio','Secuestro','Extorsión',
  'Robo de vehículo automotor','Robo a casa habitación',
  'Robo a negocio','Robo a transeúnte en vía pública',
  'Violación simple','Lesiones dolosas','Narcomenudeo',
];

const LAYOUT_BASE = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  font: { family: 'Inter, system-ui, sans-serif', color: '#8892b0', size: 11 },
  xaxis: { gridcolor: '#2e3250', zerolinecolor: '#2e3250', color: '#8892b0' },
  yaxis: { gridcolor: '#2e3250', zerolinecolor: '#2e3250', color: '#8892b0', rangemode: 'tozero' },
  hovermode: 'x unified',
  hoverlabel: { bgcolor: '#1a1d27', bordercolor: '#4f72ff', font: { color: '#e8eaf6' } },
};

const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

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

function sumaTotal(arr) {
  return arr.reduce((s, r) => s + (Number(r.Valor) || 0), 0);
}

export default function ComparadorMunicipios({ data, munis = [], filtAnno, filtDelito }) {
  const [munA, setMunA] = useState(munis[0] || 'Hermosillo');
  const [munB, setMunB] = useState(munis[1] || 'Cajeme');

  const getEvolucion = (mun) => {
    let fil = data.filter(r => r.Municipio === mun);
    if (filtAnno)  fil = fil.filter(r => String(r['Año']) === filtAnno);
    if (filtDelito) fil = fil.filter(r => r['Subtipo de delito'] === filtDelito);
    const byFecha = {};
    fil.forEach(r => { byFecha[r.Fecha] = (byFecha[r.Fecha] || 0) + (Number(r.Valor) || 0); });
    return Object.entries(byFecha).sort(([a], [b]) => a > b ? 1 : -1);
  };

  const getDelitoBreakdown = (mun) => {
    let fil = data.filter(r => r.Municipio === mun);
    if (filtAnno)  fil = fil.filter(r => String(r['Año']) === filtAnno);
    if (filtDelito) fil = fil.filter(r => r['Subtipo de delito'] === filtDelito);
    return ALTO_IMPACTO.map(d => ({
      delito: d.length > 25 ? d.slice(0, 25) + '…' : d,
      valor: sumaTotal(fil.filter(r => r['Subtipo de delito'] === d)),
    })).filter(d => d.valor > 0);
  };

  const { evA, evB, breakA, breakB } = useMemo(() => ({
    evA: getEvolucion(munA),
    evB: getEvolucion(munB),
    breakA: getDelitoBreakdown(munA),
    breakB: getDelitoBreakdown(munB),
  }), [data, munA, munB, filtAnno, filtDelito]);

  const totalA = evA.reduce((s, [, v]) => s + v, 0);
  const totalB = evB.reduce((s, [, v]) => s + v, 0);

  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{ background: '#1a1d27', border: '1px solid #2e3250' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
          ⇄ Comparador de Municipios
        </h3>
      </div>

      {/* Selectores */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Municipio A', value: munA, set: setMunA, color: '#4f72ff', total: totalA },
          { label: 'Municipio B', value: munB, set: setMunB, color: '#ff6b6b', total: totalB },
        ].map(({ label, value, set, color, total }) => (
          <div key={label}>
            <label className="text-xs text-gray-500 mb-1 block">{label}</label>
            <div className="flex gap-2 items-center">
              <select
                value={value}
                onChange={e => set(e.target.value)}
                className="flex-1 bg-[#0d1117] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                style={{ border: `1px solid ${color}55` }}
              >
                {munis.map(m => <option key={m}>{m}</option>)}
              </select>
              <span
                className="text-xs font-bold px-2 py-1 rounded-lg"
                style={{ background: `${color}22`, color }}
              >
                {total.toLocaleString('es-MX')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolución temporal */}
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Evolución mensual</p>
          <Plot
            data={[
              { x: evA.map(([f]) => f), y: evA.map(([, v]) => v), name: munA,
                type: 'scatter', mode: 'lines', line: { color: '#4f72ff', width: 2 } },
              { x: evB.map(([f]) => f), y: evB.map(([, v]) => v), name: munB,
                type: 'scatter', mode: 'lines', line: { color: '#ff6b6b', width: 2 } },
            ]}
            layout={{
              ...LAYOUT_BASE, autosize: true,
              margin: { t: 10, r: 10, b: 40, l: 50 },
              xaxis: { ...LAYOUT_BASE.xaxis, type: 'category' },
              legend: { orientation: 'h', y: -0.25 },
            }}
            config={PLOTLY_CONFIG}
            style={{ width: '100%', height: 260 }}
            useResizeHandler
          />
        </div>

        {/* Desglose por delito */}
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Desglose por delito</p>
          <Plot
            data={[
              { y: breakA.map(d => d.delito), x: breakA.map(d => d.valor), name: munA,
                type: 'bar', orientation: 'h', marker: { color: '#4f72ff88' } },
              { y: breakB.map(d => d.delito), x: breakB.map(d => d.valor), name: munB,
                type: 'bar', orientation: 'h', marker: { color: '#ff6b6b88' } },
            ]}
            layout={{
              ...LAYOUT_BASE, autosize: true, barmode: 'group',
              margin: { t: 10, r: 10, b: 40, l: 160 },
              yaxis: { ...LAYOUT_BASE.yaxis, type: 'category' },
              legend: { orientation: 'h', y: -0.25 },
            }}
            config={PLOTLY_CONFIG}
            style={{ width: '100%', height: 260 }}
            useResizeHandler
          />
        </div>
      </div>
    </div>
  );
}

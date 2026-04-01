---
name: react-best-practices
description: >
  Use this skill when writing or refactoring React components, hooks, or state
  management in the sonora-delictiva dashboard. Covers React 19 patterns,
  PapaParse CSV loading, D3 map integration, Plotly chart components,
  filter state, performance optimization with useMemo/useCallback, and
  component architecture decisions. Use when the user asks about component
  structure, data flow, hooks, or why something re-renders unexpectedly.
---

# React Best Practices — Sonora Delictiva

## Stack
React 19 · Vite 8 · Tailwind 4 · Plotly (react-plotly.js) · D3 v7 · PapaParse

## Arquitectura de datos

### Carga de CSVs (PapaParse)
```jsx
// Hook reutilizable para cargar un CSV
function useCsvData(url) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    Papa.parse(url, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: ({ data }) => { setData(data); setLoading(false); },
      error:    (err)      => { setError(err.message); setLoading(false); },
    });
  }, [url]);

  return { data, loading, error };
}
```

### Estado global de filtros
```jsx
// Centralizar filtros en App.jsx o un Context
const [filtros, setFiltros] = useState({ anno: '', delito: '', municipio: '' });

// Pasar a hijos como props — no duplicar estado
<TabMunicipal dataMunicipal={municipal} filtros={filtros} onFiltroChange={setFiltros} />
```

### Memoización — cuándo y cuándo no
```jsx
// SÍ: cálculos costosos sobre arrays grandes
const totalesPorMun = useMemo(() => {
  return data.filter(...).reduce(...);
}, [data, filtros.anno, filtros.delito]);

// SÍ: callbacks pasados a hijos pesados
const handleMunSelect = useCallback((mun) => setMunSel(mun), []);

// NO: componentes simples, derivaciones triviales, strings
// NO: envolver todo en useMemo "por si acaso"
```

## Patrones de componentes

### Componente de gráfica Plotly
```jsx
import Plot from 'react-plotly.js';

export default function GraficaTendencia({ data, anno, delito }) {
  const traces = useMemo(() => buildTraces(data, anno, delito), [data, anno, delito]);

  if (!data.length) return <SkeletonChart />;

  return (
    <Plot
      data={traces}
      layout={LAYOUT_BASE}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler
    />
  );
}
```

### Integración D3 + React (para el mapa)
```jsx
// D3 maneja el DOM del SVG; React maneja el estado externo
const svgRef = useRef(null);

useEffect(() => {
  if (!geoJson || !svgRef.current) return;
  const svg = d3.select(svgRef.current);
  svg.selectAll('*').remove(); // limpiar antes de re-dibujar

  // ... lógica D3 aquí
  // Para eventos → actualizar estado React desde dentro del efecto
  g.selectAll('path').on('click', (e, d) => {
    setSelected(d.properties.NOMGEO); // llamar setter de React
  });
}, [geoJson, totalesPorMun]); // re-dibuja solo cuando cambian los datos
```

### Skeleton / Loading states
```jsx
function SkeletonChart() {
  return (
    <div className="animate-pulse rounded-xl w-full h-full"
         style={{ background: '#1e2235' }} />
  );
}
```

## Estructura de archivos recomendada
```
src/
├── components/
│   ├── MapaChoropleth.jsx     ← D3 map
│   ├── TabMunicipal.jsx       ← tab completo
│   ├── KpiCard.jsx            ← reutilizable
│   └── FilterBar.jsx          ← filtros
├── hooks/
│   ├── useCsvData.js          ← carga CSV
│   └── useMapData.js          ← agregaciones del mapa
├── utils/
│   └── dataHelpers.js         ← funciones puras (agrupar, filtrar, formatear)
└── App.jsx                    ← estado global + tabs
```

## Exportar CSV desde el frontend
```jsx
function exportarCsv(datos, nombre) {
  const csv  = Papa.unparse(datos);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: nombre });
  a.click();
  URL.revokeObjectURL(url);
}
```

## Constraints
- NO usar `localStorage` / `sessionStorage`
- NO hacer fetch dentro de componentes puros de UI
- NO mutar el estado directamente — siempre crear copias
- Plotly: siempre `useResizeHandler` para que el chart sea responsive
- D3: limpiar el SVG con `svg.selectAll('*').remove()` al inicio de cada efecto

## Performance tips para este proyecto
- Los CSVs del SESNSP tienen ~50k filas — filtrar antes de pasar a componentes
- Usar `React.memo()` en los tabs que no están activos
- El mapa D3 es pesado — lazy load con `React.lazy` si el tab no es el default
- `PapaParse` con `worker: true` para archivos > 5MB

## Checklist
- [ ] ¿Los cálculos costosos están en `useMemo`?
- [ ] ¿El mapa D3 limpia el SVG antes de re-dibujar?
- [ ] ¿Los filtros están centralizados en un solo lugar?
- [ ] ¿Los charts Plotly tienen `useResizeHandler`?
- [ ] ¿Los errores de carga tienen un estado de fallback visible?

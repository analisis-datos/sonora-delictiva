---
name: web-artifacts-builder
description: >
  Use this skill when the user asks to add a completely new feature or module
  to the sonora-delictiva dashboard: a new tab, a new analysis section, a new
  type of chart, a comparison tool, an anomaly detection panel, a trend
  projection widget, or any significant addition that requires creating multiple
  new files. Use when the scope goes beyond editing an existing component —
  when you need to plan and build something from scratch end-to-end.
  Do NOT use for small edits or bug fixes (use frontend-design or react-best-practices instead).
---

# Web Artifacts Builder — Sonora Delictiva

## Propósito
Construir features completas y autónomas para el dashboard. Cada feature nueva
sigue el mismo patrón: datos → hook de datos → componente UI → integración en App.

## Stack de referencia
React 19 · Vite 8 · Tailwind 4 · Plotly · D3 v7 · PapaParse

## Proceso de construcción de una feature nueva

### Paso 1: Definir la feature
Antes de escribir código, responder:
1. ¿Qué datos necesita? (¿de qué CSV? ¿qué columnas?)
2. ¿Qué visualizaciones muestra? (línea, barras, mapa, tabla, KPIs)
3. ¿Tiene filtros propios o usa los globales?
4. ¿Dónde vive? (nuevo tab, panel en tab existente, modal)

### Paso 2: Hook de datos
```js
// src/hooks/useNuevaFeature.js
import { useMemo } from 'react';

export function useNuevaFeature(data = [], filtros = {}) {
  return useMemo(() => {
    // 1. Filtrar
    let fil = data;
    if (filtros.anno)   fil = fil.filter(r => String(r['Año']) === filtros.anno);
    if (filtros.delito) fil = fil.filter(r => r['Tipo de delito']?.includes(filtros.delito));

    // 2. Agregar
    const resultado = {};
    fil.forEach(r => { /* lógica */ });

    // 3. Retornar todo lo que necesita la UI
    return { resultado, total: 0, loading: false };
  }, [data, filtros.anno, filtros.delito]);
}
```

### Paso 3: Componente UI
```jsx
// src/components/NuevaFeature.jsx
import { useNuevaFeature } from '../hooks/useNuevaFeature';

export default function NuevaFeature({ data, filtros }) {
  const { resultado, total } = useNuevaFeature(data, filtros);

  return (
    <div className="space-y-5">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-4">
        {/* ... */}
      </div>

      {/* Visualizaciones */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="rounded-2xl p-5" style={{ background: '#1a1d27', border: '1px solid #2e3250' }}>
          {/* Chart 1 */}
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#1a1d27', border: '1px solid #2e3250' }}>
          {/* Chart 2 */}
        </div>
      </div>
    </div>
  );
}
```

### Paso 4: Integración en App.jsx
```jsx
// Agregar import
import NuevaFeature from './components/NuevaFeature';

// Agregar tab en la lista
const TABS = [
  { id: 'tendencias',   label: '📈 Tendencias' },
  { id: 'municipal',    label: '🗺️ Municipal' },
  { id: 'victimas',     label: '👥 Víctimas' },
  { id: 'comparativa',  label: '📊 Comparativa' },
  { id: 'nueva',        label: '🆕 Nueva Feature' },  // ← nuevo
];

// Agregar render en el switch/condicional de tabs
{activeTab === 'nueva' && (
  <NuevaFeature data={municipal} filtros={filtros} />
)}
```

## Features planificadas para este proyecto (referencia)

### Proyección de tendencia
- Datos: `sonora_estatal.csv` — serie temporal por tipo de delito
- Visualización: línea histórica + línea punteada de proyección (regresión lineal)
- Lógica: `slope = (y[n]-y[0])/(n-1)`, proyectar 3-6 meses hacia adelante
- Hook: `useTrendProjection(data, delito, mesesProyeccion)`

### Comparador de municipios
- Datos: `sonora_municipal.csv`
- Visualización: líneas superpuestas de 2-4 municipios seleccionados
- UI: selector tipo "add chip" para agregar municipios al comparador
- Hook: `useComparadorMunicipios(data, municipiosSeleccionados)`

### Alertas de anomalías
- Datos: `sonora_estatal.csv` o `sonora_municipal.csv`
- Lógica: calcular media y desviación estándar por municipio/delito, marcar
  cuando un mes supera `media + 2*desviacion`
- Visualización: badges rojos en el mapa + lista de alertas
- Hook: `useAnomalias(data, threshold = 2)`

### Análisis de estacionalidad
- Datos: `sonora_estatal.csv`
- Visualización: heatmap meses × años + línea promedio histórico por mes
- Responde: ¿en qué meses hay más homicidios? ¿hay un patrón estacional?

## Tamaño de archivos entregables
- Hook: ~50-80 líneas
- Componente: ~150-300 líneas
- Total por feature: 2-4 archivos

## Constraints
- Una feature = un tab o un panel claramente delimitado
- Siempre crear el hook separado del componente
- Los componentes no hacen fetch — reciben `data` como prop
- Respetar la paleta de colores del proyecto (ver frontend-design skill)
- Cada feature debe tener su propio botón de exportar CSV

## Checklist de feature completa
- [ ] ¿Hook creado en `src/hooks/`?
- [ ] ¿Componente creado en `src/components/`?
- [ ] ¿Tab o panel integrado en `App.jsx`?
- [ ] ¿Funciona con datos vacíos / filtros que retornan 0 resultados?
- [ ] ¿Tiene estado de loading visible?
- [ ] ¿Tiene botón de exportar CSV?

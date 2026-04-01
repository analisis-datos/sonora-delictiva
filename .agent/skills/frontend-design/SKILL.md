---
name: frontend-design
description: >
  Use this skill when the user asks to build, edit, or improve any UI in the
  sonora-delictiva dashboard: React components, Plotly charts, the D3 choropleth
  map, Tailwind layouts, KPI cards, filter bars, sidebars, or any visual element.
  Also use when the user asks to "make it look better", "improve the design",
  or "add a new section/tab" to the dashboard.
---

# Frontend Design — Sonora Delictiva

## Contexto del proyecto
Dashboard de incidencia delictiva de Sonora. Stack: React 19 + Vite 8 +
Tailwind 4 + Plotly + D3. Desplegado como SPA estática en GitHub Pages.
Estética: dark mode glassmorphism, paleta azul-rojo-verde sobre fondos
oscuros (#0f1117, #1a1d27). Sin backend — todos los datos vienen de CSVs
en `/public/data/`.

## Principios de diseño para este proyecto

### Estética comprometida
- Dark mode puro: fondo `#0f1117`, cards `#1a1d27`, borders `#2e3250`
- Acento primario `#4f72ff` (azul), peligro `#e74c3c` (rojo), éxito `#27ae60`
- Glassmorphism: `backdrop-filter: blur(8-12px)` + `background: rgba(...)` en modales y tooltips
- NO usar colores genéricos de Tailwind (gray-500 etc) directamente — usar variables CSS

### Tipografía
- Fuente: `'Segoe UI', system-ui, sans-serif` (ya configurada)
- Jerarquía: títulos de sección en `text-sm uppercase tracking-wider text-gray-500`
- Valores KPI: `text-2xl font-bold text-white`
- Labels: `text-xs text-gray-400`

### Componentes del dashboard

**KPI Cards**
```jsx
<div className="rounded-2xl p-4" style={{ background: "#1a1d27", border: "1px solid #2e3250" }}>
  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
  <p className="text-2xl font-bold text-white">{value}</p>
  <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
</div>
```

**Gráficas Plotly** — siempre usar estos defaults:
```js
const LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  font: { family: 'Segoe UI', color: '#8892b0', size: 11 },
  xaxis: { gridcolor: '#2e3250', color: '#8892b0' },
  yaxis: { gridcolor: '#2e3250', color: '#8892b0', rangemode: 'tozero' },
  hoverlabel: { bgcolor: '#1a1d27', bordercolor: '#4f72ff', font: { color: '#e8eaf6' } },
  margin: { t: 20, r: 16, b: 40, l: 50 },
};
```

**Mapa D3** — paleta de calor: `["#0d1b4b","#1a3a7a","#1e5fa8","#2980d4","#e8a020","#e05c10","#c0280a"]`

**Selectores / filtros**
```jsx
<select style={{ background: "#0d1117", border: "1px solid #2e3250", color: "#e8eaf6" }}
        className="rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500">
```

**Botones primarios**
```jsx
<button style={{ background: "#4f72ff" }} className="px-4 py-2 rounded-lg text-white font-semibold text-sm hover:opacity-85 transition-opacity">
```

## Constraints
- NUNCA usar `localStorage` o `sessionStorage` — no están disponibles
- Todo estado en React `useState` / `useReducer`
- Los datos vienen de props o context — NO fetch dentro de componentes de UI puros
- Responsive: el grid debe colapsar a 1 columna en mobile (`grid-cols-1 md:grid-cols-2`)
- Plotly: siempre pasar `{ responsive: true, displayModeBar: false }` como config

## Motion / Animaciones
- Transiciones CSS en hover: `transition-colors`, `transition-opacity` (150-200ms)
- Evitar animaciones pesadas que bloqueen el render de datos
- Los tooltips del mapa D3 usan `opacity` transition suave

## Checklist antes de entregar código
- [ ] ¿Los colores siguen la paleta del proyecto?
- [ ] ¿El componente es responsive?
- [ ] ¿Los datos son props, no fetch internos?
- [ ] ¿Las gráficas Plotly tienen `paper_bgcolor: 'rgba(0,0,0,0)'`?
- [ ] ¿No hay `console.log` de debug?

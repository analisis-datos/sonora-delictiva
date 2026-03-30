# 🗺️ Integración: Mapa Choropleth de Municipios

## Archivos incluidos

| Archivo | Destino en tu repo | Descripción |
|---|---|---|
| `MapaChoropleth.jsx` | `src/components/` | Componente del mapa (D3 + SVG) |
| `TabMunicipal.jsx` | `src/components/` | Pestaña completa: mapa + ranking + filtros |
| `useMapData.js` | `src/hooks/` | Hook de datos para el mapa |
| `05_geojson_sonora.py` | `scripts/` | Genera el GeoJSON de municipios |

---

## Paso 1 — Generar el GeoJSON

```bash
python scripts/05_geojson_sonora.py
```

El script intenta descargarlo automáticamente. Si falla la red, descárgalo manualmente:

- **Opción A (recomendada):** https://github.com/angelnmara/geojson → `mexicoHigh.json`  
  Colócalo en `Data/mexicoHigh.json` y vuelve a correr el script.

- **Opción B:** INEGI Marco Geoestadístico Municipal  
  https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=889463807469

Resultado: `public/data/sonora_municipios.geojson` (~300 KB)

---

## Paso 2 — Copiar los componentes

```
src/
├── components/
│   ├── MapaChoropleth.jsx   ← nuevo
│   └── TabMunicipal.jsx     ← nuevo
└── hooks/
    └── useMapData.js        ← nuevo (crear carpeta si no existe)
```

---

## Paso 3 — Integrar en tu App.jsx

Reemplaza o complementa tu pestaña municipal existente:

```jsx
// En tu App.jsx o donde manejes las pestañas:
import TabMunicipal from "./components/TabMunicipal";

// Asumiendo que ya tienes dataMunicipal cargado con PapaParse:
<TabMunicipal dataMunicipal={dataMunicipal} />
```

Si tu estado se llama diferente, ajusta el prop `dataMunicipal`.

---

## Paso 4 — Verificar que D3 esté importado correctamente

Ya tienes `"d3": "^7.9.0"` en tu `package.json`, así que no necesitas instalar nada extra.

Si al compilar hay un error de tree-shaking con D3, agrega esto a `vite.config.js`:

```js
export default defineConfig({
  optimizeDeps: {
    include: ['d3'],
  },
  // ...resto de tu config
})
```

---

## Funcionamiento del mapa

- **Hover** → tooltip con nombre del municipio y número de carpetas
- **Click** → selecciona el municipio, se resalta en blanco y aparece en el sidebar
- **Zoom/Pan** → rueda del mouse o botones ＋／－／⌂
- **Filtros** → año y tipo de delito sincronizan el mapa y el ranking
- **Export** → botón para descargar el ranking filtrado como CSV

---

## Notas sobre el GeoJSON

El componente busca el nombre del municipio en estas propiedades (en orden):
```
NOMGEO → NOM_MUN → MUNICIPIO → nombre → name
```

El script `05_geojson_sonora.py` normaliza automáticamente cualquiera de estos campos a `NOMGEO` para garantizar compatibilidad.

Si el nombre del municipio en el GeoJSON no coincide exactamente con el CSV del SESNSP, el municipio aparecerá sin color. En ese caso puedes agregar un diccionario de mapeo:

```js
// En MapaChoropleth.jsx, antes de buscar el valor:
const ALIASES = {
  "Álamos": "Alamos",
  "San Luis Río Colorado": "San Luis Río Colorado",
  // ...
};
const nomNormalizado = ALIASES[nom] ?? nom;
const val = totalesPorMun[nomNormalizado];
```

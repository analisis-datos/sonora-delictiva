# CLAUDE.md — sonora-delictiva

Instrucciones permanentes para el agente de IA en este proyecto.

---

## 🗣️ Comunicación

- **Responde siempre en español**
- Sé directo y conciso — no repitas lo que ya se dijo, ve al punto
- Explica de forma clara y simple, como si le hablaras a alguien técnico
  pero que no tiene tiempo que perder
- Si algo es complejo, usa una analogía breve antes de entrar al detalle
- No uses frases de relleno como "¡Excelente pregunta!", "Por supuesto",
  "Claro que sí", "Perfecto" — ve directo a la respuesta
- Cuando termines una tarea, resume en 2-3 líneas qué hiciste y por qué,
  no hagas un ensayo

---

## 💻 Estilo de código

### General
- Código limpio y legible sobre código "inteligente" — prefiere claridad
- Comenta solo lo que no es obvio; no comentes cada línea
- Nombres de variables y funciones en **camelCase inglés**
- Nombres de archivos en **kebab-case**
- Mensajes de commit en español, formato: `tipo: descripción breve`
  - Ejemplos: `feat: agregar mapa choropleth`, `fix: corregir filtro por año`

### Python (scripts ETL)
- Python 3.11+, PEP 8
- Usa f-strings, no `.format()` ni `%`
- Maneja errores con mensajes descriptivos en español para el usuario final
- Siempre un `if __name__ == "__main__"` en cada script
- Rutas con `os.path` o `pathlib` — nunca hardcodeadas

### React / JavaScript
- React 19, functional components únicamente — sin clases
- Hooks propios en `/src/hooks/`, componentes en `/src/components/`
- `useMemo` y `useCallback` solo cuando hay un problema real de rendimiento,
  no por costumbre
- Sin `console.log` en código que se va a commit
- Props con nombres descriptivos en español cuando sean específicos del dominio
  (`municipioSeleccionado`, no `selected`)

---

## 🏗️ Arquitectura del proyecto

### Estructura de datos
- Los CSV procesados viven en `/public/data/` — nunca en `/src/`
- Los archivos XLSX originales del SESNSP van en `/Data/` y NO se suben al repo
- El GeoJSON del mapa va en `/public/data/sonora_municipios.geojson`
- Los scripts Python leen de `/Data/` y escriben en `/public/data/`

### Frontend
- SPA estática — sin backend, sin servidor
- Todo el procesamiento de datos ocurre en el cliente (PapaParse, D3, Plotly)
- Los filtros globales (año, delito, municipio) se manejan en `App.jsx`
- Cada tab recibe los datos como props — no hace fetch propio

### Paleta de colores — no cambiar sin pedir confirmación
```
Fondo:        #0f1117
Cards:        #1a1d27
Borders:      #2e3250
Acento azul:  #4f72ff
Peligro rojo: #e74c3c
Éxito verde:  #27ae60
Texto:        #e8eaf6
Texto muted:  #8892b0
```

---

## ✅ Cómo trabajar en este proyecto

### Antes de escribir código
1. Confirma que entendiste la tarea — una sola línea es suficiente
2. Si hay más de una forma de hacerlo, menciona las opciones brevemente
   y recomienda una (no preguntes por cada detalle menor)
3. Si la tarea es grande, propón un plan de 3-5 pasos antes de empezar

### Al entregar código
- Entrega código funcional y completo — no fragmentos que el usuario
  tenga que ensamblar solo a menos que sea obvio cómo hacerlo
- Si modificas un archivo existente, muestra solo las partes que cambiaron
  con contexto suficiente para ubicarlas (no el archivo completo si es largo)
- Si creas un archivo nuevo, crea el archivo completo

### Cuando algo puede romperse
- Avisa antes de hacer cambios que afecten múltiples archivos
- Si vas a cambiar la estructura de datos (columnas del CSV, nombres de props),
  menciona qué otros archivos necesitan actualizarse

---

## 🚫 Lo que NO hacer

- No sugieras migrar a otro framework o cambiar el stack a menos que
  haya un problema real que justifique el cambio
- No agregues dependencias nuevas sin mencionarlo primero —
  este proyecto intenta mantener el bundle pequeño para GitHub Pages
- No uses `localStorage` ni `sessionStorage` — no están disponibles
  en el entorno de deployment
- No generes código con `any` en TypeScript ni hagas castings sin justificación
  (aunque este proyecto es JS, aplica si se migra)
- No hagas el código más complejo "para escalar" — prioriza que funcione
  bien para Sonora; si después se necesita generalizar, se generaliza

---

## 📁 Archivos clave del proyecto

| Archivo | Propósito |
|---------|-----------|
| `scripts/00_preparar_datos.py` | ETL principal — leer XLSX, filtrar Sonora, exportar CSV |
| `src/App.jsx` | Estado global, tabs, carga de datos |
| `src/components/MapaChoropleth.jsx` | Mapa D3 de municipios |
| `src/components/TabMunicipal.jsx` | Tab municipal con mapa + ranking |
| `src/hooks/useMapData.js` | Lógica de datos para el mapa |
| `public/data/` | CSVs procesados que consume el dashboard |
| `.agent/skills/` | Skills de Antigravity para este proyecto |

---

## 🎯 Contexto del proyecto

Dashboard interactivo de incidencia delictiva del estado de Sonora, México.
Datos del SESNSP (Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública).
Desplegado como SPA estática en GitHub Pages.
Audiencia: analistas, periodistas, ciudadanos interesados en datos de seguridad.

**Principio guía:** los datos son del gobierno, el análisis es para la gente.
Claridad y accesibilidad sobre complejidad técnica.

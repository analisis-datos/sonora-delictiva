---
name: gh-pages-deploy
description: >
  Use this skill when the user asks to set up, fix, or improve the GitHub Actions
  CI/CD pipeline for sonora-delictiva. This includes: deploying to GitHub Pages
  with `npm run deploy`, automating the monthly data update workflow (running
  00_preparar_datos.py when new XLSX files are pushed), configuring the vite.config.js
  base path, debugging 404s on GitHub Pages, or setting up branch protection rules.
  Use when the user mentions "deploy", "GitHub Actions", "workflow", "gh-pages",
  or "automatic update".
---

# GitHub Pages Deploy — Sonora Delictiva

## Configuración del proyecto

### package.json — scripts necesarios
```json
{
  "homepage": "https://analisis-datos.github.io/sonora-delictiva",
  "scripts": {
    "dev":      "vite",
    "build":    "vite build",
    "predeploy": "npm run build",
    "deploy":   "gh-pages -d dist",
    "preview":  "vite preview"
  },
  "devDependencies": {
    "gh-pages": "^6.3.0"
  }
}
```

### vite.config.js — base path crítico para GitHub Pages
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/sonora-delictiva/',   // ← CRÍTICO: debe coincidir con el repo name
  optimizeDeps: {
    include: ['d3', 'plotly.js'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          plotly: ['plotly.js'],
          d3:     ['d3'],
          react:  ['react', 'react-dom'],
        },
      },
    },
  },
});
```

## GitHub Actions Workflows

### Workflow 1: Deploy automático al hacer push a main
Archivo: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:  # permite correrlo manualmente desde la UI de GitHub

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          cname: ''   # dejar vacío si no tienes dominio custom
```

### Workflow 2: Actualización mensual automática de datos
Archivo: `.github/workflows/update-data.yml`

```yaml
name: Actualizar datos SESNSP

on:
  # Corre el día 25 de cada mes (el SESNSP publica ~20 días después del mes)
  schedule:
    - cron: '0 9 25 * *'
  # También se puede correr manualmente subiendo el XLSX al repo
  push:
    paths:
      - 'Data/RNID-*.xlsx'
      - 'Data/IDEFC_*.xlsx'
      - 'Data/IDMFC_*.xlsx'
  workflow_dispatch:
    inputs:
      force_rebuild:
        description: 'Forzar regeneración de todos los CSVs'
        required: false
        default: 'false'

permissions:
  contents: write

jobs:
  update-data:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install Python dependencies
        run: pip install -r requirements.txt

      - name: Preparar datos
        run: python scripts/00_preparar_datos.py

      - name: Verificar archivos generados
        run: |
          echo "Archivos en public/data:"
          ls -lh public/data/*.csv
          echo "Líneas por archivo:"
          wc -l public/data/*.csv

      - name: Commit y push de datos actualizados
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "data: actualizar CSVs SESNSP $(date +'%Y-%m')"
          file_pattern: "public/data/*.csv"
          commit_user_name: "github-actions[bot]"
          commit_user_email: "github-actions[bot]@users.noreply.github.com"

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install and Build
        run: |
          npm ci
          npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Solución de problemas comunes en GitHub Pages

### Problema: 404 en rutas al recargar la página
```html
<!-- public/404.html — redirigir al index.html manteniendo la ruta -->
<!DOCTYPE html>
<script>
  const path = window.location.pathname;
  const repo = '/sonora-delictiva';
  window.location.replace(repo + '/?p=' + path.slice(repo.length));
</script>
```

```jsx
// En App.jsx: recuperar la ruta redirigida
useEffect(() => {
  const p = new URLSearchParams(window.location.search).get('p');
  if (p) window.history.replaceState(null, '', p);
}, []);
```

### Problema: Los CSVs de /public/data/ no cargan
- Verificar que `base: '/sonora-delictiva/'` esté en `vite.config.js`
- Los archivos en `/public/` se copian tal cual a `/dist/`
- Usar rutas relativas en el fetch: `fetch('./data/sonora_estatal.csv')` 
  o con la variable de entorno: `fetch(import.meta.env.BASE_URL + 'data/sonora_estatal.csv')`

### Problema: El bundle es demasiado grande
- Plotly.js pesa ~3MB — usar `manualChunks` en vite.config.js (ya está configurado arriba)
- D3 pesa ~500KB — también en manualChunks
- Verificar con: `npm run build -- --report`

## Constraints
- La branch de deploy debe ser `gh-pages` (la crea automáticamente peaceiris/actions-gh-pages)
- NUNCA hacer commit directo a `gh-pages` — siempre desde el workflow
- Los archivos XLSX de datos NO deben estar en el repo (son pesados) — solo los CSVs procesados
- `GITHUB_TOKEN` ya está disponible automáticamente — no necesitas secrets adicionales

## Checklist de deploy
- [ ] ¿`base` en vite.config.js coincide con el nombre del repo?
- [ ] ¿`homepage` en package.json tiene la URL correcta?
- [ ] ¿Los CSVs están en `public/data/` y no en `src/`?
- [ ] ¿El workflow tiene `permissions: contents: write`?
- [ ] ¿Funciona localmente con `npm run preview`?

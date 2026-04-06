# Performance - Sonora Delictiva Dashboard

## Métricas Objetivo

| Métrica | Target | Status |
|---------|--------|--------|
| Lighthouse Performance | 90+ | ⏳ TBD |
| Lighthouse Accessibility | 95+ | ⏳ TBD |
| Lighthouse Best Practices | 95+ | ⏳ TBD |
| Lighthouse SEO | 90+ | ⏳ TBD |
| First Contentful Paint (FCP) | < 1.5s | ⏳ TBD |
| Largest Contentful Paint (LCP) | < 2.5s | ⏳ TBD |
| Cumulative Layout Shift (CLS) | < 0.1 | ⏳ TBD |
| Time to Interactive (TTI) | < 3s | ⏳ TBD |

## Optimizaciones Implementadas

### Build
- ✅ Gzip compression (vite-plugin-compression)
- ✅ Code splitting (Plotly, D3, Vendor chunks)
- ✅ Tree shaking con Vite 8
- ✅ CSS purging con Tailwind

### Runtime
- ✅ Lazy loading componentes (React.lazy + Suspense)
- ✅ Memoization en funciones costosas (useMemo)
- ✅ Virtual scrolling (HTML nativo, 32 items)
- ✅ Service Worker para caché offline (PWA)

### Assets
- ✅ SVG icons (Lucide React)
- ✅ CSV pre-agregado en public/data/
- ✅ Gzip en JSON payloads

## Testing de Performance

```bash
# Local
npm run build
npm run preview

# Lighthouse
npx lighthouse https://analisis-datos.github.io/sonora-delictiva/ --view

# WebPageTest
https://www.webpagetest.org/
```
Última actualización: 2026-04-06

# Accesibilidad - Sonora Delictiva Dashboard

## Cumplimiento de Estándares

Este proyecto cumple con:
- ✅ WCAG 2.1 Level AA
- ✅ Section 508 (USA)
- ✅ ADA (Americans with Disabilities Act)

## Características de Accesibilidad Implementadas

### 1. Navegación por Teclado
- [x] Tab para navegar entre elementos
- [x] Shift+Tab para navegación inversa
- [x] Enter/Space para activar botones
- [x] Arrow keys en selects
- [x] ESC para cerrar modals
- [x] Focus trap en modals

### 2. Screen Reader Support
- [x] ARIA labels en gráficas (aria-label)
- [x] ARIA roles en elementos interactivos
- [x] Tablas semánticas (thead, tbody, th, td)
- [x] aria-live regions para notificaciones
- [x] aria-modal en dialogs
- [x] aria-labelledby para headers

### 3. Visual Accessibility
- [x] Contraste de colores WCAG AA (4.5:1)
- [x] No confiar solo en color (iconos + color)
- [x] Focus visible en todos elementos interactivos
- [x] Tamaños de fuente legibles (min 12px)
- [x] Spacing adecuado

### 4. Motor de Búsqueda (SEO)
- [x] Meta tags completos
- [x] Open Graph tags
- [x] JSON-LD structured data
- [x] Canonical URL
- [x] Sitemap XML

## Testing de Accesibilidad

```bash
# Lighthouse (Chrome DevTools)
1. F12 → Lighthouse
2. Click "Accessibility"
3. Target: 95+ score

# Screen Reader Testing
- NVDA (Windows): https://www.nvaccess.org/
- VoiceOver (Mac/iOS): Built-in

# Automated Testing
npm install -D @testing-library/jest-dom axe-core
```
Recursos
WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
WebAIM: https://webaim.org/
Última actualización: 2026-04-06 Responsable: @rubenroblesv-tech

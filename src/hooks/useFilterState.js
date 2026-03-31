// src/hooks/useFilterState.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook que sincroniza un valor de estado con un parámetro de la URL (?key=value).
// Permite compartir/bookmarkear vistas del dashboard con los filtros activos.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';

/**
 * @param {string} key          – Nombre del query param en la URL
 * @param {string} defaultValue – Valor inicial si el param no existe
 * @returns {[string, Function]} – [valor, setter] igual que useState
 */
export function useFilterState(key, defaultValue = '') {
  const getFromUrl = () => {
    if (typeof window === 'undefined') return defaultValue;
    return new URLSearchParams(window.location.search).get(key) ?? defaultValue;
  };

  const [value, setValue] = useState(getFromUrl);

  // Sincronizar hacia la URL cuando el valor camria
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== defaultValue) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    const newUrl = window.location.pathname + (query ? `?${query}` : '');
    window.history.replaceState({}, '', newUrl);
  }, [key, value, defaultValue]);

  // Escuchar cambios del botón Atrás/Adelante del browser
  useEffect(() => {
    const onPop = () => setValue(getFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [key]);

  const setValueWrapped = useCallback((v) => setValue(v ?? defaultValue), [defaultValue]);

  return [value, setValueWrapped];
}

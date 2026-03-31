// src/components/MapaChoropleth.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Mapa choropleth interactivo de los municipios de Sonora.
// Colorea cada municipio según su incidencia delictiva total.
//
// Props:
//   data        – Array de objetos del CSV procesado (sonora_municipal.csv)
//   año         – Año a visualizar (string, e.g. "2024"). null = todos.
//   delito      – Tipo de delito a filtrar. null = todos.
//   onMunSelect – Callback(municipio: string) cuando el usuario hace click.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";

// ── Paleta y escala ──────────────────────────────────────────────────────────
const COLOR_VACIO  = "#1e2235";   // municipio sin dato
const COLOR_BORDE  = "#3a4060";   // borde entre municipios
const COLOR_HOVER  = "#ffffff22"; // overlay al hacer hover
const PALETA = [
  "#0d1b4b", "#1a3a7a", "#1e5fa8",
  "#2980d4", "#e8a020", "#e05c10", "#c0280a",
];

// ── Utilidades ───────────────────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}k`
    : String(n);

// ── Componente principal ─────────────────────────────────────────────────────
export default function MapaChoropleth({
  data = [],
  año = null,
  delito = null,
  onMunSelect,
  selectedMun = null,
  tipoUnidad = "carpetas",
  valoresExternos = null,   // { Municipio: valor } — si se pasa, se usa en lugar del cómputo interno
}) {
  const svgRef   = useRef(null);
  const wrapRef  = useRef(null);
  const zoomRef  = useRef(null);  // referencia al zoom D3 activo
  const [tooltip, setTooltip] = useState(null);   // { x, y, municipio, valor }
  const [geoJson, setGeoJson]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // ── Cargar GeoJSON ─────────────────────────────────────────────────────────
  useEffect(() => {
    // El GeoJSON debe estar en /public/data/sonora_municipios.geojson
    // Generado por scripts/05_geojson_sonora.py
    fetch("/data/sonora_municipios.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((geo) => {
        setGeoJson(geo);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  // ── Agregar datos por municipio (o usar valores externos) ────────────────
  const totalesPorMun = useMemo(() => {
    if (valoresExternos) return valoresExternos;  // modo tasa: usar hook externo
    let fil = [...data];
    if (año)   fil = fil.filter((r) => String(r["Año"]) === String(año));
    if (delito) fil = fil.filter((r) => r["Subtipo de delito"] === delito);
    const mapa = {};
    fil.forEach((r) => {
      const mun = r["Municipio"];
      if (mun) mapa[mun] = (mapa[mun] || 0) + (Number(r["Valor"]) || 0);
    });
    return mapa;
  }, [data, año, delito, valoresExternos]);

  // ── Escala de color ───────────────────────────────────────────────────────
  const escalaColor = useMemo(() => {
    const vals = Object.values(totalesPorMun);
    if (!vals.length) return () => COLOR_VACIO;
    const [min, max] = d3.extent(vals);
    return d3.scaleQuantize()
      .domain([min, max])
      .range(PALETA);
  }, [totalesPorMun]);

  const dominioMax = useMemo(() => {
    const vals = Object.values(totalesPorMun);
    return vals.length ? d3.max(vals) : 0;
  }, [totalesPorMun]);

  // ── Dibujar mapa con D3 ───────────────────────────────────────────────────
  useEffect(() => {
    if (!geoJson || !svgRef.current || !wrapRef.current) return;

    const container = wrapRef.current;
    const W = container.clientWidth  || 700;
    const H = container.clientHeight || 520;

    const svg = d3.select(svgRef.current);
    svg.attr("width", W).attr("height", H);
    svg.selectAll("*").remove();   // limpiar render anterior

    // Proyección centrada en Sonora
    const projection = d3.geoMercator().fitSize([W, H], geoJson);
    const pathGen    = d3.geoPath().projection(projection);

    const g = svg.append("g");

    // ── Municipios ──
    g.selectAll("path")
      .data(geoJson.features)
      .join("path")
      .attr("d", pathGen)
      .attr("fill", (d) => {
        const nom = d.properties?.NOMGEO || d.properties?.NOM_MUN || d.properties?.nombre;
        const val = totalesPorMun[nom];
        return val != null ? escalaColor(val) : COLOR_VACIO;
      })
      .attr("stroke", COLOR_BORDE)
      .attr("stroke-width", 0.8)
      .attr("cursor", "pointer")
      .attr("class", "mun-path")
      // hover
      .on("mousemove", (event, d) => {
        const nom = d.properties?.NOMGEO || d.properties?.NOM_MUN || d.properties?.nombre || "—";
        const val = totalesPorMun[nom] ?? 0;
        const [mx, my] = d3.pointer(event, container);
        setTooltip({ x: mx, y: my, municipio: nom, valor: val });
      })
      .on("mouseleave", () => setTooltip(null))
      .on("click", (event, d) => {
        const nom = d.properties?.NOMGEO || d.properties?.NOM_MUN || d.properties?.nombre;
        // Si ya está seleccionado, lo deseleccionamos; si no, lo seleccionamos.
        if (selectedMun === nom) {
          onMunSelect?.('');
        } else {
          onMunSelect?.(nom);
        }
      });

    // ── Highlight del seleccionado ──
    if (selectedMun) {
      g.selectAll("path")
        .filter((d) => {
          const nom = d.properties?.NOMGEO || d.properties?.NOM_MUN || d.properties?.nombre;
          return nom === selectedMun;
        })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2.5);
    }

    // ── Zoom + pan con D3 ──
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);
    zoomRef.current = zoom;  // guardar referencia para los botones

  }, [geoJson, totalesPorMun, escalaColor, selectedMun, onMunSelect]);

  // ── Helpers de zoom ───────────────────────────────────────────────
  const zoomIn  = () => { if (!zoomRef.current) return; d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.5); };
  const zoomOut = () => { if (!zoomRef.current) return; d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.67); };
  const zoomReset = () => { if (!zoomRef.current) return; d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity); };

  // ── Leyenda de color ──────────────────────────────────────────────────────
  const LeyendaColor = () => {
    if (!dominioMax) return null;
    const pasos = PALETA.length;
    const paso  = dominioMax / pasos;
    return (
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur rounded-xl p-3 text-xs">
        <p className="text-gray-400 mb-2 font-semibold uppercase tracking-wider">
          {tipoUnidad}
        </p>
        <div className="flex items-center gap-1">
          {PALETA.map((color, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="w-6 h-4 rounded-sm"
                style={{ background: color }}
              />
              {(i === 0 || i === PALETA.length - 1) && (
                <span className="text-gray-400" style={{ fontSize: "0.65rem" }}>
                  {i === 0 ? "0" : fmt(dominioMax)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const Tooltip = () => {
    if (!tooltip) return null;
    const { x, y, municipio, valor } = tooltip;
    return (
      <div
        className="pointer-events-none absolute z-50 rounded-xl px-3 py-2 text-sm shadow-xl"
        style={{
          left: x + 14,
          top:  y - 10,
          background: "rgba(15,17,30,0.92)",
          border: "1px solid rgba(79,114,255,0.4)",
          backdropFilter: "blur(8px)",
          maxWidth: 200,
        }}
      >
        <p className="font-bold text-white mb-0.5">{municipio}</p>
        <p className="text-blue-300">
          {valor.toLocaleString("es-MX")}{" "}
          <span className="text-gray-400">{tipoUnidad.toLowerCase()}</span>
        </p>
        {selectedMun === municipio && (
          <p className="text-yellow-400 text-xs mt-1">✓ Seleccionado</p>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapRef}
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        height: 520,
        background: "linear-gradient(135deg, #0d1117 0%, #131929 100%)",
        border: "1px solid #2e3250",
      }}
    >
      {/* Header del mapa */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <span className="text-white font-semibold text-sm">
          🗺️ Incidencia por Municipio
        </span>
        {(año || delito) && (
          <span
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ background: "#1e2a50", color: "#8892b0" }}
          >
            {[año, delito].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>

      {/* Controles de zoom */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        {[
          { label: "＋", action: zoomIn,    title: "Zoom +" },
          { label: "－", action: zoomOut,   title: "Zoom -" },
          { label: "⌂",  action: zoomReset, title: "Resetear" },
        ].map((btn) => (
          <button
            key={btn.title}
            onClick={btn.action}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
            style={{
              background: "#1a1d27",
              border: "1px solid #2e3250",
              color: "#8892b0",
            }}
            title={btn.title}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Estado: cargando */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "#2e3250", borderTopColor: "#4f72ff" }}
          />
          <p className="text-gray-500 text-sm">Cargando GeoJSON...</p>
        </div>
      )}

      {/* Estado: error (GeoJSON no encontrado) */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="text-4xl">🗺️</span>
          <p className="text-white font-semibold">GeoJSON no encontrado</p>
          <p className="text-gray-400 text-sm leading-relaxed">
            Ejecuta el script para generarlo:
          </p>
          <code
            className="text-xs px-4 py-2 rounded-lg"
            style={{ background: "#0d1117", color: "#4f72ff", border: "1px solid #2e3250" }}
          >
            python scripts/05_geojson_sonora.py
          </code>
          <p className="text-gray-500 text-xs">
            Luego copia el archivo a <code className="text-gray-300">public/data/sonora_municipios.geojson</code>
          </p>
        </div>
      )}

      {/* SVG del mapa */}
      {!loading && !error && (
        <svg ref={svgRef} className="w-full h-full" style={{ cursor: "grab" }} />
      )}

      {/* Leyenda */}
      {!loading && !error && <LeyendaColor />}

      {/* Municipio seleccionado */}
      {selectedMun && !loading && !error && (
        <div
          className="absolute bottom-4 right-4 rounded-xl px-3 py-2 text-sm"
          style={{
            background: "rgba(15,17,30,0.85)",
            border: "1px solid #4f72ff55",
            backdropFilter: "blur(8px)",
          }}
        >
          <p className="text-gray-400 text-xs mb-0.5">Municipio seleccionado</p>
          <p className="text-white font-bold">{selectedMun}</p>
          <p className="text-blue-300 text-xs">
            {(totalesPorMun[selectedMun] || 0).toLocaleString("es-MX")} {tipoUnidad.toLowerCase()}
          </p>
          <button
            onClick={() => onMunSelect?.('')}
            className="text-gray-500 text-xs mt-1 hover:text-gray-300"
          >
            ✕ Deseleccionar
          </button>
        </div>
      )}

      {/* Tooltip */}
      <Tooltip />
    </div>
  );
}

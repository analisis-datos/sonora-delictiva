import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import DashboardLayout from './DashboardLayout';

const App = () => {
  const [data, setData] = useState({
    estatal: null,
    municipal: null,
    victimas: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchCSV = (url) => {
          return new Promise((resolve, reject) => {
            Papa.parse(url, {
              download: true,
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results) => resolve(results.data),
              error: (err) => reject(err)
            });
          });
        };

        const fetchJSON = (url) => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);

        const metaData = await fetchJSON(`data/meta.json?nocache=${Math.random()}`);
        const version = metaData?.generado_en ? new Date(metaData.generado_en).getTime() : Date.now();

        const [estatalData, municipalData, victimasData] = await Promise.all([
          fetchCSV(`data/sonora_estatal.csv?v=${version}`),
          fetchCSV(`data/sonora_municipal.csv?v=${version}`),
          fetchCSV(`data/sonora_victimas.csv?v=${version}`),
        ]);

        setData({
          meta: metaData ?? {},
          estatal: estatalData,
          municipal: municipalData,
          victimas: victimasData
        });
        setLoading(false);
      } catch (err) {
        console.error("Error loading CSV files:", err);
        setError(err.message || 'Error cargando los datos.');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-dash-bg)] text-[var(--color-dash-text)] font-sans">
        <div className="w-16 h-16 border-4 border-[var(--color-dash-border)] border-t-[var(--color-dash-accent)] rounded-full animate-spin mb-4"></div>
        <p className="text-lg animate-pulse tracking-wide uppercase text-[var(--color-dash-muted)]">Cargando base de datos SESNSP...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-dash-bg)] text-red-500 font-sans">
        <h1 className="text-3xl font-bold mb-2">Error al cargar datos</h1>
        <p>{error}</p>
        <p className="text-sm mt-4 text-[var(--color-dash-muted)]">Asegúrate de que los archivos CSV estén en public/data/</p>
      </div>
    );
  }

  return <DashboardLayout data={data} />;
};

export default App;

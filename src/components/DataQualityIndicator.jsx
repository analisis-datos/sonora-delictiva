import React, { useMemo } from 'react';
import { Info, CheckCircle, AlertCircle } from 'lucide-react';

export default function DataQualityIndicator({ meta, estatal, municipal }) {
  const stats = useMemo(() => {
    if (!meta || !municipal) return null;
    
    // Calcula la cobertura de municipios (Sonora tiene 72 en realidad, pero pongo 72)
    // El user puso 32 en su template, Sonora tiene 72 municipios oficiales
    const municipios_unicos = new Set(municipal.map(r => r.Municipio)).size;
    const totalSonoraMunicipios = 72; // Corrección para Sonora
    const cobertura = ((municipios_unicos / totalSonoraMunicipios) * 100).toFixed(1);
    
    const daysOld = Math.floor(
      (Date.now() - new Date(meta.generado_en)) / (1000 * 60 * 60 * 24)
    );
    
    const dataFreshness = daysOld < 15 ? 'recent' : daysOld < 45 ? 'moderate' : 'old';
    
    return { municipios_unicos, cobertura, daysOld, dataFreshness };
  }, [meta, municipal]);

  if (!stats) return null;

  const freshnessConfig = {
    recent: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-700/40', text: 'Datos Recientes' },
    moderate: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-700/40', text: 'Datos Moderados' },
    old: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-700/40', text: 'Datos Desactualizados' }
  };

  const config = freshnessConfig[stats.dataFreshness];
  const FreshnessIcon = config.icon;

  return (
    <div className={`rounded-lg p-5 text-sm border ${config.bg} ${config.border} mb-6 custom-scrollbar`}>
      <div className="flex items-start gap-3">
        <FreshnessIcon size={20} className={`${config.color} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
            📊 Calidad de Datos
          </h3>
          
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-center gap-2">
              <span className="text-blue-400">✓</span>
              <span>
                <strong className="text-gray-300">Cobertura geográfica:</strong> {stats.municipios_unicos}/72 municipios ({stats.cobertura}%)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">✓</span>
              <span>
                <strong className="text-gray-300">Período:</strong> {meta.periodo_inicio?.slice(0, 7)} a {meta.periodo_fin?.slice(0, 7)}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">✓</span>
              <span>
                <strong className="text-gray-300">Última actualización:</strong> Hace {stats.daysOld} días
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">✓</span>
              <span>
                <strong className="text-gray-300">Fuente:</strong> Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública (SESNSP)
              </span>
            </li>
          </ul>
          
          <p className="text-[11px] text-gray-500 mt-4 flex items-start gap-1">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <span>Nota: Algunos delitos excluidos por normativa de datos abiertos (denuncias anónimas, información confidencial, etc)</span>
          </p>
        </div>
      </div>
    </div>
  );
}

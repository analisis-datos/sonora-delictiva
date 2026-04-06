"""
00_preparar_datos.py
====================
Lee los archivos originales del SESNSP, filtra Sonora y convierte
el formato ancho (meses como columnas) a formato largo (series de tiempo).

Archivos de entrada esperados (en la carpeta /data):
  Formato nuevo (desde 2025):
    - RNID-Delitos_Estatal-*.xlsx    → Dataset estatal
    - RNID-Delitos_Municipal-*.xlsx  → Dataset municipal
    - RNID-Víctimas_Estatal-*.xlsx   → Dataset de víctimas

  Formato anterior:
    - IDEFC_NM_*.csv / .xlsx
    - IDMFC_NM_*.csv / .xlsx
    - IDVFC_NM_*.csv / .xlsx

  El script detecta automáticamente el formato presente.

Archivos de salida (en la carpeta /output):
  - sonora_estatal.csv
  - sonora_municipal.csv
  - sonora_victimas.csv

Fuente de datos:
  https://www.gob.mx/sesnsp/acciones-y-programas/datos-abiertos-de-incidencia-delictiva
"""

import os
import glob
import json
import datetime
import pandas as pd

# ─── Configuración ────────────────────────────────────────────────────────────
DATA_DIR   = os.path.join(os.path.dirname(__file__), "..", "data")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")
ENTIDAD    = "Sonora"

MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

# ─── Patrones de búsqueda (nuevo formato RNID primero, luego el antiguo) ──────
PATRONES = {
    "estatal": [
        "RNID-Delitos_Estatal-*.xlsx",
        "RNID-Delitos_Estatal-*.csv",
        "IDEFC_NM_*.xlsx",
        "IDEFC_NM_*.csv"
    ],
    "municipal": [
        "RNID-Delitos_Municipal-*.xlsx",
        "RNID-Delitos_Municipal-*.csv",
        "IDMFC_NM_*.xlsx",
        "IDMFC_NM_*.csv",
    ],
    "victimas": [
        "RNID-V*ctimas_Municipal-*.xlsx",
        "RNID-V*ctimas_Municipal-*.csv",
        "RNID-V*ctimas_Estatal-*.xlsx",
        "RNID-V*ctimas_Estatal-*.csv",
        "IDVFC_NM_*.xlsx",
        "IDVFC_NM_*.csv",
        "Estatal-V*ctimas-*.csv"
    ],
}
# ──────────────────────────────────────────────────────────────────────────────


def leer_archivos_sesnsp(tipo: str) -> list[pd.DataFrame]:
    """
    Busca los archivos del SESNSP para el tipo indicado ('estatal', 'municipal', 'victimas').
    Carga todos los archivos encontrados y los retorna como lista para su procesamiento.
    """
    dfs = []
    archivos_procesados = set()
    for patron in PATRONES[tipo]:
        archivos = glob.glob(os.path.join(DATA_DIR, patron))
        for archivo in archivos:
            if archivo in archivos_procesados: continue
            archivos_procesados.add(archivo)
            ext = os.path.splitext(archivo)[1].lower()
            print(f"  Leyendo ({ext}): {os.path.basename(archivo)}")

            if ext in (".xlsx", ".xls"):
                df = pd.read_excel(archivo, engine="openpyxl")
            else:
                try:
                    df = pd.read_csv(archivo, encoding="utf-8", low_memory=False)
                except UnicodeDecodeError:
                    df = pd.read_csv(archivo, encoding="latin-1", low_memory=False)

            df.columns = df.columns.str.strip()
            dfs.append(df)

    if not dfs:
        raise FileNotFoundError(
            f"No se encontró ningún archivo '{tipo}' en {DATA_DIR}.\n"
            f"Patrones buscados: {PATRONES[tipo]}\n"
        )
    return dfs


# Alias para mantener compatibilidad con el resto del código
def leer_csv_sesnsp(patron: str) -> pd.DataFrame:
    """Wrapper legacy — usa leer_archivo_sesnsp() directamente cuando sea posible."""
    archivos = glob.glob(os.path.join(DATA_DIR, patron))
    if not archivos:
        raise FileNotFoundError(f"No se encontró: {patron}")
    archivo = sorted(archivos)[-1]
    ext = os.path.splitext(archivo)[1].lower()
    print(f"  Leyendo: {os.path.basename(archivo)}")
    if ext in (".xlsx", ".xls"):
        df = pd.read_excel(archivo, engine="openpyxl")
    else:
        try:
            df = pd.read_csv(archivo, encoding="utf-8", low_memory=False)
        except UnicodeDecodeError:
            df = pd.read_csv(archivo, encoding="latin-1", low_memory=False)
    df.columns = df.columns.str.strip()
    return df


def wide_a_long(df: pd.DataFrame, cols_id: list[str]) -> pd.DataFrame:
    """
    Convierte el formato ancho del SESNSP al formato largo (serie de tiempo).
    Cada fila resultante corresponde a un mes/año específico.
    """
    meses_presentes = [m for m in MESES if m in df.columns]
    df_long = df.melt(
        id_vars=cols_id,
        value_vars=meses_presentes,
        var_name="Mes",
        value_name="Valor"
    )
    # Crear columna de fecha (primer día del mes)
    orden_meses = {m: i + 1 for i, m in enumerate(MESES)}
    df_long["Num_Mes"] = df_long["Mes"].map(orden_meses)
    df_long["Fecha"] = pd.to_datetime(
        df_long["Año"].astype(str) + "-" +
        df_long["Num_Mes"].astype(str).str.zfill(2) + "-01"
    )
    df_long = df_long.drop(columns=["Num_Mes"])
    df_long["Valor"] = pd.to_numeric(df_long["Valor"], errors="coerce").fillna(0).astype(int)
    df_long = df_long.sort_values(["Fecha"] + cols_id).reset_index(drop=True)
    return df_long


def detectar_columna_entidad(df: pd.DataFrame) -> str:
    """Detecta el nombre exacto de la columna de entidad (varía entre versiones del SESNSP)."""
    candidatos = ["Entidad", "entidad", "ENTIDAD", "Cve. Entidad", "NOM_ENT"]
    for c in candidatos:
        if c in df.columns:
            return c
    # Último recurso: buscar columna que contenga valores como "Sonora"
    for col in df.columns:
        if df[col].astype(str).str.contains("Sonora", case=False).any():
            return col
    raise KeyError(
        f"No se encontró la columna de entidad. Columnas disponibles: {df.columns.tolist()}"
    )


def procesar_estatal() -> None:
    print("\n[1/3] Procesando dataset ESTATAL...")
    dfs_crudos = leer_archivos_sesnsp("estatal")
    dfs_long = []
    
    for df in dfs_crudos:
        col_entidad = detectar_columna_entidad(df)
        df_sub = df[df[col_entidad].astype(str).str.strip() == ENTIDAD].copy()
        if df_sub.empty:
            continue
            
        cols_id = ["Año", "Clave_Ent", "Entidad",
                   "Bien jurídico afectado", "Tipo de delito",
                   "Subtipo de delito", "Modalidad"]
        cols_id = [c for c in cols_id if c in df_sub.columns]
        dfs_long.append(wide_a_long(df_sub, cols_id))
        
    if not dfs_long:
        print("  ⚠ No se encontraron registros para Sonora en los datasets estatales.")
        return

    df_long = pd.concat(dfs_long, ignore_index=True)
    salida = os.path.join(OUTPUT_DIR, "sonora_estatal.csv")
    df_long.to_csv(salida, index=False, encoding="utf-8")
    print(f"  ✓ Guardado: {salida}  ({len(df_long):,} registros combinados)")


def procesar_municipal() -> None:
    print("\n[2/3] Procesando dataset MUNICIPAL...")
    dfs_crudos = leer_archivos_sesnsp("municipal")
    dfs_long = []
    
    for df in dfs_crudos:
        col_entidad = detectar_columna_entidad(df)
        df_sub = df[df[col_entidad].astype(str).str.strip() == ENTIDAD].copy()
        if df_sub.empty:
            continue

        cols_id = ["Año", "Clave_Ent", "Entidad",
                   "Cve. Municipio", "Municipio",
                   "Bien jurídico afectado", "Tipo de delito",
                   "Subtipo de delito", "Modalidad"]
        cols_id = [c for c in cols_id if c in df_sub.columns]
        dfs_long.append(wide_a_long(df_sub, cols_id))

    if not dfs_long: return

    df_long = pd.concat(dfs_long, ignore_index=True)
    salida = os.path.join(OUTPUT_DIR, "sonora_municipal.csv")
    df_long.to_csv(salida, index=False, encoding="utf-8")
    print(f"  ✓ Guardado: {salida}  ({len(df_long):,} registros combinados)")


def procesar_victimas() -> None:
    print("\n[3/3] Procesando dataset VÍCTIMAS...")
    dfs_crudos = leer_archivos_sesnsp("victimas")
    dfs_long = []
    
    for df in dfs_crudos:
        col_entidad = detectar_columna_entidad(df)
        df_sub = df[df[col_entidad].astype(str).str.strip() == ENTIDAD].copy()
        if df_sub.empty:
            continue

        cols_id = ["Año", "Clave_Ent", "Entidad", "Cve. Municipio", "Municipio",
                   "Bien jurídico afectado", "Tipo de delito",
                   "Subtipo de delito", "Modalidad",
                   "Sexo", "Rango de edad"]
        cols_id = [c for c in cols_id if c in df_sub.columns]
        dfs_long.append(wide_a_long(df_sub, cols_id))

    if not dfs_long: return

    df_long = pd.concat(dfs_long, ignore_index=True)
    salida = os.path.join(OUTPUT_DIR, "sonora_victimas.csv")
    df_long.to_csv(salida, index=False, encoding="utf-8")
    print(f"  ✓ Guardado: {salida}  ({len(df_long):,} registros combinados)")


def generar_meta() -> None:
    """Genera public/data/meta.json con metadatos del periodo cubierto."""
    print("\n[4/4] Generando meta.json...")
    meta = {
        "generado_en": datetime.datetime.now().isoformat(),
        "periodo_inicio": None,
        "periodo_fin": None,
        "municipios": 0,
        "total_carpetas": 0,
        "total_victimas": 0,
    }

    est_path = os.path.join(OUTPUT_DIR, "sonora_estatal.csv")
    mun_path = os.path.join(OUTPUT_DIR, "sonora_municipal.csv")
    vic_path = os.path.join(OUTPUT_DIR, "sonora_victimas.csv")

    if os.path.exists(est_path):
        df_est = pd.read_csv(est_path, parse_dates=["Fecha"])
        df_nz  = df_est[df_est["Valor"] > 0]
        if not df_nz.empty:
            meta["periodo_inicio"] = df_nz["Fecha"].min().strftime("%Y-%m-%d")
            meta["periodo_fin"]    = df_nz["Fecha"].max().strftime("%Y-%m-%d")
        meta["total_carpetas"] = int(df_est["Valor"].sum())

    if os.path.exists(mun_path):
        df_mun = pd.read_csv(mun_path)
        meta["municipios"] = int(df_mun["Municipio"].nunique())

    if os.path.exists(vic_path):
        df_vic = pd.read_csv(vic_path)
        meta["total_victimas"] = int(df_vic["Valor"].sum())

    salida = os.path.join(OUTPUT_DIR, "meta.json")
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Guardado: {salida}")
    print(f"  Periodo: {meta['periodo_inicio']} → {meta['periodo_fin']}")
    print(f"  Carpetas totales: {meta['total_carpetas']:,}")
    print(f"  Víctimas totales: {meta['total_victimas']:,}")
    print(f"  Municipios únicos: {meta['municipios']}")



def generar_agregados() -> None:
    """
    Genera versiones pre-agregadas de los CSVs para carga inicial rápida.
    sonora_mun_anual.csv: agrupado por Municipio + Año + Subtipo de delito.
    Reduce ~14 MB → ~150 KB para el load inicial del dashboard.
    """
    print("\n[5/5] Generando agregados pre-calculados...")

    mun_path = os.path.join(OUTPUT_DIR, "sonora_municipal.csv")
    vic_path = os.path.join(OUTPUT_DIR, "sonora_victimas.csv")

    if os.path.exists(mun_path):
        df_mun = pd.read_csv(mun_path)
        cols_group = ["Municipio", "Año", "Subtipo de delito"]
        cols_group = [c for c in cols_group if c in df_mun.columns]
        agg = df_mun.groupby(cols_group)["Valor"].sum().reset_index()
        salida = os.path.join(OUTPUT_DIR, "sonora_mun_anual.csv")
        agg.to_csv(salida, index=False, encoding="utf-8")
        size_kb = os.path.getsize(salida) / 1024
        orig_kb = os.path.getsize(mun_path) / 1024
        print(f"  ✓ sonora_mun_anual.csv: {size_kb:.0f} KB (vs {orig_kb:.0f} KB original)")

    if os.path.exists(vic_path):
        df_vic = pd.read_csv(vic_path)
        cols_group = ["Municipio", "Año", "Subtipo de delito", "Sexo", "Rango de edad"]
        cols_group = [c for c in cols_group if c in df_vic.columns]
        agg_vic = df_vic.groupby(cols_group)["Valor"].sum().reset_index()
        salida_vic = os.path.join(OUTPUT_DIR, "sonora_vic_anual.csv")
        agg_vic.to_csv(salida_vic, index=False, encoding="utf-8")
        size_kb = os.path.getsize(salida_vic) / 1024
        print(f"  ✓ sonora_vic_anual.csv:  {size_kb:.0f} KB")

if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("=" * 60)
    print("  Preparación de datos – Incidencia Delictiva Sonora")
    print("=" * 60)

    procesar_estatal()
    procesar_municipal()
    procesar_victimas()
    generar_agregados()
    generar_meta()

    print("\n✅ ¡Datos listos! Archivos en la carpeta /public/data/")
    print("   Ejecuta: npm run dev")

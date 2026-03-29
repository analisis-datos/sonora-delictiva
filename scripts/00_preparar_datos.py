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
        "IDEFC_NM_*.csv",
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
    ],
}
# ──────────────────────────────────────────────────────────────────────────────


def leer_archivo_sesnsp(tipo: str) -> pd.DataFrame:
    """
    Busca el archivo del SESNSP para el tipo indicado ('estatal', 'municipal', 'victimas').
    Prueba cada patrón en orden y carga el primero que encuentre.
    Soporta .xlsx y .csv automáticamente.
    """
    for patron in PATRONES[tipo]:
        archivos = glob.glob(os.path.join(DATA_DIR, patron))
        if archivos:
            archivo = sorted(archivos)[-1]      # El más reciente si hay varios
            ext = os.path.splitext(archivo)[1].lower()
            print(f"  Leyendo ({ext}): {os.path.basename(archivo)}")

            if ext in (".xlsx", ".xls"):
                df = pd.read_excel(archivo, engine="openpyxl")
            else:
                # Intenta UTF-8 primero; si falla, latin-1
                try:
                    df = pd.read_csv(archivo, encoding="utf-8", low_memory=False)
                except UnicodeDecodeError:
                    df = pd.read_csv(archivo, encoding="latin-1", low_memory=False)

            df.columns = df.columns.str.strip()
            return df

    raise FileNotFoundError(
        f"No se encontró ningún archivo '{tipo}' en {DATA_DIR}.\n"
        f"Patrones buscados: {PATRONES[tipo]}\n"
        "Descarga los datos en: https://www.gob.mx/sesnsp/acciones-y-programas/"
        "datos-abiertos-de-incidencia-delictiva"
    )


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
    df = leer_archivo_sesnsp("estatal")

    col_entidad = detectar_columna_entidad(df)
    df = df[df[col_entidad].astype(str).str.strip() == ENTIDAD].copy()
    print(f"  Registros Sonora (ancho): {len(df):,}")
    if df.empty:
        print(f"  ⚠ Valores únicos en '{col_entidad}': {leer_archivo_sesnsp('estatal')[col_entidad].unique()[:10]}")
        return

    cols_id = ["Año", "Clave_Ent", "Entidad",
               "Bien jurídico afectado", "Tipo de delito",
               "Subtipo de delito", "Modalidad"]
    cols_id = [c for c in cols_id if c in df.columns]

    df_long = wide_a_long(df, cols_id)
    salida = os.path.join(OUTPUT_DIR, "sonora_estatal.csv")
    df_long.to_csv(salida, index=False, encoding="utf-8")
    print(f"  ✓ Guardado: {salida}  ({len(df_long):,} registros)")


def procesar_municipal() -> None:
    print("\n[2/3] Procesando dataset MUNICIPAL...")
    df = leer_archivo_sesnsp("municipal")

    col_entidad = detectar_columna_entidad(df)
    df = df[df[col_entidad].astype(str).str.strip() == ENTIDAD].copy()
    print(f"  Registros Sonora (ancho): {len(df):,}")
    if df.empty:
        return

    cols_id = ["Año", "Clave_Ent", "Entidad",
               "Cve. Municipio", "Municipio",
               "Bien jurídico afectado", "Tipo de delito",
               "Subtipo de delito", "Modalidad"]
    cols_id = [c for c in cols_id if c in df.columns]

    df_long = wide_a_long(df, cols_id)
    salida = os.path.join(OUTPUT_DIR, "sonora_municipal.csv")
    df_long.to_csv(salida, index=False, encoding="utf-8")
    print(f"  ✓ Guardado: {salida}  ({len(df_long):,} registros)")


def procesar_victimas() -> None:
    print("\n[3/3] Procesando dataset VÍCTIMAS...")
    df = leer_archivo_sesnsp("victimas")

    col_entidad = detectar_columna_entidad(df)
    df = df[df[col_entidad].astype(str).str.strip() == ENTIDAD].copy()
    print(f"  Registros Sonora (ancho): {len(df):,}")
    if df.empty:
        return

    cols_id = ["Año", "Clave_Ent", "Entidad", "Cve. Municipio", "Municipio",
               "Bien jurídico afectado", "Tipo de delito",
               "Subtipo de delito", "Modalidad",
               "Sexo", "Rango de edad"]
    cols_id = [c for c in cols_id if c in df.columns]

    df_long = wide_a_long(df, cols_id)
    salida = os.path.join(OUTPUT_DIR, "sonora_victimas.csv")
    df_long.to_csv(salida, index=False, encoding="utf-8")
    print(f"  ✓ Guardado: {salida}  ({len(df_long):,} registros)")


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("=" * 60)
    print("  Preparación de datos – Incidencia Delictiva Sonora")
    print("=" * 60)

    procesar_estatal()
    procesar_municipal()
    procesar_victimas()

    print("\n✅ ¡Datos listos! Archivos en la carpeta /output")
    print("   Ejecuta los demás scripts para generar las visualizaciones.")

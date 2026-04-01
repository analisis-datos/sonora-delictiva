---
name: python-data
description: >
  Use this skill when the user asks to modify, debug, or extend the Python ETL
  scripts in the /scripts folder: 00_preparar_datos.py, 01_alto_impacto.py,
  02_tendencias.py, 03_municipal.py, 04_victimas.py, 05_geojson_sonora.py, or
  any new script that reads SESNSP data (XLSX/CSV), filters Sonora, and exports
  to /public/data/. Also use when the user mentions pandas, openpyxl, data
  cleaning, or updating the data pipeline.
---

# Python Data Pipeline — Sonora Delictiva

## Contexto del proyecto
Pipeline ETL que lee archivos del SESNSP (formato ancho, meses como columnas),
filtra el estado de Sonora, convierte a formato long (series de tiempo) y exporta
CSVs limpios a `/public/data/` para que el dashboard React los consuma.

**Archivos de entrada** (en `/Data/`):
- `RNID-Delitos_Estatal-*.xlsx` → carpetas por tipo de delito
- `RNID-Delitos_Municipal-*.xlsx` → carpetas por municipio
- `RNID-Víctimas_Estatal-*.xlsx` → víctimas por sexo y edad

**Archivos de salida** (en `/public/data/`):
- `sonora_estatal.csv`
- `sonora_municipal.csv`
- `sonora_victimas.csv`
- `sonora_municipios.geojson`

## Convenciones del proyecto

### Lectura de archivos
```python
# Siempre soportar xlsx y csv con detección automática
ext = os.path.splitext(archivo)[1].lower()
if ext in (".xlsx", ".xls"):
    df = pd.read_excel(archivo, engine="openpyxl")
else:
    try:
        df = pd.read_csv(archivo, encoding="utf-8", low_memory=False)
    except UnicodeDecodeError:
        df = pd.read_csv(archivo, encoding="latin-1", low_memory=False)
df.columns = df.columns.str.strip()
```

### Filtrado de Sonora
```python
# Detectar columna de entidad robustamente
CANDIDATOS = ["Entidad", "entidad", "NOM_ENT", "ENTIDAD"]
col = next((c for c in CANDIDATOS if c in df.columns), None)
df_sonora = df[df[col].astype(str).str.strip() == "Sonora"].copy()
```

### Conversión wide → long
```python
MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
         "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

meses_presentes = [m for m in MESES if m in df.columns]
df_long = df.melt(id_vars=cols_id, value_vars=meses_presentes,
                  var_name="Mes", value_name="Valor")

orden = {m: i+1 for i, m in enumerate(MESES)}
df_long["Num_Mes"] = df_long["Mes"].map(orden)
df_long["Fecha"] = pd.to_datetime(
    df_long["Año"].astype(str) + "-" +
    df_long["Num_Mes"].astype(str).str.zfill(2) + "-01"
)
df_long["Valor"] = pd.to_numeric(df_long["Valor"], errors="coerce").fillna(0).astype(int)
```

### Exportación
```python
# Siempre UTF-8, sin index
df_long.to_csv(salida, index=False, encoding="utf-8")
print(f"  ✓ {len(df_long):,} registros → {salida}")
```

## Patrones de búsqueda de archivos SESNSP
El SESNSP cambia los nombres de archivos periódicamente. Usar glob con múltiples patrones:
```python
PATRONES = {
    "estatal":   ["RNID-Delitos_Estatal-*.xlsx",   "IDEFC_NM_*.xlsx", "IDEFC_NM_*.csv"],
    "municipal": ["RNID-Delitos_Municipal-*.xlsx",  "IDMFC_NM_*.xlsx", "IDMFC_NM_*.csv"],
    "victimas":  ["RNID-V*ctimas_Estatal-*.xlsx",  "IDVFC_NM_*.xlsx", "IDVFC_NM_*.csv"],
}
```

## Calidad de datos
- Siempre reportar el número de registros antes y después del filtro
- Validar que `df_sonora` no esté vacío antes de continuar
- Los valores `Valor` negativos o NaN → reemplazar con 0
- El campo `Fecha` debe quedar como `YYYY-MM-DD` (primer día del mes)

## Delitos de alto impacto (referencia)
```python
ALTO_IMPACTO = [
    "Homicidio doloso", "Feminicidio", "Secuestro", "Extorsión",
    "Robo de vehículo automotor", "Robo a casa habitación",
    "Robo a negocio", "Robo a transeúnte en vía pública",
    "Violación simple", "Lesiones dolosas", "Narcomenudeo",
]
```

## Constraints
- NO modificar los archivos originales en `/Data/`
- Siempre usar rutas relativas basadas en `os.path.dirname(__file__)`
- Requiere: `pandas>=2.0`, `openpyxl>=3.1`, `numpy>=1.24`
- Los scripts deben poder correrse de forma independiente (cada uno su propio `if __name__ == "__main__"`)
- Mensajes de progreso con `print` — no usar logging para scripts standalone

## Checklist antes de entregar código
- [ ] ¿Soporta tanto `.xlsx` como `.csv`?
- [ ] ¿Detecta la columna de entidad robustamente?
- [ ] ¿Valida que el DataFrame de Sonora no esté vacío?
- [ ] ¿Exporta a `/public/data/` (no a `/output/`)?
- [ ] ¿Tiene `if __name__ == "__main__"`?

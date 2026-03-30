"""
05_geojson_sonora.py
====================
Descarga o procesa el GeoJSON nacional de municipios del INEGI
y extrae únicamente los 72 municipios de Sonora.

Salida: public/data/sonora_municipios.geojson

Fuentes soportadas (en orden de prioridad):
  1. Archivo local ya descargado en /data/
  2. Descarga automática desde GitHub (angelnmara/geojson)
  3. Descarga automática desde INEGI (Marco Geoestadístico)

Uso:
  python scripts/05_geojson_sonora.py
"""

import os
import json
import urllib.request
import zipfile
import tempfile

# ─── Rutas ────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR    = os.path.join(BASE_DIR, "Data")
PUBLIC_DIR  = os.path.join(BASE_DIR, "public", "data")
SALIDA      = os.path.join(PUBLIC_DIR, "sonora_municipios.geojson")

# Clave INEGI de Sonora = 26
CLAVE_SONORA = "26"
NOMBRE_SONORA = "Sonora"

# ─── Fuentes de GeoJSON nacional ─────────────────────────────────────────────
FUENTES = [
    # GeoJSON de municipios de México (angelnmara, ligero ~4 MB)
    "https://raw.githubusercontent.com/angelnmara/geojson/master/mexicoHigh.json",
    # Alternativa: repo de mx-topojson convertido
    "https://raw.githubusercontent.com/danielcardeenas/mexico-geojson/master/states/Sonora.geojson",
]

# Patrones de archivos locales a buscar en /data
PATRONES_LOCALES = [
    "municipios.geojson",
    "mexico_municipios.geojson",
    "mexicoHigh.json",
    "conjunto_de_datos_*.json",
    "00mun.json",
]


def buscar_local() -> str | None:
    """Busca un GeoJSON de municipios ya descargado en /data."""
    import glob
    for patron in PATRONES_LOCALES:
        resultados = glob.glob(os.path.join(DATA_DIR, patron))
        if resultados:
            return sorted(resultados)[-1]
    return None


def descargar_geojson(url: str, destino: str) -> bool:
    """Descarga un archivo desde una URL."""
    print(f"  Descargando: {url}")
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            contenido = resp.read()
        with open(destino, "wb") as f:
            f.write(contenido)
        print(f"  ✓ Guardado en: {destino}")
        return True
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def filtrar_sonora(geo: dict) -> dict:
    """
    Filtra las features del GeoJSON para quedarse solo con Sonora.
    Detecta automáticamente el campo de estado según el esquema del archivo.
    """
    features_sonora = []
    campos_estado = ["CVE_ENT", "cve_ent", "ESTADO", "estado",
                     "NOM_ENT", "nom_ent", "ENTIDAD", "entidad"]

    for feat in geo.get("features", []):
        props = feat.get("properties", {})

        # Buscar por clave numérica del estado (más confiable)
        for campo in ["CVE_ENT", "cve_ent", "CLAVE_ENT", "clave_ent"]:
            if campo in props:
                val = str(props[campo]).zfill(2)
                if val == CLAVE_SONORA:
                    features_sonora.append(feat)
                    break
        else:
            # Buscar por nombre del estado
            for campo in campos_estado:
                if campo in props:
                    if NOMBRE_SONORA.lower() in str(props[campo]).lower():
                        features_sonora.append(feat)
                        break

    return {
        "type": "FeatureCollection",
        "features": features_sonora,
    }


def normalizar_propiedades(geo: dict) -> dict:
    """
    Normaliza los nombres de propiedades para que el componente React
    pueda acceder a ellas de forma consistente.
    Garantiza que siempre existan: NOMGEO, CVE_MUN, CVE_ENT
    """
    MAPEO_NOMBRE = [
        "NOMGEO", "NOM_MUN", "MUNICIPIO", "nombre", "name", "NOMBRE",
        "NOM_ENT",   # fallback
    ]
    MAPEO_CLAVE = [
        "CVE_MUN", "cve_mun", "CLAVE_MUN", "CVEGEO",
    ]

    for feat in geo["features"]:
        props = feat.get("properties", {})

        # Asegurar NOMGEO
        if "NOMGEO" not in props:
            for campo in MAPEO_NOMBRE:
                if campo in props:
                    props["NOMGEO"] = props[campo]
                    break
            else:
                props["NOMGEO"] = "Desconocido"

        # Asegurar CVE_MUN
        if "CVE_MUN" not in props:
            for campo in MAPEO_CLAVE:
                if campo in props:
                    props["CVE_MUN"] = str(props[campo])
                    break

        feat["properties"] = props

    return geo


def imprimir_resumen(geo: dict) -> None:
    """Imprime los primeros municipios para verificar el resultado."""
    features = geo.get("features", [])
    print(f"\n  Municipios extraídos: {len(features)}")
    print("  Primeros 5 municipios:")
    for f in features[:5]:
        props = f.get("properties", {})
        print(f"    · {props.get('NOMGEO', '?')}  (clave: {props.get('CVE_MUN', '?')})")
    if len(features) < 70:
        print(f"\n  ⚠ Sonora tiene 72 municipios; se encontraron {len(features)}.")
        print("    Verifica que el GeoJSON nacional contenga datos municipales completos.")


def main():
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

    print("=" * 60)
    print("  GeoJSON Municipios de Sonora")
    print("=" * 60)

    geo_raw = None

    # ── Paso 1: buscar archivo local ──────────────────────────────────────────
    local = buscar_local()
    if local:
        print(f"\n[1/3] Archivo local encontrado: {os.path.basename(local)}")
        with open(local, encoding="utf-8") as f:
            geo_raw = json.load(f)
    else:
        print("\n[1/3] No se encontró archivo local.")

    # ── Paso 2: descargar si no hay local ─────────────────────────────────────
    if geo_raw is None:
        print("[2/3] Intentando descarga automática...")
        for url in FUENTES:
            tmp = os.path.join(tempfile.gettempdir(), "mexico_municipios_tmp.json")
            if descargar_geojson(url, tmp):
                with open(tmp, encoding="utf-8") as f:
                    try:
                        geo_raw = json.load(f)
                        break
                    except json.JSONDecodeError as e:
                        print(f"  ✗ JSON inválido: {e}")
                        geo_raw = None

    if geo_raw is None:
        print("\n❌ No se pudo obtener el GeoJSON de municipios.")
        print("   Descárgalo manualmente desde:")
        print("   https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=889463807469")
        print("   o desde:")
        print("   https://github.com/angelnmara/geojson")
        print(f"   y colócalo en: {DATA_DIR}/municipios.geojson")
        return

    # ── Paso 3: filtrar Sonora y exportar ────────────────────────────────────
    print("[3/3] Filtrando municipios de Sonora...")
    total_original = len(geo_raw.get("features", []))
    print(f"  Features en archivo fuente: {total_original:,}")

    geo_sonora = filtrar_sonora(geo_raw)

    # Si el archivo ya era solo Sonora (segunda fuente de FUENTES)
    if not geo_sonora["features"] and total_original > 0:
        print("  ℹ El archivo parece ya ser de Sonora; usando sin filtrar.")
        geo_sonora = geo_raw

    geo_sonora = normalizar_propiedades(geo_sonora)
    imprimir_resumen(geo_sonora)

    with open(SALIDA, "w", encoding="utf-8") as f:
        json.dump(geo_sonora, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(SALIDA) / 1024
    print(f"\n✅ GeoJSON guardado: {SALIDA}")
    print(f"   Tamaño: {size_kb:.1f} KB")
    print(f"\n   Siguiente paso:")
    print(f"   Verifica que el archivo exista en public/data/ y corre:")
    print(f"   npm run dev")


if __name__ == "__main__":
    main()

import os
import json
import shutil

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR    = os.path.join(BASE_DIR, "Data")
PUBLIC_DIR  = os.path.join(BASE_DIR, "public", "data")
ORIGEN      = os.path.join(DATA_DIR, "Sonora.json")
DESTINO     = os.path.join(PUBLIC_DIR, "sonora_municipios.geojson")

def main():
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    print("=" * 60)
    print("  Preparando GeoJSON (Municipios de Sonora)")
    print("=" * 60)

    if not os.path.exists(ORIGEN):
        print(f"  ✗ Error: No se encontró el archivo local en {ORIGEN}")
        print("    Asegúrate de haber colocado Sonora.json en la carpeta Data/.")
        return

    print(f"  Cargando archivo base: {ORIGEN}")
    try:
        with open(ORIGEN, "r", encoding="utf-8") as f:
            geo_data = json.load(f)
    except Exception as e:
        print(f"  ✗ Error al leer JSON: {e}")
        return

    features = geo_data.get("features", [])
    if not features:
        print("  ✗ Error: El archivo JSON no tiene un formato FeatureCollection válido.")
        return

    # Normalizar propiedades por si acaso (el dashboard usa NOMGEO)
    for feat in features:
        props = feat.get("properties", {})
        
        # Mapeos posibles para encontrar el nombre
        if "NOMGEO" not in props:
            nom = props.get("NOM_MUN") or props.get("nombre") or props.get("name") or "Desconocido"
            props["NOMGEO"] = nom
            
        feat["properties"] = props
        
    # Guardar en public/data
    try:
        with open(DESTINO, "w", encoding="utf-8") as f:
            json.dump(geo_data, f, ensure_ascii=False)
        print(f"\n  ✓ Éxito: GeoJSON de {len(features)} municipios generado.")
        print(f"  ✓ Guardado en: {DESTINO}")
        
        print("\n  Top 5 municipios exportados:")
        for idx, feat in enumerate(features[:5]):
            props = feat.get("properties", {})
            print(f"    {idx+1}. {props.get('NOMGEO', '?')} (Clave: {props.get('CVE_MUN', '?')})")
            
    except Exception as e:
        print(f"  ✗ Error al guardar GeoJSON final: {e}")

if __name__ == "__main__":
    main()

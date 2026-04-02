import urllib.request
import json
import os

API_URL = "https://de1.api.radio-browser.info/json/stations/search"

def build_mega_database():
    # Pedimos 25,000 estaciones, ordenadas por popularidad
    url = f"{API_URL}?limit=25000&hidebroken=true&order=clickcount&reverse=true"
    print("Iniciando descarga masiva de estaciones...")
    
    req = urllib.request.Request(url, headers={'User-Agent': 'SynaptRadioBot/2.0'})
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            optimized_db = []
            
            for s in data:
                # Filtro de calidad: Evitamos emisoras sin nombre o sin URL
                name = s.get("name", "").strip()
                url_stream = s.get("url_resolved", "")
                if not name or not url_stream:
                    continue
                    
                # COMPRESIÓN EXTREMA: Usamos llaves de 1 letra para ahorrar peso
                optimized_db.append({
                    "i": s.get("stationuuid", ""),      # ID
                    "n": name.replace('"', ''),         # Nombre
                    "u": url_stream,                    # URL Stream
                    "c": s.get("country", "Global"),    # País
                    "l": s.get("favicon", ""),          # Logo
                    "t": s.get("tags", ""),             # Tags (para las categorías)
                    "b": s.get("bitrate", "128")        # Bitrate
                })
            
            return optimized_db
            
    except Exception as e:
        print(f"Error fatal: {e}")
        return []

def main():
    stations = build_mega_database()
    if not stations:
        return

    os.makedirs('data', exist_ok=True)
    
    # Guardamos el archivo super comprimido (sin espacios innecesarios)
    output_path = 'data/global_db.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(stations, f, ensure_ascii=False, separators=(',', ':'))
    
    print(f"¡Éxito! Base de datos creada con {len(stations)} estaciones en {output_path}")

if __name__ == "__main__":
    main()

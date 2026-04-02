import urllib.request
import xml.etree.ElementTree as ET
import json
import os
import re

# Fuentes de noticias reales (puedes agregar más feeds RSS)
FEEDS = [
    {"url": "https://indiehoy.com/feed/", "tag": "MÚSICA"},
    {"url": "https://es.rollingstone.com/feed/", "tag": "TENDENCIAS"}
]

def clean_html(raw_html):
    cleanr = re.compile('<.*?>')
    return re.sub(cleanr, '', raw_html).strip()

def extract_image(item):
    # Busca imágenes en las etiquetas estándar de RSS
    media = item.find('{http://search.yahoo.com/mrss/}content')
    if media is not None and media.get('url'):
        return media.get('url')
    
    # Busca imágenes dentro del contenido HTML
    content = item.find('{http://purl.org/rss/1.0/modules/content/}encoded')
    desc = item.find('description')
    
    html_text = (content.text if content is not None else "") or (desc.text if desc is not None else "")
    if html_text:
        img_match = re.search(r'<img[^>]+src="([^">]+)"', html_text)
        if img_match:
            return img_match.group(1)
            
    # Imagen por defecto si no encuentra ninguna
    return "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800"

def fetch_news():
    all_news = []
    
    for feed in FEEDS:
        print(f"Leyendo noticias de: {feed['url']}")
        try:
            req = urllib.request.Request(feed['url'], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                xml_data = response.read()
                root = ET.fromstring(xml_data)
                
                # Tomamos los primeros 10 artículos de cada revista
                for item in root.findall('.//item')[:10]:
                    title = item.find('title').text
                    link = item.find('link').text
                    pub_date = item.find('pubDate').text if item.find('pubDate') is not None else "Reciente"
                    
                    # Limpiamos la fecha para que no sea tan larga (opcional)
                    short_date = " ".join(pub_date.split(" ")[:4]) if pub_date != "Reciente" else pub_date
                    
                    all_news.append({
                        "title": title.replace('"', ''),
                        "tag": feed['tag'],
                        "date": short_date,
                        "img": extract_image(item),
                        "url": link
                    })
        except Exception as e:
            print(f"Error leyendo {feed['url']}: {e}")

    return all_news

def main():
    news_data = fetch_news()
    if not news_data:
        print("No se encontraron noticias.")
        return

    os.makedirs('data', exist_ok=True)
    
    # Guardamos en data/news.json
    output_path = 'data/news.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(news_data, f, ensure_ascii=False, indent=2)
    
    print(f"¡Éxito! Se guardaron {len(news_data)} noticias en {output_path}")

if __name__ == "__main__":
    main()

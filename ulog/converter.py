import csv
import geojson
from datetime import datetime, timedelta

# Время запуска системы (замените на фактическое время запуска)
boot_time = datetime(2023, 4, 22, 13, 56, 0)  # Пример: 11 ноября 2024 года, 13:21:06

features = []
with open('GPS.csv', 'r') as csvfile:
    reader = csv.DictReader(csvfile, delimiter=';')
    for row in reader:
        lat = float(row['lat']) / 1e7
        lon = float(row['lon']) / 1e7
        alt = float(row['alt']) / 1000  # Преобразуем миллиметры в метры
        print(row['timestamp'])
        timestamp = int(row['timestamp']) / 1e6  # Преобразуем микросекунды в секунды
        current_time = boot_time + timedelta(seconds=timestamp)
        iso_time = current_time.isoformat() + 'Z'  # Преобразуем в формат ISO 8601

        point = geojson.Point((lon, lat, alt))
        features.append(geojson.Feature(geometry=point, properties={"timestamp": iso_time}))

feature_collection = geojson.FeatureCollection(features)
with open('GPS.geojson', 'w') as f:
    geojson.dump(feature_collection, f)

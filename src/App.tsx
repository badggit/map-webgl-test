import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import dronePathLayer, { DronePathLayer } from './dronePathLayer.ts';
import dronePathCoordinates, { DronePathCoordinates } from './dronePathCoordinates.ts';
import droneLayer, { DroneControl } from './droneLayer.ts';

// Initial map coordinates //
const mapInitCoordinates: { center: [number, number], zoom: number, bearing: number, pitch: number } = {
  center: [8.713293, 46.946965],
  zoom: 16,
  bearing: 71,
  pitch: 75,
};

// Key from https://account.mapbox.com //
mapboxgl.accessToken = 'pk.eyJ1IjoiaGlzdG9kZWZydSIsImEiOiJjbTNjc3F2ZmIxYnQ0MmtzYXJ2eHM2NmNuIn0.w8a455Up9Cwifbcyem3mRQ';

const App = () => {
  // Map refs //
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | undefined>(undefined);

  // Drone refs //
  const droneCoordinatesRef = useRef<DronePathCoordinates | undefined>(undefined);
  const droneLayerRef = useRef<DronePathLayer | undefined>(undefined);
  const droneControlRef = useRef<DroneControl | undefined>(undefined);

  // Add drone path layer //
  const droneLayersAdd = useCallback(async () => {
    // If it's already initialized //
    if (droneLayerRef.current || !mapRef.current) {
      return;
    }

    // Get coordinates from file //
    droneCoordinatesRef.current = await dronePathCoordinates();
    if (!droneCoordinatesRef.current) {
      return;
    }

    // Get the data and prepare the layer //
    droneLayerRef.current = await dronePathLayer(droneCoordinatesRef.current, mapRef.current);

    // Add drone path layer //
    if (droneLayerRef.current) {
      mapRef.current?.addLayer(droneLayerRef.current);
    }

    // Initialize the drone layer and get the function to move it
    droneControlRef.current = droneLayer(mapRef.current);
    droneControlRef.current?.flyStart(droneCoordinatesRef.current, 20);
    // droneControlRef.current?.moveTo(mapInitCoordinates.center[0], mapInitCoordinates.center[1], 1600);
  }, []);

  // Initialize map //
  useEffect(() => {

    // Check that map container is ready //
    if (!mapContainerRef.current) {
      console.error('Map container is not found');
      return;
    }

    // Initiating Mapbox //
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/standard',    // 'mapbox://styles/mapbox/light-v11',
      antialias: true,
      projection: 'mercator',
      hash: true,
      ...mapInitCoordinates,
    });

    // Check that everything is ok //
    if (!map) {
      console.log('Map is not initialized');
      return;
    }

    // Save map instance to the ref //
    mapRef.current = map;

    // Adding dark theme for style //
    map.on('style.load', () => {
      map.setConfigProperty('basemap', 'lightPreset', 'dusk');
    });

    // Add 3D terrain //
    map.on('style.load', () => {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });
    });

    // Navigation controls //
    map.addControl(new mapboxgl.NavigationControl());

    // Add custom layer when the map is loaded //
    map.on('load', () => {
      droneLayersAdd();
    });

    return () => {
      // Clean up on unmount //
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [droneLayersAdd]);

  return <div style={{ height: '100%', position: 'relative' }}>
    <div ref={mapContainerRef} id="map" style={{ width: '100%', height: '100vh' }}></div>
    <div
      style={{
        font: `12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif`,
        position: 'absolute',
        width: 'auto',
        top: 0,
        left: 0,
        padding: '10px',
      }}
    >
      <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
        <button type="button" aria-label="Fly to path" aria-disabled="false" onClick={() => mapRef.current?.flyTo(mapInitCoordinates)}>
          <span className="mapboxgl-ctrl-icon" aria-hidden="true" title="Fly to path" style={{
            margin: '5px',
            width: '19px',
            height: '19px',
            backgroundColor: 'transparent',
            border: 0,
            backgroundSize: 'cover',
            backgroundImage: `url("data:image/svg+xml,%3Csvg version='1.0' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='800px' height='800px' viewBox='0 0 64 64' xml:space='preserve' style='enable-background:new 0 0 64 64;'%3E%3Cpath d='M62.79,29.172l-28-28C34.009,0.391,32.985,0,31.962,0s-2.047,0.391-2.828,1.172l-28,28 c-1.562,1.566-1.484,4.016,0.078,5.578c1.566,1.57,3.855,1.801,5.422,0.234L8,33.617V60c0,2.211,1.789,4,4,4h16V48h8v16h16 c2.211,0,4-1.789,4-4V33.695l1.195,1.195c1.562,1.562,3.949,1.422,5.516-0.141C64.274,33.188,64.356,30.734,62.79,29.172z' style='fill:%23231F20;'/%3E%3C/svg%3E")`,
          }}></span>
        </button>
      </div>
    </div>
  </div>;
};

export default App;

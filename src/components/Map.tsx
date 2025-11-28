"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Interface for type safety (uses camelCase to match the dashboard component)
interface Location {
  id: string; 
  latitude: number;
  longitude: number;
  deviceId: string | null;
  timestamp: string;
}

interface MapProps {
  locations: Location[];
  currentLocation: Location | null; 
}

// Helper function to define the custom pulsing marker icon
const getCustomIcon = () => L.divIcon({
  className: "custom-marker-container",
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    ">
      <div style="
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 50%;
      "></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});


export default function Map({ locations, currentLocation, fitOnUpdate = true, autoZoomOnFirstPoint = false }: MapProps & { fitOnUpdate?: boolean, autoZoomOnFirstPoint?: boolean }) {
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSessionIdRef = useRef<string | null>(null);

  // 1. Map Initialization (Runs once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center (Madrid) and a national zoom level (6)
    const defaultCenter: L.LatLngExpression = [40.4168, -3.7038]; 

    mapRef.current = L.map(containerRef.current).setView(defaultCenter, 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 21,
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapRef.current);

    layerGroupRef.current = L.layerGroup().addTo(mapRef.current);

    // Inject CSS for the pulsing effect
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Data Update and Drawing Logic (Runs whenever locations changes)
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (locations.length === 0) return;

    // 2.1 Prepare coordinates for Polyline
    const coords: [number, number][] = locations.map((loc) => [
      loc.latitude,
      loc.longitude,
    ]);
    const lastLocationData = locations[locations.length - 1];
    const lastLatLng: L.LatLngExpression = [lastLocationData.latitude, lastLocationData.longitude];

    // 2.2 Draw Polyline
    const polyline = L.polyline(coords, {
      color: "#667eea",
      weight: 4,
      opacity: 0.85,
      smoothFactor: 1,
    }).addTo(layerGroup);

    // 2.3 Place Marker on the Last Location
    L.marker(lastLatLng, { icon: getCustomIcon() })
      .addTo(layerGroup)
      .bindPopup(
        `<strong>Current Location</strong><br><small>${new Date(
          lastLocationData.timestamp
        ).toLocaleString()}</small>`
      )
      .openPopup();

    // 2.4 Fit Bounds to show the entire route
    if (coords.length === 1 && autoZoomOnFirstPoint) {
      map.setView(lastLatLng, 16);
    } else if (fitOnUpdate) {
      if (coords.length > 1) {
        map.fitBounds(polyline.getBounds(), {
          padding: [50, 50],
          maxZoom: 14 
        });
      } else {
        map.setView(lastLatLng, 10);
      }
    }
    // If fitOnUpdate is false, do not change zoom/center unless autoZoomOnFirstPoint triggers above
  }, [locations, currentLocation, fitOnUpdate]);

  // Map container JSX (This MUST have a defined height from the parent component)
  return <div ref={containerRef} className="w-full h-full rounded-xl" />;
}

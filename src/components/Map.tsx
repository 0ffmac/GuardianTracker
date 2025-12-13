"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { JSX } from "react";

// Interface for type safety (uses camelCase to match the dashboard component)
interface Location {
  id: string;
  latitude: number;
  longitude: number;
  deviceId: string | null;
  timestamp: string;
  source?: "gps" | "wifi" | "hybrid" | null;
}

interface WifiDevicePoint {
  bssid: string;
  ssid: string | null;
  latitude: number;
  longitude: number;
  count: number;
  avgRssi: number | null;
  firstSeen: string;
  lastSeen: string;
}

interface BleDevicePoint {
  address: string;
  name: string | null;
  latitude: number;
  longitude: number;
  count: number;
  avgRssi: number | null;
  firstSeen: string;
  lastSeen: string;
  /** Optional tracking session id, used for coloring */
  sessionId?: string | null;
}

interface MapProps {
  locations: Location[];
  currentLocation: Location | null;
  fitOnUpdate?: boolean;
  autoZoomOnFirstPoint?: boolean;
  snappedGeoJson?: any | null;
  wifiDevices?: WifiDevicePoint[];
  bleDevices?: BleDevicePoint[];
  /**
   * If true, do not auto-open the current-location popup or attach per-device popups.
   * Useful for small/mobile maps where the tooltip can cause layout issues.
   */
  hidePopups?: boolean;
  /**
   * Optional explicit zoom level to use when not fitting bounds (e.g. focus on last point).
   * Defaults to 10 if not provided.
   */
  pointZoom?: number;
}

// Helper function to define the custom pulsing marker icon
const getCustomIcon = (source?: "gps" | "wifi" | "hybrid" | null) => {
  let gradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"; // default
  let shadow = "rgba(102, 126, 234, 0.5)";

  if (source === "wifi") {
    gradient = "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"; // orange
    shadow = "rgba(234, 88, 12, 0.5)";
  } else if (source === "hybrid") {
    gradient = "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"; // green
    shadow = "rgba(34, 197, 94, 0.5)";
  }

  return L.divIcon({
    className: "custom-marker-container",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${gradient};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px ${shadow};
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
};

export default function Map({
  locations,
  currentLocation,
  fitOnUpdate = true,
  autoZoomOnFirstPoint = false,
  snappedGeoJson,
  wifiDevices = [],
  bleDevices = [],
  hidePopups = false,
  pointZoom = 10,
}: MapProps): JSX.Element {
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const baseLayersRef = useRef<{ street?: L.TileLayer; satellite?: L.TileLayer }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");
  const [selecting, setSelecting] = useState(false);
  const selectionRectRef = useRef<L.Rectangle | null>(null);
  const selectionStartRef = useRef<L.LatLng | null>(null);

  // 1. Map Initialization (Runs once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center (Madrid) and a national zoom level (6)
    const defaultCenter: L.LatLngExpression = [40.4168, -3.7038];

    mapRef.current = L.map(containerRef.current, { tap: false } as any).setView(
      defaultCenter,
      6
    );


    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 21,
      attribution: "© OpenStreetMap contributors",
    });

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 21,
        attribution:
          "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      }
    );

    street.addTo(mapRef.current);
    baseLayersRef.current = { street, satellite };

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

  // 2. Data Update and Drawing Logic (Runs whenever locations or snappedGeoJson changes)
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    let bounds: L.LatLngBounds | null = null;

    if (locations.length > 0) {
      // Draw snapped polyline if available
      if (
        snappedGeoJson &&
        snappedGeoJson.type === "LineString" &&
        Array.isArray(snappedGeoJson.coordinates)
      ) {
        const snappedCoords = snappedGeoJson.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon],
        );
        const polyline = L.polyline(snappedCoords, {
          color: "#00e676",
          weight: 5,
          opacity: 0.95,
          smoothFactor: 1,
        }).addTo(layerGroup);
        bounds = polyline.getBounds();
      } else {
        // Fallback: draw raw points
        const coords: [number, number][] = locations.map((l) => [
          l.latitude,
          l.longitude,
        ]);
        const polyline = L.polyline(coords, {
          color: "#667eea",
          weight: 4,
          opacity: 0.85,
          smoothFactor: 1,
        }).addTo(layerGroup);
        bounds = polyline.getBounds();
      }

      // Place Marker on the Last Location
      const lastLocationData = locations[locations.length - 1];
      const lastLatLng: L.LatLngExpression = [
        lastLocationData.latitude,
        lastLocationData.longitude,
      ];
      const sourceLabel =
        lastLocationData.source === "wifi"
          ? "Wi-Fi"
          : lastLocationData.source === "hybrid"
          ? "Hybrid (GPS + Wi-Fi)"
          : "GPS";

      const currentMarker = L.marker(lastLatLng, {
        icon: getCustomIcon(lastLocationData.source),
      }).addTo(layerGroup);

      if (!hidePopups) {
        currentMarker.bindPopup(
          `<strong>Current Location</strong><br><small>${new Date(
            lastLocationData.timestamp,
          ).toLocaleString()}</small><br/><small>Source: ${sourceLabel}</small>`,
        );
      }
    }

    // Wi-Fi device markers
    if (Array.isArray(wifiDevices)) {
      wifiDevices.forEach((d) => {
        const latLng = L.latLng(d.latitude, d.longitude);
        const marker = L.circleMarker(latLng, {
          radius: 6,
          color: "#38bdf8",
          weight: 1,
          fillColor: "#0ea5e9",
          fillOpacity: 0.85,
        }).addTo(layerGroup);

        bounds = bounds ? bounds.extend(latLng) : L.latLngBounds(latLng, latLng);

        if (!hidePopups) {
          marker.bindPopup(
            `<strong>Wi-Fi</strong><br />SSID: ${
              d.ssid || "(hidden)"
            }<br />BSSID: ${d.bssid}<br />Samples: ${d.count}<br />Avg RSSI: ${
              d.avgRssi != null ? `${Math.round(d.avgRssi)} dBm` : "–"
            }<br /><small>${
              d.firstSeen
                ? `First: ${new Date(d.firstSeen).toLocaleString()}<br />`
                : ""
            }${
              d.lastSeen
                ? `Last: ${new Date(d.lastSeen).toLocaleString()}`
                : ""
            }</small>`,
          );
        }
      });
    }

    // BLE device markers
    if (Array.isArray(bleDevices)) {
      const palette = [
        { stroke: "#a855f7", fill: "#c4b5fd" },
        { stroke: "#22c55e", fill: "#4ade80" },
        { stroke: "#f97316", fill: "#fdba74" },
        { stroke: "#38bdf8", fill: "#7dd3fc" },
        { stroke: "#e11d48", fill: "#fb7185" },
      ];

      const colorForSession = (sessionId?: string | null) => {
        if (!sessionId) return palette[0];
        let hash = 0;
        for (let i = 0; i < sessionId.length; i += 1) {
          hash = (hash * 31 + sessionId.charCodeAt(i)) | 0;
        }
        const idx = Math.abs(hash) % palette.length;
        return palette[idx];
      };

      bleDevices.forEach((d) => {
        const latLng = L.latLng(d.latitude, d.longitude);
        const { stroke, fill } = colorForSession(d.sessionId);
        const marker = L.circleMarker(latLng, {
          radius: 6,
          color: stroke,
          weight: 1,
          fillColor: fill,
          fillOpacity: 0.85,
        }).addTo(layerGroup);

        bounds = bounds ? bounds.extend(latLng) : L.latLngBounds(latLng, latLng);

        if (!hidePopups) {
          marker.bindPopup(
            `<strong>Bluetooth</strong><br />Name: ${
              d.name || "(unknown)"
            }<br />Address: ${d.address}<br />Samples: ${d.count}<br />Avg RSSI: ${
              d.avgRssi != null ? `${Math.round(d.avgRssi)} dBm` : "–"
            }<br /><small>${
              d.firstSeen
                ? `First: ${new Date(d.firstSeen).toLocaleString()}<br />`
                : ""
            }${
              d.lastSeen
                ? `Last: ${new Date(d.lastSeen).toLocaleString()}`
                : ""
            }</small>`
          );
        }
      });
    }
 
     if (!bounds) {

      // Nothing to fit or center on
      return;
    }

    // Fit Bounds to show the entire route or device cloud
    if (locations.length === 0) {
      if (fitOnUpdate) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 16,
        });
      }
    } else {
      const lastLocationData = locations[locations.length - 1];
      const lastLatLng: L.LatLngExpression = [
        lastLocationData.latitude,
        lastLocationData.longitude,
      ];

      if (locations.length === 1 && autoZoomOnFirstPoint) {
        map.setView(lastLatLng, 16);
      } else if (fitOnUpdate) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 16,
        });
      } else {
        map.setView(lastLatLng, pointZoom);
      }
    }
    // If fitOnUpdate is false, do not change zoom/center unless autoZoomOnFirstPoint triggers above
  }, [
    locations,
    currentLocation,
    fitOnUpdate,
    snappedGeoJson,
    autoZoomOnFirstPoint,
    wifiDevices,
    bleDevices,
    hidePopups,
  ]);

  // Toggle between street and satellite base layers
  useEffect(() => {
    const map = mapRef.current;
    const baseLayers = baseLayersRef.current;
    if (!map || !baseLayers.street || !baseLayers.satellite) return;

    if (mapStyle === "street") {
      if (map.hasLayer(baseLayers.satellite)) {
        map.removeLayer(baseLayers.satellite);
      }
      if (!map.hasLayer(baseLayers.street)) {
        baseLayers.street.addTo(map);
      }
    } else {
      if (map.hasLayer(baseLayers.street)) {
        map.removeLayer(baseLayers.street);
      }
      if (!map.hasLayer(baseLayers.satellite)) {
        baseLayers.satellite.addTo(map);
      }
    }
  }, [mapStyle]);

  // Selection mode: drag rectangle to zoom
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      if (!selecting) return;
      selectionStartRef.current = e.latlng;
      if (selectionRectRef.current) {
        map.removeLayer(selectionRectRef.current);
        selectionRectRef.current = null;
      }
      map.dragging.disable();
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!selecting) return;
      if (!selectionStartRef.current) return;
      const bounds = L.latLngBounds(selectionStartRef.current, e.latlng);
      if (!selectionRectRef.current) {
        selectionRectRef.current = L.rectangle(bounds, {
          color: "#fbbf24",
          weight: 1,
          fillColor: "#facc15",
          fillOpacity: 0.15,
        }).addTo(map);
      } else {
        selectionRectRef.current.setBounds(bounds);
      }
    };

    const finishSelection = () => {
      if (!selecting) return;
      map.dragging.enable();
      if (selectionRectRef.current) {
        const bounds = selectionRectRef.current.getBounds();
        map.fitBounds(bounds, { padding: [40, 40] });
        map.removeLayer(selectionRectRef.current);
        selectionRectRef.current = null;
      }
      selectionStartRef.current = null;
      setSelecting(false);
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", finishSelection);
    map.on("mouseleave", finishSelection as any);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", finishSelection);
      map.off("mouseleave", finishSelection as any);
      map.dragging.enable();
      if (selectionRectRef.current) {
        map.removeLayer(selectionRectRef.current);
        selectionRectRef.current = null;
      }
      selectionStartRef.current = null;
    };
  }, [selecting]);

  // Map container JSX (This MUST have a defined height from the parent component)
  // Fullscreen logic
  function handleFullscreen() {

    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  }

  return (
    <div className="relative w-full h-full rounded-xl">
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex gap-2">
        <button
          type="button"
          onClick={() =>
            setMapStyle((prev) => (prev === "street" ? "satellite" : "street"))
          }
          title={mapStyle === "street" ? "Switch to satellite view" : "Switch to map view"}
          className="bg-black/60 hover:bg-black/80 text-white rounded-full px-3 py-1 text-xs shadow-lg focus:outline-none"
          style={{ pointerEvents: "auto" }}
        >
          {mapStyle === "street" ? "Satellite" : "Map"}
        </button>
        <button
          type="button"
          onClick={() => setSelecting((v) => !v)}
          title="Draw a box to zoom"
          className={`bg-black/60 hover:bg-black/80 text-white rounded-full px-3 py-1 text-xs shadow-lg focus:outline-none border ${
            selecting ? "border-amber-300" : "border-transparent"
          }`}
          style={{ pointerEvents: "auto" }}
        >
          {selecting ? "Cancel select" : "Select area"}
        </button>
      </div>
      <button
        onClick={handleFullscreen}
        title="Maximize Map"
        className="absolute top-2 right-2 z-[1000] bg-black/60 hover:bg-black/80 text-white rounded-full p-2 shadow-lg focus:outline-none"
        style={{ pointerEvents: 'auto' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
      </button>
      <div ref={containerRef} className="w-full h-full rounded-xl" />
    </div>
  );
}

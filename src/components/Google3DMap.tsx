"use client";

import { useEffect, useRef } from "react";

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  deviceId: string | null;
  timestamp: string;
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
}

interface Google3DMapProps {
  locations: Location[];
  currentLocation: Location | null;
  fitOnUpdate?: boolean;
  autoZoomOnFirstPoint?: boolean;
  snappedGeoJson?: any | null;
  wifiDevices?: WifiDevicePoint[];
  bleDevices?: BleDevicePoint[];
  apiKey: string;
}

declare global {
  interface Window {
    google?: any;
    __guardianGoogleMapsLoading?: boolean;
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (window.google && window.google.maps) {
    return Promise.resolve();
  }

  if (window.__guardianGoogleMapsLoading) {
    // Another component already triggered loading; just wait a bit and resolve.
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  }

  window.__guardianGoogleMapsLoading = true;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=maps&v=beta`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.__guardianGoogleMapsLoading = false;
      resolve();
    };
    script.onerror = (err) => {
      window.__guardianGoogleMapsLoading = false;
      console.error("Failed to load Google Maps script", err);
      reject(err);
    };
    document.head.appendChild(script);
  });
}

export default function Google3DMap({
  locations,
  currentLocation,
  fitOnUpdate = true,
  autoZoomOnFirstPoint = false,
  snappedGeoJson,
  wifiDevices = [],
  bleDevices = [],
  apiKey,
}: Google3DMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const overlaysRef = useRef<any[]>([]);

  // Initialize map and update overlays when data changes
  useEffect(() => {
    if (!containerRef.current) return;
    if (!apiKey) return;

    let cancelled = false;

    async function initAndRender() {
      await loadGoogleMapsScript(apiKey).catch(() => undefined);
      if (cancelled) return;
      if (!window.google || !window.google.maps) return;

      const google = window.google;

      if (!mapRef.current) {
        const centerLocation =
          locations[0] || currentLocation || {
            latitude: 40.4168,
            longitude: -3.7038,
          };

        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: centerLocation.latitude, lng: centerLocation.longitude },
          zoom: 6,
          tilt: 60,
          heading: 0,
          mapTypeId: "hybrid",
        });
      }

      const map = mapRef.current;

      // Clear previous overlays
      overlaysRef.current.forEach((overlay) => {
        if (overlay && typeof overlay.setMap === "function") {
          overlay.setMap(null);
        }
      });
      overlaysRef.current = [];

      if (!locations || locations.length === 0) {
        return;
      }

      const path: { lat: number; lng: number }[] = [];

      if (snappedGeoJson && snappedGeoJson.type === "LineString" && Array.isArray(snappedGeoJson.coordinates)) {
        snappedGeoJson.coordinates.forEach(([lon, lat]: [number, number]) => {
          path.push({ lat, lng: lon });
        });
      } else {
        locations.forEach((loc) => {
          path.push({ lat: loc.latitude, lng: loc.longitude });
        });
      }

      if (path.length > 0) {
        const polyline = new google.maps.Polyline({
          path,
          strokeColor: snappedGeoJson ? "#00e676" : "#667eea",
          strokeOpacity: 0.95,
          strokeWeight: 5,
        });
        polyline.setMap(map);
        overlaysRef.current.push(polyline);

        if (fitOnUpdate) {
          const bounds = new google.maps.LatLngBounds();
          path.forEach((p) => bounds.extend(p));
          map.fitBounds(bounds, { padding: 60 });
        } else if (autoZoomOnFirstPoint) {
          map.setCenter(path[path.length - 1]);
          map.setZoom(16);
        }
      }

      const last = locations[locations.length - 1];
      if (last) {
        const marker = new google.maps.Marker({
          position: { lat: last.latitude, lng: last.longitude },
          map,
          title: "Current location",
        });
        const info = new google.maps.InfoWindow({
          content: `<strong>Current Location</strong><br/><small>${new Date(
            last.timestamp
          ).toLocaleString()}</small>`,
        });
        marker.addListener("click", () => {
          info.open({ map, anchor: marker });
        });
        info.open({ map, anchor: marker });
        overlaysRef.current.push(marker);
        overlaysRef.current.push(info);
      }

      // Wi-Fi devices
      if (Array.isArray(wifiDevices)) {
        wifiDevices.forEach((d) => {
          const marker = new google.maps.Circle({
            center: { lat: d.latitude, lng: d.longitude },
            radius: 8,
            strokeColor: "#38bdf8",
            strokeOpacity: 1,
            strokeWeight: 1,
            fillColor: "#0ea5e9",
            fillOpacity: 0.9,
            map,
          });
          const info = new google.maps.InfoWindow({
            content:
              `<strong>Wi-Fi</strong><br/>SSID: ${d.ssid || "(hidden)"}<br/>BSSID: ${d.bssid}` +
              `<br/>Samples: ${d.count}` +
              `<br/>Avg RSSI: ${
                d.avgRssi != null ? `${Math.round(d.avgRssi)} dBm` : "–"
              }` +
              `<br/><small>${
                d.firstSeen ? `First: ${new Date(d.firstSeen).toLocaleString()}<br/>` : ""
              }${d.lastSeen ? `Last: ${new Date(d.lastSeen).toLocaleString()}` : ""}</small>`,
          });
          marker.addListener("click", (e: any) => {
            info.setPosition(e.latLng);
            info.open({ map });
          });
          overlaysRef.current.push(marker);
          overlaysRef.current.push(info);
        });
      }

      // Bluetooth devices
      if (Array.isArray(bleDevices)) {
        bleDevices.forEach((d) => {
          const marker = new google.maps.Circle({
            center: { lat: d.latitude, lng: d.longitude },
            radius: 8,
            strokeColor: "#a855f7",
            strokeOpacity: 1,
            strokeWeight: 1,
            fillColor: "#c4b5fd",
            fillOpacity: 0.9,
            map,
          });
          const info = new google.maps.InfoWindow({
            content:
              `<strong>Bluetooth</strong><br/>Name: ${d.name || "(unknown)"}<br/>Address: ${d.address}` +
              `<br/>Samples: ${d.count}` +
              `<br/>Avg RSSI: ${
                d.avgRssi != null ? `${Math.round(d.avgRssi)} dBm` : "–"
              }` +
              `<br/><small>${
                d.firstSeen ? `First: ${new Date(d.firstSeen).toLocaleString()}<br/>` : ""
              }${d.lastSeen ? `Last: ${new Date(d.lastSeen).toLocaleString()}` : ""}</small>`,
          });
          marker.addListener("click", (e: any) => {
            info.setPosition(e.latLng);
            info.open({ map });
          });
          overlaysRef.current.push(marker);
          overlaysRef.current.push(info);
        });
      }
    }

    initAndRender();

    return () => {
      cancelled = true;
    };
  }, [apiKey, locations, currentLocation, fitOnUpdate, autoZoomOnFirstPoint, snappedGeoJson, wifiDevices, bleDevices]);

  return <div ref={containerRef} className="w-full h-full rounded-xl" />;
}

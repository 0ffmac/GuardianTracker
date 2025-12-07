"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MapPin, Clock, TrendingUp, Activity, CalendarDays } from "lucide-react";
 
const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const Google3DMap = dynamic(() => import("@/components/Google3DMap"), { ssr: false });


// Map imported directly; render only when hasMounted to avoid SSR issues.

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  deviceId: string | null;
  timestamp: string;
}

interface TrackingSession {
  id: string;
  name: string | null;
  startTime: string;
  endTime: string;
  locations: Location[];
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

export default function DashboardMapPage() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Do not early-return before other hooks to avoid hook order mismatches
  const [locations, setLocations] = useState<Location[]>([]);
  const [trackingSessions, setTrackingSessions] = useState<TrackingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [snappedGeoJson, setSnappedGeoJson] = useState<any | null>(null);
  const [osrmConfidence, setOsrmConfidence] = useState<number | null>(null);
  const [showSnapped, setShowSnapped] = useState(true);

  const [wifiDevices, setWifiDevices] = useState<WifiDevicePoint[]>([]);
  const [bleDevices, setBleDevices] = useState<BleDevicePoint[]>([]);
  const [showWifiDevices, setShowWifiDevices] = useState(true);
  const [showBleDevices, setShowBleDevices] = useState(true);

  const [useGoogle3DMaps, setUseGoogle3DMaps] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);

  const handleExportWigle = () => {
    if (!selectedSessionId) return;
    const url = `/api/export/wigle?trackingSessionId=${encodeURIComponent(selectedSessionId)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  const [nearbySuspiciousCount, setNearbySuspiciousCount] = useState<number | null>(null);
  const [nearbySuspiciousLoading, setNearbySuspiciousLoading] = useState(false);
  const [nearbySuspiciousError, setNearbySuspiciousError] = useState<string | null>(null);

  // Load tracking sessions and initial selection
  useEffect(() => {
    const fetchLocationHistory = async () => {
      const res = await fetch("/api/locations");
      const data = await res.json();
      const sessions: TrackingSession[] = (data.trackingSessions || []) as TrackingSession[];
      setTrackingSessions(sessions);

      if (sessions.length === 0) {
        setSelectedSessionId(null);
        setLocations([]);
        return;
      }

      setSelectedSessionId((prev) => prev ?? sessions[0].id);
    };
    fetchLocationHistory();
  }, []);

  // Load per-user map settings (Google 3D preference + API key)
  useEffect(() => {
    if (!hasMounted) return;
    const fetchMapSettings = async () => {
      try {
        const res = await fetch("/api/user/maps");
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.useGoogle3DMaps === "boolean") {
          setUseGoogle3DMaps(data.useGoogle3DMaps);
        }
        if (typeof data.googleMapsApiKey === "string") {
          setGoogleMapsApiKey(data.googleMapsApiKey || null);
        }
      } catch (err) {
        console.error("[dashboard-map] Failed to load map settings", err);
      }
    };
    fetchMapSettings();
  }, [hasMounted]);

  // Load Wi-Fi/BLE devices positions globally (all sessions) for map visualization
  useEffect(() => {
    const fetchDevicesForMap = async () => {
      try {
        const res = await fetch("/api/environment/devices_for_map");
        if (!res.ok) {
          setWifiDevices([]);
          setBleDevices([]);
          return;
        }
        const data = await res.json();
        const wifi: WifiDevicePoint[] = (data.wifi || []).map((w: any) => ({
          bssid: w.bssid,
          ssid: w.ssid ?? null,
          latitude: w.latitude,
          longitude: w.longitude,
          count: w.count ?? 0,
          avgRssi: w.avgRssi ?? null,
          firstSeen: w.firstSeen,
          lastSeen: w.lastSeen,
        }));
        const ble: BleDevicePoint[] = (data.ble || []).map((b: any) => ({
          address: b.address,
          name: b.name ?? null,
          latitude: b.latitude,
          longitude: b.longitude,
          count: b.count ?? 0,
          avgRssi: b.avgRssi ?? null,
          firstSeen: b.firstSeen,
          lastSeen: b.lastSeen,
        }));
        setWifiDevices(wifi);
        setBleDevices(ble);
      } catch (e) {
        console.error("Failed to load global devices_for_map", e);
        setWifiDevices([]);
        setBleDevices([]);
      }
    };

    fetchDevicesForMap();
  }, []);

  // Update locations + snapped route when selected session changes
  useEffect(() => {
    if (!selectedSessionId) {
      setLocations([]);
      setSnappedGeoJson(null);
      setOsrmConfidence(null);
      return;
    }

    const session = trackingSessions.find((s) => s.id === selectedSessionId);
    setLocations(session ? session.locations : []);
    setSnappedGeoJson(null);
    setOsrmConfidence(null);

    // Fetch snapped polyline if enough points

    if (session && session.locations.length >= 2) {

      const points = session.locations.map((loc) => ({
        lat: loc.latitude,
        lon: loc.longitude,
        timestamp: Math.floor(new Date(loc.timestamp).getTime() / 1000),
      }));

      fetch("/api/map_match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.snapped) setSnappedGeoJson(data.snapped);
          if (typeof data.confidence === "number") setOsrmConfidence(data.confidence);
        })
        .catch(() => {
          setSnappedGeoJson(null);
          setOsrmConfidence(null);
        });
    }
  }, [selectedSessionId, trackingSessions]);

  // Check for suspicious devices near the last known location of this session's primary device
  useEffect(() => {
    if (!hasMounted) return;
    if (!locations || locations.length === 0) {
      setNearbySuspiciousCount(null);
      setNearbySuspiciousError(null);
      return;
    }

    const deviceIds = Array.from(new Set(locations.map((l) => l.deviceId).filter(Boolean)));
    const primaryDeviceId = deviceIds[0] as string | undefined;

    if (!primaryDeviceId) {
      setNearbySuspiciousCount(null);
      setNearbySuspiciousError(null);
      return;
    }

    let cancelled = false;

    async function fetchNearbySuspicious() {
      setNearbySuspiciousLoading(true);
      setNearbySuspiciousError(null);
      try {
        const idForQuery = primaryDeviceId ?? "";
        const res = await fetch(
          `/api/tracked_devices/nearby?user_device_id=${encodeURIComponent(idForQuery)}`
        );
        if (!res.ok) {
          // Treat "no data" style errors as simply "no suspicious devices".
          if (res.status === 400 || res.status === 404) {
            if (!cancelled) {
              setNearbySuspiciousCount(0);
            }
            return;
          }
          throw new Error("Failed to load nearby suspicious devices");
        }
        const data = await res.json();
        if (!cancelled) {
          setNearbySuspiciousCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (err) {
        console.error("[map] Failed to load nearby suspicious devices", err);
        if (!cancelled) {
          setNearbySuspiciousError("Could not check for suspicious devices nearby.");
          setNearbySuspiciousCount(null);
        }
      } finally {
        if (!cancelled) {
          setNearbySuspiciousLoading(false);
        }
      }
    }

    fetchNearbySuspicious();

    return () => {
      cancelled = true;
    };
  }, [hasMounted, locations]);

  // Stats for the selected session
  const stats = useMemo(() => {
    if (!locations || locations.length === 0) return null;

    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let distance = 0;
    for (let i = 1; i < locations.length; i++) {
      distance += haversine(
        locations[i - 1].latitude,
        locations[i - 1].longitude,
        locations[i].latitude,
        locations[i].longitude
      );
    }

    const duration = Math.floor(
      (new Date(locations[locations.length - 1].timestamp).getTime() -
        new Date(locations[0].timestamp).getTime()) /
        1000 /
        60
    );

    const points = locations.length;
    const deviceIds = Array.from(new Set(locations.map((l) => l.deviceId).filter(Boolean)));
    const start = locations[0].timestamp;
    const end = locations[locations.length - 1].timestamp;

    return { distance, duration, points, deviceIds, start, end };
  }, [locations]);

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8 pt-20">
        <h1 className="text-2xl font-bold mb-4">Tracking Map</h1>

        {/* Stats Card Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-gold-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-gold-500/10 text-gold-300">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gold-400">Distance</p>
                <p className="text-lg font-semibold text-gold-100">
                  {stats.distance.toFixed(2)} km
                </p>
              </div>
            </div>
            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-emerald-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-400">Duration</p>
                <p className="text-lg font-semibold text-emerald-100">{stats.duration} min</p>
              </div>
            </div>
            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-sky-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-300">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-sky-400">Points</p>
                <p className="text-lg font-semibold text-sky-100">{stats.points}</p>
              </div>
            </div>
            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-blue-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-300">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-400">Devices</p>
                <div className="flex items-center gap-2 mt-1">
                  {stats.deviceIds.length === 0 ? (
                    <span className="text-blue-100">60</span>
                  ) : (
                    stats.deviceIds.map((id) => (
                      <span
                        key={id as string}
                        className="inline-block px-2 py-1 bg-blue-900/40 text-blue-100 rounded text-xs font-mono"
                      >
                        {id as string}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-gold-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-gold-500/10 text-gold-300">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gold-400">Session</p>
                <p className="text-xs text-gold-100">
                  {new Date(stats.start).toLocaleString()}
                </p>
                <p className="text-xs text-gold-100">
                  {new Date(stats.end).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {nearbySuspiciousLoading && (
          <div className="mb-2 text-xs text-amber-200">
            Checking for suspicious devices nearby...
          </div>
        )}
        {nearbySuspiciousError && (
          <div className="mb-2 text-xs text-red-300">{nearbySuspiciousError}</div>
        )}
        {nearbySuspiciousCount !== null && nearbySuspiciousCount > 0 && (
          <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-950/70 px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm text-red-50">
              Potential stalker devices detected nearby: {" "}
              <span className="font-semibold">{nearbySuspiciousCount}</span>. {" "}
              See details in Settings 20 Suspicious devices.
            </div>
          </div>
        )}

        <div className="mt-4 p-6 bg-gold-900/20 rounded-2xl border border-gold-400/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <label htmlFor="session-select" className="mr-2">
                Session:
              </label>
              <select
                id="session-select"
                value={selectedSessionId || ""}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full md:w-64 p-3 bg-gold-900/40 border border-gold-400/30 rounded-lg text-gold-100 appearance-none cursor-pointer focus:ring-gold-500 focus:border-gold-500 font-semibold"
              >
                {trackingSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `Session ${new Date(s.startTime).toLocaleString()}`}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleExportWigle}
              disabled={!selectedSessionId}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-black text-sm font-semibold shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export all to Wigle
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showSnapped}
                onChange={() => setShowSnapped((v) => !v)}
                className="form-checkbox h-5 w-5 text-green-500"
              />
              <span className="ml-2 text-gold-100 font-medium">
                Show snapped (map-matched) route
              </span>
            </label>
            {showSnapped && osrmConfidence !== null && (
              <span className="px-3 py-1 rounded-full bg-green-700/80 text-green-100 text-xs font-semibold">
                OSRM confidence: {(osrmConfidence * 100).toFixed(1)}%
              </span>
            )}
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showWifiDevices}
                onChange={() => setShowWifiDevices((v) => !v)}
                className="form-checkbox h-5 w-5 text-sky-500"
              />
              <span className="ml-2 text-gold-100 font-medium">Show Wi-Fi devices</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showBleDevices}
                onChange={() => setShowBleDevices((v) => !v)}
                className="form-checkbox h-5 w-5 text-purple-500"
              />
              <span className="ml-2 text-gold-100 font-medium">Show Bluetooth devices</span>
            </label>
          </div>
        </div>

        <div className="h-[500px] rounded-xl overflow-hidden mt-4">
          {hasMounted && (
            useGoogle3DMaps && googleMapsApiKey ? (
              <Google3DMap
                apiKey={googleMapsApiKey}
                locations={locations}
                currentLocation={locations[locations.length - 1] || null}
                fitOnUpdate
                autoZoomOnFirstPoint
                snappedGeoJson={showSnapped ? snappedGeoJson : null}
                wifiDevices={showWifiDevices ? wifiDevices : []}
                bleDevices={showBleDevices ? bleDevices : []}
              />
            ) : (
              <Map
                locations={locations}
                currentLocation={locations[locations.length - 1] || null}
                fitOnUpdate
                autoZoomOnFirstPoint
                snappedGeoJson={showSnapped ? snappedGeoJson : null}
                wifiDevices={showWifiDevices ? wifiDevices : []}
                bleDevices={showBleDevices ? bleDevices : []}
              />
            )
          )}
        </div>

        <div className="mt-6 p-6 bg-gold-900/20 rounded-2xl border border-gold-400/20 overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">Points for Selected Session</h2>
          {locations.length === 0 ? (
            <p className="text-sm text-gold-300/80">
              No points recorded for this session yet.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gold-300/80 border-b border-gold-400/30">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Latitude</th>
                  <th className="py-2 pr-4">Longitude</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, index) => (
                  <tr
                    key={loc.id}
                    className="border-b border-gold-400/10 last:border-b-0"
                  >
                    <td className="py-1 pr-4 text-gold-100">{index + 1}</td>
                    <td className="py-1 pr-4 text-gold-100">
                      {new Date(loc.timestamp).toLocaleString()}
                    </td>
                    <td className="py-1 pr-4 text-gold-100 font-mono text-xs">
                      {loc.latitude.toFixed(6)}
                    </td>
                    <td className="py-1 pr-4 text-gold-100 font-mono text-xs">
                      {loc.longitude.toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

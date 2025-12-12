"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
 
 import { Footer } from "@/components/Footer";
import { MapPin, Clock, TrendingUp, Activity, CalendarDays, DownloadCloud, Bluetooth, ChevronDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
 
const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const Google3DMap = dynamic(() => import("@/components/Google3DMap"), { ssr: false });


// Map imported directly; render only when hasMounted to avoid SSR issues.

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  deviceId: string | null;
  timestamp: string;
  source?: "gps" | "wifi" | "hybrid" | null;
}

interface TrackingSession {
  id: string;
  name: string | null;
  quality?: "GOOD" | "REGULAR" | "BAD" | null;
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
  const { t } = useLanguage();
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
  const [sessionQualityFilter, setSessionQualityFilter] = useState<"ALL" | "GOOD" | "REGULAR" | "BAD">("ALL");
  const [sessionSearch, setSessionSearch] = useState("");

  const [useGoogle3DMaps, setUseGoogle3DMaps] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);

  const [focusKind, setFocusKind] = useState<"wifi" | "ble" | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const kind = params.get("focusKind");
      const key = params.get("focusKey");
      if (kind === "wifi" || kind === "ble") {
        setFocusKind(kind);
      }
      if (key) {
        setFocusKey(key);
      }
    } catch {
      // ignore malformed URLs
    }
  }, []);

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
      const rawSessions: any[] = data.trackingSessions || [];
      const sessions: TrackingSession[] = rawSessions.map((s) => ({
        id: s.id,
        name: s.name ?? null,
        quality: s.quality ?? null,
        startTime: s.startTime,
        endTime: s.endTime,
        locations: (s.locations || []) as Location[],
      }));
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

  const filteredTrackingSessions = useMemo(() => {
    let base = trackingSessions;

    if (sessionQualityFilter !== "ALL") {
      base = base.filter((s) => {
        const q = s.quality ?? "REGULAR";
        return q === sessionQualityFilter;
      });
    }

    const term = sessionSearch.trim().toLowerCase();
    if (!term) return base;

    return base.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const dateLabel = new Date(s.startTime).toLocaleString().toLowerCase();
      return name.includes(term) || dateLabel.includes(term);
    });
  }, [trackingSessions, sessionQualityFilter, sessionSearch]);

  // When the quality or search filter changes, ensure the selected session is still visible
  useEffect(() => {
    if (filteredTrackingSessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }
    if (!selectedSessionId) {
      setSelectedSessionId(filteredTrackingSessions[0].id);
      return;
    }
    const exists = filteredTrackingSessions.some((s) => s.id === selectedSessionId);
    if (!exists) {
      setSelectedSessionId(filteredTrackingSessions[0].id);
    }
  }, [filteredTrackingSessions, selectedSessionId]);

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

  const focusedWifiDevices = useMemo(() => {
    if (focusKind !== "wifi" || !focusKey) return wifiDevices;
    return wifiDevices.filter((d) => d.bssid === focusKey);
  }, [wifiDevices, focusKind, focusKey]);

  const focusedBleDevices = useMemo(() => {
    if (focusKind !== "ble" || !focusKey) return bleDevices;
    return bleDevices.filter((d) => d.address === focusKey);
  }, [bleDevices, focusKind, focusKey]);

  const selectedSession =
    trackingSessions.find((s) => s.id === selectedSessionId) || null;



  let togglePillActiveBg = "bg-gold-500";
  let toggleRingActive = "ring-2 ring-gold-400/40";

  if (selectedSession?.quality === "GOOD") {
    togglePillActiveBg = "bg-emerald-400";
    toggleRingActive = "ring-2 ring-emerald-500/40";
  } else if (selectedSession?.quality === "REGULAR") {
    togglePillActiveBg = "bg-amber-400";
    toggleRingActive = "ring-2 ring-amber-400/40";
  } else if (selectedSession?.quality === "BAD") {
    togglePillActiveBg = "bg-red-500";
    toggleRingActive = "ring-2 ring-red-500/40";
  }

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
                 <p className="text-xs uppercase tracking-wide text-gold-400">{t('dashboard.history.stat.distance')}</p>

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
                 <p className="text-xs uppercase tracking-wide text-emerald-400">{t('dashboard.history.stat.duration')}</p>

                <p className="text-lg font-semibold text-emerald-100">{stats.duration} min</p>
              </div>
            </div>
            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-sky-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-300">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-xs uppercase tracking-wide text-sky-400">{t('dashboard.history.stat.points')}</p>

                <p className="text-lg font-semibold text-sky-100">{stats.points}</p>
              </div>
            </div>
            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-blue-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-300">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-xs uppercase tracking-wide text-blue-400">{t('dashboard.history.stat.devices')}</p>

                <div className="flex items-center gap-2 mt-1">
                  {stats.deviceIds.length === 0 ? (
                    <span className="text-blue-100">60</span>
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
                 <p className="text-xs uppercase tracking-wide text-gold-400">{t('dashboard.map.session.label')}</p>

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
            {t("dashboard.map.suspicious.checking")}
          </div>
        )}
        {nearbySuspiciousError && (
          <div className="mb-2 text-xs text-red-300">
            {t("dashboard.map.suspicious.error")}
          </div>
        )}
        {nearbySuspiciousCount !== null && nearbySuspiciousCount > 0 && (
          <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-950/70 px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm text-red-50">
              {t("dashboard.map.suspicious.bannerPrefix")} 
              <span className="font-semibold">{nearbySuspiciousCount}</span>
              {t("dashboard.map.suspicious.bannerSuffix")}
            </div>
          </div>
        )}


        <div className="mt-4 p-6 bg-gold-900/20 rounded-2xl border border-gold-400/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch">
            {/* Session box */}
            <div className="md:col-span-2 flex flex-col justify-between bg-gold-900/30 border border-gold-400/30 rounded-xl px-3 py-2">
               <label
                 htmlFor="session-select"
                 className="text-xs font-semibold uppercase tracking-wide text-gold-300 mb-1"
               >
                {t('dashboard.map.session.label')}
               </label>

              <div className="relative mt-1">
                {selectedSession?.quality && (
                  <span
                    className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full ${
                      selectedSession.quality === 'GOOD'
                        ? 'bg-emerald-400'
                        : selectedSession.quality === 'BAD'
                        ? 'bg-red-500'
                        : 'bg-amber-400'
                    }`}
                  />
                )}
                <select
                  id="session-select"
                  value={selectedSessionId || ""}
                  onChange={(e) => setSelectedSessionId(e.target.value || null)}
                  className="w-full rounded-lg bg-gold-900/40 border border-gold-400/40 pl-8 pr-8 py-2 text-sm text-gold-100 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 font-semibold"
                >
                  {filteredTrackingSessions.map((s) => {
                    const baseLabel = s.name || `Session ${new Date(s.startTime).toLocaleString()}`;
                    return (
                      <option key={s.id} value={s.id}>
                        {baseLabel}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-300" />
              </div>
            </div>

            {/* Quality box */}
            <div className="flex flex-col justify-between bg-gold-900/30 border border-gold-400/30 rounded-xl px-3 py-2">
               <label
                 htmlFor="quality-filter"
                 className="text-xs font-semibold uppercase tracking-wide text-gold-300 mb-1"
               >
                {t('dashboard.map.quality.label')}
               </label>

              <select
                id="quality-filter"
                value={sessionQualityFilter}
                onChange={(e) => setSessionQualityFilter(e.target.value as "ALL" | "GOOD" | "REGULAR" | "BAD")}
                className="mt-1 w-full rounded-lg bg-gold-900/40 border border-gold-400/40 px-3 py-2 text-sm text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
               >
                <option value="ALL">{t('dashboard.map.quality.all')}</option>
                <option value="GOOD">{t('dashboard.map.quality.good')}</option>
                <option value="REGULAR">{t('dashboard.map.quality.regular')}</option>
                <option value="BAD">{t('dashboard.map.quality.bad')}</option>
               </select>

            </div>

            {/* Search box */}
            <div className="flex flex-col justify-between bg-gold-900/30 border border-gold-400/30 rounded-xl px-3 py-2">
               <label
                 htmlFor="search-input"
                 className="text-xs font-semibold uppercase tracking-wide text-gold-300 mb-1"
               >
                {t('dashboard.map.search.label')}
               </label>

               <input
                 id="search-input"
                 type="text"
                 value={sessionSearch}
                 onChange={(e) => setSessionSearch(e.target.value)}
                placeholder={t("dashboard.map.search.placeholder")}
                 className="mt-1 w-full rounded-lg bg-gold-900/40 border border-gold-400/40 px-3 py-2 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
               />

            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            {/* Route button */}
             <button
               type="button"
               onClick={() => setShowSnapped((v) => !v)}
               className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-black shadow-sm transition-colors ${
                 showSnapped ? 'border-gold-300 bg-gold-500/80 shadow-gold-500/30' : 'border-gold-500 bg-gold-600/70'
               }`}
              title={t("dashboard.map.buttons.route.title")}
             >

              <svg
                className="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </button>

            {/* Wi-Fi button */}
             <button
               type="button"
               onClick={() => setShowWifiDevices((v) => !v)}
               className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-black shadow-sm transition-colors ${
                 showWifiDevices ? 'border-gold-300 bg-gold-500/80 shadow-gold-500/30' : 'border-gold-500 bg-gold-600/70'
               }`}
              title={t("dashboard.map.buttons.wifi.title")}
             >

              <svg
                className="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                />
              </svg>
            </button>

            {/* Bluetooth button */}
             <button
               type="button"
               onClick={() => setShowBleDevices((v) => !v)}
               className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-black shadow-sm transition-colors ${
                 showBleDevices ? 'border-gold-300 bg-gold-500/80 shadow-gold-500/30' : 'border-gold-500 bg-gold-600/70'
               }`}
              title={t("dashboard.map.buttons.ble.title")}
             >

              <Bluetooth className="w-5 h-5 text-black" />
            </button>

            {/* Export button */}
             <button
               type="button"
               onClick={handleExportWigle}
               disabled={!selectedSessionId}
               className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 hover:bg-gold-400 text-black shadow disabled:opacity-50 disabled:cursor-not-allowed"
              title={t("dashboard.map.buttons.export.title")}
             >
              <span className="sr-only">{t("dashboard.map.buttons.export.sr")}</span>
               <DownloadCloud className="w-5 h-5" />
             </button>

          </div>


            {showSnapped && osrmConfidence !== null && (
 
             <div className="mt-3">
               <span className="px-3 py-1 rounded-full bg-green-700/80 text-green-100 text-xs font-semibold">
                {t('dashboard.map.osrm.confidencePrefix')} {(osrmConfidence * 100).toFixed(1)}%
               </span>
             </div>

          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-200">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
            <span>{t("dashboard.map.legend.gps")}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
            <span>{t("dashboard.map.legend.wifi")}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>{t("dashboard.map.legend.hybrid")}</span>
          </span>
          {focusKey && focusKind && (
            <span className="inline-flex items-center gap-1 text-amber-200">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              <span>
                {t("dashboard.map.legend.focusPrefix")} {focusKind === "wifi" ? t("dashboard.map.legend.focus.wifi") : t("dashboard.map.legend.focus.ble")} {" "}
                <span className="font-mono">{focusKey}</span>
              </span>
            </span>
          )}
        </div>


        <div className="mt-6 p-6 bg-gold-900/20 rounded-2xl border border-gold-400/20"></div>
      </main>
      <Footer />
    </div>
  );
}
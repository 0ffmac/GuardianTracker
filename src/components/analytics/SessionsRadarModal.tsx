"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import dynamic from "next/dynamic";
import { Bluetooth, Smartphone, Router } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export type OverlapDevice = {
  kind: "wifi" | "ble";
  key: string;
  label: string;
  totalCount: number;
  sessionCount: number;
  sessions: { id: string; name: string; count: number }[];
  isTrusted: boolean;
  trustedSourceLabel?: string | null;
  distanceKey: string;
  avgMeters?: number | null;
  minMeters?: number | null;
};

export type EnvironmentDeviceWifi = {
  bssid: string;
  manufacturer?: string | null;
};

export type EnvironmentDeviceBle = {
  address: string;
  manufacturer?: string | null;
};

type SessionMapLocation = {
  id: string;
  latitude: number;
  longitude: number;
  deviceId: string | null;
  timestamp: string;
  source?: "gps" | "wifi" | "hybrid" | null;
};

const InlineMap = dynamic(() => import("@/components/Map"), { ssr: false });

export type TrackingSessionLite = {

  id: string;
  name: string | null;
  startTime: string | null;
  endTime: string | null;
  quality: string | null;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;

  fromIso: string;
  toIso: string;

  trackingSessions: TrackingSessionLite[];
  filteredSessions: TrackingSessionLite[];
  selectedSessionIds: string[];
  setSelectedSessionIds: (updater: (prev: string[]) => string[]) => void;

  filteredOverlapDevices: OverlapDevice[];
  envWifiDevices: EnvironmentDeviceWifi[];
  envBleDevices: EnvironmentDeviceBle[];

  deviceKindFilter: "all" | "wifi" | "ble";
  setDeviceKindFilter: (k: "all" | "wifi" | "ble") => void;
  hideTrusted: boolean;
  setHideTrusted: (v: boolean) => void;

  openDeviceOnMap: (device: OverlapDevice) => void;
}

type ModalDevice = OverlapDevice & {
  manufacturer?: string | null;
  iconKind: "mobile" | "router" | "bluetooth";
};

export function SessionsRadarModal(props: Props) {
  const {
    isOpen,
    onClose,
    fromIso,
    toIso,
    trackingSessions,
    filteredSessions,
    selectedSessionIds,
    setSelectedSessionIds,
    filteredOverlapDevices,
    envWifiDevices,
    envBleDevices,
    deviceKindFilter,
    setDeviceKindFilter,
    hideTrusted,
    setHideTrusted,
    openDeviceOnMap,
  } = props;

  const { t } = useLanguage();

  const [selectedModalDevice, setSelectedModalDevice] =
    useState<ModalDevice | null>(null);
  const [deviceDistances, setDeviceDistances] = useState<
    Map<string, { avgMeters: number | null; minMeters: number | null }>
  >(new Map());
  const [zoomLevel, setZoomLevel] = useState<"near" | "medium" | "far">("medium");
  const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null);

  const [sessionMapLocations, setSessionMapLocations] = useState<
    Record<string, SessionMapLocation[]>
  >({});
  const [sessionMapIds, setSessionMapIds] = useState<string[]>([]);
  const [sessionMapsLoading, setSessionMapsLoading] = useState(false);
  const [sessionMapsError, setSessionMapsError] = useState<"no-data" | "load-failed" | null>(null);

  const getDeviceColor = (
    iconKind: ModalDevice["iconKind"],
    strength: number
  ) => {
    const clamped = Math.max(0.2, Math.min(1, strength || 0));
    const alpha = 0.3 + clamped * 0.7;

    if (iconKind === "bluetooth") return `rgba(168, 85, 247, ${alpha})`;
    if (iconKind === "mobile") return `rgba(16, 185, 129, ${alpha})`;
    return `rgba(251, 146, 60, ${alpha})`;
  };

  // Fetch per-device distance statistics (in meters) for the current time range
  useEffect(() => {
    if (!isOpen) return;

    const fetchDistances = async () => {
      try {
        const params = new URLSearchParams({ from: fromIso, to: toIso }).toString();
        const res = await fetch(`/api/analytics/device_distances?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        const map = new Map<string, { avgMeters: number | null; minMeters: number | null }>();
        for (const d of (data.devices || []) as any[]) {
          const dk = d.distanceKey as string;
          map.set(dk, {
            avgMeters: d.avgMeters ?? null,
            minMeters: d.minMeters ?? null,
          });
        }
        setDeviceDistances(map);
      } catch (err) {
        console.error("Failed to load device distances", err);
      }
    };

    void fetchDistances();
  }, [isOpen, fromIso, toIso]);

  const modalDevices = useMemo<ModalDevice[]>(() => {
    if (filteredOverlapDevices.length === 0) return [];

    const wifiMap = new Map(envWifiDevices.map((w) => [w.bssid, w]));
    const bleMap = new Map(envBleDevices.map((b) => [b.address, b]));

    const classifyIcon = (
      base: OverlapDevice,
      manufacturer: string | null
    ): ModalDevice["iconKind"] => {
      if (base.kind === "ble") return "bluetooth";
      const label = base.label.toLowerCase();
      const vendor = (manufacturer || "").toLowerCase();
      if (
        /iphone|ipad|android|galaxy|pixel|hotspot/.test(label) ||
        /apple|samsung|oppo|xiaomi|huawei|oneplus/.test(vendor)
      ) {
        return "mobile";
      }
      return "router";
    };

    return filteredOverlapDevices.map((d) => {
      let manufacturer: string | null = null;
      if (d.kind === "wifi") {
        const env = wifiMap.get(d.key);
        manufacturer = env?.manufacturer ?? null;
      } else {
        const env = bleMap.get(d.key);
        manufacturer = env?.manufacturer ?? null;
      }
      const dist = deviceDistances.get(d.distanceKey) || null;
      const iconKind = classifyIcon(d, manufacturer);
      return {
        ...d,
        manufacturer,
        iconKind,
        avgMeters: dist?.avgMeters ?? null,
        minMeters: dist?.minMeters ?? null,
      };
    });
  }, [filteredOverlapDevices, envWifiDevices, envBleDevices, deviceDistances]);

  const radarDevicesFull = useMemo<ModalDevice[]>(() => {
    const max = 10;
    if (modalDevices.length === 0) return [];
    const suspicious = modalDevices.filter((d) => !d.isTrusted);
    const trustedList = modalDevices.filter((d) => d.isTrusted);
    const ordered = [...suspicious, ...trustedList].slice(0, max);
    return ordered;
  }, [modalDevices]);

  const modalRadarStats = useMemo(
    () => {
      if (radarDevicesFull.length === 0) {
        return { maxSessionCount: 1, maxTotalCount: 1 };
      }
      let maxSessionCount = 1;
      let maxTotalCount = 1;
      radarDevicesFull.forEach((d) => {
        if (d.sessionCount > maxSessionCount) maxSessionCount = d.sessionCount;
        if (d.totalCount > maxTotalCount) maxTotalCount = d.totalCount;
      });
      return { maxSessionCount, maxTotalCount };
    },
    [radarDevicesFull]
  );

  const hoveredDevice = useMemo(
    () =>
      hoveredDeviceId
        ?
            radarDevicesFull.find((d) => `${d.kind}-${d.key}` === hoveredDeviceId) ??
          null
        : null,
    [hoveredDeviceId, radarDevicesFull]
  );

  const groupedModalDevices = useMemo(() => {
    const groups: Record<"mobile" | "router" | "bluetooth", ModalDevice[]> = {
      mobile: [],
      router: [],
      bluetooth: [],
    };

    modalDevices.forEach((d) => {
      groups[d.iconKind].push(d);
    });

    return groups;
  }, [modalDevices]);

  const renderDeviceIcon = (d: ModalDevice) => {
    const size = 12;
    if (d.iconKind === "bluetooth") {
      return <Bluetooth className="w-3 h-3" style={{ width: size, height: size }} />;
    }
    if (d.iconKind === "mobile") {
      return <Smartphone className="w-3 h-3" style={{ width: size, height: size }} />;
    }
    return <Router className="w-3 h-3" style={{ width: size, height: size }} />;
  };

  const bandEdgesByZoom: Record<"near" | "medium" | "far", number[]> = {
    // Near: focus on 0–5m only
    near: [0, 5],
    // Medium: show 0–20m with a bit more spread
    medium: [0, 5, 10, 20],
    // Far: full range up to ~30m
    far: [0, 5, 10, 20, 30],
  };

  const ringParamsByZoom: Record<"near" | "medium" | "far", { base: number; step: number }> = {
    // Near: single ring, slightly inset so bottom nodes stay visible
    near: { base: 80, step: 0 },
    medium: { base: 30, step: 18 },
    far: { base: 10, step: 18 },
  };

  const bandEdges = bandEdgesByZoom[zoomLevel];
  const { base: ringBaseSize, step: ringStep } = ringParamsByZoom[zoomLevel];

  const ringRadii = bandEdges.slice(1).map((_, idx) => {
    const size = ringBaseSize + (idx + 1) * ringStep;
    return size / 2;
  });

  const getBandRadius = (bandIndex: number) => {
    if (ringRadii.length === 0) return 20;
    // 0 and 1 share the innermost ring (0–5m bucket)
    if (bandIndex <= 1) return ringRadii[0];
    const idx = Math.min(bandIndex - 1, ringRadii.length - 1);
    return ringRadii[idx];
  };

  const handleShowSessionMap = async (sessionId: string) => {
    setSessionMapsError(null);

    if (sessionMapLocations[sessionId]) {
      setSessionMapIds((prev) =>
        prev.includes(sessionId) ? prev : [...prev, sessionId]
      );
      return;
    }

    setSessionMapsLoading(true);
    try {
      let byId = sessionMapLocations;

      if (Object.keys(byId).length === 0) {
        const res = await fetch("/api/locations");
        if (!res.ok) {
          throw new Error("Failed to load session locations");
        }
        const data = await res.json();
        const rawSessions: any[] = data.trackingSessions || [];
        const nextById: Record<string, SessionMapLocation[]> = {};
        for (const s of rawSessions) {
          const sid = String(s.id);
          const locs = (s.locations || []) as any[];
          nextById[sid] = locs.map((l) => ({
            id: String(l.id),
            latitude: l.latitude,
            longitude: l.longitude,
            deviceId: l.deviceId ?? null,
            timestamp: l.timestamp,
            source: l.source ?? null,
          }));
        }
        byId = { ...byId, ...nextById };
        setSessionMapLocations(byId);
      }

      if (byId[sessionId] && byId[sessionId].length > 0) {
        setSessionMapIds((prev) =>
          prev.includes(sessionId) ? prev : [...prev, sessionId]
        );
      } else {
        setSessionMapsError("no-data");
      }
    } catch (err: any) {
      console.error("[SessionsRadarModal] Failed to load session map", err);
      setSessionMapsError("load-failed");
    } finally {
      setSessionMapsLoading(false);
    }
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm overflow-y-auto flex items-start justify-center pt-24 pb-4">
      <div className="relative w-full max-w-7xl bg-surface rounded-2xl border border-white/20 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 gap-4">
          <h2 className="text-sm font-semibold">
            {t('analytics.modal.title')}
          </h2>

          <div className="flex items-center gap-3 text-[11px] text-gray-300">
            {/* Device kind filter */}
            <div className="inline-flex items-center gap-1 rounded-full bg-black/40 border border-white/15 p-1">
               <button
                 type="button"
                 onClick={() => setDeviceKindFilter("all")}
                 className={`px-2 py-0.5 rounded-full ${
                   deviceKindFilter === "all" ? "bg-white text-black" : "text-gray-300"
                 }`}
               >
                 {t('analytics.modal.deviceKind.all')}
               </button>
               <button
                 type="button"
                 onClick={() => setDeviceKindFilter("wifi")}
                 className={`px-2 py-0.5 rounded-full ${
                   deviceKindFilter === "wifi" ? "bg-white text-black" : "text-gray-300"
                 }`}
               >
                 {t('analytics.modal.deviceKind.wifi')}
               </button>
               <button
                 type="button"
                 onClick={() => setDeviceKindFilter("ble")}
                 className={`px-2 py-0.5 rounded-full ${
                   deviceKindFilter === "ble" ? "bg-white text-black" : "text-gray-300"
                 }`}
               >
                 {t('analytics.modal.deviceKind.ble')}
               </button>

              <button
                type="button"
                onClick={() => setDeviceKindFilter("wifi")}
                className={`px-2 py-0.5 rounded-full ${
                  deviceKindFilter === "wifi" ? "bg-white text-black" : "text-gray-300"
                }`}
              >
                Wi‑Fi
              </button>
              <button
                type="button"
                onClick={() => setDeviceKindFilter("ble")}
                className={`px-2 py-0.5 rounded-full ${
                  deviceKindFilter === "ble" ? "bg-white text-black" : "text-gray-300"
                }`}
              >
                Bluetooth
              </button>
            </div>
            {/* Hide known toggle */}
             <label className="inline-flex items-center gap-2">
               <input
                 type="checkbox"
                 checked={hideTrusted}
                 onChange={(e) => setHideTrusted(e.target.checked)}
                 className="h-3 w-3"
               />
               <span>{t('analytics.modal.hideKnown')}</span>
             </label>
             <button
               type="button"
               onClick={onClose}
               className="text-xs text-gray-300 hover:text-white"
             >
               {t('analytics.modal.close')}
             </button>

          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px,1fr] gap-4 p-4">
          {/* Left: sessions + grouped devices */}
          <div className="overflow-y-auto pr-2 text-xs">
            {/* Session selection */}
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                 {t('analytics.modal.sessions.label')}
               </p>
               {filteredSessions.length === 0 ? (
                 <p className="text-[11px] text-gray-500">
                   {t('analytics.modal.sessions.empty')}
                 </p>

              ) : (
                <ul className="space-y-1">
                  {filteredSessions.map((s) => {
                    const isActive = selectedSessionIds.includes(s.id);
                    const quality = s.quality;
                    const dotClass =
                      quality === "GOOD"
                        ? "bg-emerald-400"
                        : quality === "BAD"
                        ? "bg-red-500"
                        : quality === "REGULAR"
                        ? "bg-amber-400"
                        : "bg-gray-500";
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSessionIds((prev) =>
                              prev.includes(s.id)
                                ? prev.filter((id) => id !== s.id)
                                : [...prev, s.id]
                            );
                          }}
                          className={`w-full flex items-start justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                            isActive
                              ? "bg-white/10 border-gold-400/70"
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 h-2 w-2 rounded-full ${dotClass}`} />
                            <div>
                              <div className="text-[11px] font-semibold text-gray-100">
                                 {s.name || t('analytics.modal.sessions.fallbackName')}
                               </div>
                               <div className="text-[10px] text-gray-400">
                                 {s.startTime
                                   ? new Date(s.startTime).toLocaleString()
                                   : t('analytics.modal.sessions.unknownTime')}

                              </div>
                            </div>
                          </div>
                           <div className="text-[10px] text-gray-400">
                             {isActive
                               ? t('analytics.modal.sessions.selected')
                               : t('analytics.modal.sessions.tapToInclude')}
                           </div>

                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Devices across selected sessions */}
             <p className="text-[11px] text-gray-400 mb-2">
               {t('analytics.modal.devices.caption')}
             </p>
             {modalDevices.length === 0 ? (
               <p className="text-[11px] text-gray-500">
                 {t('analytics.modal.devices.empty')}

              </p>
            ) : (
              <div className="space-y-3">
                {/* Routers */}
                {groupedModalDevices.router.length > 0 && (
                  <div>
                    <h3 className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                       {t('analytics.modal.group.routers')} ({groupedModalDevices.router.length})
                     </h3>

                    <ul className="space-y-2">
                      {groupedModalDevices.router.map((d) => (
                        <li
                          key={d.kind + d.key}
                          className="flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 cursor-pointer hover:bg-white/10"
                          onClick={() => setSelectedModalDevice(d)}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
                                {renderDeviceIcon(d)}
                              </span>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-gray-100">
                                {d.label}
                              </div>
                              {d.manufacturer && (
                                <div className="text-[10px] text-gray-400">
                                  {d.manufacturer}
                                </div>
                              )}
                              <div className="text-[10px] text-gray-500">
                                {d.sessionCount} sessions · {d.totalCount} sightings
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {d.isTrusted
                             ? t('analytics.modal.device.known')
                             : t('analytics.modal.device.possibleTracker')}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mobiles */}
                {groupedModalDevices.mobile.length > 0 && (
                  <div>
                    <h3 className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                       {t('analytics.modal.group.mobiles')} ({groupedModalDevices.mobile.length})
                     </h3>

                    <ul className="space-y-2">
                      {groupedModalDevices.mobile.map((d) => (
                        <li
                          key={d.kind + d.key}
                          className="flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 cursor-pointer hover:bg-white/10"
                          onClick={() => setSelectedModalDevice(d)}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
                                {renderDeviceIcon(d)}
                              </span>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-gray-100">
                                {d.label}
                              </div>
                              {d.manufacturer && (
                                <div className="text-[10px] text-gray-400">
                                  {d.manufacturer}
                                </div>
                              )}
                              <div className="text-[10px] text-gray-500">
                                {d.sessionCount} sessions · {d.totalCount} sightings
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {d.isTrusted
                             ? t('analytics.modal.device.known')
                             : t('analytics.modal.device.possibleTracker')}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Bluetooth */}
                {groupedModalDevices.bluetooth.length > 0 && (
                  <div>
                    <h3 className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                       {t('analytics.modal.group.bluetooth')} ({groupedModalDevices.bluetooth.length})
                     </h3>

                    <ul className="space-y-2">
                      {groupedModalDevices.bluetooth.map((d) => (
                        <li
                          key={d.kind + d.key}
                          className="flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 cursor-pointer hover:bg-white/10"
                          onClick={() => setSelectedModalDevice(d)}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
                                {renderDeviceIcon(d)}
                              </span>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-gray-100">
                                {d.label}
                              </div>
                              {d.manufacturer && (
                                <div className="text-[10px] text-gray-400">
                                  {d.manufacturer}
                                </div>
                              )}
                              <div className="text-[10px] text-gray-500">
                                {d.sessionCount} sessions · {d.totalCount} sightings
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {d.isTrusted
                             ? t('analytics.modal.device.known')
                             : t('analytics.modal.device.possibleTracker')}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: large radar + legend + details */}
          <div
            className={`flex flex-col gap-4 ${
              zoomLevel === "near" ? "overflow-y-auto pr-2" : ""
            }`}
          >
            <div className="relative mx-auto mt-12 aspect-square w-full max-w-xl rounded-full border border-white/15 bg-gradient-to-br from-black/60 via-gray-900/60 to-gray-900/80 overflow-hidden shadow-2xl">
              {/* Animated scanning effect */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div
                  className="absolute inset-0 bg-gradient-conic from-transparent via-blue-500/10 to-transparent animate-spin"
                  style={{ animationDuration: "8s" }}
                />
              </div>

              {/* Distance rings with glow and dynamic labels */}
              {bandEdges.slice(1).map((distance, idx) => {
                const size = ringBaseSize + (idx + 1) * ringStep;
                return (
                  <div
                    key={distance}
                    className="absolute rounded-full border border-blue-400/20"
                    style={{
                      inset: `${50 - size / 2}%`,
                      boxShadow: "0 0 20px rgba(96, 165, 250, 0.1)",
                    }}
                  >
                    <div
                      className="absolute left-1/2 text-[10px] font-mono text-blue-300/70 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm"
                      style={{
                        top: "-14px",
                        transform: "translateX(-50%)",
                      }}
                    >
                      {distance}m
                    </div>
                  </div>
                );
              })}

              {/* Cardinal direction lines */}
              {[0, 90, 180, 270].map((angle) => (
                <div
                  key={angle}
                  className="absolute left-1/2 top-1/2 w-px h-1/2 bg-gradient-to-t from-blue-400/30 to-transparent origin-bottom"
                  style={{
                    transform: `translateX(-50%) rotate(${angle}deg)`,
                  }}
                />
              ))}

              {/* Center: You with pulsing effect */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20">
                <div className="relative">
                  <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-lg" />
                  <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-75" />
                  <div className="absolute inset-0 rounded-full bg-yellow-400/30 blur-xl scale-150" />
                </div>
                <span className="text-[10px] font-semibold text-yellow-300 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                   {t('analytics.modal.legend.you')}
                 </span>

              </div>

              {/* Devices */}
              {radarDevicesFull.map((d, index) => {
                const angle =
                  (index / Math.max(radarDevicesFull.length, 1)) * 2 * Math.PI;

                let effectiveMeters: number | null = d.avgMeters ?? null;
                if (effectiveMeters == null) {
                  const intensity =
                    (d.sessionCount || 1) /
                    (modalRadarStats.maxSessionCount || 1);
                  effectiveMeters =
                    bandEdges[bandEdges.length - 1] * intensity;
                }

                let bandIndex = 0;
                for (let i = 1; i < bandEdges.length; i++) {
                  if (effectiveMeters <= bandEdges[i]) {
                    bandIndex = i;
                    break;
                  }
                  bandIndex = i + 1;
                }

                const radius = getBandRadius(bandIndex);

                const x = 50 + radius * Math.cos(angle);
                const y = 50 + radius * Math.sin(angle);

                const midRadius = radius * 0.5;
                const midX = 50 + midRadius * Math.cos(angle);
                const midY = 50 + midRadius * Math.sin(angle);

                const strength =
                  modalRadarStats.maxTotalCount > 0
                    ? (d.totalCount || 1) / modalRadarStats.maxTotalCount
                    : 0.5;

                const deviceCount = radarDevicesFull.length || 1;
                const densityFactor = Math.min(deviceCount / 10, 2);

                // Map strength (0–1) into a clear visual size range
                const minSize = 20;
                const maxSize = 46;
                let size = minSize + strength * (maxSize - minSize);

                // Light global shrink when there are many devices to reduce overlap
                const densityScale = 1 / (1 + densityFactor * 0.25);
                size *= densityScale;

                const id = `${d.kind}-${d.key}`;
                const isHovered = hoveredDeviceId === id;

                const color = getDeviceColor(d.iconKind, strength);
                const rotationDeg = (angle * 180) / Math.PI;

                return (
                  <Fragment key={id}>
                    {/* Connection line */}
                    <div
                      className="absolute w-px bg-gradient-to-t from-white/30 to-transparent origin-top transition-opacity"
                      style={{
                        left: "50%",
                        top: "50%",
                        height: `${radius}%`,
                        transform: `translate(-50%, 0) rotate(${rotationDeg}deg)`,
                        opacity: isHovered ? 1 : 0.4,
                      }}
                    />

                    {/* Mid-line distance label (when meters are known) */}
                    {d.avgMeters != null && (
                      <div
                        className="absolute text-[9px] text-gray-200 bg-black/70 px-1.5 py-0.5 rounded-full backdrop-blur-sm border border-white/10"
                        style={{
                          left: `${midX}%`,
                          top: `${midY}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        ~{Math.round(d.avgMeters)}m
                      </div>
                    )}

                    {/* Device marker */}
                    <button
                      type="button"
                      onClick={() => setSelectedModalDevice(d)}
                      onMouseEnter={() => setHoveredDeviceId(id)}
                      onMouseLeave={() => setHoveredDeviceId(null)}
                      className="absolute flex flex-col items-center gap-1 transition-all duration-300 group cursor-pointer focus:outline-none z-10"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {/* Glow on hover */}
                      {isHovered && (
                        <div
                          className="absolute -inset-2 rounded-full blur-2xl transition-opacity"
                          style={{
                            background: color,
                            opacity: 0.7,
                          }}
                        />
                      )}

                      {/* Icon bubble */}
                      <div
                        className="relative flex items-center justify-center rounded-full border-2 transition-all duration-300 backdrop-blur-sm"
                        style={{
                          width: isHovered ? size * 1.1 : size,
                          height: isHovered ? size * 1.1 : size,
                          background: color,
                          borderColor: isHovered
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(255,255,255,0.25)",
                          boxShadow: isHovered
                            ? `0 0 30px ${color}`
                            : `0 0 15px ${color}`,
                        }}
                      >
                        <div className="text-white">{renderDeviceIcon(d)}</div>
                      </div>

                      {/* Label */}
                      <div
                        className="max-w-[160px] transition-all duration-300"
                        style={{
                          opacity: isHovered ? 1 : 0.8,
                          transform: isHovered ? "scale(1.05)" : "scale(1)",
                        }}
                      >
                        <div className="text-[10px] font-medium text-white text-center truncate bg-black/70 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                          {d.label}
                        </div>
                        {d.avgMeters != null && (
                          <div className="text-[9px] text-gray-400 text-center mt-0.5">
                            ~{Math.round(d.avgMeters)}m
                          </div>
                        )}
                      </div>

                      {/* Signal strength indicator */}
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-0.5 rounded-full transition-colors"
                            style={{
                              height: 4 + i * 2,
                              background:
                                i < strength * 5
                                  ? color
                                  : "rgba(255,255,255,0.2)",
                            }}
                          />
                        ))}
                      </div>
                    </button>
                  </Fragment>
                );
              })}
            </div>

            {/* Legend + zoom controls */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-300">
              {/* Zoom controls for distance bands */}
              <div className="inline-flex items-center gap-1 rounded-full bg-black/40 border border-white/15 p-1">
                 <button
                   type="button"
                   onClick={() => setZoomLevel("near")}
                   className={`px-2 py-0.5 rounded-full ${
                     zoomLevel === "near"
                       ? "bg-white text-black"
                       : "text-gray-300"
                   }`}
                 >
                   {t('analytics.modal.zoom.near')}
                 </button>

                 <button
                   type="button"
                   onClick={() => setZoomLevel("medium")}
                   className={`px-2 py-0.5 rounded-full ${
                     zoomLevel === "medium"
                       ? "bg-white text-black"
                       : "text-gray-300"
                   }`}
                 >
                   {t('analytics.modal.zoom.medium')}
                 </button>

                 <button
                   type="button"
                   onClick={() => setZoomLevel("far")}
                   className={`px-2 py-0.5 rounded-full ${
                     zoomLevel === "far"
                       ? "bg-white text-black"
                       : "text-gray-300"
                   }`}
                 >
                   {t('analytics.modal.zoom.far')}
                 </button>

              </div>

               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-orange-500/80" />
                 <span>{t('analytics.modal.legend.routers')}</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                 <span>{t('analytics.modal.legend.mobiles')}</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-purple-500/80" />
                 <span>{t('analytics.modal.legend.bluetooth')}</span>
               </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span>Mobiles & phone hotspots</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500/80" />
                <span>Bluetooth devices</span>
              </div>
            </div>

            <p className="mt-2 text-[11px] text-gray-400">
               {t('analytics.modal.description')}
             </p>


            {/* Hover info panel */}
            {hoveredDevice && (
              <div className="mt-3 bg-black/40 backdrop-blur-lg border border-white/10 rounded-xl px-3 py-2 text-[11px] text-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-100 mb-0.5">
                      {hoveredDevice.label}
                    </div>
                    {hoveredDevice.manufacturer && (
                      <div className="text-[10px] text-gray-400">
                        {hoveredDevice.manufacturer}
                      </div>
                    )}
                     <div className="text-[10px] text-gray-500">
                       {hoveredDevice.kind === "wifi"
                         ? t('analytics.modal.deviceKind.wifi')
                         : t('analytics.modal.deviceKind.ble')}{' '}
                       ·{' '}
                       {hoveredDevice.isTrusted
                         ? t('analytics.modal.device.known')
                         : t('analytics.modal.device.possibleTracker')}
                     </div>

                  </div>
                  <div className="text-[10px] text-gray-400 text-right space-y-0.5">
                     <div>
                       {t('analytics.modal.hover.sessions')} {' '}
                       <span className="font-mono">
                         {hoveredDevice.sessionCount}
                       </span>
                     </div>
                     <div>
                       {t('analytics.modal.hover.sightings')} {' '}
                       <span className="font-mono">
                         {hoveredDevice.totalCount}
                       </span>
                     </div>
                     {hoveredDevice.avgMeters != null && (
                       <div>
                         {t('analytics.modal.hover.avgDist')} ~{Math.round(hoveredDevice.avgMeters)}m
                       </div>
                     )}

                  </div>
                </div>
              </div>
            )}

            {/* Details panel for selected device */}
            {selectedModalDevice && (
              <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-gray-200">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                      {renderDeviceIcon(selectedModalDevice as ModalDevice)}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-100">
                        {selectedModalDevice.label}
                      </div>
                      {selectedModalDevice.manufacturer && (
                        <div className="text-[10px] text-gray-400">
                          {selectedModalDevice.manufacturer}
                        </div>
                      )}
                     <div className="text-[10px] text-gray-500">
                         {selectedModalDevice.kind === "wifi"
                           ? t('analytics.modal.deviceKind.wifi')
                           : t('analytics.modal.deviceKind.ble')}{' '}
                         ·{' '}
                         {selectedModalDevice.isTrusted
                           ? t('analytics.modal.device.known')
                           : t('analytics.modal.device.possibleTracker')}
                       </div>

                    </div>
                  </div>
                   <div className="text-[10px] text-gray-400 text-right space-y-1">
                     <div>
                       {t('analytics.details.identifier')} <span className="font-mono">{selectedModalDevice.key}</span>
                     </div>
                     {selectedModalDevice.trustedSourceLabel && (
                       <div>{t('analytics.details.envLabel')} {selectedModalDevice.trustedSourceLabel}</div>
                     )}
                     {selectedModalDevice.avgMeters != null && (
                       <div>
                         {t('analytics.details.avgDistance')} ~{Math.round(selectedModalDevice.avgMeters)} m
                       </div>
                     )}
                     {selectedModalDevice.minMeters != null && (
                       <div>
                         {t('analytics.details.closest')} ~{Math.round(selectedModalDevice.minMeters)} m
                       </div>
                     )}

                     <button
                       type="button"
                       onClick={() => openDeviceOnMap(selectedModalDevice)}
                       className="mt-1 inline-flex items-center gap-1 rounded-full border border-gold-400/80 bg-gold-400 px-2 py-0.5 text-[10px] text-black hover:bg-gold-300"
                     >
                       <span>{t('analytics.modal.details.openMap')}</span>
                     </button>

                  </div>
                </div>

                <div className="mt-1">
                   <p className="text-[10px] text-gray-400 mb-1">
                     {t('analytics.modal.details.sessionsHeading')}
                   </p>

                  <div className="max-h-32 overflow-y-auto pr-1">
                    <ul className="space-y-1">
                      {selectedModalDevice.sessions.map((s) => {
                        const sessionMeta = trackingSessions.find((ts) => ts.id === s.id);
                        return (
                          <li
                            key={s.id}
                            className="flex items-start justify-between gap-2 rounded-lg bg-black/40 border border-white/10 px-2 py-1"
                          >
                            <div>
                              <div className="text-[10px] font-semibold text-gray-100">
                                {s.name}
                              </div>
                              {sessionMeta?.startTime && (
                                <div className="text-[10px] text-gray-400">
                                  {new Date(sessionMeta.startTime).toLocaleString()}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-300">
                               <span>
                                 {t('analytics.modal.details.sightingsLabel')} <span className="font-mono">{s.count}</span>
                               </span>
                               <button

                                type="button"
                                onClick={() => handleShowSessionMap(s.id)}
                                className="inline-flex items-center rounded-full border border-gold-400/70 px-1.5 py-0.5 text-[9px] text-gold-200 hover:bg-gold-400/10"
                              >
                                Show map
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {sessionMapIds.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                       <p className="text-[10px] text-gray-400">
                         {t('analytics.modal.details.inlineMapsTitle')}
                       </p>

                       <button
                         type="button"
                         onClick={() => setSessionMapIds([])}
                         className="text-[9px] text-gray-400 hover:text-gray-100 underline-offset-2 hover:underline"
                       >
                         {t('analytics.modal.details.clearMaps')}
                       </button>


                    </div>
                     {sessionMapsLoading && (
                       <p className="text-[10px] text-gray-400 mb-1">
                         {t('analytics.modal.details.loadingMaps')}
                       </p>
                     )}

                    {sessionMapsError && (
                       <p className="text-[10px] text-red-400 mb-1">
                         {sessionMapsError === "no-data"
                           ? t('analytics.modal.details.noSessions')
                           : t('analytics.modal.details.error.loadFailed')}
                       </p>
                     )}

                    <div className="flex flex-wrap gap-3">
                      {sessionMapIds.map((sessionId) => {
                        const locs = sessionMapLocations[sessionId] || [];
                        if (!locs.length) return null;
                        const lastLoc = locs[locs.length - 1];
                        const meta = trackingSessions.find((ts) => ts.id === sessionId);

                        return (
                          <div
                            key={sessionId}
                            className="w-full sm:w-64 h-48 rounded-xl border border-white/15 bg-black/40 overflow-hidden flex flex-col"
                          >
                            <div className="flex items-center justify-between px-2 py-1 text-[10px] text-gray-200 bg-black/70 border-b border-white/10">
                              <div className="flex items-center gap-2 min-w-0">
                                 <span className="truncate">
                                   {meta?.name || t('analytics.modal.sessions.fallbackName')}

                                  {meta?.startTime
                                    ? ` · ${new Date(meta.startTime).toLocaleDateString()}`
                                    : ""}
                                </span>
                                {selectedModalDevice && (
                                  <span
                                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] border ${
                                      selectedModalDevice.kind === "wifi"
                                        ? "bg-orange-500/20 border-orange-400/60 text-orange-200"
                                        : "bg-purple-500/20 border-purple-400/60 text-purple-200"
                                    }`}
                                  >
                                     {selectedModalDevice.kind === "wifi"
                                       ? t('analytics.modal.details.wifiFocus')
                                       : t('analytics.modal.details.bleFocus')}

                                  </span>
                                )}
                              </div>
                               <button
                                 type="button"
                                 onClick={() =>
                                   setSessionMapIds((prev) =>
                                     prev.filter((id) => id !== sessionId)
                                   )
                                 }
                                 className="ml-2 text-[9px] text-gray-400 hover:text-gray-100"
                               >
                                 {t('analytics.modal.details.closeMap')}
                               </button>

                            </div>
                            <div className="flex-1">
                              <InlineMap
                                locations={locs}
                                currentLocation={lastLoc}
                                fitOnUpdate={false}
                                autoZoomOnFirstPoint
                                hidePopups
                                pointZoom={17}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

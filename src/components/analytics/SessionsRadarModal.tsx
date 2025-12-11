"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { Bluetooth, Smartphone, Router } from "lucide-react";

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

  const [selectedModalDevice, setSelectedModalDevice] = useState<ModalDevice | null>(null);
  const [deviceDistances, setDeviceDistances] = useState<
    Map<string, { avgMeters: number | null; minMeters: number | null }>
  >(new Map());
  const [zoomLevel, setZoomLevel] = useState<"near" | "medium" | "far">("near");

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 pb-4">
      <div className="relative w-full max-w-7xl max-h-[90vh] bg-surface rounded-2xl border border-white/20 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 gap-4">
          <h2 className="text-sm font-semibold">
            Sessions correlation radar – full view
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
                All
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
              <span>Hide known devices</span>
            </label>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-300 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px,1fr] gap-4 p-4 overflow-hidden">
          {/* Left: sessions + grouped devices */}
          <div className="overflow-y-auto pr-2 text-xs">
            {/* Session selection */}
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                Sessions in this range
              </p>
              {filteredSessions.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                  No sessions match this analytics time window yet.
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
                                {s.name || "Session"}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {s.startTime
                                  ? new Date(s.startTime).toLocaleString()
                                  : "Unknown time"}
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {isActive ? "Selected" : "Tap to include"}
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
              Devices seen across selected sessions. Click a row to select and inspect.
            </p>
            {modalDevices.length === 0 ? (
              <p className="text-[11px] text-gray-500">
                No devices for the current session selection and filters.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Routers */}
                {groupedModalDevices.router.length > 0 && (
                  <div>
                    <h3 className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                      Wi‑Fi routers & access points ({groupedModalDevices.router.length})
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
                            {d.isTrusted ? "known" : "possible tracker"}
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
                      Mobiles & phone hotspots ({groupedModalDevices.mobile.length})
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
                            {d.isTrusted ? "known" : "possible tracker"}
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
                      Bluetooth devices ({groupedModalDevices.bluetooth.length})
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
                            {d.isTrusted ? "known" : "possible tracker"}
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
          <div className="flex flex-col gap-3">
            <div className="relative mx-auto mt-6 aspect-square w-full max-w-xl rounded-full border border-white/15 bg-black/40 overflow-hidden">
              {/* Distance rings (approximate): 0m center, then ~5m, ~10m, ~20m, ~30m+ */}
              <div className="absolute inset-10 rounded-full border border-white/15" />
              <div className="absolute inset-20 rounded-full border border-white/15" />
              <div className="absolute inset-30 rounded-full border border-white/15" />
              <div className="absolute inset-40 rounded-full border border-white/15" />

              {/* Center: You */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-gold-400 shadow-[0_0_18px_rgba(212,175,55,0.8)]" />
                <span className="text-[10px] text-gray-300">You</span>
              </div>

              {radarDevicesFull.map((d, index) => {
                const angle =
                  (index / Math.max(radarDevicesFull.length, 1)) * 2 * Math.PI;

                // Distance bands (in meters) aligned with rings; scaled by zoom
                const baseBandEdges = [0, 5, 10, 20, 30];
                const zoomScale = zoomLevel === "near" ? 1 : zoomLevel === "medium" ? 2 : 4;
                const bandEdges = baseBandEdges.map((v) => v * zoomScale);

                let effectiveMeters: number | null = d.avgMeters ?? null;
                if (effectiveMeters == null) {
                  const intensity =
                    (d.sessionCount || 1) / (modalRadarStats.maxSessionCount || 1);
                  effectiveMeters = bandEdges[bandEdges.length - 1] * intensity;
                }

                // Snap to band index: 0=center, 1=~5m, 2=~10m, 3=~20m, 4=~30m+
                let bandIndex = 0;
                if (effectiveMeters <= bandEdges[1]) bandIndex = 1;
                else if (effectiveMeters <= bandEdges[2]) bandIndex = 2;
                else if (effectiveMeters <= bandEdges[3]) bandIndex = 3;
                else bandIndex = 4;

                const baseRadius = 8; // center (0m)
                const bandStep = 12; // distance between rings
                const radius = baseRadius + bandIndex * bandStep;

                const x = 50 + radius * Math.cos(angle);
                const y = 50 + radius * Math.sin(angle);

                // Midpoint along the radial line for meter label
                const midRadius = baseRadius + (bandIndex * bandStep) * 0.5;
                const midX = 50 + midRadius * Math.cos(angle);
                const midY = 50 + midRadius * Math.sin(angle);

                const sizeBase = 14;
                const sizeExtra =
                  ((d.totalCount || 1) / (modalRadarStats.maxTotalCount || 1)) * 10;
                const size = sizeBase + sizeExtra;

                // Color by device kind: mobile (phone) = green, bluetooth = purple, router = orange
                const kindColorClass =
                  d.iconKind === "bluetooth"
                    ? "bg-purple-400"
                    : d.iconKind === "mobile"
                    ? "bg-emerald-400"
                    : "bg-orange-400";

                const rotationDeg = (angle * 180) / Math.PI;

                return (
                  <Fragment key={d.kind + d.key}>
                    {/* Radial line from center to device (meters-based when available) */}
                    <div
                      className="absolute w-px bg-white/15"
                      style={{
                        left: "50%",
                        top: "50%",
                        height: `${radius}%`,
                        transformOrigin: "bottom",
                        transform: `translateX(-50%) rotate(${rotationDeg}deg)`,
                      }}
                    />

                    {/* Mid-line distance label when meters are known */}
                    {d.avgMeters != null && (
                      <div
                        className="absolute text-[9px] text-gray-300 bg-black/60 px-1 py-0.5 rounded"
                        style={{
                          left: `${midX}%`,
                          top: `${midY}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        ~{Math.round(d.avgMeters)} m
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedModalDevice(d)}
                      className="absolute flex flex-col items-center cursor-pointer focus:outline-none"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <span
                        className={`flex items-center justify-center rounded-full shadow-[0_0_18px_rgba(0,0,0,0.8)] ${kindColorClass}`}
                        style={{ width: size + 10, height: size + 10 }}
                      >
                        {renderDeviceIcon(d)}
                      </span>
                      <span className="mt-1 max-w-[160px] truncate text-[10px] text-gray-200">
                        {d.label}
                        {d.avgMeters != null && (
                          <> · ~{Math.round(d.avgMeters)} m</>
                        )}
                      </span>
                    </button>
                  </Fragment>
                );
              })}

              {/* Crosshair lines */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-white/15" />
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-px bg-white/15" />
            </div>

            {/* Legend + zoom controls */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-300 mt-2">
              {/* Zoom controls for distance bands */}
              <div className="inline-flex items-center gap-1 rounded-full bg-black/40 border border-white/15 p-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel("near")}
                  className={`px-2 py-0.5 rounded-full ${
                    zoomLevel === "near" ? "bg-white text-black" : "text-gray-300"
                  }`}
                >
                  Near
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel("medium")}
                  className={`px-2 py-0.5 rounded-full ${
                    zoomLevel === "medium" ? "bg-white text-black" : "text-gray-300"
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel("far")}
                  className={`px-2 py-0.5 rounded-full ${
                    zoomLevel === "far" ? "bg-white text-black" : "text-gray-300"
                  }`}
                >
                  Far
                </button>
              </div>

              <div className="inline-flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10">
                  <Router className="w-3 h-3" />
                </span>
                <span>Wi‑Fi router / access point</span>
              </div>
              <div className="inline-flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10">
                  <Smartphone className="w-3 h-3" />
                </span>
                <span>Mobile / phone hotspot</span>
              </div>
              <div className="inline-flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10">
                  <Bluetooth className="w-3 h-3" />
                </span>
                <span>Bluetooth device</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              Each dot is a device across selected sessions. Icon shows type (mobile hotspot,
              Wi‑Fi router, Bluetooth), color shows device type, and size reflects how often
              it appears. Radial lines show relative distance bands (~0/5/10/20/30m scaled by
              zoom); exact averages are shown on each line.
            </p>

            {/* Details panel for selected device */}
            {selectedModalDevice && (
              <div className="mt-3 border-t border-white/10 pt-3 text-[11px] text-gray-200">
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
                        {selectedModalDevice.kind === "wifi" ? "Wi‑Fi" : "Bluetooth"} ·{" "}
                        {selectedModalDevice.isTrusted
                          ? "known in environment"
                          : "possible tracker"}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 text-right space-y-1">
                    <div>
                      Identifier: <span className="font-mono">{selectedModalDevice.key}</span>
                    </div>
                    {selectedModalDevice.trustedSourceLabel && (
                      <div>Env label: {selectedModalDevice.trustedSourceLabel}</div>
                    )}
                    {selectedModalDevice.avgMeters != null && (
                      <div>
                        Avg distance: ~{Math.round(selectedModalDevice.avgMeters)} m
                      </div>
                    )}
                    {selectedModalDevice.minMeters != null && (
                      <div>
                        Closest approach: ~{Math.round(selectedModalDevice.minMeters)} m
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openDeviceOnMap(selectedModalDevice)}
                      className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-gray-100 hover:bg-white/10"
                    >
                      <span>Open on map</span>
                    </button>
                  </div>
                </div>

                <div className="mt-1">
                  <p className="text-[10px] text-gray-400 mb-1">
                    Sessions where this device appears:
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
                            <div className="text-[10px] text-gray-300">
                              sightings: <span className="font-mono">{s.count}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { TrustedPillToggle } from "@/components/analytics/TrustedPillToggle";
import type { TrustedDeviceKey } from "@/hooks/useTrustedDevices";

interface TrackingSession {
  id: string;
  name?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  quality?: "GOOD" | "REGULAR" | "BAD" | null;
}

interface OverlapSessionInfo {
  id: string;
  name: string;
  count: number;
}

interface OverlapDevice {
  kind: "wifi" | "ble";
  key: string;
  label: string;
  totalCount: number;
  sessionCount: number;
  sessions: OverlapSessionInfo[];
  isTrusted: boolean;
  trustedSourceLabel?: string | null;
  distanceKey: string;
  avgMeters?: number | null;
  minMeters?: number | null;
}

interface RadarStats {
  maxSessionCount: number;
  maxTotalCount: number;
}

interface Props {
  filteredSessions: TrackingSession[];
  sessionSearch: string;
  setSessionSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedSessionIds: string[];
  setSelectedSessionIds: React.Dispatch<React.SetStateAction<string[]>>;
  deviceKindFilter: "all" | "wifi" | "ble";
  setDeviceKindFilter: (k: "all" | "wifi" | "ble") => void;
  hideTrusted: boolean;
  setHideTrusted: React.Dispatch<React.SetStateAction<boolean>>;
  filteredOverlapDevices: OverlapDevice[];
  suspiciousOverlapCount: number;
  sessionsLoading: boolean;
  envDevicesLoading: boolean;
  sessionsError: string | null;
  envDevicesError: string | null;
  radarDevices: OverlapDevice[];
  radarStats: RadarStats;
  onExpandRadar: () => void;
  openDeviceOnMap: (device: OverlapDevice) => void;
  toggleTrusted: (device: TrustedDeviceKey, nextValue: boolean) => void;
  sessionQualityById: Record<string, "GOOD" | "REGULAR" | "BAD" | null | undefined>;
}

export function SessionsCorrelationSection({
  filteredSessions,
  sessionSearch,
  setSessionSearch,
  selectedSessionIds,
  setSelectedSessionIds,
  deviceKindFilter,
  setDeviceKindFilter,
  hideTrusted,
  setHideTrusted,
  filteredOverlapDevices,
  suspiciousOverlapCount,
  sessionsLoading,
  envDevicesLoading,
  sessionsError,
  envDevicesError,
  radarDevices,
  radarStats,
  onExpandRadar,
  openDeviceOnMap,
  toggleTrusted,
  sessionQualityById,
}: Props) {
  const [overlapPage, setOverlapPage] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    setOverlapPage(0);
  }, [filteredOverlapDevices.length, deviceKindFilter, hideTrusted, selectedSessionIds.length]);

  const { visibleDevices, totalPages, currentPage } = useMemo(() => {
    const total = filteredOverlapDevices.length;
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
    const currentPage = Math.min(overlapPage, totalPages - 1);
    const start = currentPage * pageSize;
    const visibleDevices = filteredOverlapDevices.slice(start, start + pageSize);
    return { visibleDevices, totalPages, currentPage };
  }, [filteredOverlapDevices, overlapPage, pageSize]);

  return (
    <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-300">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sessions correlation radar</h2>
            <p className="text-xs text-gray-400 max-w-xl">
              Search across tracking sessions for Wi‑Fi and Bluetooth devices that follow you
              between different places in this time range. Known devices from your environment
              are marked so you can focus on potential stalker hardware.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-2 text-xs text-gray-300">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{filteredSessions.length} sessions in range</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>{filteredOverlapDevices.length} devices across selected sessions</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 border border-red-400/40">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>{suspiciousOverlapCount} flagged as non‑trusted</span>
            </span>
          </div>
          {(sessionsLoading || envDevicesLoading) && (
            <span className="text-[11px] text-gray-400">Loading sessions &amp; environment…</span>
          )}
          {(sessionsError || envDevicesError) && (
            <span className="text-[11px] text-red-400">
              {sessionsError || envDevicesError}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        {/* Left: session filter */}
        <div className="space-y-4 text-xs">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
              Session filter
            </p>
            <input
              type="text"
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              placeholder="Search by name, coffee shop, restaurant, club…"
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-[11px] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {["cafe", "coffee", "restaurant", "bar", "club", "home"].map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() =>
                    setSessionSearch((prev) =>
                      prev.toLowerCase().includes(token)
                        ? prev
                        : prev
                        ? `${prev} ${token}`
                        : token
                    )
                  }
                  className="px-2 py-1 rounded-full border border-white/10 bg-black/30 text-[11px] text-gray-200 hover:bg-white/10 transition-colors"
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
              Sessions in this range
            </p>
            {filteredSessions.length === 0 ? (
              <p className="text-[11px] text-gray-500">
                No sessions match this analytics time window yet.
              </p>
            ) : (
              <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
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

          <div className="border-t border-white/10 pt-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
              Device kind
            </p>
            <div className="inline-flex items-center gap-1 rounded-full bg-black/40 border border-white/10 p-1">
              <button
                type="button"
                onClick={() => setDeviceKindFilter("all")}
                className={`px-2 py-1 rounded-full text-[11px] ${
                  deviceKindFilter === "all" ? "bg-white text-black" : "text-gray-300"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDeviceKindFilter("wifi")}
                className={`px-2 py-1 rounded-full text-[11px] ${
                  deviceKindFilter === "wifi" ? "bg-white text-black" : "text-gray-300"
                }`}
              >
                Wi‑Fi
              </button>
              <button
                type="button"
                onClick={() => setDeviceKindFilter("ble")}
                className={`px-2 py-1 rounded-full text-[11px] ${
                  deviceKindFilter === "ble" ? "bg-white text-black" : "text-gray-300"
                }`}
              >
                Bluetooth
              </button>
            </div>

            <label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={hideTrusted}
                onChange={(e) => setHideTrusted(e.target.checked)}
                className="h-3 w-3"
              />
              <span className="text-[11px]">
                Hide networks and devices already known in my environment
              </span>
            </label>
          </div>
        </div>

        {/* Right: radar + overlapping devices table */}
        <div className="space-y-4">
          <div className="relative mx-auto aspect-square max-w-xs rounded-full border border-white/15 bg-black/40 overflow-hidden">
            {/* Concentric rings */}
            <div className="absolute inset-6 rounded-full border border-white/5" />
            <div className="absolute inset-12 rounded-full border border-white/5" />
            <div className="absolute inset-20 rounded-full border border-white/5" />

            {/* Center: your device */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gold-400 shadow-[0_0_18px_rgba(212,175,55,0.8)]" />
              <span className="text-[10px] text-gray-300">You</span>
            </div>

            {/* Simple radial layout for up to 5 devices */}
            {radarDevices.map((d, index) => {
              const angle = (index / Math.max(radarDevices.length, 1)) * 2 * Math.PI;
              const baseRadius = 22;
              const extraRadius =
                ((d.sessionCount || 1) / (radarStats.maxSessionCount || 1)) * 16;
              const radius = baseRadius + extraRadius;
              const x = 50 + radius * Math.cos(angle);
              const y = 50 + radius * Math.sin(angle);
              const sizeBase = 8;
              const sizeExtra =
                ((d.totalCount || 1) / (radarStats.maxTotalCount || 1)) * 6;
              const size = sizeBase + sizeExtra;
              const colorClass = d.isTrusted ? "bg-emerald-400" : "bg-red-400";
              return (
                <button
                  type="button"
                  key={d.kind + d.key}
                  onClick={() => openDeviceOnMap(d)}
                  className="absolute flex flex-col items-center cursor-pointer focus:outline-none"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span
                    className={`rounded-full shadow-[0_0_14px_rgba(0,0,0,0.6)] ${colorClass}`}
                    style={{ width: size, height: size }}
                  />
                  <span className="mt-1 max-w-[120px] truncate text-[9px] text-gray-200">
                    {d.label}
                  </span>
                </button>
              );
            })}

            {/* Crosshair lines */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-white/5" />
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-px bg-white/5" />
          </div>
          <p className="text-[11px] text-gray-400 text-center">
            Each dot is a device seen across the selected sessions. Distance from
            center roughly follows how often it appears across sessions; size reflects total
            sightings. Red means devices you have not marked as known; green means you have
            marked them as known/trusted.
          </p>
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={onExpandRadar}
              className="inline-flex items-center gap-1 rounded-full bg-gold-500 text-black px-4 py-1.5 text-[11px] font-semibold shadow hover:bg-gold-400 transition-colors border border-gold-400/70"
            >
              <span>Expand radar view</span>
            </button>
          </div>

          {/* Overlap devices table is rendered full-width below */}

        </div>
        <div className="mt-4 lg:col-span-2 overflow-x-auto">
          {selectedSessionIds.length < 2 ? (
            <p className="text-sm text-gray-400">
              Select at least two sessions on the left to see devices that follow you between
              different places (for example a coffee shop, a restaurant and later a club).
            </p>
          ) : filteredOverlapDevices.length === 0 ? (
            <p className="text-sm text-gray-400">
              No overlapping devices found for the current filters. Try including more sessions
              or showing trusted devices as well.
            </p>
          ) : (
            <>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-white/10 text-[11px]">
                    <th className="py-2 pr-4">Device</th>
                    <th className="py-2 pr-4">Kind</th>
                    <th className="py-2 pr-4">Sessions</th>
                    <th className="py-2 pr-4">Total sightings</th>
                    <th className="py-2 pr-4">Trusted</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDevices.map((d) => (
                    <tr
                      key={d.kind + d.key}
                      onClick={() => openDeviceOnMap(d)}
                      className="border-b border-white/5 last:border-b-0 text-xs cursor-pointer hover:bg-white/5"
                    >
                      <td className="py-1.5 pr-4 text-gray-100 align-top">{d.label}</td>
                      <td className="py-1.5 pr-4 text-gray-300 align-top">
                        {d.kind === "wifi" ? "Wi‑Fi" : "Bluetooth"}
                      </td>
                      <td className="py-1.5 pr-4 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {d.sessions.map((s) => {
                            const quality = sessionQualityById[s.id];
                            const pillClasses =
                              quality === "GOOD"
                                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100"
                                : quality === "BAD"
                                ? "bg-red-500/15 border-red-400/40 text-red-100"
                                : quality === "REGULAR"
                                ? "bg-amber-500/15 border-amber-400/40 text-amber-100"
                                : "bg-black/40 border-white/10 text-gray-100";
                            return (
                              <span
                                key={s.id}
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border ${pillClasses}`}
                              >
                                <span className="truncate max-w-[200px]">{s.name}</span>
                                <span className="ml-1 text-gray-400">×{s.count}</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-1 pr-4 text-gray-100">{d.totalCount}</td>
                      <td className="py-1 pr-4">
                        <TrustedPillToggle
                          isTrusted={d.isTrusted}
                          trustedSourceLabel={d.trustedSourceLabel}
                          onToggle={() => toggleTrusted({ kind: d.kind, key: d.key }, !d.isTrusted)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                <span>
                  Showing {filteredOverlapDevices.length === 0 ? 0 : currentPage * pageSize + 1}
                  – {Math.min((currentPage + 1) * pageSize, filteredOverlapDevices.length)} of {" "}
                  {filteredOverlapDevices.length}
                </span>
                <div className="inline-flex items-center gap-3">
                  <span className="text-[11px] text-gray-500">
                    Page {totalPages === 0 ? 0 : currentPage + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOverlapPage((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={currentPage === 0}
                    className={`px-2 py-0.5 rounded-full border text-[11px] ${
                      currentPage === 0
                        ? "border-white/10 text-gray-500 cursor-not-allowed opacity-60"
                        : "border-white/20 text-gray-200 hover:bg-white/10"
                    }`}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOverlapPage((prev) => (prev + 1 >= totalPages ? prev : prev + 1));
                    }}
                    disabled={currentPage + 1 >= totalPages}
                    className={`px-2 py-0.5 rounded-full border text-[11px] ${
                      currentPage + 1 >= totalPages
                        ? "border-white/10 text-gray-500 cursor-not-allowed opacity-60"
                        : "border-white/20 text-gray-200 hover:bg-white/10"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
       </div>
     </section>
   );
 }


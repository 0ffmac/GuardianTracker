"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { BarChart3, Bell, ShieldAlert, AlertTriangle, Activity, Filter } from "lucide-react";

interface AlertsAnalytics {
  range: { from: string; to: string };
  bucket: "hour" | "day" | string;
  totals: {
    alerts: number;
    sent: number;
    received: number;
  };
  byStatus: Record<string, number>;
  timeBuckets: {
    start: string;
    end: string;
    total: number;
    byStatus: Record<string, number>;
  }[];
}

interface SuspiciousDevice {
  id: string;
  type: string;
  identifier: string;
  lastName: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  totalSightings: number;
  distinctLocationCount: number;
  suspicionScore: number;
  isSuspicious: boolean;
  seenNearAlert: boolean;
}

interface SuspiciousAnalytics {
  range: { from: string; to: string };
  limit: number;
  topDevices: SuspiciousDevice[];
}

interface AlertSummary {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

interface TrackingSession {
  id: string;
  name?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  quality?: "GOOD" | "REGULAR" | "BAD" | null;
}

interface EnvironmentDeviceWifi {
  kind: "wifi";
  id: string;
  ssid: string | null;
  bssid: string;
  firstSeen: string | null;
  lastSeen: string | null;
  scanCount: number;
  hasSessions: boolean;
}

interface EnvironmentDeviceBle {
  kind: "ble";
  id: string;
  name: string | null;
  address: string;
  firstSeen: string | null;
  lastSeen: string | null;
  scanCount: number;
  hasSessions: boolean;
}

interface SessionEnvironment {
  wifi: {
    ssid: string | null;
    bssid: string | null;
    count: number;
    avgRssi: number | null;
  }[];
  ble: {
    name: string | null;
    address: string | null;
    count: number;
    avgRssi: number | null;
  }[];
}

function formatShortDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatShortDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardAnalyticsPage() {
  const [daysBack, setDaysBack] = useState<7 | 30>(7);
  const [timeMode, setTimeMode] = useState<"relative" | "custom">("relative");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [alertTypeFilter, setAlertTypeFilter] = useState<"all" | "sent" | "received">("all");
  const [compare, setCompare] = useState(false);

  const [alertsAnalytics, setAlertsAnalytics] = useState<AlertsAnalytics | null>(null);
  const [alertsAnalyticsCompare, setAlertsAnalyticsCompare] =
    useState<AlertsAnalytics | null>(null);
  const [suspiciousAnalytics, setSuspiciousAnalytics] =
    useState<SuspiciousAnalytics | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<AlertSummary[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trackingSessions, setTrackingSessions] = useState<TrackingSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [sessionEnvironments, setSessionEnvironments] = useState<
    Record<string, SessionEnvironment>
  >({});
  const [envWifiDevices, setEnvWifiDevices] = useState<EnvironmentDeviceWifi[]>([]);
  const [envBleDevices, setEnvBleDevices] = useState<EnvironmentDeviceBle[]>([]);
  const [envDevicesLoading, setEnvDevicesLoading] = useState(false);
  const [envDevicesError, setEnvDevicesError] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [deviceKindFilter, setDeviceKindFilter] = useState<"all" | "wifi" | "ble">("all");
  const [hideTrusted, setHideTrusted] = useState(true);

  const router = useRouter();

  // Compute range and previous period
  const { fromIso, toIso, prevFromIso, prevToIso } = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to: Date;

    if (timeMode === "custom" && customFrom && customTo) {
      const fromDate = new Date(`${customFrom}T00:00:00Z`);
      const toDate = new Date(`${customTo}T23:59:59Z`);
      if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime()) && fromDate < toDate) {
        from = fromDate;
        to = toDate;
      } else {
        to = now;
        from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      }
    } else {
      to = now;
      from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    }

    const rangeMs = Math.max(0, to.getTime() - from.getTime());
    const prevToDate = new Date(from.getTime());
    const prevFromDate = new Date(from.getTime() - rangeMs);

    return {
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
      prevFromIso: prevFromDate.toISOString(),
      prevToIso: prevToDate.toISOString(),
    };
  }, [daysBack, timeMode, customFrom, customTo]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          from: fromIso,
          to: toIso,
          bucket: "day",
          type: alertTypeFilter,
        }).toString();

        const [alertsRes, suspiciousRes, alertsListRes] = await Promise.all([
          fetch(`/api/analytics/alerts?${params}`),
          fetch(
            `/api/analytics/suspicious_devices?${new URLSearchParams({
              from: fromIso,
              to: toIso,
              limit: "20",
              ...(selectedAlertId ? { alertId: selectedAlertId } : {}),
            }).toString()}`
          ),
          fetch(
            "/api/alerts?" +
              new URLSearchParams({ type: "sent", status: "ALL" }).toString()
          ),
        ]);

        if (!alertsRes.ok) throw new Error("Failed to load alerts analytics");
        if (!suspiciousRes.ok) throw new Error("Failed to load suspicious analytics");
        if (!alertsListRes.ok) throw new Error("Failed to load alerts list");

        const alertsData = (await alertsRes.json()) as AlertsAnalytics;
        const suspiciousData = (await suspiciousRes.json()) as SuspiciousAnalytics;
        const alertsListRaw = (await alertsListRes.json()) as { alerts: any[] };

        let compareData: AlertsAnalytics | null = null;
        if (compare) {
          const compareParams = new URLSearchParams({
            from: prevFromIso,
            to: prevToIso,
            bucket: "day",
            type: alertTypeFilter,
          }).toString();
          const compareRes = await fetch(`/api/analytics/alerts?${compareParams}`);
          if (compareRes.ok) {
            compareData = (await compareRes.json()) as AlertsAnalytics;
          }
        }

        const alertsList: AlertSummary[] = (alertsListRaw.alerts || []).map((a) => ({
          id: a.id as string,
          title: (a.title as string) || "Alert",
          status: (a.status as string) || "UNKNOWN",
          createdAt: a.createdAt as string,
        }));

        setAlertsAnalytics(alertsData);
        setAlertsAnalyticsCompare(compareData);
        setSuspiciousAnalytics(suspiciousData);
        setRecentAlerts(alertsList);
      } catch (err: any) {
        console.error("Failed to load analytics", err);
        setError(err?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, [fromIso, toIso, daysBack, selectedAlertId, alertTypeFilter, compare, prevFromIso, prevToIso]);

  useEffect(() => {
    const fetchSessionsAndDevices = async () => {
      setSessionsLoading(true);
      setEnvDevicesLoading(true);
      setSessionsError(null);
      setEnvDevicesError(null);
      try {
        const [sessionsRes, devicesRes] = await Promise.all([
          fetch("/api/locations"),
          fetch("/api/environment/devices"),
        ]);

        if (!sessionsRes.ok) {
          throw new Error("Failed to load tracking sessions");
        }
        if (!devicesRes.ok) {
          throw new Error("Failed to load environment devices");
        }

        const sessionsData = await sessionsRes.json();
        const devicesData = await devicesRes.json();

        const sessions: TrackingSession[] = (sessionsData.trackingSessions || []).map(
          (s: any) => ({
            id: String(s.id),
            name: s.name ?? null,
            startTime: s.startTime ?? null,
            endTime: s.endTime ?? null,
            quality: (s as any).quality ?? null,
          })
        );

        setTrackingSessions(sessions);

        const wifiDevices: EnvironmentDeviceWifi[] = (devicesData.wifi || [])
          .map((w: any) => ({
            kind: "wifi" as const,
            id: String(w.id ?? w.bssid ?? ""),
            ssid: w.ssid ?? null,
            bssid: w.bssid ?? w.id ?? "",
            firstSeen: w.firstSeen ?? null,
            lastSeen: w.lastSeen ?? null,
            scanCount: w.scanCount ?? 0,
            hasSessions: Boolean(w.hasSessions),
          }))
          .filter((w: EnvironmentDeviceWifi) => w.bssid);

        const bleDevices: EnvironmentDeviceBle[] = (devicesData.ble || [])
          .map((b: any) => ({
            kind: "ble" as const,
            id: String(b.id ?? b.address ?? ""),
            name: b.name ?? null,
            address: b.address ?? b.id ?? "",
            firstSeen: b.firstSeen ?? null,
            lastSeen: b.lastSeen ?? null,
            scanCount: b.scanCount ?? 0,
            hasSessions: Boolean(b.hasSessions),
          }))
          .filter((b: EnvironmentDeviceBle) => b.address);

        setEnvWifiDevices(wifiDevices);
        setEnvBleDevices(bleDevices);
      } catch (err: any) {
        console.error("Failed to load sessions/devices", err);
        setSessionsError("Failed to load tracking sessions.");
        setEnvDevicesError("Failed to load environment devices.");
      } finally {
        setSessionsLoading(false);
        setEnvDevicesLoading(false);
      }
    };

    void fetchSessionsAndDevices();
  }, []);

  useEffect(() => {
    const missing = selectedSessionIds.filter((id) => !sessionEnvironments[id]);

    if (missing.length === 0) return;
    let cancelled = false;

    const fetchEnvironments = async () => {
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            const res = await fetch(`/api/tracking_session/${id}/environment`);
            if (!res.ok) {
              throw new Error("Failed to load session environment");
            }
            const data = await res.json();
            const env: SessionEnvironment = {
              wifi: (data.wifi || []).map((w: any) => ({
                ssid: w.ssid ?? null,
                bssid: w.bssid ?? null,
                count: w.count ?? 0,
                avgRssi: w.avgRssi ?? null,
              })),
              ble: (data.ble || []).map((b: any) => ({
                name: b.name ?? null,
                address: b.address ?? null,
                count: b.count ?? 0,
                avgRssi: b.avgRssi ?? null,
              })),
            };
            return { id, env };
          })
        );

        if (cancelled) return;

        setSessionEnvironments((prev) => {
          const next = { ...prev } as Record<string, SessionEnvironment>;
          for (const { id, env } of results) {
            next[id] = env;
          }
          return next;
        });
      } catch (err) {
        console.error("Failed to load one or more session environments", err);
      }
    };

    void fetchEnvironments();

    return () => {
      cancelled = true;
    };
  }, [selectedSessionIds, sessionEnvironments]);

  const maxBucketTotal = useMemo(() => {
    if (!alertsAnalytics) return 0;
    return alertsAnalytics.timeBuckets.reduce(
      (max, b) => (b.total > max ? b.total : max),
      0
    );
  }, [alertsAnalytics]);

  const sessionsInRange = useMemo(() => {
    if (trackingSessions.length === 0) return [] as TrackingSession[];
    if (!alertsAnalytics) return trackingSessions;

    const from = new Date(alertsAnalytics.range.from);
    const to = new Date(alertsAnalytics.range.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return trackingSessions;
    }

    return trackingSessions.filter((s) => {
      const start = s.startTime ? new Date(s.startTime) : null;
      const end = s.endTime ? new Date(s.endTime) : null;
      if (!start && !end) return true;
      const effectiveStart = start || end;
      const effectiveEnd = end || start;
      if (!effectiveStart || !effectiveEnd) return false;
      return effectiveEnd >= from && effectiveStart <= to;
    });
  }, [trackingSessions, alertsAnalytics]);

  const filteredSessions = useMemo(() => {
    const base = sessionsInRange;
    if (!sessionSearch.trim()) return base;
    const q = sessionSearch.trim().toLowerCase();
    return base.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const start = s.startTime
        ? new Date(s.startTime).toLocaleString().toLowerCase()
        : "";
      return name.includes(q) || start.includes(q);
    });
  }, [sessionsInRange, sessionSearch]);

  const trustedWifiKeys = useMemo(
    () => new Set(envWifiDevices.map((w) => w.bssid)),
    [envWifiDevices]
  );
  const trustedBleKeys = useMemo(
    () => new Set(envBleDevices.map((b) => b.address)),
    [envBleDevices]
  );

  type OverlapDevice = {
    kind: "wifi" | "ble";
    key: string;
    label: string;
    totalCount: number;
    sessionCount: number;
    sessions: { id: string; name: string; count: number }[];
    isTrusted: boolean;
    trustedSourceLabel?: string | null;
  };

  const openDeviceOnMap = (device: OverlapDevice) => {
    const params = new URLSearchParams({
      focusKind: device.kind,
      focusKey: device.key,
    });
    router.push(`/dashboard/map?${params.toString()}`);
  };

  const { overlapDevices, suspiciousOverlapCount } = useMemo(() => {
    const wifiMap = new Map<string, OverlapDevice & { sessionIds: Set<string> }>();
    const bleMap = new Map<string, OverlapDevice & { sessionIds: Set<string> }>();

    const getSessionName = (id: string) => {
      const s = trackingSessions.find((ts) => ts.id === id);
      if (!s) return "Session";
      const base = s.name || "Session";
      if (!s.startTime) return base;
      try {
        const d = new Date(s.startTime);
        if (Number.isNaN(d.getTime())) return base;
        return `${base} – ${d.toLocaleString()}`;
      } catch {
        return base;
      }
    };

    for (const sessionId of selectedSessionIds) {
      const env = sessionEnvironments[sessionId];
      if (!env) continue;

      env.wifi.forEach((w) => {
        const key = w.bssid || w.ssid;
        if (!key) return;
        const envMatch = envWifiDevices.find((env) => env.bssid === key);
        const existing = wifiMap.get(key) || {
          kind: "wifi" as const,
          key,
          label: w.ssid || w.bssid || "Wi‑Fi network",
          totalCount: 0,
          sessionCount: 0,
          sessions: [],
          isTrusted: trustedWifiKeys.has(key),
          trustedSourceLabel: envMatch ? envMatch.ssid || envMatch.bssid : null,
          sessionIds: new Set<string>(),
        };
        if (!existing.sessionIds.has(sessionId)) {
          existing.sessionIds.add(sessionId);
          existing.sessionCount = existing.sessionIds.size;
          existing.sessions.push({
            id: sessionId,
            name: getSessionName(sessionId),
            count: w.count ?? 0,
          });
        } else {
          const sEntry = existing.sessions.find((s) => s.id === sessionId);
          if (sEntry) sEntry.count += w.count ?? 0;
        }
        existing.totalCount += w.count ?? 0;
        existing.isTrusted = existing.isTrusted || trustedWifiKeys.has(key);
        wifiMap.set(key, existing);
      });

      env.ble.forEach((b) => {
        const key = b.address || b.name;
        if (!key) return;
        const envMatch = envBleDevices.find((env) => env.address === key);
        const existing = bleMap.get(key) || {
          kind: "ble" as const,
          key,
          label: b.name || b.address || "Bluetooth device",
          totalCount: 0,
          sessionCount: 0,
          sessions: [],
          isTrusted: trustedBleKeys.has(key),
          trustedSourceLabel: envMatch ? envMatch.name || envMatch.address : null,
          sessionIds: new Set<string>(),
        };
        if (!existing.sessionIds.has(sessionId)) {
          existing.sessionIds.add(sessionId);
          existing.sessionCount = existing.sessionIds.size;
          existing.sessions.push({
            id: sessionId,
            name: getSessionName(sessionId),
            count: b.count ?? 0,
          });
        } else {
          const sEntry = existing.sessions.find((s) => s.id === sessionId);
          if (sEntry) sEntry.count += b.count ?? 0;
        }
        existing.totalCount += b.count ?? 0;
        existing.isTrusted = existing.isTrusted || trustedBleKeys.has(key);
        bleMap.set(key, existing);
      });
    }

    const all: OverlapDevice[] = [
      ...Array.from(wifiMap.values()),
      ...Array.from(bleMap.values()),
    ].filter((d) => d.sessionCount >= 2);

    const suspiciousCount = all.filter((d) => !d.isTrusted).length;

    all.sort((a, b) => b.sessionCount - a.sessionCount || b.totalCount - a.totalCount);

    return { overlapDevices: all, suspiciousOverlapCount: suspiciousCount };
  }, [
    selectedSessionIds,
    sessionEnvironments,
    trackingSessions,
    trustedWifiKeys,
    trustedBleKeys,
    envWifiDevices,
    envBleDevices,
  ]);

  const filteredOverlapDevices = useMemo(() => {
    return overlapDevices.filter((d) => {
      if (deviceKindFilter !== "all" && d.kind !== deviceKindFilter) return false;
      if (hideTrusted && d.isTrusted) return false;
      return true;
    });
  }, [overlapDevices, deviceKindFilter, hideTrusted]);

  const radarDevices = useMemo(() => {
    const max = 5;
    if (filteredOverlapDevices.length === 0) return [] as OverlapDevice[];
    const suspicious = filteredOverlapDevices.filter((d) => !d.isTrusted);
    const trustedList = filteredOverlapDevices.filter((d) => d.isTrusted);
    const ordered = [...suspicious, ...trustedList].slice(0, max);
    return ordered;
  }, [filteredOverlapDevices]);

  const radarStats = useMemo(
    () => {
      if (radarDevices.length === 0) {
        return { maxSessionCount: 1, maxTotalCount: 1 };
      }
      let maxSessionCount = 1;
      let maxTotalCount = 1;
      radarDevices.forEach((d) => {
        if (d.sessionCount > maxSessionCount) maxSessionCount = d.sessionCount;
        if (d.totalCount > maxTotalCount) maxTotalCount = d.totalCount;
      });
      return { maxSessionCount, maxTotalCount };
    },
    [radarDevices]
  );
 
  const totalSuspicious = suspiciousAnalytics?.topDevices.length || 0;


  const totalSeenNearAlert = suspiciousAnalytics?.topDevices.filter((d) => d.seenNearAlert)
    .length || 0;

  const alertsTotals = alertsAnalytics?.totals;
  const alertsTotalsPrev = alertsAnalyticsCompare?.totals;

  const totalAlertsDelta =
    alertsTotals && alertsTotalsPrev
      ? alertsTotals.alerts - alertsTotalsPrev.alerts
      : null;
  const sentDelta =
    alertsTotals && alertsTotalsPrev ? alertsTotals.sent - alertsTotalsPrev.sent : null;
  const receivedDelta =
    alertsTotals && alertsTotalsPrev
      ? alertsTotals.received - alertsTotalsPrev.received
      : null;

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-10 pt-32">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-400">Analytics & Threat Intelligence</p>
            <h1 className="text-2xl font-bold text-white">Alert & Stalker Analytics</h1>
            <p className="mt-1 text-xs text-gray-400 max-w-2xl">
              Understand how alerts unfold over time and which nearby devices
              consistently appear around emergency events.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {timeMode === "relative" && (
              <div className="inline-flex items-center gap-1 rounded-full bg-black/40 border border-white/10 text-xs p-1">
                <button
                  type="button"
                  onClick={() => setDaysBack(7)}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    daysBack === 7 ? "bg-white text-black" : "text-gray-300"
                  }`}
                >
                  Last 7 days
                </button>
                <button
                  type="button"
                  onClick={() => setDaysBack(30)}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    daysBack === 30 ? "bg-white text-black" : "text-gray-300"
                  }`}
                >
                  Last 30 days
                </button>
              </div>
            )}

            {alertsAnalytics && (
              <p className="text-[11px] text-gray-400">
                Range: {formatShortDate(alertsAnalytics.range.from)} – {formatShortDate(
                  alertsAnalytics.range.to
                )}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm text-red-100">
            Failed to load analytics: {error}
          </div>
        )}

        {/* Filters + KPI */}
        <div className="grid grid-cols-1 lg:grid-cols-[250px,1fr] gap-6 mb-8">
          {/* Left: presets and filters */}
          <aside className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex flex-col gap-4 text-xs">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                Alert scope
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setAlertTypeFilter("all")}
                  className={`w-full text-left px-2 py-1 rounded-md transition-colors ${
                    alertTypeFilter === "all"
                      ? "bg-white text-black"
                      : "bg-black/30 text-gray-200 hover:bg-black/50"
                  }`}
                >
                  All alerts
                </button>
                <button
                  type="button"
                  onClick={() => setAlertTypeFilter("sent")}
                  className={`w-full text-left px-2 py-1 rounded-md transition-colors ${
                    alertTypeFilter === "sent"
                      ? "bg-white text-black"
                      : "bg-black/30 text-gray-200 hover:bg-black/50"
                  }`}
                >
                  Alerts I sent
                </button>
                <button
                  type="button"
                  onClick={() => setAlertTypeFilter("received")}
                  className={`w-full text-left px-2 py-1 rounded-md transition-colors ${
                    alertTypeFilter === "received"
                      ? "bg-white text-black"
                      : "bg-black/30 text-gray-200 hover:bg-black/50"
                  }`}
                >
                  Alerts I received
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                Time range
              </p>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="time-mode"
                    checked={timeMode === "relative"}
                    onChange={() => setTimeMode("relative")}
                    className="h-3 w-3"
                  />
                  <span>Relative (last 7/30 days)</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="time-mode"
                    checked={timeMode === "custom"}
                    onChange={() => setTimeMode("custom")}
                    className="h-3 w-3"
                  />
                  <span>Custom range</span>
                </label>

                {timeMode === "custom" && (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-gray-400">From</span>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full rounded-md bg-black/40 border border-white/10 px-2 py-1 text-[11px] text-gray-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-gray-400">To</span>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full rounded-md bg-black/40 border border-white/10 px-2 py-1 text-[11px] text-gray-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 mt-1 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={compare}
                  onChange={(e) => setCompare(e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Compare to previous period</span>
              </label>
            </div>
          </aside>

          {/* Right: Top KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-gold-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-gold-500/10 text-gold-300">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gold-400">Total alerts</p>
                <p className="text-lg font-semibold text-gold-100">
                  {alertsTotals?.alerts ?? "–"}
                </p>
                {alertsTotalsPrev && totalAlertsDelta !== null && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    prev {alertsTotalsPrev.alerts}, Δ {totalAlertsDelta >= 0 ? "+" : ""}
                    {totalAlertsDelta}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-emerald-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-400">Sent</p>
                <p className="text-lg font-semibold text-emerald-100">
                  {alertsTotals?.sent ?? "–"}
                </p>
                {alertsTotalsPrev && sentDelta !== null && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    prev {alertsTotalsPrev.sent}, Δ {sentDelta >= 0 ? "+" : ""}
                    {sentDelta}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-sky-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-300">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-sky-400">Received</p>
                <p className="text-lg font-semibold text-sky-100">
                  {alertsTotals?.received ?? "–"}
                </p>
                {alertsTotalsPrev && receivedDelta !== null && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    prev {alertsTotalsPrev.received}, Δ {receivedDelta >= 0 ? "+" : ""}
                    {receivedDelta}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-red-400/20 flex items-center gap-3 shadow-lg">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-300">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-red-400">Suspicious devices</p>
                <p className="text-lg font-semibold text-red-100">
                  {totalSuspicious}
                  {totalSeenNearAlert > 0 && (
                    <span className="ml-1 text-[11px] text-amber-300">
                      ({totalSeenNearAlert} near selected alert)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts over time + focus */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Alerts over time */}
          <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Alerts over time</h2>
                <p className="text-xs text-gray-400">
                  Buckets are per {alertsAnalytics?.bucket || "day"}.
                </p>
              </div>
            </div>

            {(!alertsAnalytics || alertsAnalytics.timeBuckets.length === 0) && !loading && (
              <p className="text-sm text-gray-400">No alerts in this time range.</p>
            )}

            {alertsAnalytics && alertsAnalytics.timeBuckets.length > 0 && (
              <div className="h-52 flex items-end gap-1 border border-white/5 rounded-lg px-3 py-2 bg-black/20">
                {alertsAnalytics.timeBuckets.map((b, idx) => {
                  const heightPct = maxBucketTotal
                    ? Math.max(6, (b.total / maxBucketTotal) * 100)
                    : 0;
                  return (
                    <div
                      key={`${b.start}-${idx}`}
                      className="flex-1 flex flex-col items-center justify-end gap-1"
                    >
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-gold-500/80 to-sky-400/80"
                        style={{ height: `${heightPct}%` }}
                        title={`${b.total} alerts`}
                      />
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {formatShortDate(b.start)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {alertsAnalytics && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-300">
                {Object.entries(alertsAnalytics.byStatus).map(([status, count]) => (
                  <span
                    key={status}
                    className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 border border-white/10"
                  >
                    <span className="font-mono text-[10px] text-gray-400">{status}</span>
                    <span className="font-semibold text-white">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Alert filter and legend */}
          <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">Focus on a specific alert</h2>
              <p className="text-xs text-gray-400">
                Select an alert to flag suspicious devices that were active around that time.
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-300 mb-1 block">Alert</label>
              <select
                value={selectedAlertId}
                onChange={(e) => setSelectedAlertId(e.target.value)}
                className="w-full p-2 rounded-lg bg-black/40 border border-white/10 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">All alerts</option>
                {recentAlerts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatShortDateTime(a.createdAt)} – {a.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2 flex flex-col gap-2 text-xs text-gray-300">
              <div className="inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
                <span>GPS points (from device GNSS)</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
                <span>Wi‑Fi only points (from AP fingerprints)</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                <span>Hybrid points (GPS + Wi‑Fi)</span>
              </div>
              <div className="mt-1 inline-flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-3 h-3" />
                <span>
                  Devices marked "seen near alert" appeared within ~30 minutes of the selected
                  alert.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Session correlation section */}
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
                  <span>{filteredOverlapDevices.length} devices across ≥2 sessions</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 border border-red-400/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span>{suspiciousOverlapCount} flagged as non‑trusted</span>
                </span>
              </div>
              {(sessionsLoading || envDevicesLoading) && (
                <span className="text-[11px] text-gray-400">Loading sessions & environment…</span>
              )}
              {(sessionsError || envDevicesError) && (
                <span className="text-[11px] text-red-400">
                  {sessionsError || envDevicesError}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6">
            {/* Left: Cloudflare-like session filter */}
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
                Each dot is a device seen in at least two of the selected sessions. Distance from
                center roughly follows how often it appears across sessions; size reflects total
                sightings. Red means not in your known environment; green is already known.
              </p>

              <div className="overflow-x-auto">
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
                      {filteredOverlapDevices.map((d) => (
                        <tr
                          key={d.kind + d.key}
                          onClick={() => openDeviceOnMap(d)}
                          className="border-b border-white/5 last:border-b-0 text-xs cursor-pointer hover:bg-white/5"
                        >

                        <td className="py-1 pr-4 text-gray-100">{d.label}</td>
                        <td className="py-1 pr-4 text-gray-300">
                          {d.kind === "wifi" ? "Wi‑Fi" : "Bluetooth"}
                        </td>
                        <td className="py-1 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {d.sessions.map((s) => (
                              <span
                                key={s.id}
                                className="inline-flex items-center rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-gray-100 border border-white/10"
                              >
                                <span className="truncate max-w-[140px]">{s.name}</span>
                                <span className="ml-1 text-gray-400">×{s.count}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-1 pr-4 text-gray-100">{d.totalCount}</td>
                        <td className="py-1 pr-4">
                          {d.isTrusted ? (
                            <div className="inline-flex flex-wrap items-center gap-1">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200 border border-emerald-400/40">
                                known
                              </span>
                              {d.trustedSourceLabel && (
                                <span className="text-[10px] text-emerald-200">
                                  {d.trustedSourceLabel}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-200 border border-red-400/40">
                              possible tracker
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
           </div>
         </section>


        {/* Suspicious devices table */}
        <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-red-400/20 mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-300">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Top suspicious devices</h2>
                <p className="text-xs text-gray-400">
                  Devices that repeatedly appear near your app device in different places. These
                  may represent potential trackers or stalker tools.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Activity className="w-4 h-4" />
              <span>
                {totalSuspicious === 0
                  ? "No suspicious devices for this range"
                  : `${totalSuspicious} devices flagged`}
              </span>
            </div>
          </div>

          {(!suspiciousAnalytics || suspiciousAnalytics.topDevices.length === 0) && !loading && (
            <p className="text-sm text-gray-400">No suspicious devices detected for this time range.</p>
          )}

          {suspiciousAnalytics && suspiciousAnalytics.topDevices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-white/10">
                    <th className="py-2 pr-4">Identifier</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Sightings</th>
                    <th className="py-2 pr-4">Places</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">First seen</th>
                    <th className="py-2 pr-4">Last seen</th>
                    <th className="py-2 pr-4">Near alert</th>
                  </tr>
                </thead>
                <tbody>
                  {suspiciousAnalytics.topDevices.map((d) => (
                    <tr key={d.id} className="border-b border-white/5 last:border-b-0 text-xs">
                      <td className="py-1 pr-4 font-mono text-[11px] text-gray-200">
                        {d.identifier}
                      </td>
                      <td className="py-1 pr-4 text-gray-200">{d.type}</td>
                      <td className="py-1 pr-4 text-gray-100">
                        {d.lastName || <span className="text-gray-500 italic">(unknown)</span>}
                      </td>
                      <td className="py-1 pr-4 text-gray-100">{d.totalSightings}</td>
                      <td className="py-1 pr-4 text-gray-100">{d.distinctLocationCount}</td>
                      <td className="py-1 pr-4 text-gray-100">{d.suspicionScore.toFixed(1)}</td>
                      <td className="py-1 pr-4 text-gray-400">
                        {formatShortDateTime(d.firstSeenAt)}
                      </td>
                      <td className="py-1 pr-4 text-gray-400">
                        {formatShortDateTime(d.lastSeenAt)}
                      </td>
                      <td className="py-1 pr-4">
                        {d.seenNearAlert ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200 border border-amber-400/40">
                            <AlertTriangle className="w-3 h-3" />
                            near alert
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500">no</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

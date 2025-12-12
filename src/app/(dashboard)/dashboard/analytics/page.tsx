"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/hooks/useLanguage";
import {
  BarChart3,
  Bell,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Filter,
  Smartphone,
  Bluetooth,
  Router,
} from "lucide-react";

import {
  SessionsRadarModal,
  OverlapDevice as RadarOverlapDevice,
  EnvironmentDeviceWifi as RadarEnvWifi,
  EnvironmentDeviceBle as RadarEnvBle,
  TrackingSessionLite,
} from "@/components/analytics/SessionsRadarModal";
import { TrustedPillToggle } from "@/components/analytics/TrustedPillToggle";
import { TopSuspiciousDevicesSection } from "@/components/analytics/TopSuspiciousDevicesSection";
import { SessionsCorrelationSection } from "@/components/analytics/SessionsCorrelationSection";
import { useTrustedDevices } from "@/hooks/useTrustedDevices";


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
  // Optional, per-recipient analytics for the current user
  recipientByStatus?: Record<string, number>;
  recipientTimeBuckets?: {
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

interface AlertTimelineEvent {
  time: string;
  kind: string;
  status?: string | null;
  byUserId?: string | null;
  byUserName?: string | null;
  recipientId?: string | null;
  recipientName?: string | null;
}

interface AlertTimeline {
  alert: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    senderName?: string | null;
  };
  events: AlertTimelineEvent[];
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
  manufacturer?: string | null;
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
  manufacturer?: string | null;
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
  const { t } = useLanguage();
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
  const [alertTimeline, setAlertTimeline] = useState<AlertTimeline | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
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
  const [showRadarModal, setShowRadarModal] = useState(false);

  const { trustedWifiKeySet, trustedBleKeySet, toggleTrusted } = useTrustedDevices();

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

        const [alertsRes, suspiciousRes, sentAlertsRes, receivedAlertsRes] =
          await Promise.all([
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
            fetch(
              "/api/alerts?" +
                new URLSearchParams({ type: "received", status: "ALL" }).toString()
            ),
          ]);

        if (!alertsRes.ok) throw new Error("Failed to load alerts analytics");
        if (!suspiciousRes.ok) throw new Error("Failed to load suspicious analytics");
        if (!sentAlertsRes.ok || !receivedAlertsRes.ok)
          throw new Error("Failed to load alerts list");

        const alertsData = (await alertsRes.json()) as AlertsAnalytics;
        const suspiciousData = (await suspiciousRes.json()) as SuspiciousAnalytics;
        const sentAlertsRaw = (await sentAlertsRes.json()) as { alerts: any[] };
        const receivedAlertsRaw = (await receivedAlertsRes.json()) as { alerts: any[] };

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

        const mergedAlertsRaw = [
          ...(sentAlertsRaw.alerts || []),
          ...(receivedAlertsRaw.alerts || []),
        ];

        mergedAlertsRaw.sort((a, b) => {
          const aTime = new Date(a.createdAt as string).getTime();
          const bTime = new Date(b.createdAt as string).getTime();
          return bTime - aTime;
        });

        const alertsList: AlertSummary[] = mergedAlertsRaw.map((a) => ({
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
    if (!selectedAlertId) {
      setAlertTimeline(null);
      setTimelineError(null);
      return;
    }

    let cancelled = false;

    const fetchTimeline = async () => {
      setTimelineLoading(true);
      setTimelineError(null);
      try {
        const res = await fetch(`/api/analytics/alerts/${selectedAlertId}/timeline`);
        if (!res.ok) throw new Error("Failed to load alert timeline");
        const data = (await res.json()) as AlertTimeline;
        if (cancelled) return;
        setAlertTimeline(data);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Failed to load alert timeline", err);
        setTimelineError(err?.message || "Unknown error");
        setAlertTimeline(null);
      } finally {
        if (!cancelled) {
          setTimelineLoading(false);
        }
      }
    };

    void fetchTimeline();

    return () => {
      cancelled = true;
    };
  }, [selectedAlertId]);

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
            manufacturer: w.manufacturer ?? null,
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
            manufacturer: b.manufacturer ?? null,
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

  type OverlapDevice = {
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
          isTrusted: trustedWifiKeySet.has(key),
          trustedSourceLabel: envMatch ? envMatch.ssid || envMatch.bssid : null,
          distanceKey: `wifi:${key}`,
          avgMeters: undefined,
          minMeters: undefined,
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
        existing.isTrusted = existing.isTrusted || trustedWifiKeySet.has(key);
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
          isTrusted: trustedBleKeySet.has(key),
          trustedSourceLabel: envMatch ? envMatch.name || envMatch.address : null,
          distanceKey: `ble:${key}`,
          avgMeters: undefined,
          minMeters: undefined,
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
        existing.isTrusted = existing.isTrusted || trustedBleKeySet.has(key);
        bleMap.set(key, existing);
      });
    }

    const all: OverlapDevice[] = [
      ...Array.from(wifiMap.values()),
      ...Array.from(bleMap.values()),
    ].filter((d) => d.sessionCount >= 1);

    const suspiciousCount = all.filter((d) => !d.isTrusted).length;

    all.sort((a, b) => b.sessionCount - a.sessionCount || b.totalCount - a.totalCount);

    return { overlapDevices: all, suspiciousOverlapCount: suspiciousCount };
  }, [
    selectedSessionIds,
    sessionEnvironments,
    trackingSessions,
    trustedWifiKeySet,
    trustedBleKeySet,
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

  const sessionQualityById = useMemo(() => {
    const map: Record<string, "GOOD" | "REGULAR" | "BAD" | null | undefined> = {};
    trackingSessions.forEach((s) => {
      map[s.id] = s.quality ?? null;
    });
    return map;
  }, [trackingSessions]);




  const totalSuspicious = suspiciousAnalytics?.topDevices.length || 0;


  const totalSeenNearAlert = suspiciousAnalytics?.topDevices.filter((d) => d.seenNearAlert)
    .length || 0;

  const alertsTotals = alertsAnalytics?.totals;
  const alertsTotalsPrev = alertsAnalyticsCompare?.totals;
  const recipientStatusSummary = alertsAnalytics?.recipientByStatus || {};

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
            <p className="text-sm text-gray-400">{t('analytics.hero.kicker')}</p>
            <h1 className="text-2xl font-bold text-white">{t('analytics.hero.title')}</h1>
            <p className="mt-1 text-xs text-gray-400 max-w-2xl">
              {t('analytics.hero.body')}
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
                  {t('analytics.range.last7')}
                 </button>
                 <button
                   type="button"
                   onClick={() => setDaysBack(30)}
                   className={`px-3 py-1 rounded-full transition-colors ${
                     daysBack === 30 ? "bg-white text-black" : "text-gray-300"
                   }`}
                 >
                  {t('analytics.range.last30')}
                 </button>
               </div>
             )}


             {alertsAnalytics && (
               <p className="text-[11px] text-gray-400">
                {t('analytics.range.label')} {formatShortDate(alertsAnalytics.range.from)} – {formatShortDate(
                   alertsAnalytics.range.to
                 )}
               </p>

            )}
          </div>
        </div>

         {error && (
           <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm text-red-100">
            {t('analytics.error.load')} {error}
           </div>
         )}


        {/* Filters + KPI */}
        <div className="grid grid-cols-1 lg:grid-cols-[250px,1fr] gap-6 mb-8">
          {/* Left: presets and filters */}
          <aside className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex flex-col gap-4 text-xs">
             <div>
               <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                {t('analytics.scope.label')}
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
                  {t('analytics.scope.all')}
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
                  {t('analytics.scope.sent')}
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
                  {t('analytics.scope.received')}
                 </button>

              </div>
            </div>

             <div>
               <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                {t('analytics.time.label')}
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
                   <span>{t('analytics.time.relative')}</span>
                 </label>
                 <label className="inline-flex items-center gap-2">
                   <input
                     type="radio"
                     name="time-mode"
                     checked={timeMode === "custom"}
                     onChange={() => setTimeMode("custom")}
                     className="h-3 w-3"
                   />
                   <span>{t('analytics.time.custom')}</span>
                 </label>

                {timeMode === "custom" && (
                  <div className="mt-2 space-y-2">
                     <div className="flex flex-col gap-1">
                       <span className="text-[11px] text-gray-400">{t('analytics.time.from')}</span>
                       <input
                         type="date"
                         value={customFrom}
                         onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full rounded-md bg-black/40 border border-white/10 px-2 py-1 text-[11px] text-gray-100"
                      />
                    </div>
                     <div className="flex flex-col gap-1">
                       <span className="text-[11px] text-gray-400">{t('analytics.time.to')}</span>
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
                 <span>{t('analytics.compare.label')}</span>
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
                 <p className="text-xs uppercase tracking-wide text-gold-400">{t('analytics.kpi.total')}</p>

                <p className="text-lg font-semibold text-gold-100">
                  {alertsTotals?.alerts ?? "–"}
                </p>
                {alertsTotalsPrev && totalAlertsDelta !== null && (
                   <p className="text-[10px] text-gray-400 mt-0.5">
                    {t('analytics.kpi.prevPrefix')} {alertsTotalsPrev.alerts}, {t('analytics.kpi.deltaPrefix')} {totalAlertsDelta >= 0 ? "+" : ""}
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
                 <p className="text-xs uppercase tracking-wide text-emerald-400">{t('analytics.kpi.sent')}</p>

                <p className="text-lg font-semibold text-emerald-100">
                  {alertsTotals?.sent ?? "–"}
                </p>
                {alertsTotalsPrev && sentDelta !== null && (
                   <p className="text-[10px] text-gray-400 mt-0.5">
                    {t('analytics.kpi.prevPrefix')} {alertsTotalsPrev.sent}, {t('analytics.kpi.deltaPrefix')} {sentDelta >= 0 ? "+" : ""}
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
                 <p className="text-xs uppercase tracking-wide text-sky-400">{t('analytics.kpi.received')}</p>

                <p className="text-lg font-semibold text-sky-100">
                  {alertsTotals?.received ?? "–"}
                </p>
                {alertsTotalsPrev && receivedDelta !== null && (
                   <p className="text-[10px] text-gray-400 mt-0.5">
                    {t('analytics.kpi.prevPrefix')} {alertsTotalsPrev.received}, {t('analytics.kpi.deltaPrefix')} {receivedDelta >= 0 ? "+" : ""}
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
                 <p className="text-xs uppercase tracking-wide text-red-400">{t('analytics.kpi.suspicious')}</p>

                <p className="text-lg font-semibold text-red-100">
                   {totalSuspicious}
                   {totalSeenNearAlert > 0 && (
                     <span className="ml-1 text-[11px] text-amber-300">
                      ({totalSeenNearAlert} {t('analytics.kpi.nearSelectedAlertSuffix')})
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
                <h2 className="text-lg font-semibold">{t('analytics.alertsOverTime.title')}</h2>
                <p className="text-xs text-gray-400">
                  {t('analytics.alertsOverTime.subtitlePrefix')} {alertsAnalytics?.bucket || "day"}.
                </p>
               </div>

            </div>

             {(!alertsAnalytics || alertsAnalytics.timeBuckets.length === 0) && !loading && (
              <p className="text-sm text-gray-400">{t('analytics.alertsOverTime.empty')}</p>
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
                        {formatShortDate(b.end)}
                       </span>
                    </div>
                  );
                })}
              </div>
            )}

            {alertsAnalytics && (
              <div className="mt-3 flex flex-col gap-2 text-xs text-gray-300">
                <div className="flex flex-wrap gap-3">
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

                {Object.keys(recipientStatusSummary).length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(recipientStatusSummary).map(([status, count]) => (
                      <span
                        key={`me-${status}`}
                        className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 border border-sky-400/40"
                      >
                        <span className="font-mono text-[10px] text-sky-300">ME/{status}</span>
                        <span className="font-semibold text-white">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

           {/* Alert filter and legend */}
            <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10 flex flex-col gap-4">
              <div>
               <h2 className="text-lg font-semibold">{t('analytics.focus.title')}</h2>
               <p className="text-xs text-gray-400">
                 {t('analytics.focus.body')}
               </p>
              </div>


              <div>
               <label className="text-xs text-gray-300 mb-1 block">{t('analytics.focus.selectLabel')}</label>
                <select

                 value={selectedAlertId}
                 onChange={(e) => setSelectedAlertId(e.target.value)}
                 className="w-full p-2 rounded-lg bg-black/40 border border-white/10 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
>
                  <option value="">{t('analytics.focus.allOption')}</option>
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
                 <span>{t('analytics.focus.legend.gps')}</span>
               </div>
               <div className="inline-flex items-center gap-2">
                 <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
                 <span>{t('analytics.focus.legend.wifi')}</span>
               </div>
               <div className="inline-flex items-center gap-2">
                 <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                 <span>{t('analytics.focus.legend.hybrid')}</span>
               </div>
               <div className="mt-1 inline-flex items-center gap-2 text-amber-300">
                 <AlertTriangle className="w-3 h-3" />
                 <span>
                   {t('analytics.focus.legend.nearAlert')}
                 </span>
               </div>
            </div>

            {selectedAlertId && (
              <div className="mt-4 border-t border-white/10 pt-3 text-xs text-gray-300">
                <p className="mb-2 font-semibold">
                  {t('analytics.focus.timelineLabel')}
                </p>

                {timelineLoading && (
                  <p className="text-[11px] text-gray-400">
                    {t('analytics.focus.timelineLoading')}
                  </p>
                )}

                {timelineError && (
                  <p className="text-[11px] text-red-400">
                    {timelineError}
                  </p>
                )}

                {alertTimeline && alertTimeline.events.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {alertTimeline.events.map((ev) => (
                      <div key={`${ev.kind}-${ev.time}-${ev.recipientId || ev.byUserId || ''}`} className="flex flex-col">
                        <span className="text-[11px] text-gray-400">
                          {formatShortDateTime(ev.time)}
                        </span>
                        <span className="text-[11px] text-gray-100">
                          {ev.kind}
                          {ev.status ? ` · ${ev.status}` : ""}
                          {ev.recipientName ? ` · ${ev.recipientName}` : ""}
                          {ev.byUserName ? ` · ${ev.byUserName}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {alertTimeline && alertTimeline.events.length === 0 && !timelineLoading && !timelineError && (
                  <p className="text-[11px] text-gray-400">
                    {t('analytics.focus.timelineEmpty')}
                  </p>
                )}
              </div>
            )}
           </section>

        </div>

        {/* Session correlation section */}
        <SessionsCorrelationSection
          filteredSessions={filteredSessions}
          sessionSearch={sessionSearch}
          setSessionSearch={setSessionSearch}
          selectedSessionIds={selectedSessionIds}
          setSelectedSessionIds={setSelectedSessionIds}
          deviceKindFilter={deviceKindFilter}
          setDeviceKindFilter={setDeviceKindFilter}
          hideTrusted={hideTrusted}
          setHideTrusted={setHideTrusted}
          filteredOverlapDevices={filteredOverlapDevices}
          suspiciousOverlapCount={suspiciousOverlapCount}
          sessionsLoading={sessionsLoading}
          envDevicesLoading={envDevicesLoading}
          sessionsError={sessionsError}
          envDevicesError={envDevicesError}
          radarDevices={radarDevices}
          radarStats={radarStats}
          onExpandRadar={() => setShowRadarModal(true)}
          openDeviceOnMap={openDeviceOnMap}
          toggleTrusted={toggleTrusted}
          sessionQualityById={sessionQualityById}
        />


        {/* Suspicious devices table */}
        <TopSuspiciousDevicesSection
          suspiciousAnalytics={suspiciousAnalytics}
          loading={loading}
          trustedWifiKeySet={trustedWifiKeySet}
          trustedBleKeySet={trustedBleKeySet}
          toggleTrusted={toggleTrusted}
        />


        <SessionsRadarModal
          isOpen={showRadarModal}
          onClose={() => setShowRadarModal(false)}
          fromIso={fromIso}
          toIso={toIso}
          trackingSessions={trackingSessions as TrackingSessionLite[]}
          filteredSessions={filteredSessions as TrackingSessionLite[]}
          selectedSessionIds={selectedSessionIds}
          setSelectedSessionIds={setSelectedSessionIds}
          filteredOverlapDevices={filteredOverlapDevices as RadarOverlapDevice[]}
          envWifiDevices={envWifiDevices as RadarEnvWifi[]}
          envBleDevices={envBleDevices as RadarEnvBle[]}
          deviceKindFilter={deviceKindFilter}
          setDeviceKindFilter={setDeviceKindFilter}
          hideTrusted={hideTrusted}
          setHideTrusted={setHideTrusted}
          openDeviceOnMap={openDeviceOnMap}
        />

       </main>
    </div>
  );
}
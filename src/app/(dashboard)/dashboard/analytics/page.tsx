"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { BarChart3, Bell, ShieldAlert, AlertTriangle, Activity } from "lucide-react";

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

  const maxBucketTotal = useMemo(() => {
    if (!alertsAnalytics) return 0;
    return alertsAnalytics.timeBuckets.reduce(
      (max, b) => (b.total > max ? b.total : max),
      0
    );
  }, [alertsAnalytics]);

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
      <main className="max-w-7xl mx-auto px-6 py-8 pt-24">
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

"use client";

import React from "react";
import { Activity, AlertTriangle, ShieldAlert } from "lucide-react";
import { TrustedPillToggle } from "@/components/analytics/TrustedPillToggle";
import type { TrustedDeviceKey } from "@/hooks/useTrustedDevices";
import { useLanguage } from "@/hooks/useLanguage";

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

interface Props {
  suspiciousAnalytics: SuspiciousAnalytics | null;
  loading: boolean;
  trustedWifiKeySet: Set<string>;
  trustedBleKeySet: Set<string>;
  toggleTrusted: (device: TrustedDeviceKey, nextValue?: boolean) => void;
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

export function TopSuspiciousDevicesSection({
  suspiciousAnalytics,
  loading,
  trustedWifiKeySet,
  trustedBleKeySet,
  toggleTrusted,
}: Props) {
  const { t } = useLanguage();
  const devices = suspiciousAnalytics?.topDevices ?? [];
  const totalSuspicious = devices.length;

  return (
    <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-red-400/20 mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-300">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {t("analytics.suspicious.title")}
            </h2>
            <p className="text-xs text-gray-400">
              {t("analytics.suspicious.body")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-300 mb-4">
        <Activity className="w-4 h-4" />
        <span>
          {totalSuspicious === 0
            ? t("analytics.suspicious.summary.none")
            : `${totalSuspicious} ${t("analytics.suspicious.summary.someSuffix")}`}
        </span>
      </div>

      {!loading && devices.length === 0 && (
        <p className="text-sm text-gray-400">
          {t("analytics.suspicious.empty")}
        </p>
      )}

      {devices.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/10">
                <th className="py-2 pr-4">
                  {t("analytics.suspicious.table.identifier")}
                </th>
                <th className="py-2 pr-4">
                  {t("analytics.suspicious.table.type")}
                </th>
                <th className="py-2 pr-4">
                  {t("analytics.suspicious.table.name")}
                </th>
                <th className="py-2 pr-4">
                  {t("analytics.suspicious.table.sightings")}
                </th>
                <th className="py-2 pr-4">
                  {t("analytics.suspicious.table.places")}
                </th>
                <th className="py-2 pr-4">
                  {t("analytics.suspicious.table.score")}
                </th>
                <th className="py-2 pr-4">
                  {t("analytics.suspicious.table.firstSeen")}
                </th>
                <th className="py-2 pr-4">
                  {t("analytics.suspicious.table.lastSeen")}
                </th>
                <th className="py-2 pr-4">
                  {t("analytics.suspicious.table.nearAlert")}
                </th>
                <th className="py-2 pr-4">
                  {t("analytics.suspicious.table.trusted")}
                </th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const isWifi = d.type === "wifi";
                const isBle = d.type === "ble";
                const key = d.identifier;
                const isTrusted = isWifi
                  ? trustedWifiKeySet.has(key)
                  : isBle
                  ? trustedBleKeySet.has(key)
                  : false;

                return (
                  <tr
                    key={d.id}
                    className="border-b border-white/5 last:border-b-0 text-xs"
                  >
                    <td className="py-1 pr-4 font-mono text-[11px] text-gray-200">
                      {d.identifier}
                    </td>
                    <td className="py-1 pr-4 text-gray-200">{d.type}</td>
                    <td className="py-1 pr-4 text-gray-100">
                      {d.lastName || (
                        <span className="text-gray-500 italic">
                          {t("analytics.suspicious.unknownName")}
                        </span>
                      )}
                    </td>
                    <td className="py-1 pr-4 text-gray-100">
                      {d.totalSightings}
                    </td>
                    <td className="py-1 pr-4 text-gray-100">
                      {d.distinctLocationCount}
                    </td>
                    <td className="py-1 pr-4 text-gray-100">
                      {d.suspicionScore.toFixed(1)}
                    </td>
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
                          {t("analytics.suspicious.nearAlertPill")}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500">
                          {t("analytics.suspicious.nearAlertNo")}
                        </span>
                      )}
                    </td>
                    <td className="py-1 pr-4">
                      {isWifi || isBle ? (
                        <TrustedPillToggle
                          isTrusted={isTrusted}
                          onToggle={() =>
                            toggleTrusted(
                              { kind: isWifi ? "wifi" : "ble", key },
                              !isTrusted,
                            )
                          }
                        />
                      ) : (
                        <span className="text-[10px] text-gray-500">
                          {t("analytics.suspicious.na")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface SuspiciousDevicesSectionProps {
  suspiciousWifiDevices: any[];
  suspiciousBleDevices: any[];
  suspiciousLoading: boolean;
  suspiciousError: string | null;
}

export function SuspiciousDevicesSection({
  suspiciousWifiDevices,
  suspiciousBleDevices,
  suspiciousLoading,
  suspiciousError,
}: SuspiciousDevicesSectionProps) {
  const { t } = useLanguage();
  return (
    <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h2 className="text-lg font-semibold mb-2">
        {t('settings.suspicious.title')}
      </h2>
      <p className="text-sm text-gray-300">
        {t('settings.suspicious.body')}
        across different places for the selected session's device.
      </p>
      {suspiciousError && (
        <div className="mt-3 text-sm text-red-400">{suspiciousError}</div>
      )}
      <div className="mt-4">
        {suspiciousLoading ? (
          <div className="text-sm text-gray-400">{t('settings.suspicious.loading')}</div>
        ) :
        suspiciousWifiDevices.length === 0 && suspiciousBleDevices.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-sm text-gray-400">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="mb-1">{t('settings.suspicious.emptyTitle')}</p>
            <p className="text-xs text-gray-500 max-w-md text-center">
              {t('settings.suspicious.emptyBody')}
              repeatedly appear across different places near you will be highlighted here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">
                {t('settings.suspicious.wifiHeading')}
              </h3>
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                {suspiciousWifiDevices.map((device: any, idx: number) => {
                  const first = device.first_seen_at
                    ? new Date(device.first_seen_at)
                    : null;
                  const last = device.last_seen_at
                    ? new Date(device.last_seen_at)
                    : null;
                  return (
                    <li
                      key={`${device.identifier}-${idx}`}
                      className="bg-white/5 rounded-xl px-3 py-2 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium truncate">
                            {device.name || t('settings.suspicious.unknownWifi')}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {t('settings.suspicious.bssid')} {device.identifier}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px] text-gray-300">
                          <span>
                            {t('settings.suspicious.score')} {Number(device.suspicion_score ?? 0).toFixed(1)}
                          </span>
                          <span>
                            {t('settings.suspicious.places')} {device.distinct_location_count ?? 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-300">
                        {first && (
                          <span>{t('settings.suspicious.firstSeen')} {first.toLocaleString()}</span>
                        )}
                        {last && (
                          <span>{t('settings.suspicious.lastSeen')} {last.toLocaleString()}</span>
                        )}
                        <span>{t('settings.suspicious.sightings')} {device.total_sightings ?? 0}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">
                {t('settings.suspicious.bluetoothHeading')}
              </h3>
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                {suspiciousBleDevices.map((device: any, idx: number) => {
                  const first = device.first_seen_at
                    ? new Date(device.first_seen_at)
                    : null;
                  const last = device.last_seen_at
                    ? new Date(device.last_seen_at)
                    : null;
                  return (
                    <li
                      key={`${device.identifier}-${idx}`}
                      className="bg-white/5 rounded-xl px-3 py-2 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium truncate">
                            {device.name || t('settings.suspicious.unknownBle')}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {t('settings.suspicious.address')} {device.identifier}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px] text-gray-300">
                          <span>
                            {t('settings.suspicious.score')} {Number(device.suspicion_score ?? 0).toFixed(1)}
                          </span>
                          <span>
                            {t('settings.suspicious.places')} {device.distinct_location_count ?? 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-300">
                        {first && (
                          <span>{t('settings.suspicious.firstSeen')} {first.toLocaleString()}</span>
                        )}
                        {last && (
                          <span>{t('settings.suspicious.lastSeen')} {last.toLocaleString()}</span>
                        )}
                        <span>{t('settings.suspicious.sightings')} {device.total_sightings ?? 0}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

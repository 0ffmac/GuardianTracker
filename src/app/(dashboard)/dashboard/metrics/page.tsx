 "use client";
  import { useState, useEffect, useMemo } from "react";

 import dynamic from "next/dynamic";
 import { Navbar } from "@/components/Navbar";
 import { useLanguage } from "@/hooks/useLanguage";
 
 const Map = dynamic(() => import("@/components/Map"), { ssr: false });
 
 interface Location {
   id: string;
   latitude: number;
   longitude: number;
   deviceId: string | null;
   timestamp: string;
   source?: "gps" | "wifi" | "hybrid" | null;
   trackingSessionId?: string | null;
 }
 
 export default function DashboardMetricsPage() {
   const { t } = useLanguage();

  const [trackingSessions, setTrackingSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<any[]>([]);
  const [bleDevices, setBleDevices] = useState<any[]>([]);
  const [environmentSummary, setEnvironmentSummary] = useState<any>(null);
  const [selectedBleAddress, setSelectedBleAddress] = useState<string | null>(null);
  const [bleDeviceLocations, setBleDeviceLocations] = useState<Location[]>([]);
  const [bleDeviceLocationsRaw, setBleDeviceLocationsRaw] = useState<Location[]>([]);
  const [bleRangeFrom, setBleRangeFrom] = useState<string>("");
  const [bleRangeTo, setBleRangeTo] = useState<string>("");
  const [bleMapLoading, setBleMapLoading] = useState(false);
  const [bleMapError, setBleMapError] = useState<string | null>(null);

  const selectedBleDevice = useMemo(
    () => bleDevices.find((d) => d.address === selectedBleAddress) || null,
    [bleDevices, selectedBleAddress],
  );

  useEffect(() => {
    const fetchLocationHistory = async () => {
      const res = await fetch("/api/locations");
      const data = await res.json();
      setTrackingSessions(data.trackingSessions || []);
      if (!selectedSessionId && data.trackingSessions.length > 0) {
        setSelectedSessionId(data.trackingSessions[0].id);
      }
    };
    fetchLocationHistory();
  }, [selectedSessionId]);

   useEffect(() => {
     const loadEnvironment = async () => {
       if (!selectedSessionId) {
         setEnvironmentSummary(null);
         setWifiNetworks([]);
         setBleDevices([]);
         return;
       }
       try {
         const res = await fetch(`/api/tracking_session/${selectedSessionId}/environment`);
         if (!res.ok) return;
         const data = await res.json();
         setEnvironmentSummary(data.summary ?? null);
         setWifiNetworks(data.wifi ?? []);
         setBleDevices(data.ble ?? []);
       } catch (err) {
         console.error("Failed to load environment metrics", err);
       }
     };
     loadEnvironment();
   }, [selectedSessionId]);

   useEffect(() => {
     if (!bleDeviceLocationsRaw || bleDeviceLocationsRaw.length === 0) {
       setBleDeviceLocations([]);
       return;
     }

     const fromTime = bleRangeFrom ? new Date(bleRangeFrom).getTime() : null;
     const toTime = bleRangeTo ? new Date(bleRangeTo).getTime() : null;

     const filtered = bleDeviceLocationsRaw.filter((loc) => {
       const ts = new Date(loc.timestamp).getTime();
       if (Number.isNaN(ts)) return false;
       if (fromTime !== null && ts < fromTime) return false;
       if (toTime !== null && ts > toTime) return false;
       return true;
     });

     setBleDeviceLocations(filtered);
   }, [bleDeviceLocationsRaw, bleRangeFrom, bleRangeTo]);

   const handleShowBleDeviceMap = async () => {
     if (!selectedBleAddress) return;
     try {
       setBleMapLoading(true);
       setBleMapError(null);
       const res = await fetch(
         `/api/environment/ble_device_path?address=${encodeURIComponent(selectedBleAddress)}`,
       );
       if (!res.ok) {
         throw new Error("Failed to load BLE device path");
       }
       const data = await res.json();
       const locations = (data.locations || []) as Location[];
       setBleDeviceLocationsRaw(locations);
     } catch (err) {
       console.error("Failed to load BLE device path", err);
       setBleMapError("Failed to load Bluetooth device map.");
       setBleDeviceLocationsRaw([]);
       setBleDeviceLocations([]);
     } finally {
       setBleMapLoading(false);
     }
   };

   const bleSessionsSummary = useMemo(() => {
     if (!selectedBleAddress || bleDeviceLocations.length === 0) return [];

     const locationsBySession: Record<string, Location[]> = {};

     const distanceMeters = (
       lat1: number,
       lon1: number,
       lat2: number,
       lon2: number,
     ) => {
       const R = 6371000; // meters
       const toRad = (v: number) => (v * Math.PI) / 180;
       const dLat = toRad(lat2 - lat1);
       const dLon = toRad(lon2 - lon1);
       const a =
         Math.sin(dLat / 2) * Math.sin(dLat / 2) +
         Math.cos(toRad(lat1)) *
           Math.cos(toRad(lat2)) *
           Math.sin(dLon / 2) *
           Math.sin(dLon / 2);
       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
       return R * c;
     };

     bleDeviceLocations.forEach((loc) => {
       const sid = (loc as any).trackingSessionId || "unknown";
       if (!locationsBySession[sid]) {
         locationsBySession[sid] = [];
       }
       locationsBySession[sid].push(loc);
     });

     const summaries = Object.entries(locationsBySession).map(([sid, locs]) => {
       if (locs.length === 0) {
         return {
           sessionId: sid,
           label: t("settings.sessions.sessionFallback"),
           count: 0,
           multiPlace: false,
         };
       }

       let maxDist = 0;
       for (let i = 0; i < locs.length; i++) {
         for (let j = i + 1; j < locs.length; j++) {
           const d = distanceMeters(
             locs[i].latitude,
             locs[i].longitude,
             locs[j].latitude,
             locs[j].longitude,
           );
           if (d > maxDist) maxDist = d;
         }
       }

       const session =
         trackingSessions.find((s) => s.id === sid) || null;
       const label =
         session?.name ||
         (session
           ? `Session ${new Date(session.startTime).toLocaleString()}`
           : t("settings.sessions.sessionFallback"));

       return {
         sessionId: sid,
         label,
         count: locs.length,
         multiPlace: maxDist >= 20,
       };
     });

     return summaries;
   }, [bleDeviceLocations, trackingSessions, selectedBleAddress, t]);


   return (

    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 pt-20">
        <h1 className="text-2xl font-bold mb-4">Tracking Metrics</h1>
        <div className="mt-4 p-6 bg-gold-900/20 rounded-2xl border border-gold-400/20">
          <label htmlFor="session-select" className="mr-2">Session:</label>
          <select
            id="session-select"
            value={selectedSessionId || ''}
            onChange={e => setSelectedSessionId(e.target.value)}
            className="w-full md:w-64 p-3 bg-gold-900/40 border border-gold-400/30 
              rounded-lg text-gold-100 appearance-none cursor-pointer 
              focus:ring-gold-500 focus:border-gold-500 font-semibold
              "
          >
            {trackingSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || `Session ${new Date(s.startTime).toLocaleString()}`}
              </option>
            ))}
          </select>
        </div>
         <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">{t('dashboard.metrics.wifiSeen.title')}</h2>
           {wifiNetworks.length === 0 ? (
            <p className="text-sm text-gray-400">{t('dashboard.metrics.wifiSeen.empty')}</p>
           ) : (

            <table className="min-w-full text-sm">
              <thead>
                 <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="py-2 pr-4">{t('dashboard.metrics.wifiSeen.columns.ssid')}</th>
                  <th className="py-2 pr-4">{t('dashboard.metrics.wifiSeen.columns.bssid')}</th>
                  <th className="py-2 pr-4">{t('dashboard.metrics.wifiSeen.columns.samples')}</th>
                  <th className="py-2 pr-4">{t('dashboard.metrics.wifiSeen.columns.avgRssi')}</th>
                 </tr>

              </thead>
              <tbody>
                {wifiNetworks.map((net, idx) => (
                  <tr key={`${net.bssid}-${idx}`} className="border-b border-white/5 last:border-b-0">
                    <td className="py-1 pr-4 text-white">{net.ssid || <span className="text-gray-500 italic">(hidden)</span>}</td>
                    <td className="py-1 pr-4 text-gray-300 font-mono text-xs">{net.bssid}</td>
                    <td className="py-1 pr-4 text-gray-200">{net.count}</td>
                    <td className="py-1 pr-4 text-gray-200">{net.avgRssi !== null && net.avgRssi !== undefined ? `${Math.round(net.avgRssi)} dBm` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
         <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">{t('dashboard.metrics.wifiTop.title')}</h2>
           {wifiNetworks.length === 0 ? (
            <p className="text-sm text-gray-400">{t('dashboard.metrics.wifiSeen.empty')}</p>
           ) : (

            <table className="min-w-full text-sm">
              <thead>
                 <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="py-2 pr-4">{t('dashboard.metrics.wifiSeen.columns.ssid')}</th>
                  <th className="py-2 pr-4">{t('dashboard.metrics.wifiSeen.columns.bssid')}</th>
                  <th className="py-2 pr-4">{t('dashboard.metrics.wifiTop.columns.samplesProxy')}</th>
                 </tr>

              </thead>
              <tbody>
                {wifiNetworks
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10)
                  .map((net, idx) => (
                    <tr key={`most-${net.bssid}-${idx}`} className="border-b border-white/5 last:border-b-0">
                      <td className="py-1 pr-4 text-white">{net.ssid || <span className="text-gray-500 italic">{t('dashboard.metrics.wifi.hidden')}</span>}</td>
                      <td className="py-1 pr-4 text-gray-300 font-mono text-xs">{net.bssid}</td>
                      <td className="py-1 pr-4 text-gold-300 font-bold">{net.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
         </div>
          <div className="mb-8">
           <h2 className="text-lg font-semibold mb-2">{t('dashboard.metrics.bleSeen.title')}</h2>
           {bleDevices.length === 0 ? (
            <p className="text-sm text-gray-400">{t('dashboard.metrics.bleSeen.empty')}</p>
           ) : (
 
            <table className="min-w-full text-sm">
              <thead>
                 <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="py-2 pr-4">{t('dashboard.metrics.bleSeen.columns.name')}</th>
                  <th className="py-2 pr-4">{t('dashboard.metrics.bleSeen.columns.address')}</th>
                  <th className="py-2 pr-4">{t('dashboard.metrics.bleSeen.columns.samples')}</th>
                  <th className="py-2 pr-4">{t('dashboard.metrics.bleSeen.columns.avgRssi')}</th>
                 </tr>
 
              </thead>
              <tbody>
                {bleDevices.map((dev, idx) => (
                  <tr key={`${dev.address}-${idx}`} className="border-b border-white/5 last:border-b-0">
                    <td className="py-1 pr-4 text-white">{dev.name || <span className="text-gray-500 italic">(unknown)</span>}</td>
                    <td className="py-1 pr-4 text-gray-300 font-mono text-xs">{dev.address}</td>
                    <td className="py-1 pr-4 text-gray-200">{dev.count}</td>
                    <td className="py-1 pr-4 text-gray-200">{dev.avgRssi !== null && dev.avgRssi !== undefined ? `${Math.round(dev.avgRssi)} dBm` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
         <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">{t('dashboard.metrics.bleTop.title')}</h2>
           {bleDevices.length === 0 ? (
            <p className="text-sm text-gray-400">{t('dashboard.metrics.bleSeen.empty')}</p>
           ) : (
 
            <>
              <table className="min-w-full text-sm">
                <thead>
                   <tr className="text-left text-gray-400 border-b border-white/10">
                    <th className="py-2 pr-4 w-10">
                      {t('dashboard.metrics.bleTop.columns.select')}
                    </th>
                    <th className="py-2 pr-4">{t('dashboard.metrics.bleSeen.columns.name')}</th>
                    <th className="py-2 pr-4">{t('dashboard.metrics.bleSeen.columns.address')}</th>
                    <th className="py-2 pr-4">{t('dashboard.metrics.bleTop.columns.samplesProxy')}</th>
                   </tr>
 
                </thead>
                <tbody>
                  {bleDevices
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                    .map((dev, idx) => (
                      <tr
                        key={`most-${dev.address}-${idx}`}
                        className="border-b border-white/5 last:border-b-0"
                      >
                        <td className="py-1 pr-2 align-middle">
                          <input
                             type="radio"
                             name="ble-top-select"
                             className="h-4 w-4 cursor-pointer accent-gold-400"
                             checked={selectedBleAddress === dev.address}
                             onChange={() => {
                               setSelectedBleAddress(dev.address);
                               setBleDeviceLocationsRaw([]);
                               setBleDeviceLocations([]);
                               setBleRangeFrom("");
                               setBleRangeTo("");
                               setBleMapError(null);
                             }}
                           />

                        </td>
                        <td className="py-1 pr-4 text-white">
                          {dev.name || (
                            <span className="text-gray-500 italic">
                              {t('dashboard.metrics.ble.unknown')}
                            </span>
                          )}
                        </td>
                        <td className="py-1 pr-4 text-gray-300 font-mono text-xs">
                          {dev.address}
                        </td>
                        <td className="py-1 pr-4 text-gold-300 font-bold">{dev.count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>

               <div className="mt-4 flex flex-col gap-2">
                 <button
                   type="button"
                   onClick={handleShowBleDeviceMap}
                   disabled={!selectedBleAddress || bleMapLoading}
                   className="inline-flex items-center justify-center rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-black shadow disabled:cursor-not-allowed disabled:opacity-60"
                 >
                   {bleMapLoading
                     ? t('dashboard.metrics.bleTop.mapButton.loading')
                     : t('dashboard.metrics.bleTop.mapButton')}
                 </button>
                 {bleMapError && (
                   <p className="text-xs text-red-400">{bleMapError}</p>
                 )}
               </div>

               <div className="mt-4 grid gap-3 text-xs text-gray-200 md:grid-cols-3">
                 <div className="md:col-span-2 flex flex-wrap items-end gap-3">
                   <span className="font-semibold text-sm text-gold-200">
                     {t('dashboard.metrics.bleTop.range.label')}
                   </span>
                   <div className="flex flex-col gap-1">
                     <label className="text-[11px] uppercase tracking-wide text-gray-400">
                       {t('dashboard.metrics.bleTop.range.from')}
                     </label>
                     <input
                       type="datetime-local"
                       value={bleRangeFrom}
                       onChange={(e) => setBleRangeFrom(e.target.value)}
                       className="rounded-md bg-gold-950/40 border border-gold-500/40 px-2 py-1 text-[11px] text-gold-100 focus:outline-none focus:ring-1 focus:ring-gold-400"
                     />
                   </div>
                   <div className="flex flex-col gap-1">
                     <label className="text-[11px] uppercase tracking-wide text-gray-400">
                       {t('dashboard.metrics.bleTop.range.to')}
                     </label>
                     <input
                       type="datetime-local"
                       value={bleRangeTo}
                       onChange={(e) => setBleRangeTo(e.target.value)}
                       className="rounded-md bg-gold-950/40 border border-gold-500/40 px-2 py-1 text-[11px] text-gold-100 focus:outline-none focus:ring-1 focus:ring-gold-400"
                     />
                   </div>
                 </div>
                 {bleSessionsSummary.length > 0 && (
                   <div className="md:col-span-1">
                     <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">
                       {t('dashboard.metrics.bleTop.sessionsTitle')}
                     </p>
                     <div className="max-h-32 overflow-auto rounded-md border border-white/10 bg-black/20">
                       <table className="min-w-full text-[11px]">
                         <thead>
                           <tr className="text-left text-gray-400 border-b border-white/10">
                             <th className="py-1 px-2">
                               {t('dashboard.metrics.bleTop.sessions.columns.session')}
                             </th>
                             <th className="py-1 px-2">
                               {t('dashboard.metrics.bleTop.sessions.columns.sightings')}
                             </th>
                             <th className="py-1 px-2">
                               {t('dashboard.metrics.bleTop.sessions.columns.multiPlace')}
                             </th>
                           </tr>
                         </thead>
                         <tbody>
                           {bleSessionsSummary.map((row) => (
                             <tr
                               key={row.sessionId}
                               className="border-b border-white/5 last:border-b-0"
                             >
                               <td className="py-1 px-2 text-gray-100">{row.label}</td>
                               <td className="py-1 px-2 text-gold-200 font-semibold">
                                 {row.count}
                               </td>
                               <td className="py-1 px-2">
                                 <span
                                   className={
                                     row.multiPlace
                                       ? "inline-flex items-center rounded-full bg-emerald-600/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-50"
                                       : "inline-flex items-center rounded-full bg-gray-700/70 px-2 py-0.5 text-[10px] font-semibold text-gray-100"
                                   }
                                 >
                                   {row.multiPlace
                                     ? t('dashboard.metrics.bleTop.sessions.multiPlace.yes')
                                     : t('dashboard.metrics.bleTop.sessions.multiPlace.no')}
                                 </span>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}
               </div>
 
               {bleDeviceLocations.length > 0 && (
                 <div className="mt-4 h-[420px] rounded-2xl border border-gold-400/30 bg-gold-900/20 p-3">
                   <h3 className="mb-2 text-sm font-semibold">
                     {t('dashboard.metrics.bleTop.mapTitle')}
                   </h3>
                   <div className="h-[340px]">
                     <Map
                       locations={[]}
                       currentLocation={null}
                       fitOnUpdate
                       autoZoomOnFirstPoint
                       hidePopups
                       wifiDevices={[]}
                       bleDevices={bleDeviceLocations.map((loc) => ({
                         address: selectedBleAddress || "",
                         name: selectedBleDevice?.name ?? null,
                         latitude: loc.latitude,
                         longitude: loc.longitude,
                         count: 1,
                         avgRssi: null,
                         firstSeen: loc.timestamp,
                         lastSeen: loc.timestamp,
                       }))}
                     />
                   </div>
                 </div>
               )}


              {selectedBleAddress && !bleMapLoading &&
                bleDeviceLocations.length === 0 &&
                !bleMapError && (
                  <p className="mt-2 text-xs text-gray-400">
                    {t('dashboard.metrics.bleTop.mapEmpty')}
                  </p>
                )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

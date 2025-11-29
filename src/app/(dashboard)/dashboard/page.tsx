// src/app/(dashboard)/dashboard/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  TrendingUp,
  Activity,
  Download, // Added Download icon for the new section
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

// const TRACKED_DEVICE_ID = "simulator_01";

// Dynamic Map import
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-2xl">
      <div className="text-white">Loading map...</div>
    </div>
  ),
});

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  deviceId: string | null;
  timestamp: string;
}

interface TrackingSession {
  id: string;
  name: string | null;
  startTime: string;
  endTime: string;
  locations: Location[];
  totalPoints: number;
  distanceKm: number;
  durationMin: number;
}

// Haversine Distance Helper (for calculating stats)
const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // Radius of Earth in kilometers
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

export default function DashboardPage() {
  // New: Track the active tracking session ID
  const [activeTrackingSessionId, setActiveTrackingSessionId] = useState<string | null>(null);
  const { status } = useSession();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [trackingSessions, setTrackingSessions] = useState<TrackingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPoints: 0,
    distance: 0,
    duration: 0,
  });

  // Wifi/BLE environment metrics for selected session
  const [environmentSummary, setEnvironmentSummary] = useState<{
    locations: number;
    wifiScans: number;
    bleScans: number;
  } | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<
    { ssid: string | null; bssid: string | null; count: number; avgRssi: number | null }[]
  >([]);

  // 1. Authentication Check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // 2. Stats Calculation Helpers
  const calculateDistance = (locs: Location[]) => {
    if (locs.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < locs.length; i++) {
      total += haversineDistance(
        locs[i - 1].latitude, locs[i - 1].longitude,
        locs[i].latitude, locs[i].longitude
      );
    }
    return total;
  };

  const calculateDuration = (locs: Location[]) => {
    if (locs.length < 2) return 0;
    const first = new Date(locs[0].timestamp).getTime();
    const last = new Date(locs[locs.length - 1].timestamp).getTime();
    return Math.floor((last - first) / 1000 / 60);
  };

  // 3. Location Update (Geolocation watch)
  const updateLocation = useCallback(async (latitude: number, longitude: number) => {
    try {
      const payload: any = {
        latitude,
        longitude,
        device_id: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };
      if (activeTrackingSessionId) {
        payload.trackingSessionId = activeTrackingSessionId;
      }
      await fetch("/api/update_location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Failed to update location:", error);
    }
  }, [activeTrackingSessionId]);

  // 4. Data Fetching and Filtering Logic
  const fetchLocationHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to fetch history");

      const data = await res.json();
      const rawSessions: any[] = data.trackingSessions || [];
      const allDevices: any[] = data.devices || [];

      const sessions: TrackingSession[] = rawSessions.map((session) => {
        const locs: Location[] = session.locations || [];
        return {
          id: session.id,
          name: session.name,
          startTime: session.startTime,
          endTime: session.endTime,
          locations: locs,
          totalPoints: locs.length,
          distanceKm: calculateDistance(locs),
          durationMin: calculateDuration(locs),
        };
      });

      setTrackingSessions(sessions);

      // Check for active devices (last seen within 30 seconds)
      const now = new Date().getTime();
      const activeThreshold = 30 * 1000; // 30 seconds
      const activeDevices = allDevices.filter((device) =>
        now - new Date(device.lastSeen).getTime() < activeThreshold
      );
      // activeDevices can be used to reflect live status in the UI,
      // but we no longer block history visualization when there
      // are no active devices.

      if (sessions.length === 0) {
        setLocations([]);
        setStats({ totalPoints: 0, distance: 0, duration: 0 });
        setCurrentLocation(null);
        setSelectedSessionId(null);
        return;
      }

      // Determine which session to show: the selected one or the most recent by default
      const sessionToShow =
        (selectedSessionId &&
          sessions.find((session) => session.id === selectedSessionId)) ||
        sessions[0];

      const locationsToShow: Location[] = sessionToShow.locations || [];

      // Update locations for the map
      setLocations(locationsToShow);

      // Update stats and current location
      if (locationsToShow.length > 0) {
        const lastLoc = locationsToShow[locationsToShow.length - 1];
        setCurrentLocation(lastLoc);

        setStats({
          totalPoints: locationsToShow.length,
          distance: calculateDistance(locationsToShow),
          duration: calculateDuration(locationsToShow),
        });
      } else {
        setStats({ totalPoints: 0, distance: 0, duration: 0 });
        setCurrentLocation(null);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  }, [selectedSessionId]); // Dependency on selectedSessionId ensures fetch runs when dropdown changes

  // 5. Setup Intervals and Geolocation Watch
  useEffect(() => {
    fetchLocationHistory();
    const interval = setInterval(fetchLocationHistory, 5000);
    return () => clearInterval(interval);
  }, [fetchLocationHistory]);

  // 5b. Fetch environment metrics (wifi/BLE) when a session is selected
  useEffect(() => {
    const loadEnvironment = async () => {
      if (!selectedSessionId) {
        setEnvironmentSummary(null);
        setWifiNetworks([]);
        return;
      }
      try {
        const res = await fetch(`/api/tracking_session/${selectedSessionId}/environment`);
        if (!res.ok) return;
        const data = await res.json();
        setEnvironmentSummary(data.summary ?? null);
        setWifiNetworks(data.wifi ?? []);
      } catch (err) {
        console.error("Failed to load environment metrics", err);
      }
    };
    loadEnvironment();
  }, [selectedSessionId]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [updateLocation]);

  // 6. Handler for History Dropdown (per tracking session)
  const handleSessionSelect = (sessionId: string) => {
    // If user selects the default empty option, set selectedSessionId to null
    setSelectedSessionId(sessionId || null);
  };

  // New: Start/Stop tracking session logic (example, you may need to wire this to your UI)
  const startTrackingSession = async (name?: string) => {
    const res = await fetch("/api/start_tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.success && data.trackingSession) {
      setActiveTrackingSessionId(data.trackingSession.id);
    }
  };

  const stopTrackingSession = async () => {
    if (!activeTrackingSessionId) return;
    await fetch("/api/stop_tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeTrackingSessionId }),
    });
    setActiveTrackingSessionId(null);
  };


  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white selection:bg-gold-500/30 selection:text-gold-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8 pt-20">
        {/* Stats Grid */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* ... (Motion divs for Total Points, Distance, Duration - unchanged) ... */}
          {/* ... Stats JSX here ... */}
        </div>

        {/* 🔑 NEW: Download Client App Section */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 p-6 bg-gold-900/20 rounded-2xl border border-gold-400/20 flex justify-between items-center flex-wrap"
        >
            <div>
                <h3 className="text-xl font-semibold text-gold-200">
                    Enable Real-Time Tracking
                </h3>
                <p className="text-gold-300/80 text-sm">
                    Download the Guardian Client App to send live location data from your device.
                </p>
            </div>
            <a
                href="https://gitgoing.net/downloads/GuardianClient.apk"
                download
                className="mt-4 md:mt-0 px-6 py-2 bg-gold-500 text-black font-bold rounded-lg hover:bg-gold-400 transition-colors flex items-center gap-2"
            >
                <Download className="w-5 h-5" />
                Download Client App
            </a>
        </motion.div>


        {/* 🔑 NEW: History Selector */}
        {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-6 flex flex-col md:flex-row md:items-center justify-between"
        >
            <h2 className="text-2xl font-bold text-white mb-2 md:mb-0">Tracking History</h2>
            <div>
              <label htmlFor="history-select" className="text-gray-400 sr-only">
                View Tracking History
              </label>
              <select
                id="history-select"
                onChange={(e) => handleSessionSelect(e.target.value)}
                value={selectedSessionId || ''}
                className="w-full md:w-64 p-3 bg-surface border border-white/10 rounded-lg text-white appearance-none cursor-pointer focus:ring-gold-500 focus:border-gold-500"
              >
                <option value="">
                    --- Select a Session to Visualize --- 
                </option>
                 {trackingSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {(() => {
                      const label =
                        session.name ||
                        `Session starting ${new Date(session.startTime).toLocaleString()}`;
                      const distance = session.distanceKm.toFixed(2);
                      const duration = session.durationMin;
                      const points = session.totalPoints;
                      return `${label}  ${distance} km  ${duration} min  ${points} pts`;
                    })()}
                  </option>
                ))}

              </select>
            </div>
        </motion.div> */}


         {/* Live Tracking Map Section */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10"
         >
           <div className="flex items-center justify-between mb-6">
             <div>
               <h2 className="text-2xl font-bold text-white">Live Tracking</h2>
               <p className="text-gray-400">
                 This map shows your most recent tracking session or live updates if tracking is active.
               </p>
             </div>
             <div className="flex items-center gap-2">
               <Activity className="w-5 h-5 text-green-400 animate-pulse" />
               <span className="text-green-400 font-medium">Active</span>
             </div>
           </div>
           <div className="h-[400px] rounded-xl overflow-hidden">
             <Map locations={locations} currentLocation={currentLocation} fitOnUpdate={false} autoZoomOnFirstPoint={true} />
           </div>
         </motion.div>

         {/* Tracking History Section */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5 }}
           className="mt-8 p-6 bg-gold-900/20 rounded-2xl border border-gold-400/20"
         >
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
             <h2 className="text-2xl font-bold text-gold-200 mb-2 md:mb-0">Tracking History</h2>
             <div>
               <label htmlFor="history-select" className="text-gray-400 sr-only">
                 View Tracking History
               </label>
               <select
                 id="history-select"
                 onChange={(e) => handleSessionSelect(e.target.value)}
                 value={selectedSessionId || ''}
                 className="w-full md:w-64 p-3 bg-gold-900/40 border border-gold-400/30 rounded-lg text-gold-100 appearance-none cursor-pointer focus:ring-gold-500 focus:border-gold-500 font-semibold"
               >
                 <option value="">
                     --- Select a Session to Visualize --- 
                 </option>
                 {trackingSessions.map((session) => (
                   <option key={session.id} value={session.id}>
                     {(() => {
                       const label =
                         session.name ||
                         `Session starting ${new Date(session.startTime).toLocaleString()}`;
                       const distance = session.distanceKm.toFixed(2);
                       const duration = session.durationMin;
                       const points = session.totalPoints;
                       return `${label} – ${distance} km – ${duration} min – ${points} pts`;
                     })()}
                   </option>
                 ))}
               </select>
             </div>
           </div>
           <div className="h-[400px] rounded-xl overflow-hidden mb-6">
             <Map
               locations={(() => {
                 const session = trackingSessions.find((s) => s.id === selectedSessionId);
                 return session ? session.locations : [];
               })()}
               currentLocation={(() => {
                 const session = trackingSessions.find((s) => s.id === selectedSessionId);
                 return session && session.locations.length > 0 ? session.locations[session.locations.length - 1] : null;
               })()}
               fitOnUpdate={true}
             />
           </div>
            {/* Session Stats Row for History */}
            {selectedSessionId && (() => {
              const session = trackingSessions.find((s) => s.id === selectedSessionId);
              if (!session) return null;
              const distance = session.distanceKm.toFixed(2);
              const duration = session.durationMin;
              const points = session.totalPoints;
 
              return (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
                  >
                    <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gold-500/10 text-gold-300">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Distance</p>
                        <p className="text-lg font-semibold text-white">{distance} km</p>
                      </div>
                    </div>
                    <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Duration</p>
                        <p className="text-lg font-semibold text-white">{duration} min</p>
                      </div>
                    </div>
                    <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-300">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Points</p>
                        <p className="text-lg font-semibold text-white">{points}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Wifi History Table */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-white/10 overflow-x-auto"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">Wi-Fi Networks Seen</h3>
                      {environmentSummary && (
                        <p className="text-xs text-gray-400">
                          {environmentSummary.wifiScans} scan samples across {wifiNetworks.length} networks
                        </p>
                      )}
                    </div>
                    {wifiNetworks.length === 0 ? (
                      <p className="text-sm text-gray-400">No Wi-Fi data recorded for this session yet.</p>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-white/10">
                            <th className="py-2 pr-4">SSID</th>
                            <th className="py-2 pr-4">BSSID</th>
                            <th className="py-2 pr-4">Samples</th>
                            <th className="py-2 pr-4">Avg RSSI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wifiNetworks.map((net, idx) => (
                            <tr key={`${net.bssid}-${idx}`} className="border-b border-white/5 last:border-b-0">
                              <td className="py-1 pr-4 text-white">
                                {net.ssid || <span className="text-gray-500 italic">(hidden)</span>}
                              </td>
                              <td className="py-1 pr-4 text-gray-300 font-mono text-xs">{net.bssid}</td>
                              <td className="py-1 pr-4 text-gray-200">{net.count}</td>
                              <td className="py-1 pr-4 text-gray-200">
                                {net.avgRssi !== null && net.avgRssi !== undefined
                                  ? `${Math.round(net.avgRssi)} dBm`
                                  : "–"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </motion.div>
                </>
              );
            })()}
          </motion.div>



        {/* {selectedSessionId && (() => {
          const session = trackingSessions.find((s) => s.id === selectedSessionId);
          if (!session) return null;
          const distance = session.distanceKm.toFixed(2);
          const duration = session.durationMin;
          const points = session.totalPoints;

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gold-500/10 text-gold-300">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Distance</p>
                  <p className="text-lg font-semibold text-white">{distance} km</p>
                </div>
              </div>

              <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Duration</p>
                  <p className="text-lg font-semibold text-white">{duration} min</p>
                </div>
              </div>

              <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-300">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Points</p>
                  <p className="text-lg font-semibold text-white">{points}</p>
                </div>
              </div>
            </motion.div>
          );
        })()} */}

        {currentLocation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Current Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Latitude</p>
                <p className="text-white font-mono">
                  {currentLocation.latitude.toFixed(6)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Longitude</p>
                <p className="text-white font-mono">
                  {currentLocation.longitude.toFixed(6)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Last Updated</p>
                <p className="text-white">
                  {new Date(currentLocation.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

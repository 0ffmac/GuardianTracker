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
  AlertTriangle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import AlertList from "@/components/AlertList";

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

interface Alert {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  audioMessages: AudioMessage[];
  recipientStatus?: string;
  recipientNotifiedAt?: string;
  recipientRespondedAt?: string;
  recipients?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    status: string;
    notifiedAt: string | null;
    respondedAt: string | null;
  }[];
}

interface AudioMessage {
  id: string;
  contentUrl: string;
  contentType: string;
  duration: number | null;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
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
  const { data: session, status } = useSession();
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
  // Whether there is an actively reporting device (for live-only map)
  const [hasLiveData, setHasLiveData] = useState(false);

  // Wifi/BLE environment metrics for selected session
  const [environmentSummary, setEnvironmentSummary] = useState<{
    locations: number;
    wifiScans: number;
    bleScans: number;
  } | null>(null);
  // Last time any device checked in (for status display)
  const [lastDeviceSeenAt, setLastDeviceSeenAt] = useState<string | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<
    { ssid: string | null; bssid: string | null; count: number; avgRssi: number | null }[]
  >([]);

  // Nearby contacts / alerts state
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(10);
  const [nearbyContacts, setNearbyContacts] = useState<
    {
      userId: string;
      name: string | null;
      email: string;
      image: string | null;
      distanceKm: number;
      lastLocation: { latitude: number; longitude: number; timestamp: string };
    }[]
  >([]);
  const [selectedNearbyContact, setSelectedNearbyContact] = useState<
    | {
        userId: string;
        name: string | null;
        email: string;
        image: string | null;
        distanceKm: number;
        lastLocation: { latitude: number; longitude: number; timestamp: string };
      }
    | null
  >(null);
  const [shareWithNearbyContacts, setShareWithNearbyContacts] = useState(true);

  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sentAlerts, setSentAlerts] = useState<Alert[]>([]);
  const [alertsView, setAlertsView] = useState<"received" | "sent">("received");

  // Load persisted privacy preference on mount
  useEffect(() => {
    const loadPrivacy = async () => {
      try {
        const res = await fetch("/api/user/privacy");
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.shareLocationWithTrustedContacts === "boolean") {
          setShareWithNearbyContacts(data.shareLocationWithTrustedContacts);
        }
      } catch (err) {
        console.error("Failed to load privacy settings", err);
      }
    };
    loadPrivacy();
  }, []);

  // Fetch alerts for the current user
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?type=received");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data = await res.json();
      setAlerts(data.alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  }, []);

  // Fetch alerts created by the current user
  const fetchSentAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?type=sent");
      if (!res.ok) throw new Error("Failed to fetch sent alerts");
      const data = await res.json();
      setSentAlerts(data.alerts);
    } catch (error) {
      console.error("Error fetching sent alerts:", error);
    }
  }, []);

  // Load alerts on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetchAlerts();
      fetchSentAlerts();
    }
  }, [status, fetchAlerts, fetchSentAlerts]);

  // Refresh alerts periodically
  useEffect(() => {
    if (status === "authenticated") {
      const interval = setInterval(() => {
        fetchAlerts();
        fetchSentAlerts();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [status, fetchAlerts, fetchSentAlerts]);

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

      // Check for active devices (recent last seen). If a device
      // hasn't checked in for a while, treat live tracking as idle.
      const now = new Date().getTime();
      const activeThreshold = 2 * 60 * 1000; // 2 minutes

      let latestSeen: number | null = null;
      const activeDevices = allDevices.filter((device) => {
        const ts = new Date(device.lastSeen).getTime();
        if (!Number.isNaN(ts)) {
          if (latestSeen === null || ts > latestSeen) {
            latestSeen = ts;
          }
        }
        return now - ts < activeThreshold;
      });
      setHasLiveData(activeDevices.length > 0);
      setLastDeviceSeenAt(latestSeen ? new Date(latestSeen).toISOString() : null);

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

  // 5c. Fetch nearby contacts when live tracking and sharing are enabled
  useEffect(() => {
    if (!hasLiveData || !currentLocation || !shareWithNearbyContacts) {
      setNearbyContacts([]);
      setSelectedNearbyContact(null);
      return;
    }

    const loadNearby = async () => {
      try {
        const res = await fetch(`/api/contacts/nearby?radiusKm=${nearbyRadiusKm}`);
        if (!res.ok) return;
        const data = await res.json();
        setNearbyContacts(data.contacts || []);
        if (data.contacts && data.contacts.length > 0) {
          // Keep existing selection if still present, otherwise clear
          setSelectedNearbyContact((prev) =>
            prev && data.contacts.find((c: any) => c.userId === prev.userId)
              ? prev
              : null
          );
        } else {
          setSelectedNearbyContact(null);
        }
      } catch (err) {
        console.error("Failed to load nearby contacts", err);
      }
    };

    loadNearby();
    const interval = setInterval(loadNearby, 20000);
    return () => clearInterval(interval);
  }, [hasLiveData, currentLocation, shareWithNearbyContacts, nearbyRadiusKm]);

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

  // Respond to an alert
  const handleAlertResponse = async (alertId: string, action: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to respond to alert: ${response.statusText}`);
      }

      // Update the local state after successful response
      fetchAlerts();
    } catch (error) {
      console.error("Error responding to alert:", error);
    }
  };


  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Derived alert metrics for mobile status
  const now = Date.now();
  const THIRTY_MIN_MS = 30 * 60 * 1000;

  const pendingMobileAlertsCount = alerts.filter(
    (alert) => alert.recipientStatus === "PENDING"
  ).length;

  const recentSentAlertsCount = sentAlerts.filter((alert) => {
    const created = new Date(alert.createdAt).getTime();
    if (Number.isNaN(created)) return false;
    return now - created <= THIRTY_MIN_MS;
  }).length;

  return (
    <div className="min-h-screen bg-background text-white selection:bg-gold-500/30 selection:text-gold-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8 pt-20">
         {/* Greeting + Stats Grid */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-400">
            Welcome back{session?.user?.name ? "," : ""}
          </p>
          <h1 className="text-2xl font-bold text-white">
            {session?.user?.name || session?.user?.email || "Your overview"}
          </h1>
        </div>
      </div>

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
            transition={{ delay: 0.35 }}
            className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Emergency Alerts</h2>
                    <p className="text-gray-400 text-sm">
                      View alerts you have received from your trusted contacts or ones you have sent to them.
                    </p>
                    {(pendingMobileAlertsCount > 0 || recentSentAlertsCount > 0) && (
                      <p className="mt-2 text-xs text-amber-300">
                        {pendingMobileAlertsCount > 0 && (
                          <span>{pendingMobileAlertsCount} pending on your mobile</span>
                        )}
                        {pendingMobileAlertsCount > 0 && recentSentAlertsCount > 0 && (
                          <span className="mx-1">·</span>
                        )}
                        {recentSentAlertsCount > 0 && (
                          <span>{recentSentAlertsCount} sent in last 30 min</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="inline-flex rounded-full bg-black/40 border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setAlertsView("received")}
                      className={`px-3 py-1 rounded-full transition-colors ${
                        alertsView === "received" ? "bg-white text-black" : "text-gray-300"
                      }`}
                    >
                      Received
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlertsView("sent")}
                      className={`px-3 py-1 rounded-full transition-colors ${
                        alertsView === "sent" ? "bg-white text-black" : "text-gray-300"
                      }`}
                    >
                      Sent
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto pr-1">
                  <AlertList
                    alerts={alertsView === "received" ? alerts : sentAlerts}
                    onRespond={alertsView === "received" ? handleAlertResponse : undefined}
                    showActions={alertsView === "received"}
                  />
                </div>
              </div>


            </div>
          </motion.div>

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
                  The dashboard only shows live points while a device is actively reporting. Use the Map tab to explore history.
                </p>
              </div>
               <div className="flex flex-col items-end gap-1">

                <div className="flex items-center gap-2">
                  <Activity
                    className={
                      hasLiveData
                        ? "w-5 h-5 text-green-400 animate-pulse"
                        : "w-5 h-5 text-gray-500"
                    }
                  />
                  <span
                    className={
                      hasLiveData
                        ? "text-green-400 font-medium"
                        : "text-gray-400 font-medium"
                    }
                  >
                    {hasLiveData ? "Active" : "Idle"}
                  </span>
                </div>
                {lastDeviceSeenAt && (
                  <p className="text-[11px] text-gray-400">
                    Last seen {(() => {
                      const diffMs = Date.now() - new Date(lastDeviceSeenAt).getTime();
                      if (diffMs < 60 * 1000) return "just now";
                      const mins = Math.round(diffMs / (60 * 1000));
                      if (mins < 60) return `${mins} min ago`;
                      const hours = Math.round(mins / 60);
                      return `${hours} hr${hours > 1 ? "s" : ""} ago`;
                    })()}
                  </p>
                )}
              </div>
            </div>


           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
             <div className="lg:col-span-2 h-[350px] lg:h-[380px] rounded-xl overflow-hidden">
               {hasLiveData ? (
                 <Map
                   locations={locations}
                   currentLocation={currentLocation}
                   fitOnUpdate={true}
                   autoZoomOnFirstPoint={true}
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-xl border border-dashed border-white/10">
                   <p className="text-sm text-gray-400 text-center px-4">
                     No active tracking right now. Start the mobile app to see your live position here.
                   </p>
                 </div>
               )}
             </div>

             <div className="h-full rounded-xl border border-white/10 bg-black/20 p-4 flex flex-col gap-4">
               <div>
                 <h3 className="text-lg font-semibold text-white mb-1">Alerts & Nearby Contacts</h3>
                 <p className="text-sm text-gray-400 mb-3">
                   See trusted contacts that are physically close to your live location.
                 </p>

                 <div className="flex items-center justify-between gap-2 mb-3">
                   <label className="flex items-center gap-2 text-xs text-gray-300">
                     <span className="uppercase tracking-wide">Radius</span>
                     <select
                       value={nearbyRadiusKm}
                       onChange={(e) => setNearbyRadiusKm(Number(e.target.value))}
                       className="bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-gray-100"
                     >
                       <option value={1}>1 km</option>
                       <option value={2}>2 km</option>
                       <option value={5}>5 km</option>
                       <option value={10}>10 km</option>
                       <option value={20}>20 km</option>
                     </select>
                   </label>
                   <label className="flex items-center gap-2 text-xs text-gray-300">
                     <input
                       type="checkbox"
                       checked={shareWithNearbyContacts}
                       onChange={async () => {
                         const next = !shareWithNearbyContacts;
                         setShareWithNearbyContacts(next);
                         try {
                           await fetch("/api/user/privacy", {
                             method: "PUT",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({
                               shareLocationWithTrustedContacts: next,
                             }),
                           });
                         } catch (err) {
                           console.error("Failed to update privacy settings", err);
                         }
                       }}
                       className="h-4 w-4 text-gold-500"
                     />
                     <span>Share my live location</span>
                   </label>
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto border border-white/5 rounded-md bg-black/20 p-2">
                 {!hasLiveData && (
                   <p className="text-xs text-gray-500 italic">
                     Start the mobile app to enable nearby contact detection.
                   </p>
                 )}
                 {hasLiveData && nearbyContacts.length === 0 && (
                   <p className="text-xs text-gray-500 italic">
                     No trusted contacts within {nearbyRadiusKm} km.
                   </p>
                 )}
                 {hasLiveData && nearbyContacts.length > 0 && (
                   <ul className="space-y-1">
                     {nearbyContacts.map((c) => (
                       <li key={c.userId}>
                         <button
                           type="button"
                           onClick={() => setSelectedNearbyContact(c)}
                           className={`w-full flex items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors ${
                             selectedNearbyContact && selectedNearbyContact.userId === c.userId
                               ? "bg-gold-500/20 text-gold-100"
                               : "bg-black/30 text-gray-100 hover:bg-black/50"
                           }`}
                         >
                           <span className="truncate">
                             {c.name || c.email}
                           </span>
                           <span className="ml-2 text-[11px] text-gray-300">
                             {c.distanceKm.toFixed(1)} km
                           </span>
                         </button>
                       </li>
                     ))}
                   </ul>
                 )}
               </div>

               {hasLiveData && currentLocation && selectedNearbyContact && (
                 <div className="mt-2">
                   <p className="text-xs text-gray-300 mb-1">
                     Selected: <span className="font-semibold">{selectedNearbyContact.name || selectedNearbyContact.email}</span>
                   </p>
                   <div className="w-full h-40 rounded-md overflow-hidden border border-white/10">
                     <Map
                       locations={[
                         {
                           id: "me",
                           latitude: currentLocation.latitude,
                           longitude: currentLocation.longitude,
                           deviceId: currentLocation.deviceId,
                           timestamp: currentLocation.timestamp,
                         },
                         {
                           id: selectedNearbyContact.userId,
                           latitude: selectedNearbyContact.lastLocation.latitude,
                           longitude: selectedNearbyContact.lastLocation.longitude,
                           deviceId: null,
                           timestamp: selectedNearbyContact.lastLocation.timestamp as any,
                         },
                       ]}
                       currentLocation={null}
                       fitOnUpdate={true}
                       autoZoomOnFirstPoint={false}
                     />
                   </div>
                 </div>
               )}
             </div>
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
                     className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
                   >
                     <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-gold-400/20 flex items-center gap-3 shadow-lg">
                       <div className="p-2 rounded-xl bg-gold-500/10 text-gold-300">
                         <MapPin className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="text-xs uppercase tracking-wide text-gold-400">Distance</p>
                         <p className="text-lg font-semibold text-gold-100">{distance} km</p>
                       </div>
                     </div>
                     <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-emerald-400/20 flex items-center gap-3 shadow-lg">
                       <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300">
                         <Clock className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="text-xs uppercase tracking-wide text-emerald-400">Duration</p>
                         <p className="text-lg font-semibold text-emerald-100">{duration} min</p>
                       </div>
                     </div>
                     <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-sky-400/20 flex items-center gap-3 shadow-lg">
                       <div className="p-2 rounded-xl bg-sky-500/10 text-sky-300">
                         <TrendingUp className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="text-xs uppercase tracking-wide text-sky-400">Points</p>
                         <p className="text-lg font-semibold text-sky-100">{points}</p>
                       </div>
                     </div>
                     <div className="bg-surface backdrop-blur-sm rounded-2xl p-4 border border-blue-400/20 flex items-center gap-3 shadow-lg">
                       <div className="p-2 rounded-xl bg-blue-500/10 text-blue-300">
                         <Activity className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="text-xs uppercase tracking-wide text-blue-400">Devices</p>
                         <p className="text-lg font-semibold text-blue-100">{Array.from(new Set(session.locations.map(l => l.deviceId)).values()).filter(Boolean).length}</p>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-6 bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10 flex gap-4 items-start"
        >
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Suspicious observations
            </h3>
            <p className="text-sm text-gray-300">
              Once Guardian has enough tracking history, Wi-Fi and Bluetooth
              devices that seem to follow you across different places will be
              surfaced here.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              You can explore full details in Settings  Suspicious Wi-Fi &amp;
              Bluetooth Devices.
            </p>
          </div>
        </motion.div>

        {hasLiveData && currentLocation && (
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

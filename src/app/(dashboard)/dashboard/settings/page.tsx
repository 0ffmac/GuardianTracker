"use client";
import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { AlertTriangle } from "lucide-react";

type UserWithId = { id: string; name?: string | null; email?: string | null; image?: string | null };

export default function SettingsPage() {
  const { data: session } = useSession();
  const sessionUser = session?.user as UserWithId | undefined;
  const [profileUser, setProfileUser] = useState<UserWithId | null>(null);
  const [mounted, setMounted] = useState(false);
  const [trackingSessions, setTrackingSessions] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [trustedBy, setTrustedBy] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactDeletingId, setContactDeletingId] = useState<string | null>(null);
  const [inviteUpdatingId, setInviteUpdatingId] = useState<string | null>(null);
  const [trustedDeletingId, setTrustedDeletingId] = useState<string | null>(null);
  const [shareLocationWithTrustedContacts, setShareLocationWithTrustedContacts] = useState<boolean | null>(null);
  const [useGoogle3DMaps, setUseGoogle3DMaps] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [mapSettingsLoading, setMapSettingsLoading] = useState(false);
  const [mapSettingsError, setMapSettingsError] = useState<string | null>(null);
  const [mapSettingsSaving, setMapSettingsSaving] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"sent" | "received">("sent");
  const [alertStatus, setAlertStatus] = useState<string>("ACTIVE");
  const [wifiDevices, setWifiDevices] = useState<any[]>([]);
  const [bleDevices, setBleDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [environmentSummary, setEnvironmentSummary] = useState<any | null>(null);
  const [sessionNameDraft, setSessionNameDraft] = useState("");
  const [sessionQualityDraft, setSessionQualityDraft] = useState<"GOOD" | "REGULAR" | "BAD">("REGULAR");
  const [sessionMetaSaving, setSessionMetaSaving] = useState(false);
  const [sessionMetaError, setSessionMetaError] = useState<string | null>(null);
  const [environmentWifi, setEnvironmentWifi] = useState<any[]>([]);
  const [environmentBle, setEnvironmentBle] = useState<any[]>([]);
  const [environmentVisible, setEnvironmentVisible] = useState(false);
  const [suspiciousWifiDevices, setSuspiciousWifiDevices] = useState<any[]>([]);
  const [suspiciousBleDevices, setSuspiciousBleDevices] = useState<any[]>([]);
  const [suspiciousLoading, setSuspiciousLoading] = useState(false);
  const [suspiciousError, setSuspiciousError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  useEffect(() => {
    setMounted(true);
  }, []);
 
 
  useEffect(() => {
    if (!mounted) return;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [sessionsRes, contactsRes] = await Promise.all([
          fetch("/api/locations"),
          fetch("/api/contacts"),
        ]);
 
        if (!sessionsRes.ok) throw new Error("Failed to load tracking sessions");
        if (!contactsRes.ok) throw new Error("Failed to load contacts");
 
        const sessionsData = await sessionsRes.json();
        const contactsData = await contactsRes.json();
 
        setTrackingSessions(sessionsData.trackingSessions || []);
        setContacts(contactsData.contacts || []);
        setTrustedBy(contactsData.trustedBy || []);

        // Load fresh profile from backend
        if (sessionUser?.id) {
          const userRes = await fetch(`/api/user/${sessionUser.id}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            setProfileUser(userData as UserWithId);
          } else {
            setProfileUser(sessionUser);
          }
        }

        // Load privacy flag
        const privacyRes = await fetch("/api/user/privacy");
        if (privacyRes.ok) {
          const privacyData = await privacyRes.json();
          if (typeof privacyData.shareLocationWithTrustedContacts === "boolean") {
            setShareLocationWithTrustedContacts(privacyData.shareLocationWithTrustedContacts);
          }
        }
      } catch (err) {
        setError("Failed to load settings data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [mounted, sessionUser?.id]);

  useEffect(() => {
    if (!mounted) return;
    async function fetchAlerts() {
      setAlertsLoading(true);
      setAlertsError(null);
      try {
        const res = await fetch(`/api/alerts?type=${alertType}&status=${encodeURIComponent(alertStatus)}`);
        if (!res.ok) throw new Error("Failed to load alerts");
        const data = await res.json();
        setAlerts(data.alerts || []);
      } catch (err) {
        setAlertsError("Failed to load alerts data.");
      } finally {
        setAlertsLoading(false);
      }
    }
    fetchAlerts();
  }, [mounted, alertType, alertStatus]);

   useEffect(() => {
     if (!mounted) return;
     async function fetchMapSettings() {
       setMapSettingsLoading(true);
       setMapSettingsError(null);
       try {
         const res = await fetch("/api/user/maps");
         if (res.ok) {
           const data = await res.json();
           if (typeof data.useGoogle3DMaps === "boolean") {
             setUseGoogle3DMaps(data.useGoogle3DMaps);
           }
           if (typeof data.googleMapsApiKey === "string") {
             setGoogleMapsApiKey(data.googleMapsApiKey || "");
           }
         }
       } catch (err) {
         console.error("Failed to load map settings", err);
         setMapSettingsError("Failed to load map settings.");
       } finally {
         setMapSettingsLoading(false);
       }
     }
     fetchMapSettings();
   }, [mounted]);

   useEffect(() => {
     if (!mounted) return;
     async function fetchDevices() {

      setDevicesLoading(true);
      setDevicesError(null);
      try {
        const res = await fetch("/api/environment/devices");
        if (!res.ok) throw new Error("Failed to load environment devices");
        const data = await res.json();
        setWifiDevices(data.wifi || []);
        setBleDevices(data.ble || []);
      } catch (err) {
        setDevicesError("Failed to load nearby devices.");
      } finally {
        setDevicesLoading(false);
      }
    }
    fetchDevices();
  }, [mounted]);


  async function handleDeleteSession(id: string) {
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/tracking_session/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      setTrackingSessions((prev) => prev.filter((s) => s.id !== id));
      showToast("Session deleted");
    } catch (err) {
      setError("Failed to delete session.");
      showToast("Failed to delete session.", "error");
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeleteAllSessions() {
    if (trackingSessions.length === 0) return;
    if (
      !confirm(
        "Are you sure you want to delete all tracking sessions? This will remove all recorded sessions but keep your account."
      )
    )
      return;

    try {
      const ids = trackingSessions.map((s) => s.id as string);
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/tracking_session/${id}`, { method: "DELETE" }).catch(() => null)
        )
      );
      setTrackingSessions([]);
      setSelectedSessionId(null);
      showToast("All tracking sessions deleted");
    } catch (err) {
      console.error("Failed to delete all sessions", err);
      showToast("Failed to delete all sessions", "error");
    }
  }

  async function handleDeleteAlert(id: string) {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("Failed to delete alert", "error");
        return;
      }
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      showToast("Alert deleted");
    } catch (err) {
      console.error("Failed to delete alert", err);
      showToast("Failed to delete alert", "error");
    }
  }

   async function handleSaveMapSettings(e: React.FormEvent) {
     e.preventDefault();
     setMapSettingsSaving(true);
     setMapSettingsError(null);
     try {
       const trimmedKey = googleMapsApiKey.trim();
       const res = await fetch("/api/user/maps", {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           useGoogle3DMaps: useGoogle3DMaps && trimmedKey.length > 0,
           googleMapsApiKey: trimmedKey,
         }),
       });
       const data = await res.json().catch(() => ({}));
       if (!res.ok) {
         const message = data?.error || "Failed to save map settings.";
         setMapSettingsError(message);
         showToast(message, "error");
         return;
       }
       const nextUseGoogle = !!data.useGoogle3DMaps && !!data.googleMapsApiKey;
       setUseGoogle3DMaps(nextUseGoogle);
       setGoogleMapsApiKey(data.googleMapsApiKey || "");
       showToast("Map settings saved");
     } catch (err) {
       console.error("Failed to save map settings", err);
       setMapSettingsError("Failed to save map settings.");
       showToast("Failed to save map settings.", "error");
     } finally {
       setMapSettingsSaving(false);
     }
   }

   async function handleDeleteAllAlerts() {

    if (alerts.length === 0) return;
    if (
      !confirm(
        "Are you sure you want to delete all alerts in this view? This will only affect your account."
      )
    )
      return;

    try {
      const ids = alerts.map((a) => a.id as string);
      await Promise.all(
        ids.map((id) => fetch(`/api/alerts/${id}`, { method: "DELETE" }).catch(() => null))
      );
      setAlerts([]);
      showToast("All alerts deleted");
    } catch (err) {
      console.error("Failed to delete all alerts", err);
      showToast("Failed to delete all alerts", "error");
    }
  }

  async function handleSaveSessionMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSession) return;

    setSessionMetaSaving(true);
    setSessionMetaError(null);

    try {
      const res = await fetch(`/api/tracking_session/${selectedSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sessionNameDraft.trim() || null,
          quality: sessionQualityDraft,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = (data as any)?.error || "Failed to save session details.";
        setSessionMetaError(message);
        showToast(message, "error");
        return;
      }

      const updated = (data as any).trackingSession || data;
      setTrackingSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
      );
      showToast("Session details saved");
    } catch (err) {
      console.error("Failed to save session details", err);
      setSessionMetaError("Failed to save session details.");
      showToast("Failed to save session details.", "error");
    } finally {
      setSessionMetaSaving(false);
    }
  }

  async function handleLoadEnvironment(sessionId: string) {
    // Toggle visibility if we already have data
    if (environmentSummary) {
      setEnvironmentVisible((prev) => !prev);
      return;
    }

    setEnvironmentLoading(true);
    setEnvironmentError(null);
    try {
      const res = await fetch(`/api/tracking_session/${sessionId}/environment`);
      if (!res.ok) throw new Error("Failed to load environment metrics");
      const data = await res.json();
      setEnvironmentSummary(data.summary || null);
      setEnvironmentWifi(data.wifi || []);
      setEnvironmentBle(data.ble || []);
      setEnvironmentVisible(true);
    } catch (err) {
      console.error("Failed to load environment metrics", err);
      setEnvironmentError("Failed to load environment metrics.");
    } finally {
      setEnvironmentLoading(false);
    }
  }

  async function handleDeleteDevice(
    kind: "wifi" | "ble",
    id: string,
    hasSessions: boolean
  ) {
    if (hasSessions) {
      showToast(
        kind === "wifi"
          ? "This Wi-Fi network is part of tracking sessions. Delete those sessions first."
          : "This Bluetooth device is part of tracking sessions. Delete those sessions first.",
        "error"
      );
      return;
    }

    try {
      const res = await fetch("/api/environment/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      if (!res.ok) {
        showToast("Failed to delete device", "error");
        return;
      }
      if (kind === "wifi") {
        setWifiDevices((prev) => prev.filter((d) => d.id !== id));
      } else {
        setBleDevices((prev) => prev.filter((d) => d.id !== id));
      }
      showToast("Device deleted");
    } catch (err) {
      console.error("Failed to delete device", err);
      showToast("Failed to delete device", "error");
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactEmail.trim()) return;

    setContactLoading(true);
    setContactError(null);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: contactEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data?.error || "Failed to add contact.";
        setContactError(message);
        showToast(message, "error");
        return;
      }
 
      setContacts((prev) => [data.contact, ...prev]);
      setContactEmail("");
      showToast("Contact added");
    } catch (err) {
      setContactError("Failed to add contact.");
      showToast("Failed to add contact.", "error");
    } finally {

      setContactLoading(false);
    }
  }

  async function handleDeleteContact(id: string) {
    setContactDeletingId(id);
    setContactError(null);
 
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contact");
      setContacts((prev) => prev.filter((c) => c.id !== id));
      showToast("Contact removed");
    } catch (err) {
      setContactError("Failed to delete contact.");
      showToast("Failed to delete contact.", "error");
    } finally {
      setContactDeletingId(null);
    }
  }

  async function handleDeleteAllContacts() {
    if (contacts.length === 0) return;
    if (!confirm("Are you sure you want to delete all emergency contacts?")) return;

    try {
      const ids = contacts.map((c) => c.id as string);
      await Promise.all(
        ids.map((id) => fetch(`/api/contacts/${id}`, { method: "DELETE" }).catch(() => null))
      );
      setContacts([]);
      showToast("All contacts removed");
    } catch (err) {
      console.error("Failed to delete all contacts", err);
      showToast("Failed to delete all contacts", "error");
    }
  }


  async function handleDeleteAllData() {
    const targetUser = profileUser || sessionUser;
    if (!targetUser?.id) return;
    if (!confirm("Are you sure? This will delete ALL your data and cannot be undone.")) return;
    setDangerLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/${targetUser.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user data");
      // Sign out the user after deleting their account
      signOut();
    } catch (err) {
      setError("Failed to delete all user data.");
    } finally {
      setDangerLoading(false);
    }
  }

  async function handleInviteStatus(id: string, status: "ACCEPTED" | "DECLINED") {
    setInviteUpdatingId(id);
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update invite");
      setTrustedBy((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      );
    } catch (err) {
      // Keep it quiet in UI; optional: setError
      console.error(err);
    } finally {
      setInviteUpdatingId(null);
    }
  }

  async function handleDeleteTrustedBy(id: string) {
    setTrustedDeletingId(id);
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("Failed to remove contact", "error");
        return;
      }
      setTrustedBy((prev) => prev.filter((t) => t.id !== id));
      showToast("Contact removed");
    } catch (err) {
      console.error("Failed to delete trusted contact", err);
      showToast("Failed to remove contact", "error");
    } finally {
      setTrustedDeletingId(null);
    }
  }

  const effectiveUser = profileUser || sessionUser;

  const selectedSession =
    selectedSessionId && trackingSessions.length > 0
      ? trackingSessions.find((s) => s.id === selectedSessionId) || trackingSessions[0]
      : trackingSessions[0] || null;

  const selectedSessionLocations = selectedSession?.locations || [];

  useEffect(() => {
    if (!selectedSession) {
      setSessionNameDraft("");
      setSessionQualityDraft("REGULAR");
      setSessionMetaError(null);
      return;
    }
    setSessionNameDraft(selectedSession.name || "");
    const q = (selectedSession as any).quality ?? "REGULAR";
    if (q === "GOOD" || q === "REGULAR" || q === "BAD") {
      setSessionQualityDraft(q);
    } else {
      setSessionQualityDraft("REGULAR");
    }
    setSessionMetaError(null);
  }, [selectedSession?.id]);

  const sessionStart = selectedSession
    ? new Date(selectedSession.startTime)
    : selectedSessionLocations[0]
    ? new Date(selectedSessionLocations[0].timestamp)
    : null;

  const sessionEnd = selectedSession
    ? new Date(selectedSession.endTime)
    : selectedSessionLocations.length > 0
    ? new Date(
        selectedSessionLocations[selectedSessionLocations.length - 1].timestamp
      )
    : null;

  const sessionDurationMs =
    sessionStart && sessionEnd ? sessionEnd.getTime() - sessionStart.getTime() : null;

  const sessionDeviceIds = Array.from(
    new Set(
      selectedSessionLocations
        .map((loc: any) => loc.deviceId)
        .filter((id: string | null | undefined) => !!id)
    )
  );

  const totalAlerts = alerts.length;
  const alertsByStatus: { [key: string]: number } = {};
  alerts.forEach((alert: any) => {
    const key = alert.status || alert.recipientStatus || "UNKNOWN";
    alertsByStatus[key] = (alertsByStatus[key] || 0) + 1;
  });
  const totalAudioMessages = alerts.reduce(
    (sum: number, alert: any) => sum + (alert.audioMessages?.length || 0),
    0
  );

  useEffect(() => {
     // Reset environment metrics when switching sessions
     setEnvironmentSummary(null);
     setEnvironmentWifi([]);
     setEnvironmentBle([]);
     setEnvironmentError(null);
     setEnvironmentVisible(false);
   }, [selectedSessionId]);

   useEffect(() => {
     if (!mounted) return;

     if (!selectedSessionId || trackingSessions.length === 0) {
       setSuspiciousWifiDevices([]);
       setSuspiciousBleDevices([]);
       setSuspiciousError(null);
       return;
     }

     const session =
       trackingSessions.find((s) => s.id === selectedSessionId) || trackingSessions[0];
     const locations = session?.locations || [];
     const deviceIds = Array.from(
       new Set(
         locations
           .map((loc: any) => loc.deviceId)
           .filter((id: string | null | undefined) => !!id)
       )
     );
     const primaryDeviceId = deviceIds[0] as string | undefined;

     if (!primaryDeviceId) {
       setSuspiciousWifiDevices([]);
       setSuspiciousBleDevices([]);
       setSuspiciousError("No device information available for this session yet.");
       return;
     }

      async function fetchSuspicious() {
        setSuspiciousLoading(true);
        setSuspiciousError(null);
        try {
          const idForQuery = primaryDeviceId ?? "";
          const url = `/api/tracked_devices/suspicious?user_device_id=${encodeURIComponent(
            idForQuery
          )}`;
          const res = await fetch(url);

         if (!res.ok) {
           throw new Error("Failed to load suspicious devices");
         }
         const data = await res.json();
         const wifi = Array.isArray(data)
           ? data.filter((d: any) => d.type === "wifi")
           : [];
         const ble = Array.isArray(data)
           ? data.filter((d: any) => d.type === "ble")
           : [];
         setSuspiciousWifiDevices(wifi);
         setSuspiciousBleDevices(ble);
       } catch (err) {
         console.error("Failed to load suspicious devices", err);
         setSuspiciousWifiDevices([]);
         setSuspiciousBleDevices([]);
         setSuspiciousError("Failed to load suspicious devices.");
       } finally {
         setSuspiciousLoading(false);
       }
     }

     fetchSuspicious();
   }, [mounted, selectedSessionId, trackingSessions]);
 
   function formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
 
  if (!mounted) {
    return null;
  }
 
   return (

    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8 pt-28">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-900/40 border border-red-500/40 rounded-xl px-4 py-2">
            {error}
          </div>
        )}
        <div className="space-y-10">
          {/* Account and contacts section */}
          <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4">Account &amp; Contacts</h2>
            <div className="space-y-6">
              {/* Profile */}
              <div>
                <h3 className="text-base font-semibold mb-1">Profile</h3>
                <p className="text-sm text-gray-300 mb-3">
                  Update the information that appears in your dashboard and for trusted contacts.
                </p>
                {effectiveUser && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget as HTMLFormElement;
                    const formData = new FormData(form);
                    const name = String(formData.get("name") || "");
                    const email = String(formData.get("email") || "");
                    const image = String(formData.get("image") || "");
                    try {
                      const res = await fetch(`/api/user/${effectiveUser.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, email, image }),
                      });
                      if (!res.ok) {
                        console.error("Failed to update profile");
                        showToast("Failed to save profile", "error");
                      } else {
                        setProfileUser((prev) => ({
                          ...(prev || effectiveUser),
                          name,
                          email,
                          image,
                        }));
                        showToast("Profile saved");
                      }
                    } catch (err) {
                      console.error("Profile update error", err);
                      showToast("Failed to save profile", "error");
                    }

                    }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
                        {effectiveUser.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={effectiveUser.image}
                            alt={effectiveUser.name || effectiveUser.email || "Avatar"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold">
                            {(effectiveUser.name || effectiveUser.email || "?")
                              .toString()
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-xs text-gray-400">
                        This avatar will appear in the navigation bar.
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Name</label>
                      <input
                        name="name"
                        defaultValue={effectiveUser.name || ""}
                        className="w-full px-3 py-2 rounded-lg bg-white/90 text-black text-sm focus:outline-none"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={effectiveUser.email || ""}
                        className="w-full px-3 py-2 rounded-lg bg-white/90 text-black text-sm focus:outline-none"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Avatar URL</label>
                      <input
                        name="image"
                        defaultValue={effectiveUser.image || ""}
                        className="w-full px-3 py-2 rounded-lg bg-white/90 text-black text-sm focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>
                    <button
                      type="submit"
                      className="mt-2 px-4 py-2 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition text-sm font-semibold"
                    >
                      Save Profile
                    </button>
                  </form>
                )}
              </div>

              <div className="h-px bg-white/10" />

              {/* Privacy */}
              <div>
                <h3 className="text-base font-semibold mb-1">Privacy</h3>
                <p className="text-sm text-gray-300">
                  Control whether your live location can be used to find nearby trusted contacts.
                </p>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-xs text-gray-400 max-w-xs">
                    When enabled, your last known position is used to calculate distances to your accepted contacts.
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-200">
                    <input
                      type="checkbox"
                      checked={!!shareLocationWithTrustedContacts}
                      onChange={async () => {
                        const next = !shareLocationWithTrustedContacts;
                        setShareLocationWithTrustedContacts(next);
                        try {
                          await fetch("/api/user/privacy", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              shareLocationWithTrustedContacts: next,
                            }),
                          });
                        } catch (err) {
                          console.error("Failed to update privacy from settings", err);
                        }
                      }}
                      className="h-4 w-4 text-gold-500"
                    />
                    <span>Share my live location</span>
                  </label>
                </div>
              </div>

               <div className="h-px bg-white/10" />
 
               {/* Map experience */}
               <div>
                 <h3 className="text-base font-semibold mb-1">Map Experience</h3>
                 <p className="text-sm text-gray-300">
                   Choose between the built-in map and Google 3D Maps when you provide your own API key.
                 </p>
                 <form
                   onSubmit={handleSaveMapSettings}
                   className="mt-3 space-y-3 max-w-xl"
                 >
                   <div>
                     <label className="block text-xs text-gray-300 mb-1">Google Maps API key</label>
                     <input
                       type="text"
                       value={googleMapsApiKey}
                       onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                       className="w-full px-3 py-2 rounded-lg bg-white/90 text-black text-sm focus:outline-none"
                       placeholder="Paste your Google Maps API key"
                     />
                     <p className="mt-1 text-[11px] text-gray-400">
                       Restrict this key by HTTP referrer in your Google Cloud Console. It is stored only for your account.
                     </p>
                   </div>
                   <label className="flex items-center gap-2 text-xs text-gray-200">
                     <input
                       type="checkbox"
                       checked={useGoogle3DMaps && !!googleMapsApiKey.trim()}
                       onChange={(e) => setUseGoogle3DMaps(e.target.checked)}
                       className="h-4 w-4 text-gold-500"
                       disabled={!googleMapsApiKey.trim()}
                     />
                     <span>
                       Use Google 3D Maps on the dashboard when this key is set
                       {!googleMapsApiKey.trim() ? " (add a key first)" : ""}
                     </span>
                   </label>
                   {mapSettingsError && (
                     <div className="text-xs text-red-400">{mapSettingsError}</div>
                   )}
                   <button
                     type="submit"
                     className="px-4 py-2 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition text-sm font-semibold disabled:opacity-60"
                     disabled={mapSettingsSaving || mapSettingsLoading}
                   >
                     {mapSettingsSaving ? "Saving..." : "Save map settings"}
                   </button>
                   {mapSettingsLoading && (
                     <div className="text-xs text-gray-400">Loading saved map settings...</div>
                   )}
                 </form>
               </div>
 
               <div className="h-px bg-white/10" />
 
               {/* Emergency contacts */}

              <div>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="text-base font-semibold">Emergency Contacts</h3>
                  {contacts.length > 0 && (
                    <button
                      className="px-3 py-1 text-[11px] rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                      onClick={handleDeleteAllContacts}
                    >
                      Delete all
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-300">
                  Add trusted people who can receive alerts about your location. Only existing Guardian accounts can be added for now.
                </p>
                <form
                  onSubmit={handleAddContact}
                  className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <input
                    type="email"
                    className="flex-1 px-3 py-2 rounded-lg bg-white/90 text-black text-sm focus:outline-none"
                    placeholder="Contact's email address"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    disabled={contactLoading}
                  >
                    {contactLoading ? "Adding..." : "Add Contact"}
                  </button>
                </form>
                {contactError && (
                  <div className="mt-2 text-sm text-red-400">{contactError}</div>
                )}
                <div className="mt-4">
                  {contacts.length === 0 ? (
                    <div className="text-sm text-gray-400">No emergency contacts yet.</div>
                  ) : (
                    <ul className="space-y-2">
                      {contacts.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"
                        >
                          <div className="flex-1 mr-3">
                            <div className="text-sm font-medium">
                              {c.contact?.name || c.contact?.email || "Contact"}
                            </div>
                            {c.contact?.email && (
                              <div className="text-xs text-gray-400">{c.contact.email}</div>
                            )}
                            <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-4 text-[11px] text-gray-200">
                              <label className="inline-flex items-center gap-2 mb-1 sm:mb-0">
                                <input
                                  type="checkbox"
                                  checked={c.receiveEmergencyAlerts ?? true}
                                  onChange={async (e) => {
                                    const next = e.target.checked;
                                    setContacts((prev) =>
                                      prev.map((x) =>
                                        x.id === c.id ? { ...x, receiveEmergencyAlerts: next } : x
                                      )
                                    );
                                    try {
                                      const res = await fetch(`/api/contacts/${c.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ receiveEmergencyAlerts: next }),
                                      });
                                      if (!res.ok) {
                                        showToast("Failed to update emergency alerts setting", "error");
                                      }
                                    } catch (err) {
                                      console.error("Failed to update receiveEmergencyAlerts", err);
                                      showToast("Failed to update emergency alerts setting", "error");
                                    }
                                  }}
                                  className="h-4 w-4 text-gold-500"
                                />
                                <span>Emergency alerts</span>
                              </label>
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={c.allowCallsAndMessages ?? true}
                                  onChange={async (e) => {
                                    const next = e.target.checked;
                                    setContacts((prev) =>
                                      prev.map((x) =>
                                        x.id === c.id ? { ...x, allowCallsAndMessages: next } : x
                                      )
                                    );
                                    try {
                                      const res = await fetch(`/api/contacts/${c.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ allowCallsAndMessages: next }),
                                      });
                                      if (!res.ok) {
                                        showToast("Failed to update calls/messages setting", "error");
                                      }
                                    } catch (err) {
                                      console.error("Failed to update allowCallsAndMessages", err);
                                      showToast("Failed to update calls/messages setting", "error");
                                    }
                                  }}
                                  className="h-4 w-4 text-gold-500"
                                />
                                <span>Calls &amp; messages</span>
                              </label>
                            </div>
                          </div>
                          <button
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                            onClick={() => handleDeleteContact(c.id)}
                            disabled={contactDeletingId === c.id}
                          >
                            {contactDeletingId === c.id ? "Removing..." : "Remove"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/10" />

              {/* People who trust you */}
              <div>
                <h3 className="text-base font-semibold mb-1">People Who Trust You</h3>
                <p className="text-sm text-gray-300">
                  These people have added you as an emergency contact in their Guardian account.
                </p>
                {trustedBy.length > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-900/40 border border-emerald-400/40 px-4 py-2 text-xs font-semibold text-emerald-200">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                    <span>
                      You are an emergency contact for {trustedBy.length} {trustedBy.length === 1 ? "person" : "people"}.
                    </span>
                  </div>
                )}
                <div className="mt-3">
                  {trustedBy.some((t) => t.status === "PENDING") && (
                    <div className="mb-3 rounded-xl bg-amber-900/40 border border-amber-400/40 px-4 py-3 text-xs text-amber-100">
                      <div className="font-semibold mb-1">Pending emergency contact requests</div>
                      <p>
                        You have {trustedBy.filter((t) => t.status === "PENDING").length} pending request
                        {trustedBy.filter((t) => t.status === "PENDING").length === 1 ? "" : "s"} to become an emergency contact.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  {trustedBy.length === 0 ? (
                    <div className="text-sm text-gray-400">
                      No one has added you as an emergency contact yet.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {trustedBy.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium">
                              {t.owner?.name || t.owner?.email || "Guardian user"}
                            </div>
                            {t.owner?.email && (
                              <div className="text-xs text-gray-400">{t.owner.email}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {t.status === "PENDING" && (
                              <>
                                <button
                                  className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition text-xs"
                                  onClick={() => handleInviteStatus(t.id, "ACCEPTED")}
                                  disabled={inviteUpdatingId === t.id || trustedDeletingId === t.id}
                                >
                                  {inviteUpdatingId === t.id ? "Accepting..." : "Accept"}
                                </button>
                                <button
                                  className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition text-xs"
                                  onClick={() => handleInviteStatus(t.id, "DECLINED")}
                                  disabled={inviteUpdatingId === t.id || trustedDeletingId === t.id}
                                >
                                  {inviteUpdatingId === t.id ? "Declining..." : "Decline"}
                                </button>
                              </>
                            )}
                            {t.status === "ACCEPTED" && (
                              <>
                                <span className="px-2 py-1 rounded-full bg-emerald-900/60 text-emerald-200 text-[11px] font-semibold">
                                  Accepted
                                </span>
                                <button
                                  className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition text-xs"
                                  onClick={() => handleInviteStatus(t.id, "DECLINED")}
                                  disabled={inviteUpdatingId === t.id || trustedDeletingId === t.id}
                                >
                                  {inviteUpdatingId === t.id ? "Revoking..." : "Revoke emergency"}
                                </button>
                              </>
                            )}
                            {t.status === "DECLINED" && (
                              <span className="px-2 py-1 rounded-full bg-neutral-800/80 text-neutral-300 text-[11px] font-semibold">
                                Declined
                              </span>
                            )}
                            <button
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                              onClick={() => handleDeleteTrustedBy(t.id)}
                              disabled={trustedDeletingId === t.id || inviteUpdatingId === t.id}
                            >
                              {trustedDeletingId === t.id ? "Removing..." : "Remove"}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Tracking sessions section */}
          <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-lg font-semibold">Tracking Sessions</h2>
              {trackingSessions.length > 0 && (
                <button
                  className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                  onClick={handleDeleteAllSessions}
                >
                  Delete all
                </button>
              )}
            </div>
            <p className="text-sm text-gray-300">
              View, inspect and delete recorded tracking sessions from your devices.
            </p>
            <div className="mt-4">
              {loading ? (
                <div>Loading...</div>
              ) : trackingSessions.length === 0 ? (
                <div className="text-sm text-gray-400">
                  No tracking sessions found yet. They will appear here when you use live tracking.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-200 mb-1">Sessions</h3>
                    <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {trackingSessions.map((session) => {
                        const quality = (session as any).quality;
                        const dotClass =
                          quality === "GOOD"
                            ? "bg-emerald-400"
                            : quality === "BAD"
                            ? "bg-red-500"
                            : quality === "REGULAR"
                            ? "bg-amber-400"
                            : "bg-gray-500";
                        const qualityLabel =
                          quality === "GOOD"
                            ? "Good"
                            : quality === "BAD"
                            ? "Not good"
                            : quality === "REGULAR"
                            ? "Regular"
                            : null;
                        return (
                          <li
                            key={session.id}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer border ${
                              selectedSession && selectedSession.id === session.id
                                ? "bg-white/10 border-gold-400/70"
                                : "bg-white/5 border-white/10 hover:bg-white/10"
                            }`}
                            onClick={() => setSelectedSessionId(session.id)}
                          >
                            <div className="mr-3 flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                              <div>
                                <div className="text-sm font-medium">
                                  {session.name || "Session"}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(session.startTime).toLocaleString()}
                                </div>
                                {qualityLabel && (
                                  <div
                                    className="mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] text-black"
                                    style={{
                                      backgroundColor:
                                        quality === "GOOD"
                                          ? "#22c55e"
                                          : quality === "BAD"
                                          ? "#ef4444"
                                          : "#f97316",
                                    }}
                                  >
                                    {qualityLabel}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                              disabled={deleting === session.id}
                            >
                              {deleting === session.id ? "Deleting..." : "Delete"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-200">Session details</h3>
                      {selectedSession && (
                        <button
                          className="px-3 py-1 text-[11px] rounded-lg bg-white/10 text-gray-100 hover:bg-white/20 border border-white/15 transition"
                          onClick={() => handleLoadEnvironment(selectedSession.id)}
                          disabled={environmentLoading}
                        >
                          {environmentLoading ? "Loading environment..." : "View environment metrics"}
                        </button>
                      )}
                    </div>
                     {!selectedSession ? (
                       <div className="text-sm text-gray-400">
                         Select a session on the left to see its details.

                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-white/5 rounded-xl p-3">
                             <div className="text-xs text-gray-400 mb-1">Name</div>
                             <div className="flex items-center justify-between gap-2">
                               <div className="text-sm font-medium">
                                 {selectedSession.name || "Session"}
                               </div>
                               {(() => {
                                 const quality = (selectedSession as any).quality;
                                 if (!quality) return null;
                                 let label = "";
                                 let cls = "";
                                 if (quality === "GOOD") {
                                   label = "Good track";
                                   cls = "bg-emerald-600 text-emerald-50";
                                 } else if (quality === "BAD") {
                                   label = "Not good";
                                   cls = "bg-red-600 text-red-50";
                                 } else if (quality === "REGULAR") {
                                   label = "Regular";
                                   cls = "bg-amber-500 text-black";
                                 }
                                 if (!label) return null;
                                 return (
                                   <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
                                     {label}
                                   </span>
                                 );
                               })()}
                             </div>
                           </div>

                          <div className="bg-white/5 rounded-xl p-3">
                            <div className="text-xs text-gray-400">Duration</div>
                            <div className="text-sm font-medium">
                              {sessionDurationMs != null
                                ? formatDuration(sessionDurationMs)
                                : "Unknown"}
                            </div>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3">
                            <div className="text-xs text-gray-400">Points</div>
                            <div className="text-sm font-medium">
                              {selectedSessionLocations.length}
                            </div>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3">
                            <div className="text-xs text-gray-400">Devices in session</div>
                            <div className="text-sm font-medium">
                              {sessionDeviceIds.length > 0
                                ? sessionDeviceIds.length
                                : "No device info"}
                            </div>
                          </div>
                         </div>

                         <form
                           onSubmit={handleSaveSessionMeta}
                           className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4"
                         >
                           <div className="bg-white/5 rounded-xl p-3 sm:col-span-2">
                             <div className="text-xs text-gray-400 mb-1">Edit session name / tag</div>
                             <input
                               type="text"
                               value={sessionNameDraft}
                               onChange={(e) => setSessionNameDraft(e.target.value)}
                               className="w-full px-3 py-2 rounded-lg bg-white/90 text-black text-sm focus:outline-none"
                               placeholder="e.g. Morning commute, City test drive"
                             />
                             <div className="text-[11px] text-gray-400 mt-1">
                               Give this track a short label to make it easier to find later.
                             </div>
                           </div>
                           <div className="bg-white/5 rounded-xl p-3 flex flex-col gap-2">
                             <div className="text-xs text-gray-400">Quality rating</div>
                             <div className="flex flex-wrap gap-2">
                               <button
                                 type="button"
                                 onClick={() => setSessionQualityDraft("GOOD")}
                                 className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition ${
                                   sessionQualityDraft === "GOOD"
                                     ? "bg-emerald-600 text-emerald-50 border-emerald-300"
                                     : "bg-black/30 text-emerald-200 border-emerald-500/40 hover:bg-emerald-700/40"
                                 }`}
                               >
                                 Good (green)
                               </button>
                               <button
                                 type="button"
                                 onClick={() => setSessionQualityDraft("REGULAR")}
                                 className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition ${
                                   sessionQualityDraft === "REGULAR"
                                     ? "bg-amber-500 text-black border-amber-300"
                                     : "bg-black/30 text-amber-200 border-amber-500/40 hover:bg-amber-700/40"
                                 }`}
                               >
                                 Regular (orange)
                               </button>
                               <button
                                 type="button"
                                 onClick={() => setSessionQualityDraft("BAD")}
                                 className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition ${
                                   sessionQualityDraft === "BAD"
                                     ? "bg-red-600 text-red-50 border-red-300"
                                     : "bg-black/30 text-red-200 border-red-500/40 hover:bg-red-700/40"
                                 }`}
                               >
                                 Not good (red)
                               </button>
                             </div>
                             {sessionMetaError && (
                               <div className="text-[11px] text-red-400">{sessionMetaError}</div>
                             )}
                             <button
                               type="submit"
                               className="mt-1 px-3 py-1.5 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition text-[11px] font-semibold disabled:opacity-60"
                               disabled={sessionMetaSaving}
                             >
                               {sessionMetaSaving ? "Saving..." : "Save tag & rating"}
                             </button>
                           </div>
                         </form>

                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                           <div className="bg-white/5 rounded-xl p-3">
                             <div className="text-xs text-gray-400">Batches sent</div>
                             <div className="text-sm font-medium">Coming soon</div>
                             <div className="text-[11px] text-gray-400 mt-1">
                               Placeholder for future batch metrics.
                             </div>
                           </div>
                           <div className="bg-white/5 rounded-xl p-3">
                             <div className="text-xs text-gray-400">Errors</div>
                             <div className="text-sm font-medium">Coming soon</div>
                             <div className="text-[11px] text-gray-400 mt-1">
                               Placeholder for error stats per session.
                             </div>
                           </div>
                           <div className="bg-white/5 rounded-xl p-3">
                             <div className="text-xs text-gray-400">Map points preview</div>
                             <div className="text-[11px] text-gray-400 mt-1">
                               Future space for route maps or visualizations.
                             </div>
                           </div>
                         </div>


                        {environmentVisible && environmentSummary && (
                          <div className="mt-4 space-y-3">
                            <h4 className="text-xs font-semibold text-gray-300 tracking-wide uppercase">
                              Environment metrics for this session
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-white/5 rounded-xl p-3">
                                <div className="text-[11px] text-gray-400">Location points</div>
                                <div className="text-sm font-semibold">
                                  {environmentSummary.locations ?? 0}
                                </div>
                              </div>
                              <div className="bg-white/5 rounded-xl p-3">
                                <div className="text-[11px] text-gray-400">Wi-Fi scans</div>
                                <div className="text-sm font-semibold">
                                  {environmentSummary.wifiScans ?? 0}
                                </div>
                              </div>
                              <div className="bg-white/5 rounded-xl p-3">
                                <div className="text-[11px] text-gray-400">Bluetooth scans</div>
                                <div className="text-sm font-semibold">
                                  {environmentSummary.bleScans ?? 0}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-gray-300">
                              <div className="bg-white/5 rounded-xl p-3">
                                <div className="text-[11px] font-semibold text-gray-200 mb-1">
                                  Top Wi-Fi networks
                                </div>
                                {environmentWifi.length === 0 ? (
                                  <div className="text-gray-400">No Wi-Fi data for this session.</div>
                                ) : (
                                  <ul className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                                    {environmentWifi.slice(0, 5).map((w: any) => (
                                      <li key={w.bssid} className="flex justify-between gap-2">
                                        <span className="truncate">
                                          {w.ssid || "Hidden"}
                                        </span>
                                        <span className="text-gray-400">
                                          ×{w.count ?? 0}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div className="bg-white/5 rounded-xl p-3">
                                <div className="text-[11px] font-semibold text-gray-200 mb-1">
                                  Top Bluetooth devices
                                </div>
                                {environmentBle.length === 0 ? (
                                  <div className="text-gray-400">No Bluetooth data for this session.</div>
                                ) : (
                                  <ul className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                                    {environmentBle.slice(0, 5).map((b: any) => (
                                      <li key={b.address} className="flex justify-between gap-2">
                                        <span className="truncate">
                                          {b.name || "Unknown"}
                                        </span>
                                        <span className="text-gray-400">
                                          ×{b.count ?? 0}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Nearby devices section */}
          <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-2">Nearby Wi-Fi &amp; Bluetooth Devices</h2>
            <p className="text-sm text-gray-300">
              See which Wi-Fi networks and Bluetooth devices have been around you during tracking, how often they appeared, and clean up historical scans.
            </p>
            {devicesError && (
              <div className="mt-3 text-sm text-red-400">{devicesError}</div>
            )}
            <div className="mt-4">
              {devicesLoading ? (
                <div className="text-sm text-gray-400">Loading nearby devices...</div>
              ) : wifiDevices.length === 0 && bleDevices.length === 0 ? (
                <div className="text-sm text-gray-400">
                  No Wi-Fi or Bluetooth scan data yet. When you record sessions with environment scanning enabled, devices will appear here.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-2">Wi-Fi networks</h3>
                    <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {wifiDevices.map((device) => {
                        const first = device.firstSeen ? new Date(device.firstSeen) : null;
                        const last = device.lastSeen ? new Date(device.lastSeen) : null;
                        const durationMs =
                          first && last ? last.getTime() - first.getTime() : 0;
                        return (
                          <li
                            key={device.id}
                            className="bg-white/5 rounded-xl px-3 py-2 text-xs flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium">
                                  {device.ssid || "Hidden network"}
                                </div>
                                <div className="text-[11px] text-gray-400">
                                  BSSID: {device.bssid}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {device.hasSessions && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-100">
                                    Part of sessions
                                  </span>
                                )}
                                <button
                                  className="px-2 py-0.5 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 transition"
                                  onClick={() =>
                                    handleDeleteDevice(
                                      "wifi",
                                      device.id as string,
                                      device.hasSessions
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-300">
                              {first && (
                                <span>First seen: {first.toLocaleString()}</span>
                              )}
                              {last && (
                                <span>Last seen: {last.toLocaleString()}</span>
                              )}
                              <span>Scans: {device.scanCount}</span>
                              {durationMs > 0 && (
                                <span>
                                  Near you for ~{formatDuration(durationMs)}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-2">Bluetooth devices</h3>
                    <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {bleDevices.map((device) => {
                        const first = device.firstSeen ? new Date(device.firstSeen) : null;
                        const last = device.lastSeen ? new Date(device.lastSeen) : null;
                        const durationMs =
                          first && last ? last.getTime() - first.getTime() : 0;
                        return (
                          <li
                            key={device.id}
                            className="bg-white/5 rounded-xl px-3 py-2 text-xs flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium">
                                  {device.name || "Unknown device"}
                                </div>
                                <div className="text-[11px] text-gray-400">
                                  Address: {device.address}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {device.hasSessions && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-100">
                                    Part of sessions
                                  </span>
                                )}
                                <button
                                  className="px-2 py-0.5 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 transition"
                                  onClick={() =>
                                    handleDeleteDevice(
                                      "ble",
                                      device.id as string,
                                      device.hasSessions
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-300">
                              {first && (
                                <span>First seen: {first.toLocaleString()}</span>
                              )}
                              {last && (
                                <span>Last seen: {last.toLocaleString()}</span>
                              )}
                              <span>Scans: {device.scanCount}</span>
                              {durationMs > 0 && (
                                <span>
                                  Near you for ~{formatDuration(durationMs)}
                                </span>
                              )}
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

           {/* Suspicious tracked devices section */}
           <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
             <h2 className="text-lg font-semibold mb-2">Suspicious Wi-Fi &amp; Bluetooth Devices</h2>
             <p className="text-sm text-gray-300">
               Based on your tracking history, these devices have been seen many times
               across different places for the selected session&apos;s device.
             </p>
             {suspiciousError && (
               <div className="mt-3 text-sm text-red-400">{suspiciousError}</div>
             )}
             <div className="mt-4">
               {suspiciousLoading ? (
                 <div className="text-sm text-gray-400">Loading suspicious devices...</div>
               ) :
               suspiciousWifiDevices.length === 0 && suspiciousBleDevices.length === 0 ? (
                 <div className="py-6 flex flex-col items-center justify-center text-sm text-gray-400">
                   <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                   <p className="mb-1">No suspicious devices detected yet.</p>
                   <p className="text-xs text-gray-500 max-w-md text-center">
                     As you build up tracking history, Wi-Fi and Bluetooth devices that
                     repeatedly appear across different places near you will be highlighted here.
                   </p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <h3 className="text-sm font-semibold text-gray-200 mb-2">Wi-Fi devices</h3>
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
                                   {device.name || "Unknown Wi-Fi device"}
                                 </div>
                                 <div className="text-[11px] text-gray-400">
                                   BSSID: {device.identifier}
                                 </div>
                               </div>
                               <div className="flex flex-col items-end gap-1 text-[11px] text-gray-300">
                                 <span>
                                   Score: {Number(device.suspicion_score ?? 0).toFixed(1)}
                                 </span>
                                 <span>
                                   Places: {device.distinct_location_count ?? 0}
                                 </span>
                               </div>
                             </div>
                             <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-300">
                               {first && (
                                 <span>First seen: {first.toLocaleString()}</span>
                               )}
                               {last && (
                                 <span>Last seen: {last.toLocaleString()}</span>
                               )}
                               <span>Sightings: {device.total_sightings ?? 0}</span>
                             </div>
                           </li>
                         );
                       })}
                     </ul>
                   </div>
                   <div>
                     <h3 className="text-sm font-semibold text-gray-200 mb-2">Bluetooth devices</h3>
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
                                   {device.name || "Unknown Bluetooth device"}
                                 </div>
                                 <div className="text-[11px] text-gray-400">
                                   Address: {device.identifier}
                                 </div>
                               </div>
                               <div className="flex flex-col items-end gap-1 text-[11px] text-gray-300">
                                 <span>
                                   Score: {Number(device.suspicion_score ?? 0).toFixed(1)}
                                 </span>
                                 <span>
                                   Places: {device.distinct_location_count ?? 0}
                                 </span>
                               </div>
                             </div>
                             <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-300">
                               {first && (
                                 <span>First seen: {first.toLocaleString()}</span>
                               )}
                               {last && (
                                 <span>Last seen: {last.toLocaleString()}</span>
                               )}
                               <span>Sightings: {device.total_sightings ?? 0}</span>
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
 
           {/* Alerts section */}
           <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">

            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-lg font-semibold">Alerts</h2>
              {alerts.length > 0 && (
                <button
                  className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                  onClick={handleDeleteAllAlerts}
                >
                  Delete all
                </button>
              )}
            </div>
            <p className="text-sm text-gray-300">
              See alerts you&apos;ve sent or received, and filter them similar to analytics dashboards.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-300">Type</span>
                <select
                  className="bg-white/90 text-black text-sm rounded-lg px-2 py-1"
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as "sent" | "received")}
                >
                  <option value="sent">Sent</option>
                  <option value="received">Received</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-300">Status</span>
                <select
                  className="bg-white/90 text-black text-sm rounded-lg px-2 py-1"
                  value={alertStatus}
                  onChange={(e) => setAlertStatus(e.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="READ">Read</option>
                  <option value="RESPONDED">Responded</option>
                  <option value="DISMISSED">Dismissed</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                </select>
              </div>
              <div className="text-xs text-gray-400">
                More filters (date range, devices, errors) can be added here later.
              </div>
            </div>
            {alertsError && (
              <div className="mt-3 text-sm text-red-400">{alertsError}</div>
            )}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-400">Total alerts</div>
                <div className="text-lg font-semibold">{totalAlerts}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-400">With audio replies</div>
                <div className="text-lg font-semibold">{totalAudioMessages}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-400">Status breakdown</div>
                <div className="mt-1 text-[11px] text-gray-300 space-y-0.5">
                  {Object.keys(alertsByStatus).length === 0 ? (
                    <div>No data yet.</div>
                  ) : (
                    Object.entries(alertsByStatus).map(([statusKey, count]) => (
                      <div key={statusKey} className="flex justify-between">
                        <span>{statusKey}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6">
              {alertsLoading ? (
                <div className="text-sm text-gray-400">Loading alerts...</div>
              ) : alerts.length === 0 ? (
                <div className="text-sm text-gray-400">
                  No alerts found for this filter. Trigger or receive an alert and they&apos;ll appear here.
                </div>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {alerts.map((alert: any) => (
                    <li
                      key={alert.id}
                      className="bg-white/5 rounded-xl px-3 py-2 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">
                          {alert.title || "Alert"}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-200">
                            {alert.status}
                          </span>
                          <button
                            className="px-2 py-0.5 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 transition"
                            onClick={() => handleDeleteAlert(alert.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                      {alert.description && (
                        <div className="text-xs text-gray-300 mt-1 truncate">
                          {alert.description}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-300">
                        <span>
                          Recipients: {" "}
                          {alert.recipients
                            ? alert.recipients.length
                            : alert.alertRecipients
                            ? alert.alertRecipients.length
                            : 0}
                        </span>
                        <span>
                          Audio messages: {alert.audioMessages?.length || 0}
                        </span>
                        {alert.recipientStatus && (
                          <span>My status: {alert.recipientStatus}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Danger Zone section */}
          <section className="bg-red-950/40 rounded-2xl p-6 border border-red-500/40">
            <h2 className="text-lg font-semibold mb-2 text-red-200">Danger Zone</h2>
            <p className="text-sm text-red-100/80">
              Delete all your location history, devices, tracking sessions, and your account.
              This action is irreversible.
            </p>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              onClick={handleDeleteAllData}
              disabled={dangerLoading}
            >
              {dangerLoading ? "Deleting..." : "Delete All My Data"}
            </button>
          </section>
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-xl px-4 py-3 text-sm shadow-lg border ${
              toast.type === "success"
                ? "bg-emerald-900/80 border-emerald-400/60 text-emerald-50"
                : "bg-red-900/80 border-red-400/60 text-red-50"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}



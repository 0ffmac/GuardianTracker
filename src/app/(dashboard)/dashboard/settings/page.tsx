"use client";
import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { AccountAndContactsSection } from "@/components/settings/AccountAndContactsSection";
import { TrackingSessionsSection } from "@/components/settings/TrackingSessionsSection";
import { NearbyDevicesSection } from "@/components/settings/NearbyDevicesSection";
import { SuspiciousDevicesSection } from "@/components/settings/SuspiciousDevicesSection";
import { AlertsSection } from "@/components/settings/AlertsSection";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
 
 
 type UserWithId = { id: string; name?: string | null; email?: string | null; image?: string | null };
 
 export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
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

    async function handleRefreshDevices() {
      try {
        await (async () => {
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
        })();
      } catch {
        // errors handled inside
      }
    }
 
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
         <h1 className="text-2xl font-bold mb-6">{t('settings.page.title')}</h1>
         {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-900/40 border border-red-500/40 rounded-xl px-4 py-2">
            {error}
          </div>
        )}
        <div className="space-y-10">
          {/* Account and contacts section */}
          <AccountAndContactsSection
            effectiveUser={effectiveUser}
            shareLocationWithTrustedContacts={shareLocationWithTrustedContacts}
            setShareLocationWithTrustedContacts={setShareLocationWithTrustedContacts}
            useGoogle3DMaps={useGoogle3DMaps}
            setUseGoogle3DMaps={setUseGoogle3DMaps}
            googleMapsApiKey={googleMapsApiKey}
            setGoogleMapsApiKey={setGoogleMapsApiKey}
            mapSettingsLoading={mapSettingsLoading}
            mapSettingsSaving={mapSettingsSaving}
            mapSettingsError={mapSettingsError}
            handleSaveMapSettings={handleSaveMapSettings}
            contacts={contacts}
            setContacts={setContacts}
            contactEmail={contactEmail}
            setContactEmail={setContactEmail}
            contactLoading={contactLoading}
            contactError={contactError}
            contactDeletingId={contactDeletingId}
            handleAddContact={handleAddContact}
            handleDeleteContact={handleDeleteContact}
            handleDeleteAllContacts={handleDeleteAllContacts}
            trustedBy={trustedBy}
            inviteUpdatingId={inviteUpdatingId}
            trustedDeletingId={trustedDeletingId}
            handleInviteStatus={handleInviteStatus}
            handleDeleteTrustedBy={handleDeleteTrustedBy}
            showToast={showToast}
            setProfileUser={setProfileUser}
          />

          {/* Tracking sessions section */}
          <TrackingSessionsSection
            trackingSessions={trackingSessions}
            loading={loading}
            deleting={deleting}
            handleDeleteAllSessions={handleDeleteAllSessions}
            handleDeleteSession={handleDeleteSession}
            selectedSessionId={selectedSessionId}
            setSelectedSessionId={setSelectedSessionId}
            selectedSession={selectedSession}
            selectedSessionLocations={selectedSessionLocations}
            sessionDurationMs={sessionDurationMs}
            sessionDeviceIds={sessionDeviceIds}
            environmentLoading={environmentLoading}
            environmentError={environmentError}
            environmentSummary={environmentSummary}
            environmentWifi={environmentWifi}
            environmentBle={environmentBle}
            environmentVisible={environmentVisible}
            handleLoadEnvironment={handleLoadEnvironment}
            sessionNameDraft={sessionNameDraft}
            setSessionNameDraft={setSessionNameDraft}
            sessionQualityDraft={sessionQualityDraft}
            setSessionQualityDraft={setSessionQualityDraft}
            sessionMetaSaving={sessionMetaSaving}
            sessionMetaError={sessionMetaError}
            handleSaveSessionMeta={handleSaveSessionMeta}
            formatDuration={formatDuration}
          />


          {/* Nearby devices section */}
          <NearbyDevicesSection
            wifiDevices={wifiDevices}
            bleDevices={bleDevices}
            devicesLoading={devicesLoading}
            devicesError={devicesError}
            handleRefreshDevices={handleRefreshDevices}
            handleDeleteDevice={handleDeleteDevice}
            formatDuration={formatDuration}
          />

           {/* Suspicious tracked devices section */}
          <SuspiciousDevicesSection
            suspiciousWifiDevices={suspiciousWifiDevices}
            suspiciousBleDevices={suspiciousBleDevices}
            suspiciousLoading={suspiciousLoading}
            suspiciousError={suspiciousError}
          />
 
          {/* Alerts section */}
          <AlertsSection
            alerts={alerts}
            alertsLoading={alertsLoading}
            alertsError={alertsError}
            alertType={alertType}
            setAlertType={setAlertType}
            alertStatus={alertStatus}
            setAlertStatus={setAlertStatus}
            handleDeleteAllAlerts={handleDeleteAllAlerts}
            handleDeleteAlert={handleDeleteAlert}
          />


           {/* Danger Zone section */}
           <section className="bg-red-950/40 rounded-2xl p-6 border border-red-500/40">
             <h2 className="text-lg font-semibold mb-2 text-red-200">{t('settings.danger.title')}</h2>
             <p className="text-sm text-red-100/80">
               {t('settings.danger.body')}
             </p>
             <button
               className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
               onClick={handleDeleteAllData}
               disabled={dangerLoading}
             >
               {dangerLoading
                 ? t('settings.danger.button.loading')
                 : t('settings.danger.button.idle')}
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



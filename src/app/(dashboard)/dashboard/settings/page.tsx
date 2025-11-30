"use client";
import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Navbar } from "@/components/Navbar";

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
  const [shareLocationWithTrustedContacts, setShareLocationWithTrustedContacts] = useState<boolean | null>(null);

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


  async function handleDeleteSession(id: string) {
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/tracking_session/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      setTrackingSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError("Failed to delete session.");
    } finally {
      setDeleting(null);
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
        setContactError(data?.error || "Failed to add contact.");
        return;
      }

      setContacts((prev) => [data.contact, ...prev]);
      setContactEmail("");
    } catch (err) {
      setContactError("Failed to add contact.");
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
    } catch (err) {
      setContactError("Failed to delete contact.");
    } finally {
      setContactDeletingId(null);
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

  const effectiveUser = profileUser || sessionUser;

  if (!mounted) {
    return null;
  }
 
   return (

    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8 pt-20">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-900/40 border border-red-500/40 rounded-xl px-4 py-2">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Privacy Card */}
          <div className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10 flex flex-col gap-3">
            <h2 className="text-lg font-semibold mb-1">Privacy</h2>
            <p className="text-sm text-gray-300">
              Control whether your live location can be used to find nearby trusted contacts.
            </p>
            <div className="mt-2 flex items-center justify-between gap-4">
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

          {/* Profile Card */}
          <div className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10 flex flex-col gap-4">
            <h2 className="text-lg font-semibold mb-1">Profile</h2>

            <p className="text-sm text-gray-300">
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
                    } else {
                      setProfileUser((prev) => ({
                        ...(prev || effectiveUser),
                        name,
                        email,
                        image,
                      }));
                    }
                  } catch (err) {
                    console.error("Profile update error", err);
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


          {/* Tracking Sessions Card */}
          <div className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-2">Tracking Sessions</h2>
            <p className="text-sm text-gray-300">
              View and delete recorded tracking sessions from your devices.
            </p>
            <div className="mt-4">
              {loading ? (
                <div>Loading...</div>
              ) : trackingSessions.length === 0 ? (
                <div className="text-sm text-gray-400">No tracking sessions found.</div>
              ) : (
                <ul className="space-y-2">
                  {trackingSessions.map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {session.name || "Session"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(session.startTime).toLocaleString()}
                        </div>
                      </div>
                      <button
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={deleting === session.id}
                      >
                        {deleting === session.id ? "Deleting..." : "Delete"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Emergency Contacts Card */}
          <div className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-2">Emergency Contacts</h2>
            <p className="text-sm text-gray-300">
              Add trusted people who can receive alerts about your location.
              Only existing Guardian accounts can be added for now.
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
                      <div>
                        <div className="text-sm font-medium">
                          {c.contact?.name || c.contact?.email || "Contact"}
                        </div>
                        {c.contact?.email && (
                          <div className="text-xs text-gray-400">{c.contact.email}</div>
                        )}
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

          {/* I'm an emergency contact for... */}
          <div className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-2">People Who Trust You</h2>
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
                              disabled={inviteUpdatingId === t.id}
                            >
                              {inviteUpdatingId === t.id ? "Accepting..." : "Accept"}
                            </button>
                            <button
                              className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition text-xs"
                              onClick={() => handleInviteStatus(t.id, "DECLINED")}
                              disabled={inviteUpdatingId === t.id}
                            >
                              {inviteUpdatingId === t.id ? "Declining..." : "Decline"}
                            </button>
                          </>
                        )}
                        {t.status === "ACCEPTED" && (
                          <span className="px-2 py-1 rounded-full bg-emerald-900/60 text-emerald-200 text-[11px] font-semibold">
                            Accepted
                          </span>
                        )}
                        {t.status === "DECLINED" && (
                          <span className="px-2 py-1 rounded-full bg-neutral-800/80 text-neutral-300 text-[11px] font-semibold">
                            Declined
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="bg-red-950/40 rounded-2xl p-6 border border-red-500/40 lg:col-span-2">
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
          </div>
        </div>
      </main>
    </div>
  );
}


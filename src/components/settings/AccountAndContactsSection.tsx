"use client";

import React, { Dispatch, SetStateAction } from "react";

// Keep in sync with Settings page user type
export type UserWithId = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

interface AccountAndContactsSectionProps {
  effectiveUser?: UserWithId | null;
  shareLocationWithTrustedContacts: boolean | null;
  setShareLocationWithTrustedContacts: Dispatch<
    SetStateAction<boolean | null>
  >;
  useGoogle3DMaps: boolean;
  setUseGoogle3DMaps: Dispatch<SetStateAction<boolean>>;
  googleMapsApiKey: string;
  setGoogleMapsApiKey: Dispatch<SetStateAction<string>>;
  mapSettingsLoading: boolean;
  mapSettingsSaving: boolean;
  mapSettingsError: string | null;
  handleSaveMapSettings: (e: React.FormEvent) => Promise<void> | void;
  contacts: any[];
  setContacts: Dispatch<SetStateAction<any[]>>;
  contactEmail: string;
  setContactEmail: Dispatch<SetStateAction<string>>;
  contactLoading: boolean;
  contactError: string | null;
  contactDeletingId: string | null;
  handleAddContact: (e: React.FormEvent) => Promise<void> | void;
  handleDeleteContact: (id: string) => Promise<void> | void;
  handleDeleteAllContacts: () => Promise<void> | void;
  trustedBy: any[];
  inviteUpdatingId: string | null;
  trustedDeletingId: string | null;
  handleInviteStatus: (
    id: string,
    status: "ACCEPTED" | "DECLINED"
  ) => Promise<void> | void;
  handleDeleteTrustedBy: (id: string) => Promise<void> | void;
  showToast: (message: string, type?: "success" | "error") => void;
  setProfileUser: Dispatch<SetStateAction<UserWithId | null>>;
}

export function AccountAndContactsSection({
  effectiveUser,
  shareLocationWithTrustedContacts,
  setShareLocationWithTrustedContacts,
  useGoogle3DMaps,
  setUseGoogle3DMaps,
  googleMapsApiKey,
  setGoogleMapsApiKey,
  mapSettingsLoading,
  mapSettingsSaving,
  mapSettingsError,
  handleSaveMapSettings,
  contacts,
  setContacts,
  contactEmail,
  setContactEmail,
  contactLoading,
  contactError,
  contactDeletingId,
  handleAddContact,
  handleDeleteContact,
  handleDeleteAllContacts,
  trustedBy,
  inviteUpdatingId,
  trustedDeletingId,
  handleInviteStatus,
  handleDeleteTrustedBy,
  showToast,
  setProfileUser,
}: AccountAndContactsSectionProps) {
  return (
    <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h2 className="text-lg font-semibold mb-4">Account &amp; Contacts</h2>
      <div className="space-y-6">
        {/* Profile */}
        <div>
          <h3 className="text-base font-semibold mb-1">Profile</h3>
          <p className="text-sm text-gray-300 mb-3">
            Update the information that appears in your dashboard and for trusted
            contacts.
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
                      alt={
                        effectiveUser.name || effectiveUser.email || "Avatar"
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold">
                      {(
                        effectiveUser.name || effectiveUser.email || "?"
                      )
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
                  className="w-full px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={effectiveUser.email || ""}
                  className="w-full px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Avatar URL
                </label>
                <input
                  name="image"
                  defaultValue={effectiveUser.image || ""}
                  className="w-full px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
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
            Control whether your live location can be used to find nearby
            trusted contacts.
          </p>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs text-gray-400 max-w-xs">
              When enabled, your last known position is used to calculate
              distances to your accepted contacts.
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
                    console.error(
                      "Failed to update privacy from settings",
                      err
                    );
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
            Choose between the built-in map and Google 3D Maps when you provide
            your own API key.
          </p>
          <form
            onSubmit={handleSaveMapSettings}
            className="mt-3 space-y-3 max-w-xl"
          >
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Google Maps API key
              </label>
              <input
                type="password"
                value={googleMapsApiKey}
                onChange={(e) => setGoogleMapsApiKey(e.target.value)}

                className="w-full px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                placeholder="Paste your Google Maps API key"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Restrict this key by HTTP referrer in your Google Cloud
                Console. It is stored only for your account.
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
              <div className="text-xs text-gray-400">
                Loading saved map settings...
              </div>
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
            Add trusted people who can receive alerts about your location. Only
            existing Guardian accounts can be added for now.
          </p>
          <form
            onSubmit={handleAddContact}
            className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              type="email"
              className="flex-1 px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
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
              <div className="text-sm text-gray-400">
                No emergency contacts yet.
              </div>
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
                        <div className="text-xs text-gray-400">
                          {c.contact.email}
                        </div>
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
                                  x.id === c.id
                                    ? { ...x, receiveEmergencyAlerts: next }
                                    : x
                                )
                              );
                              try {
                                const res = await fetch(`/api/contacts/${c.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    receiveEmergencyAlerts: next,
                                  }),
                                });
                                if (!res.ok) {
                                  showToast(
                                    "Failed to update emergency alerts setting",
                                    "error"
                                  );
                                }
                              } catch (err) {
                                console.error(
                                  "Failed to update receiveEmergencyAlerts",
                                  err
                                );
                                showToast(
                                  "Failed to update emergency alerts setting",
                                  "error"
                                );
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
                                  x.id === c.id
                                    ? { ...x, allowCallsAndMessages: next }
                                    : x
                                )
                              );
                              try {
                                const res = await fetch(`/api/contacts/${c.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    allowCallsAndMessages: next,
                                  }),
                                });
                                if (!res.ok) {
                                  showToast(
                                    "Failed to update calls/messages setting",
                                    "error"
                                  );
                                }
                              } catch (err) {
                                console.error(
                                  "Failed to update allowCallsAndMessages",
                                  err
                                );
                                showToast(
                                  "Failed to update calls/messages setting",
                                  "error"
                                );
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
            These people have added you as an emergency contact in their
            Guardian account.
          </p>
          {trustedBy.length > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-900/40 border border-emerald-400/40 px-4 py-2 text-xs font-semibold text-emerald-200">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>
                You are an emergency contact for {trustedBy.length}{" "}
                {trustedBy.length === 1 ? "person" : "people"}.
              </span>
            </div>
          )}
          <div className="mt-3">
            {trustedBy.some((t) => t.status === "PENDING") && (
              <div className="mb-3 rounded-xl bg-amber-900/40 border border-amber-400/40 px-4 py-3 text-xs text-amber-100">
                <div className="font-semibold mb-1">
                  Pending emergency contact requests
                </div>
                <p>
                  You have {
                    trustedBy.filter((t) => t.status === "PENDING").length
                  }{" "}
                  pending request
                  {trustedBy.filter((t) => t.status === "PENDING").length === 1
                    ? ""
                    : "s"}
                  {" "}
                  to become an emergency contact.
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
                        <div className="text-xs text-gray-400">
                          {t.owner.email}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === "PENDING" && (
                        <>
                          <button
                            className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition text-xs"
                            onClick={() => handleInviteStatus(t.id, "ACCEPTED")}
                            disabled={
                              inviteUpdatingId === t.id || trustedDeletingId === t.id
                            }
                          >
                            {inviteUpdatingId === t.id ? "Accepting..." : "Accept"}
                          </button>
                          <button
                            className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition text-xs"
                            onClick={() => handleInviteStatus(t.id, "DECLINED")}
                            disabled={
                              inviteUpdatingId === t.id || trustedDeletingId === t.id
                            }
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
                            disabled={
                              inviteUpdatingId === t.id || trustedDeletingId === t.id
                            }
                          >
                            {inviteUpdatingId === t.id
                              ? "Revoking..."
                              : "Revoke emergency"}
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
                        disabled={
                          trustedDeletingId === t.id || inviteUpdatingId === t.id
                        }
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
  );
}

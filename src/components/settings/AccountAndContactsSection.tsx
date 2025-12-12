"use client";

import React, { Dispatch, SetStateAction } from "react";
import { useLanguage } from "@/hooks/useLanguage";

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
    status: "ACCEPTED" | "DECLINED",
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
  const { t } = useLanguage();

  return (
    <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h2 className="text-lg font-semibold mb-4">
        {t("settings.account.title")}
      </h2>

      <div className="space-y-6">
        {/* Profile */}
        <div>
          <h3 className="text-base font-semibold mb-1">
            {t("settings.account.profile.title")}
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            {t("settings.account.profile.body")}
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
                    showToast("Profile saved", "success");
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
                  {t("settings.account.profile.avatarNote")}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  {t("settings.account.profile.nameLabel")}
                </label>
                <input
                  name="name"
                  defaultValue={effectiveUser.name || ""}
                  className="w-full px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  {t("settings.account.profile.emailLabel")}
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={effectiveUser.email || ""}
                  className="w-full px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline.none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  {t("settings.account.profile.avatarLabel")}
                </label>
                <input
                  name="image"
                  defaultValue={effectiveUser.image || ""}
                  className="w-full px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline.none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="https://..."
                />
              </div>

              <button
                type="submit"
                className="mt-2 px-4 py-2 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition text-sm font-semibold"
              >
                {t("settings.account.profile.save")}
              </button>
            </form>
          )}
        </div>

        <div className="h-px bg-white/10" />

        {/* Privacy */}
        <div>
          <h3 className="text-base font-semibold mb-1">
            {t("settings.privacy.title")}
          </h3>
          <p className="text-sm text-gray-300">
            {t("settings.privacy.body")}
          </p>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs text-gray-400 max-w-xs">
              {t("settings.privacy.helper")}
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
                      err,
                    );
                  }
                }}
                className="h-4 w-4 text-gold-500"
              />
              <span>{t("settings.privacy.shareToggle")}</span>
            </label>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Map experience */}
        <div>
          <h3 className="text-base font-semibold mb-1">
            {t("settings.map.title")}
          </h3>
          <p className="text-sm text-gray-300">
            {t("settings.map.body")}
          </p>
          <form
            onSubmit={handleSaveMapSettings}
            className="mt-3 space-y-3 max-w-xl"
          >
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                {t("settings.map.apiKeyLabel")}
              </label>
              <input
                type="password"
                value={googleMapsApiKey}
                onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline.none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                placeholder={t("settings.map.apiKeyPlaceholder")}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                {t("settings.map.apiKeyHelper")}
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
                {t("settings.map.useGoogle3D")}
                {!googleMapsApiKey.trim()
                  ? t("settings.map.useGoogle3D.addKeySuffix")
                  : ""}
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
              {mapSettingsSaving
                ? t("settings.map.save.loading")
                : t("settings.map.save.idle")}
            </button>
            {mapSettingsLoading && (
              <div className="text-xs text-gray-400">
                {t("settings.map.loadingSaved")}
              </div>
            )}
          </form>
        </div>

        <div className="h-px bg-white/10" />

        {/* Emergency contacts */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-base font-semibold">
              {t("settings.contacts.title")}
            </h3>
            {contacts.length > 0 && (
              <button
                className="px-3 py-1 text-[11px] rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                onClick={handleDeleteAllContacts}
              >
                {t("settings.contacts.deleteAll")}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-300">
            {t("settings.contacts.body")}
          </p>
          <form
            onSubmit={handleAddContact}
            className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              type="email"
              className="flex-1 px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline.none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              placeholder={t("settings.contacts.inputPlaceholder")}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              disabled={contactLoading}
            >
              {contactLoading
                ? t("settings.contacts.add.loading")
                : t("settings.contacts.add.idle")}
            </button>
          </form>
          {contactError && (
            <div className="mt-2 text-sm text-red-400">{contactError}</div>
          )}
          <div className="mt-4">
            {contacts.length === 0 ? (
              <div className="text-sm text-gray-400">
                {t("settings.contacts.empty")}
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
                                    : x,
                                ),
                              );
                              try {
                                const res = await fetch(`/api/contacts/${c.id}`, {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    receiveEmergencyAlerts: next,
                                  }),
                                });
                                if (!res.ok) {
                                  showToast(
                                    "Failed to update emergency alerts setting",
                                    "error",
                                  );
                                }
                              } catch (err) {
                                console.error(
                                  "Failed to update receiveEmergencyAlerts",
                                  err,
                                );
                                showToast(
                                  "Failed to update emergency alerts setting",
                                  "error",
                                );
                              }
                            }}
                            className="h-4 w-4 text-gold-500"
                          />
                          <span>{t("settings.contacts.flags.emergencyAlerts")}</span>
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
                                    : x,
                                ),
                              );
                              try {
                                const res = await fetch(`/api/contacts/${c.id}`, {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    allowCallsAndMessages: next,
                                  }),
                                });
                                if (!res.ok) {
                                  showToast(
                                    "Failed to update calls/messages setting",
                                    "error",
                                  );
                                }
                              } catch (err) {
                                console.error(
                                  "Failed to update allowCallsAndMessages",
                                  err,
                                );
                                showToast(
                                  "Failed to update calls/messages setting",
                                  "error",
                                );
                              }
                            }}
                            className="h-4 w-4 text-gold-500"
                          />
                          <span>{t("settings.contacts.flags.callsMessages")}</span>
                        </label>
                      </div>
                    </div>
                    <button
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                      onClick={() => handleDeleteContact(c.id)}
                      disabled={contactDeletingId === c.id}
                    >
                      {contactDeletingId === c.id
                        ? t("settings.contacts.remove.loading")
                        : t("settings.contacts.remove.idle")}
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
          <h3 className="text-base font-semibold mb-1">
            {t("settings.contacts.trustedBy.title")}
          </h3>
          <p className="text-sm text-gray-300">
            {t("settings.contacts.trustedBy.body")}
          </p>
          {trustedBy.length > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-900/40 border border-emerald-400/40 px-4 py-2 text-xs font-semibold text-emerald-200">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>
                {trustedBy.length === 1
                  ? t("settings.contacts.trustedBy.summary.one")
                  : `${t("settings.contacts.trustedBy.summary.manyPrefix")} ${trustedBy.length} ${t(
                      "settings.contacts.trustedBy.summary.manySuffix",
                    )}`}
              </span>
            </div>
          )}
          <div className="mt-3">
            {trustedBy.some((trust) => trust.status === "PENDING") && (
              <div className="mb-3 rounded-xl bg-amber-900/40 border border-amber-400/40 px-4 py-3 text-xs text-amber-100">
                <div className="font-semibold mb-1">
                  {t("settings.contacts.trustedBy.pendingTitle")}
                </div>
                <p>
                  {t("settings.contacts.trustedBy.pendingPrefix")} {" "}
                  {trustedBy.filter((trust) => trust.status === "PENDING").length}{" "}
                  {trustedBy.filter((trust) => trust.status === "PENDING").length === 1
                    ? t("settings.contacts.trustedBy.pendingSuffix")
                    : t("settings.contacts.trustedBy.pendingSuffixPlural")}
                </p>
              </div>
            )}
          </div>
          <div className="mt-2">
            {trustedBy.length === 0 ? (
              <div className="text-sm text-gray-400">
                {t("settings.contacts.trustedBy.empty")}
              </div>
            ) : (
              <ul className="space-y-2">
                {trustedBy.map((trust) => (
                  <li
                    key={trust.id}
                    className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {trust.owner?.name || trust.owner?.email || "Guard Royal user"}
                      </div>
                      {trust.owner?.email && (
                        <div className="text-xs text-gray-400">
                          {trust.owner.email}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {trust.status === "PENDING" && (
                        <>
                          <button
                            className="px-3 py-1 text-[11px] rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                            onClick={() => handleInviteStatus(trust.id, "ACCEPTED")}
                            disabled={inviteUpdatingId === trust.id}
                          >
                            Accept
                          </button>
                          <button
                            className="px-3 py-1 text-[11px] rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition"
                            onClick={() => handleInviteStatus(trust.id, "DECLINED")}
                            disabled={inviteUpdatingId === trust.id}
                          >
                            Decline
                          </button>
                        </>
                      )}
                      <button
                        className="px-3 py-1 text-[11px] rounded-lg bg-red-600 text.white hover:bg-red-700 transition"
                        onClick={() => handleDeleteTrustedBy(trust.id)}
                        disabled={trustedDeletingId === trust.id}
                      >
                        {t("settings.contacts.remove.idle")}
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

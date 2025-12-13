"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import {
  DEFAULT_TRUSTED_NAME_PREFIXES,
  loadTrustedNamePrefixes,
  saveTrustedNamePrefixes,
} from "@/hooks/useTrustedDevices";

export function TrustedNamePrefixesSection() {
  const { t } = useLanguage();
  const [prefixes, setPrefixes] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    // Start with built-in defaults plus any user-defined prefixes
    const custom = loadTrustedNamePrefixes();
    const merged = [...DEFAULT_TRUSTED_NAME_PREFIXES, ...custom];
    // De-duplicate while preserving order
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const p of merged) {
      const key = p.trim();
      if (!key) continue;
      const lower = key.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      unique.push(key);
    }
    setPrefixes(unique);
  }, []);

  const handleAdd = () => {
    const value = input.trim();
    if (!value) return;
    const exists = prefixes.some((p) => p.toLowerCase() === value.toLowerCase());
    if (exists) {
      setInput("");
      return;
    }
    const next = [...prefixes, value];
    setPrefixes(next);
    // Only persist non-built-in additions
    const custom = next.filter(
      (p) => !DEFAULT_TRUSTED_NAME_PREFIXES.some((d) => d.toLowerCase() === p.toLowerCase()),
    );
    saveTrustedNamePrefixes(custom);
    setInput("");
  };

  const handleRemove = (value: string) => {
    const next = prefixes.filter((p) => p !== value);
    setPrefixes(next);
    const custom = next.filter(
      (p) => !DEFAULT_TRUSTED_NAME_PREFIXES.some((d) => d.toLowerCase() === p.toLowerCase()),
    );
    saveTrustedNamePrefixes(custom);
  };

  return (
    <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h2 className="text-lg font-semibold mb-1">
        {t("settings.trustedNames.title")}
      </h2>
      <p className="text-sm text-gray-300 mb-3">
        {t("settings.trustedNames.body")}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {prefixes.length === 0 ? (
          <span className="text-sm text-gray-400">
            {t("settings.trustedNames.empty")}
          </span>
        ) : (
          prefixes.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-white/5 border border-white/15 text-gray-100"
            >
              <span>{p}</span>
              {/* Allow removing non built-in prefixes; built-ins are fixed */}
              {!DEFAULT_TRUSTED_NAME_PREFIXES.some(
                (d) => d.toLowerCase() === p.toLowerCase(),
              ) && (
                <button
                  type="button"
                  onClick={() => handleRemove(p)}
                  className="ml-1 text-[10px] text-gray-400 hover:text-white"
                >
                  ×
                </button>
              )}
            </span>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("settings.trustedNames.placeholder")}
          className="flex-1 min-w-[160px] rounded-lg bg-black/40 border border-white/15 px-2 py-1 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-1 text-xs rounded-lg bg-white/10 text-gray-100 hover:bg-white/20 border border-white/15 transition"
        >
          {t("settings.trustedNames.addButton")}
        </button>
      </div>

      <p className="mt-2 text-[11px] text-gray-400">
        {t("settings.trustedNames.note")}
      </p>
    </section>
  );
}
